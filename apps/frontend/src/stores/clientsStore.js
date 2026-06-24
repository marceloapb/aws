import { create } from 'zustand';
import { clientsService } from '../services/clients.service';

export const useClientsStore = create((set, get) => ({
  clients: [],
  loading: false,
  nextToken: null,

  fetchClients: async (limit = 50) => {
    set({ loading: true });
    try {
      const res = await clientsService.list(limit);
      set({ clients: res.data.clients, nextToken: res.data.nextToken });
    } finally {
      set({ loading: false });
    }
  },

  createClient: async (data) => {
    const res = await clientsService.create(data);
    set({ clients: [res.data.client, ...get().clients] });
    return res.data.client;
  },

  updateClient: async (clientId, data) => {
    await clientsService.update(clientId, data);
    set({
      clients: get().clients.map((c) =>
        c.id === clientId ? { ...c, ...data } : c
      )
    });
  }
}));
