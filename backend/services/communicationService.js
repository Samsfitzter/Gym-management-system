import pool from '../db/database.js';

export class CommunicationService {
  /**
   * Log a new WhatsApp communication event.
   * @param {Object} params
   * @param {number} params.memberId - The ID of the member
   * @param {string} params.type - The type of communication ('birthday', 'expiry', 'payment', 'absence')
   * @param {number} params.initiatedBy - The ID of the user (admin) who initiated it
   */
  static async logCommunication({ memberId, type, initiatedBy }) {
    if (!memberId || !type) {
      throw new Error('memberId and type are required');
    }

    const query = `
      INSERT INTO communication_logs (member_id, type, initiated_by, initiated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await pool.query(query, [memberId, type, initiatedBy || null]);
    return result.rows[0];
  }

  /**
   * Retrieve the latest communication logs for all members.
   * Returns a promise resolving to the rows of latest logs.
   */
  static async getLatestLogs() {
    const query = `
      SELECT DISTINCT ON (member_id, type) member_id, type, initiated_at
      FROM communication_logs
      ORDER BY member_id, type, initiated_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

export default CommunicationService;
