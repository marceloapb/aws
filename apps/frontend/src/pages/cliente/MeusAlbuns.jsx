import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Image, Download, Heart, Check } from 'lucide-react';

const ACCENT = '#EA580C';

export default function MeusAlbuns() {
  const { authFetch } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [favorites, setFavorites] = useState(new Set());

  useEffect(() => {
    authFetch('/albums/mine').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setAlbums(data);
    }).catch(() => {});
  }, []);

  const openAlbum = async (album) => {
    setSelectedAlbum(album);
    try {
      const res = await authFetch(`/albums/${album.id}/photos`);
      const data = await res.json();
      if (Array.isArray(data)) setPhotos(data);
    } catch {}
  };

  const toggleFavorite = (photoId) => {
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(photoId) ? next.delete(photoId) : next.add(photoId);
      return next;
    });
  };

  if (selectedAlbum) {
    return (
      <div>
        <button onClick={() => setSelectedAlbum(null)} className="text-sm text-gray-500 hover:text-gray-700 mb-4">← Voltar aos álbuns</button>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedAlbum.title}</h1>
        <p className="text-sm text-gray-500 mb-6">{photos.length} fotos • Selecione suas favoritas</p>

        {photos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Nenhuma foto disponível neste álbum ainda.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map(photo => (
              <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                <img src={photo.url || photo.thumbnailUrl} alt="" className="w-full h-40 object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                <button onClick={() => toggleFavorite(photo.id)}
                  className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    favorites.has(photo.id) ? 'bg-accent text-white' : 'bg-white/80 text-gray-600 opacity-0 group-hover:opacity-100'
                  }`} style={favorites.has(photo.id) ? { background: ACCENT } : {}}>
                  {favorites.has(photo.id) ? <Check size={14} /> : <Heart size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}

        {favorites.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-200 px-5 py-3 flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">{favorites.size} foto(s) selecionada(s)</span>
            <button style={{ background: ACCENT }} className="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
              Confirmar seleção
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Image size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Minhas Fotos</h1>
      </div>

      {albums.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          Suas galerias de fotos aparecerão aqui após a sessão fotográfica.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {albums.map(album => (
            <button key={album.id} onClick={() => openAlbum(album)}
              className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                  {album.coverUrl ? <img src={album.coverUrl} alt="" className="w-full h-full object-cover" /> : <Image size={24} className="text-gray-300" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{album.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{album.photoCount || 0} fotos</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    album.status === 'delivered' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {album.status === 'delivered' ? 'Pronto para download' : 'Em seleção'}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
