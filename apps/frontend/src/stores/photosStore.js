import { create } from 'zustand';
import { photosService } from '../services/photos.service';

export const usePhotosStore = create((set, get) => ({
  photos: [],
  loading: false,
  nextToken: null,

  fetchPhotos: async (galleryId, limit = 20) => {
    set({ loading: true });
    try {
      const res = await photosService.listPhotos(galleryId, limit);
      set({ photos: res.data.photos, nextToken: res.data.nextToken });
    } finally {
      set({ loading: false });
    }
  },

  loadMore: async (galleryId, limit = 20) => {
    const { nextToken, photos } = get();
    if (!nextToken) return;

    set({ loading: true });
    try {
      const res = await photosService.listPhotos(galleryId, limit, nextToken);
      set({
        photos: [...photos, ...res.data.photos],
        nextToken: res.data.nextToken
      });
    } finally {
      set({ loading: false });
    }
  },

  uploadPhoto: async (file, galleryId, onProgress) => {
    const res = await photosService.getUploadUrl(file.name, file.type, galleryId);
    await photosService.uploadToS3(res.data.uploadUrl, file, onProgress);
    return res.data;
  },

  deletePhoto: async (photoId) => {
    await photosService.deletePhoto(photoId);
    set({ photos: get().photos.filter((p) => p.id !== photoId) });
  },

  clearPhotos: () => set({ photos: [], nextToken: null })
}));
