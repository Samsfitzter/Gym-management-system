import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gym_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling & session management
apiClient.interceptors.response.use(
  (response) => {
    // Return the response body directly since it already contains { success, data, message }
    return response.data;
  },
  (error) => {
    if (error.response) {
      const { status } = error.response;
      
      // Auto-logout user on 401 Unauthorized
      if (status === 401 || status === 403) {
        localStorage.removeItem('gym_token');
        localStorage.removeItem('gym_user');
        
        // Only redirect if not already on the login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      
      // Return custom rejected promise using standard API error envelope
      return Promise.reject({
        success: false,
        data: null,
        message: error.response.data?.message || 'Request failed'
      });
    }
    
    // Network or server connection failure
    return Promise.reject({
      success: false,
      data: null,
      message: 'Network failure or server is offline'
    });
  }
);

export default apiClient;
