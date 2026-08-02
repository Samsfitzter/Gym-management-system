import pool from '../db/database.js';
import cryptoService from '../services/cryptoService.js';
import biometricSyncService from '../services/biometricSyncService.js';
import biometricEnrollmentService from '../services/biometricEnrollmentService.js';
import biometricEventScheduler from '../services/biometricEventScheduler.js';
import HikvisionClient from '../services/hikvisionClient.js';

export class DeviceController {
  
  static async getSettings(req, res) {
    try {
      const deviceRes = await pool.query('SELECT * FROM device_settings ORDER BY id ASC LIMIT 1');
      if (deviceRes.rows.length === 0) {
        return res.json({ success: true, data: null });
      }
      
      const device = deviceRes.rows[0];
      // Don't send encrypted password back to client
      delete device.password_encrypted;
      
      return res.json({
        success: true,
        data: device,
        message: 'Device settings retrieved'
      });
    } catch (err) {
      console.error('Device getSettings error:', err.message);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  static async updateSettings(req, res) {
    try {
      const { device_name, device_ip, device_port, username, password, enabled, connection_timeout, sync_page_size } = req.body;
      
      const deviceRes = await pool.query('SELECT * FROM device_settings ORDER BY id ASC LIMIT 1');
      
      let passwordEncrypted = null;
      if (password) {
        passwordEncrypted = cryptoService.encrypt(password);
      } else if (deviceRes.rows.length > 0) {
        passwordEncrypted = deviceRes.rows[0].password_encrypted;
      }
      
      if (deviceRes.rows.length === 0) {
        // Insert
        await pool.query(`
          INSERT INTO device_settings 
          (device_name, device_ip, device_port, username, password_encrypted, enabled, connection_timeout, sync_page_size, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        `, [device_name, device_ip, device_port, username, passwordEncrypted, enabled, connection_timeout, sync_page_size]);
      } else {
        // Update
        await pool.query(`
          UPDATE device_settings 
          SET device_name=$1, device_ip=$2, device_port=$3, username=$4, password_encrypted=$5, enabled=$6, connection_timeout=$7, sync_page_size=$8
          WHERE id = $9
        `, [device_name, device_ip, device_port, username, passwordEncrypted, enabled, connection_timeout, sync_page_size, deviceRes.rows[0].id]);
      }
      
      return res.json({
        success: true,
        message: 'Device settings updated successfully'
      });
    } catch (err) {
      console.error('Device updateSettings error:', err.message);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  static async sync(req, res) {
    try {
      const data = await biometricSyncService.runSync();
      return res.json({
        success: true,
        data,
        message: 'Device synced successfully'
      });
    } catch (err) {
      console.error('Device sync controller error:', err.message);
      return res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }

  static async getHealth(req, res) {
    try {
      const health = {
        configured: false,
        deviceReachable: false,
        authenticated: false,
        schedulerRunning: biometricEventScheduler.isRunning || false, // Use the proper boolean prop from scheduler
        lastSync: null,
        lastSuccessfulSync: null,
        pendingEvents: 0,
        firmware: 'Unknown',
        deviceTime: 'Unknown',
        serverTime: new Date().toISOString()
      };

      const deviceRes = await pool.query('SELECT * FROM device_settings ORDER BY id ASC LIMIT 1');
      if (deviceRes.rows.length > 0) {
        const device = deviceRes.rows[0];
        health.configured = true;
        health.lastSync = device.last_sync;
        health.lastSuccessfulSync = device.last_successful_sync;

        if (device.enabled) {
          try {
            const client = new HikvisionClient({
              ip_address: device.device_ip,
              port: device.device_port,
              username: device.username,
              password: cryptoService.decrypt(device.password_encrypted)
            });

            // Ping device info
            const infoRes = await client.request({
              url: '/ISAPI/System/deviceInfo?format=json',
              method: 'GET'
            });
            
            if (infoRes && infoRes.status === 200) {
              health.deviceReachable = true;
              health.authenticated = true;
              if (infoRes.data && infoRes.data.DeviceInfo) {
                health.firmware = infoRes.data.DeviceInfo.firmwareVersion || 'Unknown';
              }
            }

            // Get device time
            try {
              const timeRes = await client.request({
                url: '/ISAPI/System/time?format=json',
                method: 'GET'
              });
              if (timeRes.data && timeRes.data.Time) {
                health.deviceTime = timeRes.data.Time.localTime || 'Unknown';
              }
            } catch (timeErr) {
              // Ignore time error
            }
          } catch (err) {
             health.deviceReachable = err.code !== 'ECONNREFUSED' && err.code !== 'ETIMEDOUT';
             health.authenticated = err.response && err.response.status !== 401;
          }
        }
      }

      return res.json({
        success: true,
        data: health,
        message: 'Biometric health retrieved'
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async verifyMember(req, res) {
    try {
      const { memberId } = req.params;
      const result = await biometricEnrollmentService.verifyMember(memberId);
      
      res.json({
        success: true,
        data: result.member,
        message: 'Member biometric status verified successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async syncAllMembers(req, res) {
    try {
      const result = await biometricEnrollmentService.syncAllMembers();
      res.json({
        success: true,
        data: result,
        message: 'Bulk enrollment sync completed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default DeviceController;
