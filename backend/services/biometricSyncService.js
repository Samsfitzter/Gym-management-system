import pool from '../db/database.js';
import cryptoService from './cryptoService.js';
import HikvisionClient from './hikvisionClient.js';
import { AttendanceService } from './attendanceService.js';

class BiometricSyncService {
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
      // We use a fixed window of 2 days ago to handle device clock changes/drifts
      // The deduplication logic will prevent double-inserting records
      let startTime = new Date();
      startTime.setDate(startTime.getDate() - 2);

      const lastSyncRes = await pool.query(
        'SELECT last_event_time FROM sync_jobs WHERE status = $1 AND last_event_time IS NOT NULL ORDER BY id DESC LIMIT 1',
        ['completed']
      );
      // 4. Connect to Device and Fetch Events
      // hikvisionClient expects { ip_address, port, username, password }
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
      // Calculate delta in milliseconds (Server Time - Device Time)
      const timeDeltaMs = serverTime.getTime() - deviceTime.getTime();

      const formatTime = (date) => {
        return date.toISOString().replace(/\.\d{3}Z$/, '+00:00');
      };

      const startTimeStr = formatTime(startTime);
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
              major: 5, // Access Control events
              minor: 0, // All minor events
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
              break; // Reached the end
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
      for (const event of events) {
        try {
          const employeeNo = event.employeeNoString;
          if (!employeeNo) continue;

          const rawEventTime = new Date(event.time);
          // Normalize to server time
          const normalizedEventTime = new Date(rawEventTime.getTime() + timeDeltaMs);
          const serialNo = event.serialNo || 0;
          const deviceLogId = `hik-${serialNo}`;

          await pool.query(
            `INSERT INTO biometric_raw_events (device_log_id, employee_no, event_time, status)
             VALUES ($1, $2, $3, 'pending')
             ON CONFLICT (device_log_id) DO NOTHING`,
            [deviceLogId, employeeNo, normalizedEventTime]
          );
        } catch (insertErr) {
          console.error(`Failed to insert raw event ${event.serialNo}:`, insertErr);
        }
      }

      // 6. Process pending events
      let imported = 0;
      let duplicates = 0;
      let failed = 0;
      let maxEventTime = startTime;

      const pendingRes = await pool.query(
        `SELECT * FROM biometric_raw_events WHERE status = 'pending' ORDER BY event_time ASC LIMIT 1000`
      );

      for (const raw of pendingRes.rows) {
        try {
          const eventTime = raw.event_time;
          if (eventTime > maxEventTime) {
            maxEventTime = eventTime;
          }

          const employeeNoStr = String(raw.employee_no);
          const deviceLogId = raw.device_log_id;
          
          const memberRes = await pool.query('SELECT id, status FROM members WHERE device_user_id = $1', [employeeNoStr]);
          const memberId = memberRes.rows.length > 0 ? memberRes.rows[0].id : null;

          if (memberId) {
            // We use the deduplication queries to prevent double processing
            const checkRes = await pool.query(
              'SELECT 1 FROM attendance WHERE device_log_id = $1 OR checkout_device_log_id = $1',
              [deviceLogId]
            );
            
            if (checkRes.rows.length > 0) {
              duplicates++;
              await pool.query(`UPDATE biometric_raw_events SET status = 'processed', processed_at = NOW() WHERE id = $1`, [raw.id]);
            } else {
              await AttendanceService.handleScan({
                memberId: memberId,
                attendanceMethod: 'biometric',
                scanTimestamp: eventTime,
                deviceLogId: deviceLogId,
                verificationMethod: 'biometric',
                deviceName: device.device_name || 'Hikvision Device'
              });
              imported++;
              await pool.query(`UPDATE biometric_raw_events SET status = 'processed', processed_at = NOW() WHERE id = $1`, [raw.id]);
            }
          } else {
            console.warn(`[SyncService] Unmatched device_user_id from device event: ${employeeNoStr}`);
            failed++;
            await pool.query(`UPDATE biometric_raw_events SET status = 'failed', processed_at = NOW() WHERE id = $1`, [raw.id]);
          }
        } catch (eventError) {
          console.error(`Failed to process event ${raw.device_log_id}:`, eventError.message);
          if (eventError.message && eventError.message.includes('Duplicate scan')) {
            duplicates++;
            await pool.query(`UPDATE biometric_raw_events SET status = 'ignored', processed_at = NOW() WHERE id = $1`, [raw.id]);
          } else {
            failed++;
            await pool.query(`UPDATE biometric_raw_events SET status = 'failed', processed_at = NOW() WHERE id = $1`, [raw.id]);
          }
        }
      }

      // 7. Update Sync Job Success
      await pool.query(`
        UPDATE sync_jobs 
        SET status = $1, finished_at = CURRENT_TIMESTAMP, imported = $2, duplicates = $3, failed = $4, last_event_time = $5
        WHERE id = $6
      `, ['completed', imported, duplicates, failed, maxEventTime, syncJobId]);

      // Update device_settings last_successful_sync
      await pool.query(`UPDATE device_settings SET last_successful_sync = CURRENT_TIMESTAMP, last_sync = CURRENT_TIMESTAMP WHERE id = $1`, [device.id]);

      return {
        success: true,
        imported,
        duplicates,
        failed,
        jobId: syncJobId
      };
    } catch (error) {
      console.error('Sync failed:', error);

      // 8. Update Sync Job Failure
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

export default new BiometricSyncService();
