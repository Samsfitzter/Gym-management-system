import apiClient from './client.js';

export const authApi = {
  login: (username, password) => {
    return apiClient.post('/api/auth/login', { username, password });
  },
  register: (username, password, role, name) => {
    return apiClient.post('/api/auth/register', { username, password, role, name });
  },
  me: () => {
    return apiClient.get('/api/auth/me');
  }
};

export default authApi;
