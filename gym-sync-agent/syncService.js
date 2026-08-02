import pool from './db.js';
import cryptoService from './cryptoService.js';
import HikvisionClient from './hikvisionClient.js';

class SyncService {
  async runSync() {
    let syncJobId = null;
    try {
      // 1. Get Device Config
      const deviceRes = await pool.query('SELECT * FROM device_settings ORDER BY id ASC LIMIT 1');
      const device = deviceRes.rows[0];

      if (!device || !device.enabled) {
        throw new Error('Biometric device is not configured or disabled');
      }

      // Decrypt password
      device.password = cryptoService.decrypt(device.password_encrypted);

      // 2. Create Sync Job
      const jobRes = await pool.query(
        'INSERT INTO sync_jobs (status) VALUES ($1) RETURNING id',
        ['running']
      );
      syncJobId = jobRes.rows[0].id;

      // 3. Determine Start Time
      let startTime = new Date();
      startTime.setDate(startTime.getDate() - 2);

      const lastSyncRes = await pool.query(
        'SELECT last_event_time FROM sync_jobs WHERE status = $1 AND last_event_time IS NOT NULL ORDER BY id DESC LIMIT 1',
        ['completed']
      );

      if (lastSyncRes.rows.length > 0) {
        startTime = new Date(lastSyncRes.rows[0].last_event_time);
      }

      // 4. Connect to Device and Fetch Events
      const client = new HikvisionClient({
        ip_address: device.device_ip,
        port: device.device_port,
        username: device.username,
        password: device.password
      });

      const timeRes = await client.request({ url: '/ISAPI/System/time', method: 'GET' });
      const deviceTimeStr = timeRes.data.match(/<localTime>(.*?)<\/localTime>/)[1];
      const deviceTime = new Date(deviceTimeStr);
      const serverTime = new Date();
      const timeDeltaMs = serverTime.getTime() - deviceTime.getTime();

      const formatTime = (date) => {
        return date.toISOString().replace(/\.\d{3}Z$/, '+00:00');
      };

      // Convert startTime (server time) back to device time to avoid startTime > endTime errors
      const deviceStartTime = new Date(startTime.getTime() - timeDeltaMs);
      const startTimeStr = formatTime(deviceStartTime);
      const safeEndTimeStr = deviceTimeStr;

      let events = [];
      let searchPosition = 0;
      const maxResults = 1000;

      try {
        while (true) {
          const payload = {
            AcsEventCond: {
              searchID: "sync-events-" + syncJobId,
              searchResultPosition: searchPosition,
              maxResults: maxResults,
              major: 5,
              minor: 0,
              startTime: startTimeStr,
              endTime: safeEndTimeStr,
              timeReverseOrder: true
            }
          };

          const response = await client.request({
            url: '/ISAPI/AccessControl/AcsEvent?format=json',
            method: 'POST',
            data: payload
          });
          const acsEvent = response.data.AcsEvent;

          if (acsEvent && acsEvent.InfoList && acsEvent.InfoList.length > 0) {
            events = events.concat(acsEvent.InfoList);
            if (acsEvent.InfoList.length < maxResults) {
              break;
            }
            searchPosition += maxResults;
          } else {
            break;
          }
        }
      } catch (deviceError) {
        throw new Error(`Failed to fetch events from device: ${deviceError.message}`);
      }

      // 5. Insert raw events to decoupling table
      let inserted = 0;
      let maxEventTime = startTime;

      for (const event of events) {
        try {
          const employeeNo = event.employeeNoString;
          if (!employeeNo) continue;

          const rawEventTime = new Date(event.time);
          const normalizedEventTime = new Date(rawEventTime.getTime() + timeDeltaMs);

          if (normalizedEventTime > maxEventTime) {
            maxEventTime = normalizedEventTime;
          }

          const serialNo = event.serialNo || 0;
          const deviceLogId = `hik-${serialNo}`;

          const insertRes = await pool.query(
            `INSERT INTO biometric_raw_events (device_log_id, employee_no, event_time, status)
             VALUES ($1, $2, $3, 'pending')
             ON CONFLICT (device_log_id) DO NOTHING`,
            [deviceLogId, employeeNo, normalizedEventTime]
          );

          if (insertRes.rowCount > 0) inserted++;
        } catch (insertErr) {
          console.error(`Failed to insert raw event ${event.serialNo}:`, insertErr);
        }
      }

      // 6. Update Sync Job Success
      await pool.query(`
        UPDATE sync_jobs 
        SET status = $1, finished_at = CURRENT_TIMESTAMP, imported = $2, last_event_time = $3
        WHERE id = $4
      `, ['completed', inserted, maxEventTime, syncJobId]);

      await pool.query(`UPDATE device_settings SET last_successful_sync = CURRENT_TIMESTAMP, last_sync = CURRENT_TIMESTAMP WHERE id = $1`, [device.id]);

      return {
        success: true,
        inserted,
        jobId: syncJobId
      };
    } catch (error) {
      console.error('Sync failed:', error);

      if (syncJobId) {
        await pool.query(`
          UPDATE sync_jobs 
          SET status = $1, finished_at = CURRENT_TIMESTAMP, error_message = $2
          WHERE id = $3
        `, ['failed', error.message, syncJobId]);
      }
      throw error;
    }
  }
}

export default new SyncService();
