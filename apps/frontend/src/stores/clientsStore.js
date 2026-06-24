import { create } from 'zustand';
import { clientsService } from '../services/clients.service';

export const useClientsStore = create((set, get) => ({
  clients: [],
  loading: false,
  nextToken: null,

  fetchClients: async (reset = false) => {
    set({ loading: true });
    try {
      const token = reset ? null : get().nextToken;
      const result = await clientsService.list(20, token);
      set((state) => ({
        clients: reset ? result.clients : [...state.clients, ...result.clients],
        nextToken: result.nextToken || null,
        loading: false
      }));
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  createClient: async (data) => {
    const result = await clientsService.create(data);
    set((state) => ({
      clients: [result.client, ...state.clients]
    }));
    return result;
  },

  clearClients: () => set({ clients: [], nextToken: null })
}));
