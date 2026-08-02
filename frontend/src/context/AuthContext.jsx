import React, { createContext, useState, useEffect, useContext } from 'react';
import authApi from '../api/auth.api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('gym_user');
    const storedToken = localStorage.getItem('gym_token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const result = await authApi.login(username, password);
      
      if (result.success && result.data) {
        const { user: loggedUser, token: loggedToken } = result.data;
        setUser(loggedUser);
        setToken(loggedToken);
        localStorage.setItem('gym_user', JSON.stringify(loggedUser));
        localStorage.setItem('gym_token', loggedToken);
        return { success: true };
      } else {
        return { success: false, message: result.message || 'Login failed' };
      }
    } catch (err) {
      console.error('Login request error:', err);
      return { success: false, message: err.message || 'Login failed' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('gym_user');
    localStorage.removeItem('gym_token');
  };

  const isAdmin = () => user?.role === 'admin';
  const isReceptionist = () => user?.role === 'receptionist';

  // Deprecated fallback helper for direct requests if needed anywhere
  const authFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const storedToken = localStorage.getItem('gym_token') || token;
    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`;
    }

    const API_BASE_URL = import.meta.env.VITE_API_URL || '';
    const targetUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const res = await fetch(targetUrl, {
      ...options,
      headers
    });

    if (res.status === 401 || res.status === 403) {
      logout();
    }

    return res;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin, isReceptionist, authFetch }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default AuthContext;

