import api from './api';

export const clientsService = {
  async create(clientData) {
    const { data } = await api.post('/clients', clientData);
    return data;
  },

  async list(limit = 20, nextToken = null) {
    const params = {};
    if (limit) params.limit = limit;
    if (nextToken) params.nextToken = nextToken;
    const { data } = await api.get('/clients', { params });
    return data;
  },

  async get(clientId) {
    const { data } = await api.get(`/clients/${clientId}`);
    return data;
  },

  async update(clientId, updateData) {
    const { data } = await api.put(`/clients/${clientId}`, updateData);
    return data;
  }
};
