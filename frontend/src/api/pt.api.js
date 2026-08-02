import apiClient from './client.js';

export const ptApi = {
  getDashboard: () => {
    return apiClient.get('/api/pt/dashboard');
  },

  getTrainers: () => {
    return apiClient.get('/api/pt/trainers');
  },

  listAllTrainers: () => {
    return apiClient.get('/api/pt/trainers/all');
  },

  createTrainer: (data) => {
    return apiClient.post('/api/pt/trainers', data);
  },

  updateTrainer: (id, data) => {
    return apiClient.put(`/api/pt/trainers/${id}`, data);
  },

  deactivateTrainer: (id) => {
    return apiClient.delete(`/api/pt/trainers/${id}`);
  },
  
  getPlans: (params = {}) => {
    return apiClient.get('/api/pt/plans', { params });
  },
  
  getActivePlans: () => {
    return apiClient.get('/api/pt/plans/active');
  },
  
  createPlan: (data) => {
    return apiClient.post('/api/pt/plans', data);
  },
  
  updatePlan: (id, data) => {
    return apiClient.put(`/api/pt/plans/${id}`, data);
  },
  
  deletePlan: (id) => {
    return apiClient.delete(`/api/pt/plans/${id}`);
  },
  
  getClients: (params = {}) => {
    return apiClient.get('/api/pt/clients', { params });
  },
  
  getClientDetails: (id) => {
    return apiClient.get(`/api/pt/clients/${id}`);
  },
  
  createClient: (data) => {
    return apiClient.post('/api/pt/clients', data);
  },
  
  updateClient: (id, data) => {
    return apiClient.put(`/api/pt/clients/${id}`, data);
  },
  
  renewClient: (id, data) => {
    return apiClient.post(`/api/pt/clients/${id}/renew`, data);
  },
  
  deleteClient: (id) => {
    return apiClient.delete(`/api/pt/clients/${id}`);
  },
  
  getProgress: (clientId) => {
    return apiClient.get(`/api/pt/clients/${clientId}/progress`);
  },
  
  addProgress: (clientId, data) => {
    return apiClient.post(`/api/pt/clients/${clientId}/progress`, data);
  },
  
  getNotes: (clientId) => {
    return apiClient.get(`/api/pt/clients/${clientId}/notes`);
  },
  
  addNote: (clientId, data) => {
    return apiClient.post(`/api/pt/clients/${clientId}/notes`, data);
  },
  
  updateNote: (clientId, noteId, data) => {
    return apiClient.put(`/api/pt/clients/${clientId}/notes/${noteId}`, data);
  },
  
  getImages: (clientId) => {
    return apiClient.get(`/api/pt/clients/${clientId}/images`);
  },
  
  uploadImage: (clientId, formData) => {
    return apiClient.post(`/api/pt/clients/${clientId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // Weight History
  getWeightHistory: (clientId) => {
    return apiClient.get(`/api/pt/clients/${clientId}/weight-history`);
  },
  recordWeight: (clientId, data) => {
    return apiClient.post(`/api/pt/clients/${clientId}/weight-history`, data);
  },

  // Diet Plan
  getDietPlan: (clientId) => {
    return apiClient.get(`/api/pt/clients/${clientId}/diet-plan`);
  },
  saveDietPlan: (clientId, data) => {
    return apiClient.post(`/api/pt/clients/${clientId}/diet-plan`, data);
  },
  getDietPlanHistory: (clientId) => {
    return apiClient.get(`/api/pt/clients/${clientId}/diet-plan/history`);
  },

  // Diet Plan Templates
  getTemplates: (all = false) => {
    return apiClient.get(`/api/pt/diet-templates`, { params: { all } });
  },
  createTemplate: (data) => {
    return apiClient.post(`/api/pt/diet-templates`, data);
  },
  updateTemplate: (id, data) => {
    return apiClient.put(`/api/pt/diet-templates/${id}`, data);
  },
  toggleTemplate: (id, isActive) => {
    return apiClient.patch(`/api/pt/diet-templates/${id}/toggle`, { is_active: isActive });
  },

  // Progress Images
  getProgressImages: (clientId) => {
    return apiClient.get(`/api/pt/clients/${clientId}/progress-images`);
  },
  uploadProgressImage: (clientId, formData) => {
    return apiClient.post(`/api/pt/clients/${clientId}/progress-images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  updateTargetWeight: (clientId, data) => {
    return apiClient.patch(`/api/pt/clients/${clientId}/target-weight`, data);
  }
};

export default ptApi;
