import pool from '../db/database.js';
import cryptoService from './cryptoService.js';
import HikvisionClient from './hikvisionClient.js';

class BiometricEnrollmentService {
  
  async getDeviceClient() {
    const deviceRes = await pool.query('SELECT * FROM device_settings ORDER BY id ASC LIMIT 1');
    const device = deviceRes.rows[0];
    
    if (!device || !device.enabled) {
      throw new Error('Biometric device is not configured or disabled');
    }
    
    return new HikvisionClient({
      ip_address: device.device_ip,
      port: device.device_port,
      username: device.username,
      password: cryptoService.decrypt(device.password_encrypted)
    });
  }

  async verifyMember(memberId) {
    // 1. Get Member
    const memberRes = await pool.query('SELECT * FROM members WHERE id = $1', [memberId]);
    if (memberRes.rows.length === 0) {
      throw new Error(`Member with ID ${memberId} not found`);
    }
    const member = memberRes.rows[0];
    
    if (member.device_user_id === null || member.device_user_id === undefined) {
      throw new Error(`Member ${memberId} does not have a device_user_id assigned`);
    }

    // 2. Connect to Device
    const client = await this.getDeviceClient();
    
    let isEnrolled = false;
    let faceEnabled = false;
    let fpEnabled = false;
    let cardEnabled = false;
    
    try {
      const payload = {
        UserInfoSearchCond: {
          searchID: "verify-" + member.device_user_id,
          searchResultPosition: 0,
          maxResults: 10,
          EmployeeNoList: [{ employeeNo: String(member.device_user_id) }]
        }
      };

      const response = await client.request({
        url: '/ISAPI/AccessControl/UserInfo/Search?format=json',
        method: 'POST',
        data: payload
      });
      
      const userInfoSearch = response.data.UserInfoSearch;
      if (userInfoSearch && userInfoSearch.UserInfo && userInfoSearch.UserInfo.length > 0) {
        const userInfo = userInfoSearch.UserInfo.find(u => u.employeeNo === String(member.device_user_id));
        
        if (userInfo) {
          isEnrolled = true;
          faceEnabled = userInfo.numOfFace > 0 || userInfo.face === true || false;
          fpEnabled = userInfo.numOfFP > 0 || userInfo.fingerprint === true || false;
          cardEnabled = userInfo.numOfCard > 0 || userInfo.card === true || false;
          
          if (userInfo.numOfFace === undefined && userInfo.numOfFP === undefined && userInfo.numOfCard === undefined) {
             faceEnabled = true;
             fpEnabled = true;
          }
        }
      }
    } catch (error) {
      console.error(`Error verifying member ${member.device_user_id} on device:`, error.message);
      throw new Error(`Failed to communicate with biometric device: ${error.message}`);
    }

    const biometricStatus = isEnrolled ? 'enrolled' : 'pending';

    // 3. Update Database
    const updateRes = await pool.query(`
      UPDATE members 
      SET 
        biometric_status = $1,
        face_enabled = $2,
        fingerprint_enabled = $3,
        card_enabled = $4,
        last_verified_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [biometricStatus, faceEnabled, fpEnabled, cardEnabled, memberId]);

    return {
      verified: true,
      member: updateRes.rows[0]
    };
  }
  
  async syncAllMembers() {
    console.log('[BiometricEnrollmentService] Starting bulk enrollment sync...');
    const client = await this.getDeviceClient();
    
    try {
      // 1. Fetch all members with a device_user_id
      const membersRes = await pool.query('SELECT id, device_user_id FROM members WHERE device_user_id IS NOT NULL');
      const members = membersRes.rows;
      
      if (members.length === 0) {
        return { success: true, message: 'No members with device_user_id found.' };
      }
      
      // 2. Fetch all users from device (paginate if necessary, here we just fetch up to 10,000)
      const payload = {
        UserInfoSearchCond: {
          searchID: "bulk-sync",
          searchResultPosition: 0,
          maxResults: 10000
        }
      };
      
      const response = await client.request({
        url: '/ISAPI/AccessControl/UserInfo/Search?format=json',
        method: 'POST',
        data: payload
      });
      
      const userInfoSearch = response.data.UserInfoSearch;
      const deviceUsers = (userInfoSearch && userInfoSearch.UserInfo) ? userInfoSearch.UserInfo : [];
      
      let updatedCount = 0;
      
      // 3. Update members based on device user list
      for (const member of members) {
        const userInfo = deviceUsers.find(u => u.employeeNo === String(member.device_user_id));
        
        if (userInfo) {
          let faceEnabled = userInfo.numOfFace > 0 || userInfo.face === true || false;
          let fpEnabled = userInfo.numOfFP > 0 || userInfo.fingerprint === true || false;
          let cardEnabled = userInfo.numOfCard > 0 || userInfo.card === true || false;
          
          if (userInfo.numOfFace === undefined && userInfo.numOfFP === undefined && userInfo.numOfCard === undefined) {
             faceEnabled = true;
             fpEnabled = true;
          }
          
          await pool.query(`
            UPDATE members 
            SET biometric_status = 'enrolled', face_enabled = $1, fingerprint_enabled = $2, card_enabled = $3, last_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
          `, [faceEnabled, fpEnabled, cardEnabled, member.id]);
          updatedCount++;
        } else {
          // Member not found on device
          await pool.query(`
            UPDATE members 
            SET biometric_status = 'pending', face_enabled = false, fingerprint_enabled = false, card_enabled = false, last_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [member.id]);
        }
      }
      
      return {
        success: true,
        updatedCount,
        totalMembers: members.length
      };
    } catch (error) {
      console.error('[BiometricEnrollmentService] Bulk sync failed:', error.message);
      throw new Error(`Failed to bulk sync enrollment statuses: ${error.message}`);
    }
  }
}

export default new BiometricEnrollmentService();
