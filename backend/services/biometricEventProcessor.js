import pool from '../db/database.js';
import { AttendanceService } from './attendanceService.js';

class BiometricEventProcessor {
  async processPendingEvents() {
    console.log('[EventProcessor] Invoked processPendingEvents()');
    try {
      let imported = 0;
      let duplicates = 0;
      let failed = 0;

      const pendingRes = await pool.query(
        `SELECT * FROM biometric_raw_events WHERE status = 'pending' ORDER BY event_time ASC LIMIT 1000`
      );

      if (pendingRes.rows.length === 0) {
        return { success: true, processed: 0 };
      }

      console.log(`[EventProcessor] Found ${pendingRes.rows.length} pending biometric events to process.`);

      for (const raw of pendingRes.rows) {
        try {
          const eventTime = raw.event_time;
          const employeeNoStr = String(raw.employee_no);
          const deviceLogId = raw.device_log_id;
          
          const memberRes = await pool.query('SELECT id, status FROM members WHERE device_user_id = $1', [employeeNoStr]);
          const memberId = memberRes.rows.length > 0 ? memberRes.rows[0].id : null;

          if (memberId) {
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
                deviceName: 'Remote Biometric Sync'
              });
              imported++;
              await pool.query(`UPDATE biometric_raw_events SET status = 'processed', processed_at = NOW() WHERE id = $1`, [raw.id]);
            }
          } else {
            console.warn(`[EventProcessor] Unmatched device_user_id: ${employeeNoStr}`);
            failed++;
            await pool.query(`UPDATE biometric_raw_events SET status = 'failed', processed_at = NOW() WHERE id = $1`, [raw.id]);
          }
        } catch (eventError) {
          console.error(`[EventProcessor] Failed to process event ${raw.device_log_id}:`, eventError.message);
          if (eventError.message && eventError.message.includes('Duplicate scan')) {
            duplicates++;
            await pool.query(`UPDATE biometric_raw_events SET status = 'ignored', processed_at = NOW() WHERE id = $1`, [raw.id]);
          } else {
            failed++;
            await pool.query(`UPDATE biometric_raw_events SET status = 'failed', processed_at = NOW() WHERE id = $1`, [raw.id]);
          }
        }
      }

      console.log(`[EventProcessor] Processing complete: ${imported} imported, ${duplicates} duplicates, ${failed} failed.`);

      return {
        success: true,
        processed: pendingRes.rows.length,
        imported,
        duplicates,
        failed
      };
    } catch (error) {
      console.error('[EventProcessor] Critical error during processing:', error);
      throw error;
    }
  }
}

export default new BiometricEventProcessor();
