import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Image, Camera, Calendar } from 'lucide-react';

const ACCENT = '#EA580C';

export default function MeusAlbuns() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    try {
      const res = await authFetch('/client/albuns');
      const data = await res.json();
      if (data.success) setAlbums(data.data || []);
    } catch {}
    setLoading(false);
  };

  const handleOpenAlbum = (album) => {
    // Navegar para a visualização do álbum com download/compartilhar
    const slug = album.slug || album.id;
    navigate(`/cliente/albuns/${slug}`);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Image size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Meus Álbuns</h1>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Image size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Meus Álbuns</h1>
      </div>

      {albums.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Camera size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Nenhum álbum disponível ainda</p>
          <p className="text-sm text-gray-400 mt-1">Suas galerias de fotos aparecerão aqui após a sessão fotográfica.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {albums.map(album => (
            <button
              key={album.id}
              onClick={() => handleOpenAlbum(album)}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden text-left hover:shadow-lg transition-all group"
            >
              {/* Capa do álbum */}
              <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                {album.thumbnail_url ? (
                  <img
                    src={album.thumbnail_url}
                    alt={album.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera size={40} className="text-gray-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  album.status === 'publicado' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {album.status === 'publicado' ? 'Disponível' : 'Em preparação'}
                </span>
              </div>

              {/* Info do álbum */}
              <div className="p-4">
                <h3 className="font-bold text-gray-900 text-lg">{album.titulo}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Camera size={14} />
                    {album.total_fotos || 0} fotos
                  </span>
                  {album.data_evento && (
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {formatDate(album.data_evento)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
