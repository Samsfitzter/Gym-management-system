import apiClient from './client.js';

export const expensesApi = {
  getAll: (params = {}) => {
    return apiClient.get('/api/expenses', { params });
  },

  getById: (id) => {
    return apiClient.get(`/api/expenses/${id}`);
  },

  create: (formData) => {
    return apiClient.post('/api/expenses', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  update: (id, formData) => {
    return apiClient.put(`/api/expenses/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  delete: (id) => {
    return apiClient.delete(`/api/expenses/${id}`);
  },

  getCategories: () => {
    return apiClient.get('/api/expenses/categories');
  },

  createCategory: (data) => {
    return apiClient.post('/api/expenses/categories', data);
  },

  getDashboardSummary: () => {
    return apiClient.get('/api/expenses/summary');
  },

  getAnalytics: (params = {}) => {
    return apiClient.get('/api/expenses/analytics', { params });
  },

  getProfitAndLoss: (params = {}) => {
    return apiClient.get('/api/expenses/reports/profit-loss', { params });
  },

  getCategoryWiseReport: (params = {}) => {
    return apiClient.get('/api/expenses/reports/category-wise', { params });
  }
};

export default expensesApi;
