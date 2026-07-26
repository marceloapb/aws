import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, X, ChevronLeft, ChevronRight, Download, Share2, ArrowRight, ArrowLeft, ZoomIn } from 'lucide-react';

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
              className="w-full h-full object-cover"
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
      <div className="min-h-screen bg-[#1A1A1A] text-white">
        {/* Banner preview */}
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center">
          <span className="inline-flex items-center gap-2 text-sm text-yellow-800 font-medium">
            <Eye size={14} /> Pré-visualização — Seleção de galerias
          </span>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#1A1A1A]/95 backdrop-blur-sm border-b border-white/5">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => setView('cover')} className="p-2 -ml-2 text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base md:text-lg font-medium">{album.titulo}</h1>
            <div className="flex items-center gap-2">
              <Share2 size={18} className="text-white/40" />
            </div>
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

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white">
      {/* Banner preview */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center">
        <span className="inline-flex items-center gap-2 text-sm text-yellow-800 font-medium">
          <Eye size={14} /> Pré-visualização — {galeriaNome}
        </span>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#1A1A1A]/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => galeriasAtivas.length > 1 ? setView('sets') : setView('cover')}
            className="p-2 -ml-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-sm md:text-base font-medium">{galeriaNome}</h1>
            {album.titulo !== galeriaNome && (
              <p className="text-xs text-white/40">{album.titulo}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Share2 size={18} className="text-white/40" />
            {album.permite_download && <Download size={18} className="text-white/40" />}
          </div>
        </div>
      </header>

      {/* Photo Grid */}
      <main className="max-w-7xl mx-auto px-2 md:px-4 py-4">
        {/* Featured layout: first photo large + 2 side */}
        {fotosVisiveis.length > 0 && (
          <div className="mb-2 md:mb-3">
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {/* Main featured photo */}
              <div
                className="col-span-2 row-span-2 relative group cursor-pointer rounded-lg overflow-hidden"
                style={{ aspectRatio: '4/3' }}
                onClick={() => setLightbox(0)}
              >
                <img
                  src={fotosVisiveis[0]?.url || ''}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn size={32} className="text-white drop-shadow-lg" />
                </div>
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-orange-500 rounded-lg transition-colors pointer-events-none" />
              </div>

              {/* Side photos */}
              {fotosVisiveis.slice(1, 3).map((foto, i) => (
                <div
                  key={foto.id || i}
                  className="relative group cursor-pointer rounded-lg overflow-hidden"
                  style={{ aspectRatio: '1' }}
                  onClick={() => setLightbox(i + 1)}
                >
                  <img
                    src={foto.url || ''}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-orange-500 rounded-lg transition-colors pointer-events-none" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remaining photos grid */}
        {fotosVisiveis.length > 3 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {fotosVisiveis.slice(3).map((foto, i) => (
              <div
                key={foto.id || i}
                className="relative group cursor-pointer rounded-lg overflow-hidden aspect-square"
                onClick={() => setLightbox(i + 3)}
              >
                <img
                  src={foto.url || ''}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-orange-500 rounded-lg transition-colors pointer-events-none" />
              </div>
            ))}
          </div>
        )}

        {/* Infinite scroll loader */}
        {visibleCount < activeFotos.length && (
          <div ref={loaderRef} className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}

        {/* Photo count */}
        <div className="text-center py-6 text-white/30 text-sm">
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
