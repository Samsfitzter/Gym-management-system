import apiClient from './client.js';

export const membersApi = {
  getAll: (params = {}) => {
    return apiClient.get('/api/members', { params });
  },
  getById: (id) => {
    return apiClient.get(`/api/members/${id}`);
  },
  create: (data) => {
    return apiClient.post('/api/members', data);
  },
  update: (id, data) => {
    return apiClient.put(`/api/members/${id}`, data);
  },
  delete: (id) => {
    return apiClient.delete(`/api/members/${id}`);
  },
  updateStatus: (id, status) => {
    return apiClient.put(`/api/members/${id}/status`, { status });
  },
  renew: (id, data) => {
    return apiClient.post(`/api/members/${id}/renew`, data);
  },
  uploadImage: (formData) => {
    return apiClient.post('/api/members/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

export default membersApi;
