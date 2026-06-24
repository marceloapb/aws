import api from './api';

export const authService = {
  register: (email, password, name) =>
    api.post('/auth/register', { email, password, name }),

  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  refresh: (refreshToken) =>
    api.post('/auth/refresh', { refreshToken }),

  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { action: 'request', email }),

  confirmPassword: (email, code, newPassword) =>
    api.post('/auth/forgot-password', { action: 'confirm', email, code, newPassword })
};
