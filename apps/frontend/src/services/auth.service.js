import api from './api';

export const authService = {
  async register(email, password, name) {
    const { data } = await api.post('/auth/register', { email, password, name });
    return data;
  },

  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  async refresh(refreshToken) {
    const { data } = await api.post('/auth/refresh', { refreshToken });
    return data;
  },

  async forgotPassword(email) {
    const { data } = await api.post('/auth/forgot-password', { action: 'request', email });
    return data;
  },

  async confirmPassword(email, code, newPassword) {
    const { data } = await api.post('/auth/forgot-password', { action: 'confirm', email, code, newPassword });
    return data;
  }
};
