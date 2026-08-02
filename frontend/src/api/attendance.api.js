import apiClient from './client.js';

export const attendanceApi = {
  /**
   * Smart scan — automatically determines check-in or check-out based on open session.
   */
  scan: (data) => {
    return apiClient.post('/api/attendance/scan', data);
  },

  /**
   * Legacy check-in alias (backward compat).
   */
  checkIn: (data) => {
    return apiClient.post('/api/attendance/scan', data);
  },

  getToday: () => {
    return apiClient.get('/api/attendance/today');
  },

  getHistory: (date) => {
    return apiClient.get('/api/attendance/history', { params: { date } });
  },

  getMemberHistory: (memberId) => {
    return apiClient.get(`/api/attendance/member/${memberId}`);
  },

  getAll: (params = {}) => {
    return apiClient.get('/api/attendance', { params });
  },

  /**
   * Fetch all members currently inside the gym.
   */
  getInsideMembers: () => {
    return apiClient.get('/api/attendance/inside');
  },

  /**
   * Admin-only: manually trigger stale session auto-close (bulk, nightly cleanup).
   * checkout_time = end of check-in day, auto_closed = TRUE.
   */
  autoCloseStale: () => {
    return apiClient.post('/api/attendance/auto-close-stale');
  },

  /**
   * Admin-only: staff-initiated manual checkout for a single open attendance session.
   * checkout_time = NOW(), auto_closed = FALSE.
   * @param {number} attendanceId - The attendance record ID
   */
  manualCheckout: (attendanceId) => {
    return apiClient.post(`/api/attendance/manual-checkout/${attendanceId}`);
  }
};

export default attendanceApi;
