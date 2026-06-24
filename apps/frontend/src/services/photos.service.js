import api from './api';
import axios from 'axios';

export const photosService = {
  getUploadUrl: (fileName, contentType, galleryId) =>
    api.post('/photos/upload-url', { fileName, contentType, galleryId }),

  uploadToS3: (uploadUrl, file, onProgress) =>
    axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type },
      onUploadProgress: (e) => {
        if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
      }
    }),

  listPhotos: (galleryId, limit, nextToken) =>
    api.get('/photos', { params: { galleryId, limit, nextToken } }),

  deletePhoto: (photoId) =>
    api.delete(`/photos/${photoId}`)
};
