import api from './api';

export const clientsService = {
  create: (data) =>
    api.post('/clients', data),

  list: (limit, nextToken) =>
    api.get('/clients', { params: { limit, nextToken } }),

  get: (clientId) =>
    api.get(`/clients/${clientId}`),

  update: (clientId, data) =>
    api.put(`/clients/${clientId}`, data)
};
