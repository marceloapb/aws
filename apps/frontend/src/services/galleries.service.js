import api from './api';

export const galleriesService = {
  async create(galleryData) {
    const { data } = await api.post('/galleries', galleryData);
    return data;
  },

  async list(limit = 20, nextToken = null) {
    const params = {};
    if (limit) params.limit = limit;
    if (nextToken) params.nextToken = nextToken;
    const { data } = await api.get('/galleries', { params });
    return data;
  },

  async get(galleryId) {
    const { data } = await api.get(`/galleries/${galleryId}`);
    return data;
  },

  async update(galleryId, updateData) {
    const { data } = await api.put(`/galleries/${galleryId}`, updateData);
    return data;
  },

  async delete(galleryId) {
    const { data } = await api.delete(`/galleries/${galleryId}`);
    return data;
  },

  async share(galleryId, expiresInDays = 7) {
    const { data } = await api.post(`/galleries/${galleryId}/share`, { expiresInDays });
    return data;
  }
};
