import { create } from 'zustand';
import { photosService } from '../services/photos.service';

export const usePhotosStore = create((set, get) => ({
  photos: [],
  loading: false,
  nextToken: null,
  totalCount: 0,

  fetchPhotos: async (galleryId = null, reset = false) => {
    set({ loading: true });
    try {
      const token = reset ? null : get().nextToken;
      const result = await photosService.listPhotos(galleryId, 20, token);
      set((state) => ({
        photos: reset ? result.photos : [...state.photos, ...result.photos],
        nextToken: result.nextToken || null,
        totalCount: result.count,
        loading: false
      }));
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  uploadPhoto: async (file, galleryId = null, onProgress) => {
    const { uploadUrl, photoId, s3Key } = await photosService.getUploadUrl(
      file.name,
      file.type,
      galleryId
    );
    await photosService.uploadToS3(uploadUrl, file, onProgress);
    return { photoId, s3Key };
  },

  deletePhoto: async (photoId) => {
    await photosService.deletePhoto(photoId);
    set((state) => ({
      photos: state.photos.filter((p) => p.id !== photoId)
    }));
  },

  clearPhotos: () => set({ photos: [], nextToken: null, totalCount: 0 })
}));
