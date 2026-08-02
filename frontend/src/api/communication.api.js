import apiClient from './client.js';

export const communicationApi = {
  logWhatsAppOpen: (memberId, type) => {
    return apiClient.post('/api/communications/log', { memberId, type });
  }
};

export default communicationApi;
