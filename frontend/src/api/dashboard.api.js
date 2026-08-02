import apiClient from './client.js';

export const dashboardApi = {
  getStats: () => {
    return apiClient.get('/api/dashboard/stats');
  },
  getAnalytics: (params = {}) => {
    return apiClient.get('/api/dashboard/analytics', { params });
  },
  getNotifications: () => {
    return apiClient.get('/api/dashboard/notifications');
  }
};

export default dashboardApi;
