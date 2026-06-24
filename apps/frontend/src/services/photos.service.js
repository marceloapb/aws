import api from './api';
import axios from 'axios';

export const photosService = {
  async getUploadUrl(fileName, contentType, galleryId = null) {
    const { data } = await api.post('/photos/upload-url', { fileName, contentType, galleryId });
    return data;
  },

  async uploadToS3(uploadUrl, file, onProgress) {
    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
  },

  async listPhotos(galleryId = null, limit = 20, nextToken = null) {
    const params = {};
    if (galleryId) params.galleryId = galleryId;
    if (limit) params.limit = limit;
    if (nextToken) params.nextToken = nextToken;
    const { data } = await api.get('/photos', { params });
    return data;
  },

  async deletePhoto(photoId) {
    const { data } = await api.delete(`/photos/${photoId}`);
    return data;
  }
};
