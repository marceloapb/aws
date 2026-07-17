import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Image, Plus, Upload, Eye, Users } from 'lucide-react';

const ACCENT = '#EA580C';

export default function Albuns() {
  const { authFetch } = useAuth();
  const [albums, setAlbums] = useState([]);

  useEffect(() => {
    authFetch('/admin/albuns').then(r => r.json()).then(json => {
      if (json.success) setAlbums(json.data || []);
    }).catch(() => {});
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Image size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Álbuns</h1>
        </div>
        <button style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Novo Álbum
        </button>
      </div>

      {albums.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
            <Upload size={24} style={{ color: ACCENT }} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum álbum ainda</h3>
          <p className="text-gray-500 text-sm mb-4">Crie um álbum para organizar e entregar fotos ao cliente.</p>
          <button style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
            <Plus size={16} /> Criar primeiro álbum
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map(album => (
            <div key={album.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-40 bg-gray-100 flex items-center justify-center">
                {album.coverUrl ? (
                  <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
                ) : (
                  <Image size={32} className="text-gray-300" />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium text-gray-900">{album.title}</h3>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Image size={12} />{album.photoCount || 0} fotos</span>
                  <span className="flex items-center gap-1"><Users size={12} />{album.clientName || 'Sem cliente'}</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    album.status === 'delivered' ? 'bg-green-50 text-green-600' :
                    album.status === 'selecting' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {album.status === 'delivered' ? 'Entregue' : album.status === 'selecting' ? 'Em seleção' : 'Rascunho'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
