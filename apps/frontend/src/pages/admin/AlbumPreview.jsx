import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, X, ChevronLeft, ChevronRight, Camera, Download, Heart, MessageCircle } from 'lucide-react';

const DEFAULTS_TEMA = {
  capa_foto_id: null,
  capa_modo: 'cover',
  cores: { fundo: '#FFFFFF', texto: '#1A1A1A', acento: '#EA580C' },
  layout: 'grade',
  fonte_titulo: 'Inter',
  fonte_corpo: 'Inter',
  animacao: 'none',
  logo_posicao: 'top-left',
};

export default function AlbumPreview() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const [album, setAlbum] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [tema, setTema] = useState(DEFAULTS_TEMA);
  const [lightbox, setLightbox] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [albumRes, temaRes] = await Promise.all([
        authFetch(`/admin/albuns/${id}`),
        authFetch(`/admin/albuns/${id}/tema`),
      ]);
      const albumJson = await albumRes.json();
      const temaJson = await temaRes.json();
      if (albumJson.success) {
        setAlbum(albumJson.data);
        setFotos(albumJson.data.fotos || []);
      }
      if (temaJson.success) {
        setTema({ ...DEFAULTS_TEMA, ...temaJson.data });
      }
    } catch {}
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Carregando pré-visualização...</div>;
  if (!album) return <div className="flex items-center justify-center min-h-screen text-gray-400">Álbum não encontrado</div>;

  const cores = tema.cores || DEFAULTS_TEMA.cores;
  const acento = cores.acento || '#EA580C';
  const cota = album.cota_selecao || fotos.length;

  // Foto de capa
  const capaFoto = tema.capa_foto_id ? fotos.find(f => f.id === tema.capa_foto_id || f.SK?.replace('FOTO#', '') === tema.capa_foto_id) : fotos[0];

  // Grid classes por layout
  const getGridClass = () => {
    switch (tema.layout) {
      case 'mosaico': return 'columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3';
      case 'colagem': return 'columns-2 md:columns-3 gap-2 space-y-2';
      case 'coluna': return 'grid grid-cols-1 md:grid-cols-2 gap-4';
      case 'ladrilhos': return 'grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1';
      case 'slider': return 'flex overflow-x-auto gap-4 snap-x snap-mandatory pb-4';
      default: return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'; // grade
    }
  };

  // Item class por layout
  const getItemClass = (i) => {
    switch (tema.layout) {
      case 'mosaico': return 'break-inside-avoid rounded-lg overflow-hidden bg-gray-200 cursor-pointer';
      case 'colagem': return 'break-inside-avoid rounded-lg overflow-hidden bg-gray-200 cursor-pointer';
      case 'coluna': return 'rounded-lg overflow-hidden bg-gray-200 cursor-pointer';
      case 'ladrilhos': return 'aspect-square overflow-hidden bg-gray-200 cursor-pointer';
      case 'slider': return 'min-w-[300px] md:min-w-[400px] flex-shrink-0 snap-center rounded-lg overflow-hidden bg-gray-200 cursor-pointer';
      default: return 'relative aspect-square rounded-lg overflow-hidden bg-gray-200 cursor-pointer'; // grade
    }
  };

  // Animação CSS
  const getAnimClass = () => {
    switch (tema.animacao) {
      case 'fade': return 'animate-fade-in';
      case 'slide': return 'animate-slide-up';
      case 'zoom': return 'animate-zoom-in';
      default: return '';
    }
  };

  const animClass = getAnimClass();

  return (
    <div className="min-h-screen" style={{ backgroundColor: cores.fundo, color: cores.texto, fontFamily: tema.fonte_corpo }}>
      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out both; }
        .animate-slide-up { animation: slideUp 0.5s ease-out both; }
        .animate-zoom-in { animation: zoomIn 0.4s ease-out both; }
      `}</style>

      {/* Banner de Preview */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center sticky top-0 z-20">
        <span className="inline-flex items-center gap-2 text-sm text-yellow-800 font-medium">
          <Eye size={14} /> Modo pré-visualização — é assim que o cliente verá o álbum
        </span>
      </div>

      {/* Capa */}
      {capaFoto && (
        <div className="relative w-full h-[40vh] md:h-[50vh] overflow-hidden">
          <img
            src={capaFoto.url || capaFoto.url_thumb || ''}
            alt="Capa"
            className="w-full h-full"
            style={{ objectFit: tema.capa_modo || 'cover' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg" style={{ fontFamily: tema.fonte_titulo }}>
              {album.titulo}
            </h1>
            <p className="text-sm md:text-base text-white/80 mt-1">{fotos.length} fotos</p>
          </div>
        </div>
      )}

      {/* Header (sem capa) */}
      {!capaFoto && (
        <div className="border-b" style={{ borderColor: `${cores.texto}15` }}>
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center gap-3">
              <Camera size={24} style={{ color: acento }} />
              <div>
                <h1 className="text-xl font-bold" style={{ fontFamily: tema.fonte_titulo }}>{album.titulo}</h1>
                <p className="text-sm opacity-60">{fotos.length} fotos</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de ações do cliente */}
      <div className="border-b" style={{ borderColor: `${cores.texto}10` }}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Info */}
            <div className="flex items-center gap-4 text-sm opacity-70">
              {album.permite_selecao && (
                <span className="flex items-center gap-1"><Heart size={14} style={{ color: acento }} /> Seleção de fotos habilitada</span>
              )}
              {album.permite_download && (
                <span className="flex items-center gap-1"><Download size={14} /> Download disponível</span>
              )}
              {album.permite_comentarios && (
                <span className="flex items-center gap-1"><MessageCircle size={14} /> Comentários habilitados</span>
              )}
            </div>

            {/* Botões visuais (desabilitados no preview) */}
            <div className="flex items-center gap-2">
              {album.permite_download && (
                <span className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm opacity-50 cursor-not-allowed" style={{ borderColor: `${cores.texto}20` }}>
                  <Download size={14} /> Baixar Todas
                </span>
              )}
            </div>
          </div>

          {/* Barra de seleção */}
          {album.permite_selecao && (
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${cores.texto}10` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm opacity-70">0 de {cota} selecionadas</span>
                <span className="px-4 py-1.5 text-white text-sm rounded-lg opacity-50 cursor-not-allowed" style={{ background: acento }}>
                  Confirmar Seleção
                </span>
              </div>
              <div className="w-full rounded-full h-2" style={{ background: `${cores.texto}15` }}>
                <div className="h-full rounded-full" style={{ width: '0%', background: acento }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid de fotos */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className={getGridClass()}>
          {fotos.map((foto, i) => (
            <div
              key={foto.id || i}
              className={`${getItemClass(i)} ${animClass}`}
              style={tema.animacao !== 'none' ? { animationDelay: `${i * 0.05}s` } : {}}
              onClick={() => setLightbox(i)}
            >
              <img
                src={foto.url_thumb || foto.url || ''}
                alt={foto.titulo || ''}
                className={`w-full ${tema.layout === 'grade' || tema.layout === 'ladrilhos' ? 'h-full object-cover' : 'object-cover'}`}
                loading="lazy"
              />
              {/* Overlay hover */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-end opacity-0 hover:opacity-100">
                <div className="p-2 w-full flex items-center justify-between">
                  {album.permite_selecao && (
                    <span className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center">
                      <Heart size={14} style={{ color: acento }} />
                    </span>
                  )}
                  <span className="text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">{i + 1}</span>
                </div>
              </div>
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
            {fotos[lightbox]?.titulo && <span className="ml-2">— {fotos[lightbox].titulo}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
