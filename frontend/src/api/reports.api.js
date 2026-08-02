import apiClient from './client.js';

export const reportsApi = {
  getCollectionAnalytics: (params = {}) => {
    return apiClient.get('/api/reports/collections', { params });
  }
};

export default reportsApi;
