import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const PAGE_SIZE = 40;

export default function AlbumPreview() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const [album, setAlbum] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [tema, setTema] = useState(DEFAULTS_TEMA);
  const [lightbox, setLightbox] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef(null);

  useEffect(() => { loadData(); }, [id]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < fotos.length) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, fotos.length));
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [visibleCount, fotos.length]);

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

  const openLightbox = useCallback((i) => setLightbox(i), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const prevPhoto = useCallback(() => setLightbox(i => Math.max(0, i - 1)), []);
  const nextPhoto = useCallback(() => setLightbox(i => Math.min(fotos.length - 1, i + 1)), [fotos.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightbox === null) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightbox, closeLightbox, prevPhoto, nextPhoto]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Carregando pré-visualização...</div>;
  if (!album) return <div className="flex items-center justify-center min-h-screen text-gray-400">Álbum não encontrado</div>;

  const cores = tema.cores || DEFAULTS_TEMA.cores;
  const acento = cores.acento || '#EA580C';
  const cota = album.cota_selecao || fotos.length;
  const fotosVisiveis = fotos.slice(0, visibleCount);

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
      default: return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3';
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: cores.fundo, color: cores.texto, fontFamily: tema.fonte_corpo }}>
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
            src={capaFoto.url || ''}
            alt="Capa"
            className="w-full h-full"
            style={{ objectFit: tema.capa_modo || 'cover' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 pointer-events-none">
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
            <div className="flex items-center gap-2">
              {album.permite_download && (
                <span className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm opacity-50 cursor-not-allowed" style={{ borderColor: `${cores.texto}20` }}>
                  <Download size={14} /> Baixar Todas
                </span>
              )}
            </div>
          </div>

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
          {fotosVisiveis.map((foto, i) => (
            <FotoItem
              key={foto.id || i}
              foto={foto}
              index={i}
              layout={tema.layout}
              acento={acento}
              permiteSelecao={album.permite_selecao}
              onOpen={openLightbox}
            />
          ))}
        </div>

        {/* Loader para infinite scroll */}
        {visibleCount < fotos.length && (
          <div ref={loaderRef} className="flex justify-center py-8">
            <p className="text-sm opacity-50">Carregando mais fotos... ({visibleCount} de {fotos.length})</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center" onClick={closeLightbox}>
          <button onClick={(e) => { e.stopPropagation(); closeLightbox(); }} className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full z-10">
            <X size={24} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }} className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-full">
            <ChevronLeft size={28} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }} className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-full">
            <ChevronRight size={28} />
          </button>
          <img
            src={fotos[lightbox]?.url_full || fotos[lightbox]?.url || ''}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full pointer-events-none">
            {lightbox + 1} / {fotos.length}
            {fotos[lightbox]?.titulo && <span className="ml-2">— {fotos[lightbox].titulo}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente separado para cada foto — evita re-render do grid inteiro
const FotoItem = React.memo(function FotoItem({ foto, index, layout, acento, permiteSelecao, onOpen }) {
  const getItemClass = () => {
    switch (layout) {
      case 'mosaico': return 'break-inside-avoid rounded-lg overflow-hidden bg-gray-200 mb-3';
      case 'colagem': return 'break-inside-avoid rounded-lg overflow-hidden bg-gray-200 mb-2';
      case 'coluna': return 'rounded-lg overflow-hidden bg-gray-200';
      case 'ladrilhos': return 'aspect-square overflow-hidden bg-gray-200';
      case 'slider': return 'min-w-[300px] md:min-w-[400px] flex-shrink-0 snap-center rounded-lg overflow-hidden bg-gray-200';
      default: return 'aspect-square rounded-lg overflow-hidden bg-gray-200';
    }
  };

  return (
    <div className={`relative group ${getItemClass()}`}>
      <img
        src={foto.url || ''}
        alt={foto.titulo || ''}
        className={`w-full cursor-pointer ${layout === 'grade' || layout === 'ladrilhos' ? 'h-full object-cover' : 'object-cover'}`}
        loading="lazy"
        decoding="async"
        onClick={() => onOpen(index)}
        style={{ maxHeight: layout === 'coluna' ? '400px' : undefined }}
      />
      {/* Número da foto */}
      <span className="absolute bottom-1 right-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        {index + 1}
      </span>
      {/* Ícone seleção */}
      {permiteSelecao && (
        <span className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/70 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <Heart size={12} style={{ color: acento }} />
        </span>
      )}
    </div>
  );
});
