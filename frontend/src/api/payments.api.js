import apiClient from './client.js';

export const paymentsApi = {
  getAll: (params = {}) => {
    return apiClient.get('/api/payments', { params });
  },
  create: (data) => {
    return apiClient.post('/api/payments', data);
  },
  updateStatus: (id, status) => {
    return apiClient.put(`/api/payments/${id}/status`, { status });
  },
  uploadReceipt: (formData) => {
    return apiClient.post('/api/payments/upload-receipt', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

export default paymentsApi;
