import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, X, ChevronLeft, ChevronRight, Camera, Download } from 'lucide-react';

const ACCENT = '#EA580C';

export default function AlbumPreview() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const [album, setAlbum] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAlbum(); }, [id]);

  const loadAlbum = async () => {
    try {
      const res = await authFetch(`/admin/albuns/${id}`);
      const json = await res.json();
      if (json.success) {
        setAlbum(json.data);
        setFotos(json.data.fotos || []);
      }
    } catch {}
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Carregando pré-visualização...</div>;
  if (!album) return <div className="flex items-center justify-center min-h-screen text-gray-400">Álbum não encontrado</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner de Preview */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center">
        <span className="inline-flex items-center gap-2 text-sm text-yellow-800 font-medium">
          <Eye size={14} /> Modo pré-visualização — é assim que o cliente verá o álbum
        </span>
      </div>

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Camera size={24} style={{ color: ACCENT }} />
              <div>
                <h1 className="text-lg font-bold text-gray-900">{album.titulo}</h1>
                <p className="text-sm text-gray-500">{fotos.length} fotos</p>
              </div>
            </div>
            {album.permite_download && (
              <span className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm text-gray-400 cursor-not-allowed">
                <Download size={14} /> Baixar Todas
              </span>
            )}
          </div>

          {/* Barra de seleção (visual only) */}
          {album.permite_selecao && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">0 de {album.cota_selecao || fotos.length} selecionadas</span>
                <span className="px-4 py-1.5 text-white text-sm rounded-lg opacity-50" style={{ background: ACCENT }}>
                  Confirmar Seleção
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="h-full rounded-full" style={{ width: '0%', background: ACCENT }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid de fotos */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {fotos.map((foto, i) => (
            <div key={foto.id || i} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-200 cursor-pointer"
              onClick={() => setLightbox(i)}>
              <img src={foto.url_thumb || foto.url || ''} alt="" className="w-full h-full object-cover" loading="lazy" />
              <span className="absolute bottom-2 right-2 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full z-10">
            <X size={24} />
          </button>
          <button onClick={() => setLightbox(Math.max(0, lightbox - 1))} className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-full">
            <ChevronLeft size={28} />
          </button>
          <button onClick={() => setLightbox(Math.min(fotos.length - 1, lightbox + 1))} className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-full">
            <ChevronRight size={28} />
          </button>
          <img src={fotos[lightbox]?.url || fotos[lightbox]?.url_media || ''} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {lightbox + 1} / {fotos.length}
          </div>
        </div>
      )}
    </div>
  );
}
