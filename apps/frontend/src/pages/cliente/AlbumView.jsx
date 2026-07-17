import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Heart, Check, Download, X, ChevronLeft, ChevronRight, Camera } from 'lucide-react';

const ACCENT = '#EA580C';

export default function AlbumView() {
  const { slug } = useParams();
  const { authFetch } = useAuth();
  const [album, setAlbum] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [selecionadas, setSelecionadas] = useState(new Set());
  const [confirmada, setConfirmada] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAlbum(); }, [slug]);

  const loadAlbum = async () => {
    try {
      const res = await authFetch(`/client/albuns/${slug}`);
      const json = await res.json();
      if (json.success) {
        setAlbum(json.data);
        setFotos(json.data.fotos || []);
        const sel = (json.data.fotos || []).filter(f => f.selecionada).map(f => f.id);
        setSelecionadas(new Set(sel));
        setConfirmada(json.data.selecao_confirmada || false);
      }
    } catch {}
    setLoading(false);
  };

  const toggleSelecao = async (fotoId) => {
    if (confirmada) return;
    const nova = new Set(selecionadas);
    const selecionada = !nova.has(fotoId);

    // Verificar cota
    if (selecionada && album.cota_selecao && nova.size >= album.cota_selecao) {
      alert(`Você atingiu o limite de ${album.cota_selecao} fotos selecionadas.`);
      return;
    }

    if (selecionada) nova.add(fotoId); else nova.delete(fotoId);
    setSelecionadas(nova);

    // Salvar no backend
    try {
      await authFetch(`/client/albuns/${slug}/selecao`, {
        method: 'POST',
        body: JSON.stringify({ foto_id: fotoId, selecionada }),
      });
    } catch {}
  };

  const confirmarSelecao = async () => {
    if (!window.confirm(`Confirmar seleção de ${selecionadas.size} fotos? Esta ação não pode ser desfeita.`)) return;
    try {
      await authFetch(`/client/albuns/${slug}/selecao/confirmar`, { method: 'PUT' });
      setConfirmada(true);
    } catch {}
  };

  const handleDownload = async (fotoId) => {
    try {
      const res = await authFetch(`/client/albuns/${slug}/download/${fotoId}`);
      const json = await res.json();
      if (json.success && json.data?.url) window.open(json.data.url, '_blank');
    } catch {}
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Carregando álbum...</div>;
  if (!album) return <div className="flex items-center justify-center min-h-screen text-gray-400">Álbum não encontrado ou expirado</div>;

  const cota = album.cota_selecao || fotos.length;
  const pctSelecao = (selecionadas.size / cota) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
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
              <button onClick={() => handleDownload('all')} className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
                <Download size={14} /> Baixar Todas
              </button>
            )}
          </div>

          {/* Barra de seleção */}
          {album.permite_selecao && !confirmada && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{selecionadas.size} de {cota} selecionadas</span>
                <button onClick={confirmarSelecao} disabled={selecionadas.size === 0} style={{ background: ACCENT }}
                  className="px-4 py-1.5 text-white text-sm rounded-lg hover:opacity-90 disabled:opacity-50">
                  Confirmar Seleção
                </button>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="h-full rounded-full transition-all" style={{ width: `${pctSelecao}%`, background: ACCENT }} />
              </div>
            </div>
          )}
          {confirmada && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-green-600 flex items-center gap-1"><Check size={14} /> Seleção confirmada ({selecionadas.size} fotos)</p>
            </div>
          )}
        </div>
      </div>

      {/* Grid de fotos */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {fotos.map((foto, i) => {
            const sel = selecionadas.has(foto.id);
            return (
              <div key={foto.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-200 cursor-pointer"
                onClick={() => setLightbox(i)}>
                <img src={foto.url_thumb || foto.url || ''} alt="" className="w-full h-full object-cover" loading="lazy" />

                {/* Overlay de seleção */}
                {album.permite_selecao && (
                  <button onClick={(e) => { e.stopPropagation(); toggleSelecao(foto.id); }}
                    className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${sel ? 'bg-red-500 text-white scale-110' : 'bg-white/80 text-gray-400 hover:text-red-500'}`}>
                    <Heart size={16} fill={sel ? 'white' : 'none'} />
                  </button>
                )}

                {/* Badge selecionada */}
                {sel && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <span className="text-xs text-white font-medium">Selecionada</span>
                  </div>
                )}

                {/* Download individual */}
                {album.permite_download && (
                  <button onClick={(e) => { e.stopPropagation(); handleDownload(foto.id); }}
                    className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download size={14} className="text-gray-600" />
                  </button>
                )}

                {/* Número */}
                <span className="absolute bottom-2 right-2 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">{i + 1}</span>
              </div>
            );
          })}
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
