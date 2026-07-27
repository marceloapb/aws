import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, X, ChevronLeft, ChevronRight, Download, ArrowRight, ArrowLeft } from 'lucide-react';
import { JustifiedGallery } from '../../utils/galleryLayouts/justifiedRows';
import { MasonryGallery } from '../../utils/galleryLayouts/masonry';
import { CollageGallery } from '../../utils/galleryLayouts/collageGroups';

const DEFAULTS_TEMA = {
  capa_foto_id: null,
  capa_modo: 'cover',
  cores: { fundo: '#1A1A1A', texto: '#FFFFFF', acento: '#EA580C' },
  layout: 'grade',
  fonte_titulo: 'Playfair Display',
  fonte_corpo: 'Inter',
};

const PAGE_SIZE = 40;

export default function AlbumPreview() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const [album, setAlbum] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [galerias, setGalerias] = useState([]);
  const [tema, setTema] = useState(DEFAULTS_TEMA);
  const [loading, setLoading] = useState(true);

  // View state: 'cover' | 'sets' | 'gallery'
  const [view, setView] = useState('cover');
  const [activeGaleriaId, setActiveGaleriaId] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef(null);
  const gridContainerRef = useRef(null);
  const [gridWidth, setGridWidth] = useState(0);

  useEffect(() => { loadData(); }, [id]);

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const currentFotos = getActiveFotos();
          if (visibleCount < currentFotos.length) {
            setVisibleCount(prev => Math.min(prev + PAGE_SIZE, currentFotos.length));
          }
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [visibleCount, fotos.length, activeGaleriaId]);

  // Measure grid container width
  useEffect(() => {
    if (!gridContainerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setGridWidth(entry.contentRect.width);
      }
    });
    ro.observe(gridContainerRef.current);
    setGridWidth(gridContainerRef.current.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightbox === null) return;
    const currentFotos = getActiveFotos();
    const handleKey = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowLeft') setLightbox(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setLightbox(i => Math.min(currentFotos.length - 1, i + 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightbox, fotos.length, activeGaleriaId]);

  const loadData = async () => {
    try {
      const [albumRes, temaRes, galeriasRes] = await Promise.all([
        authFetch(`/admin/albuns/${id}`),
        authFetch(`/admin/albuns/${id}/tema`),
        authFetch(`/admin/albuns/${id}/galerias`),
      ]);
      const albumJson = await albumRes.json();
      const temaJson = await temaRes.json();
      const galeriasJson = await galeriasRes.json();

      if (albumJson.success) {
        setAlbum(albumJson.data);
        setFotos(albumJson.data.fotos || []);
      }
      if (temaJson.success) {
        setTema({ ...DEFAULTS_TEMA, ...temaJson.data });
      }
      if (galeriasJson.success) {
        const gals = (galeriasJson.data || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
        setGalerias(gals);
      }
    } catch {}
    setLoading(false);
  };

  const getActiveFotos = useCallback(() => {
    if (activeGaleriaId && activeGaleriaId !== 'all') {
      return fotos.filter(f => f.galeria_id === activeGaleriaId);
    }
    return fotos;
  }, [fotos, activeGaleriaId]);

  const getGaleriasComFotos = useCallback(() => {
    return galerias.map(g => {
      const fotosGaleria = fotos.filter(f => f.galeria_id === g.id);
      return {
        ...g,
        total_fotos: fotosGaleria.length,
        thumbnail_url: fotosGaleria[0]?.url || null,
      };
    }).filter(g => g.total_fotos > 0);
  }, [galerias, fotos]);

  const handleVerFotos = () => {
    const galeriasAtivas = getGaleriasComFotos();
    if (galeriasAtivas.length <= 1) {
      // Galeria única — vai direto para fotos
      setActiveGaleriaId(galeriasAtivas.length === 1 ? galeriasAtivas[0].id : 'all');
      setView('gallery');
    } else {
      setView('sets');
    }
    setVisibleCount(PAGE_SIZE);
  };

  const handleSelectGaleria = (galeriaId) => {
    setActiveGaleriaId(galeriaId);
    setView('gallery');
    setVisibleCount(PAGE_SIZE);
    setLightbox(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white/60">
        Álbum não encontrado
      </div>
    );
  }

  const cores = tema.cores || DEFAULTS_TEMA.cores;
  const acento = cores.acento || '#EA580C';
  const fonteTitulo = tema.fonte_titulo || 'Playfair Display';

  // Foto de capa
  const capaFoto = tema.capa_foto_id
    ? fotos.find(f => f.id === tema.capa_foto_id || f.SK?.replace('FOTO#', '') === tema.capa_foto_id)
    : fotos[0];

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!d) return dateStr;
    return `${d}/${m}/${y}`;
  };

  // ═══════════════════════════════════════════════════════════
  // VIEW: COVER (Capa full-screen estilo Wix)
  // ═══════════════════════════════════════════════════════════
  if (view === 'cover') {
    return (
      <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: cores.fundo }}>
        {/* Banner de preview */}
        <div className="absolute top-0 left-0 right-0 z-30 bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center">
          <span className="inline-flex items-center gap-2 text-sm text-yellow-800 font-medium">
            <Eye size={14} /> Pré-visualização — é assim que o cliente verá o álbum
          </span>
        </div>

        {/* Background cover image */}
        {capaFoto && (
          <div className="absolute inset-0">
            <img
              src={capaFoto.url || capaFoto.url_full || ''}
              alt=""
              className="w-full h-full"
              style={{ objectFit: tema.capa_modo || 'cover' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 min-h-screen flex flex-col justify-between p-6 md:p-12 pt-16">
          {/* Top - Brand */}
          <div>
            <p className="text-white/60 text-xs md:text-sm tracking-widest uppercase font-medium">
              Marcelo Bloise Fotografia
            </p>
          </div>

          {/* Bottom */}
          <div className="flex items-end justify-between flex-wrap gap-6">
            <div className="max-w-lg">
              <h1
                className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight"
                style={{ fontFamily: fonteTitulo, color: acento }}
              >
                {album.titulo}
              </h1>
              {album.data_evento && (
                <p className="mt-3 text-lg md:text-xl" style={{ color: acento, opacity: 0.8 }}>
                  {formatDate(album.data_evento)}
                </p>
              )}
            </div>

            <button
              onClick={handleVerFotos}
              className="group flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm md:text-base"
            >
              <span>Ver fotos</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // VIEW: SETS (Seleção de galerias)
  // ═══════════════════════════════════════════════════════════
  if (view === 'sets') {
    const galeriasAtivas = getGaleriasComFotos();

    return (
      <div className="min-h-screen" style={{ backgroundColor: cores.fundo, color: cores.texto }}>
        {/* Banner preview */}
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center">
          <span className="inline-flex items-center gap-2 text-sm text-yellow-800 font-medium">
            <Eye size={14} /> Pré-visualização — Seleção de galerias
          </span>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-20 backdrop-blur-sm border-b" style={{ backgroundColor: `${cores.fundo}ee`, borderColor: `${cores.texto}10` }}>
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => setView('cover')} className="p-2 -ml-2 opacity-60 hover:opacity-100 transition-opacity">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base md:text-lg font-medium" style={{ fontFamily: tema.fonte_titulo || 'Playfair Display' }}>{album.titulo}</h1>
            <div className="w-8" />
          </div>
        </header>

        {/* Gallery cards */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className={`grid gap-6 ${galeriasAtivas.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {galeriasAtivas.map((galeria) => (
              <button
                key={galeria.id}
                onClick={() => handleSelectGaleria(galeria.id)}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-800 text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                {galeria.thumbnail_url ? (
                  <img
                    src={galeria.thumbnail_url}
                    alt={galeria.nome}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-xl md:text-2xl font-semibold drop-shadow-lg px-4 text-center"
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                    {galeria.nome}
                  </span>
                </div>
                <div className="absolute bottom-3 right-3">
                  <span className="text-xs bg-black/50 text-white/80 px-2 py-1 rounded-full backdrop-blur-sm">
                    {galeria.total_fotos} fotos
                  </span>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // VIEW: GALLERY (Grid de fotos)
  // ═══════════════════════════════════════════════════════════
  const activeFotos = getActiveFotos();
  const fotosVisiveis = activeFotos.slice(0, visibleCount);
  const activeGaleria = galerias.find(g => g.id === activeGaleriaId);
  const galeriaNome = activeGaleria?.nome || 'Galeria';
  const galeriasAtivas = getGaleriasComFotos();

  // Layout do tema
  const layout = tema.layout || 'grade';

  // Animação
  const animStyle = (i) => {
    if (tema.animacao === 'none' || !tema.animacao) return {};
    return { animationDelay: `${i * 0.06}s` };
  };

  const animClass = (() => {
    switch (tema.animacao) {
      case 'fade': return 'animate-[fadeIn_0.5s_ease-out_both]';
      case 'slide': return 'animate-[slideUp_0.5s_ease-out_both]';
      case 'zoom': return 'animate-[zoomIn_0.4s_ease-out_both]';
      default: return '';
    }
  })();

  return (
    <div className="min-h-screen" style={{ backgroundColor: cores.fundo, color: cores.texto, fontFamily: tema.fonte_corpo || 'Inter' }}>
      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Banner preview */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center">
        <span className="inline-flex items-center gap-2 text-sm text-yellow-800 font-medium">
          <Eye size={14} /> Pré-visualização — {galeriaNome}
        </span>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-sm border-b" style={{ backgroundColor: `${cores.fundo}ee`, borderColor: `${cores.texto}10` }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => galeriasAtivas.length > 1 ? setView('sets') : setView('cover')}
            className="p-2 -ml-2 opacity-60 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-sm md:text-base font-medium" style={{ fontFamily: tema.fonte_titulo || 'Playfair Display' }}>{galeriaNome}</h1>
            {album.titulo !== galeriaNome && (
              <p className="text-xs opacity-40">{album.titulo}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {album.permite_download && <Download size={18} className="opacity-40" />}
          </div>
        </div>
      </header>

      {/* Photo Grid */}
      <main ref={gridContainerRef} className="max-w-7xl mx-auto px-2 md:px-4 py-4">
        {gridWidth > 0 && (
          <GalleryGrid
            layout={layout}
            fotos={fotosVisiveis}
            containerWidth={gridWidth}
            onPhotoClick={(i) => setLightbox(i)}
            tema={tema}
          />
        )}

        {/* Infinite scroll loader */}
        {visibleCount < activeFotos.length && (
          <div ref={loaderRef} className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-t-current rounded-full animate-spin opacity-30" />
          </div>
        )}

        {/* Photo count */}
        <div className="text-center py-6 text-sm opacity-30">
          {activeFotos.length} fotos
        </div>
      </main>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full z-10 transition-colors"
          >
            <X size={24} />
          </button>

          {lightbox > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(i => Math.max(0, i - 1)); }}
              className="absolute left-2 md:left-4 text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft size={32} />
            </button>
          )}

          {lightbox < activeFotos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(i => Math.min(activeFotos.length - 1, i + 1)); }}
              className="absolute right-2 md:right-4 text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronRight size={32} />
            </button>
          )}

          <img
            src={activeFotos[lightbox]?.url_full || activeFotos[lightbox]?.url || ''}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <span className="text-white/60 text-sm bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
              {lightbox + 1} / {activeFotos.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// Componente interno que escolhe o layout correto
// ═══════════════════════════════════════════════════════════
function GalleryGrid({ layout, fotos, containerWidth, onPhotoClick, tema }) {
  // Preparar array de photos no formato esperado pelos layouts
  const photos = fotos.map(f => ({
    id: f.id || f.SK?.replace('FOTO#', ''),
    url: f.url || '',
    width: f.width || 1600,
    height: f.height || 1200,
  }));

  if (photos.length === 0) return null;

  // Mosaico → Masonry (colunas, foto inteira sem corte)
  if (layout === 'mosaico') {
    return (
      <MasonryGallery
        photos={photos}
        containerWidth={containerWidth}
        options={{ columnCount: 3, gapX: 8, gapY: 8, placement: 'shortestColumn', crop: false }}
        onPhotoClick={onPhotoClick}
      />
    );
  }

  // Colagem → Colagem por Grupos (estilo Wix)
  if (layout === 'colagem') {
    return (
      <CollageGallery
        photos={photos}
        containerWidth={containerWidth}
        options={{ targetCellRatio: 1.33, targetRowHeight: 260, gapX: 8, gapY: 8, gapInner: 4 }}
        onPhotoClick={onPhotoClick}
      />
    );
  }

  // Grade → Linhas Justificadas
  if (layout === 'grade' || layout === 'ladrilhos') {
    return (
      <JustifiedGallery
        photos={photos}
        containerWidth={containerWidth}
        options={{ targetRowHeight: layout === 'ladrilhos' ? 180 : 240, gapX: 8, gapY: 8 }}
        onPhotoClick={onPhotoClick}
      />
    );
  }

  // Slider — mantém implementação simples com flex
  if (layout === 'slider') {
    return (
      <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory pb-4" style={{ scrollbarWidth: 'none' }}>
        {fotos.map((foto, i) => (
          <div
            key={foto.id || i}
            className="min-w-[70vw] md:min-w-[45vw] lg:min-w-[30vw] flex-shrink-0 snap-center rounded-lg overflow-hidden cursor-pointer"
            onClick={() => onPhotoClick(i)}
          >
            <img src={foto.url || ''} alt="" className="w-full h-[60vh] object-cover" loading="lazy" decoding="async" />
          </div>
        ))}
      </div>
    );
  }

  // Coluna — grid simples
  if (layout === 'coluna') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fotos.map((foto, i) => (
          <div key={foto.id || i} className="rounded-lg overflow-hidden cursor-pointer" onClick={() => onPhotoClick(i)}>
            <img src={foto.url || ''} alt="" className="w-full max-h-[500px] object-cover" loading="lazy" decoding="async" />
          </div>
        ))}
      </div>
    );
  }

  // Fallback: Linhas Justificadas
  return (
    <JustifiedGallery
      photos={photos}
      containerWidth={containerWidth}
      options={{ targetRowHeight: 240, gapX: 8, gapY: 8 }}
      onPhotoClick={onPhotoClick}
    />
  );
}
