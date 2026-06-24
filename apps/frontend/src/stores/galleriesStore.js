import { create } from 'zustand';
import { galleriesService } from '../services/galleries.service';

export const useGalleriesStore = create((set, get) => ({
  galleries: [],
  loading: false,
  nextToken: null,

  fetchGalleries: async (limit = 20) => {
    set({ loading: true });
    try {
      const res = await galleriesService.list(limit);
      set({ galleries: res.data.galleries, nextToken: res.data.nextToken });
    } finally {
      set({ loading: false });
    }
  },

  loadMore: async (limit = 20) => {
    const { nextToken, galleries } = get();
    if (!nextToken) return;

    set({ loading: true });
    try {
      const res = await galleriesService.list(limit, nextToken);
      set({
        galleries: [...galleries, ...res.data.galleries],
        nextToken: res.data.nextToken
      });
    } finally {
      set({ loading: false });
    }
  },

  createGallery: async (data) => {
    const res = await galleriesService.create(data);
    set({ galleries: [res.data.gallery, ...get().galleries] });
    return res.data.gallery;
  },

  deleteGallery: async (galleryId) => {
    await galleriesService.delete(galleryId);
    set({ galleries: get().galleries.filter((g) => g.id !== galleryId) });
  }
}));
