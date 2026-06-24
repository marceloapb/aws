import api from './api';

export const galleriesService = {
  create: (data) =>
    api.post('/galleries', data),

  list: (limit, nextToken) =>
    api.get('/galleries', { params: { limit, nextToken } }),

  get: (galleryId) =>
    api.get(`/galleries/${galleryId}`),

  update: (galleryId, data) =>
    api.put(`/galleries/${galleryId}`, data),

  delete: (galleryId) =>
    api.delete(`/galleries/${galleryId}`),

  share: (galleryId, expiresInDays) =>
    api.post(`/galleries/${galleryId}/share`, { expiresInDays })
};
