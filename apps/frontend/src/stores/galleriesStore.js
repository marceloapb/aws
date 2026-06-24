import { create } from 'zustand';
import { galleriesService } from '../services/galleries.service';

export const useGalleriesStore = create((set, get) => ({
  galleries: [],
  loading: false,
  nextToken: null,

  fetchGalleries: async (reset = false) => {
    set({ loading: true });
    try {
      const token = reset ? null : get().nextToken;
      const result = await galleriesService.list(20, token);
      set((state) => ({
        galleries: reset ? result.galleries : [...state.galleries, ...result.galleries],
        nextToken: result.nextToken || null,
        loading: false
      }));
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  createGallery: async (data) => {
    const result = await galleriesService.create(data);
    set((state) => ({
      galleries: [result.gallery, ...state.galleries]
    }));
    return result;
  },

  deleteGallery: async (galleryId) => {
    await galleriesService.delete(galleryId);
    set((state) => ({
      galleries: state.galleries.filter((g) => g.id !== galleryId)
    }));
  },

  clearGalleries: () => set({ galleries: [], nextToken: null })
}));
