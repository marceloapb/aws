import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '';
const PAGE_SIZE = 20;

// Protected image component - prevents download/save
function ProtectedImg({ src, alt, className, style }) {
  return (
    <div className="relative select-none h-full" style={{ WebkitTouchCallout: 'none' }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        draggable={false}
        onContextMenu={e => e.preventDefault()}
        onDragStart={e => e.preventDefault()}
        className={`${className} pointer-events-none`}
        style={style}
      />
      <div
        className="absolute inset-0 z-10"
        onContextMenu={e => e.preventDefault()}
        onDragStart={e => e.preventDefault()}
      />
    </div>
  );
}

export default function PortfolioGaleria() {
  const { categoriaId } = useParams();
  const [categoria, setCategoria] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef(null);

  // Protection: block right-click, Ctrl+S, Ctrl+P, PrintScreen
  useEffect(() => {
    const blockContext = (e) => e.preventDefault();
    const blockKeys = (e) => {
      if ((e.ctrlKey && (e.key === 's' || e.key === 'p' || e.key === 'u')) ||
          (e.ctrlKey && e.shiftKey && (e.key === 'i' || e.key === 'I' || e.key === 'j' || e.key === 'J' || e.key === 'c' || e.key === 'C')) ||
          e.key === 'PrintScreen' || e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    const blockDrag = (e) => e.preventDefault();
    const blockCopy = (e) => e.preventDefault();

    document.addEventListener('contextmenu', blockContext);
    document.addEventListener('keydown', blockKeys);
    document.addEventListener('dragstart', blockDrag);
    document.addEventListener('copy', blockCopy);

    return () => {
      document.removeEventListener('contextmenu', blockContext);
      document.removeEventListener('keydown', blockKeys);
      document.removeEventListener('dragstart', blockDrag);
      document.removeEventListener('copy', blockCopy);
    };
  }, []);

  // Infinite scroll
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

  useEffect(() => {
    fetch(`${API}/public/portfolio`)
      .then(r => r.json())
      .then(data => {
        const portfolio = data.data || data;
        if (portfolio?.categorias) {
          const cat = portfolio.categorias.find(c => c.id === categoriaId);
          if (cat) {
            setCategoria(cat);
            setFotos(cat.fotos || []);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [categoriaId]);

  const openLightbox = (idx) => setLightbox(idx);
  const closeLightbox = () => setLightbox(null);

  const prevPhoto = useCallback(() => {
    setLightbox(prev => (prev - 1 + fotos.length) % fotos.length);
  }, [fotos.length]);

  const nextPhoto = useCallback(() => {
    setLightbox(prev => (prev + 1) % fotos.length);
  }, [fotos.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightbox === null) return;
    const handler = (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [lightbox, prevPhoto, nextPhoto]);

  // Prevent body scroll when lightbox open
  useEffect(() => {
    if (lightbox !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightbox]);

  // Calculate visible photos for infinite scroll
  const fotosVisiveis = fotos.slice(0, visibleCount);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-8 w-48 bg-stone-800 rounded animate-pulse mb-8" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-1.5">
                {Array.from({ length: 3 + (i % 2) }).map((_, j) => (
                  <div key={j} className="bg-stone-900 rounded animate-pulse" style={{ height: '200px', flex: `${1 + (j % 2) * 0.5}` }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!categoria) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-400 text-lg mb-4">Galeria não encontrada.</p>
          <Link to="/portfolio" className="text-[#EA580C] hover:underline font-medium">
            &larr; Voltar ao Portfólio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950" style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>
      {/* Anti-print/screenshot CSS */}
      <style>{`
        @media print { 
          .portfolio-protected { display: none !important; }
          body { display: none !important; }
        }
        .portfolio-protected img { 
          -webkit-user-drag: none; 
          user-drag: none;
          -webkit-touch-callout: none;
          pointer-events: none;
        }
        .portfolio-protected {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        .photo-item {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .photo-item:hover {
          transform: scale(1.02);
          box-shadow: 0 8px 30px rgba(234, 88, 12, 0.15);
          z-index: 5;
        }
      `}</style>

      <div className="portfolio-protected">
        {/* Header with back link */}
        <section className="py-10 sm:py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-2 text-stone-400 hover:text-[#EA580C] transition-colors mb-5 text-sm font-medium"
            >
              <ArrowLeft size={16} />
              Voltar ao Portfólio
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-50 mb-1">
              {categoria.nome}
            </h1>
            {categoria.texto && (
              <p className="text-stone-400 max-w-2xl text-sm">{categoria.texto}</p>
            )}
            <p className="text-stone-600 text-xs mt-2">{fotos.length} fotos</p>
          </div>
        </section>

        {/* Photo Grid - Masonry (Mosaico) with Infinite Scroll */}
        <section className="pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {fotos.length === 0 ? (
              <p className="text-center text-stone-500 py-12">Nenhuma foto nesta galeria ainda.</p>
            ) : (
              <div className="columns-2 md:columns-3 gap-2">
                {fotosVisiveis.map((photo, idx) => (
                  <button
                    key={photo.id || idx}
                    onClick={() => openLightbox(idx)}
                    className="photo-item relative w-full mb-2 overflow-hidden bg-stone-900 block break-inside-avoid focus:outline-none"
                    style={{ border: '3px solid #EA580C', borderRadius: '10px' }}
                    onContextMenu={e => e.preventDefault()}
                  >
                    <ProtectedImg
                      src={photo.url || photo.thumb_url}
                      alt={photo.titulo || ''}
                      className="w-full h-auto object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                    {photo.titulo && (
                      <span className="absolute bottom-3 left-3 right-3 text-sm text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity truncate">
                        {photo.titulo}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Infinite scroll trigger */}
            {visibleCount < fotos.length && (
              <div ref={loaderRef} className="flex justify-center py-10">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-[#EA580C]/30 border-t-[#EA580C] rounded-full animate-spin" />
                  <span className="text-stone-500 text-sm">Carregando mais fotos...</span>
                </div>
              </div>
            )}

            {/* Photo count at bottom */}
            {visibleCount >= fotos.length && fotos.length > 0 && (
              <div className="text-center py-8">
                <span className="text-stone-600 text-xs">{fotos.length} fotos</span>
              </div>
            )}
          </div>
        </section>

        {/* Lightbox */}
        {lightbox !== null && fotos[lightbox] && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95">
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-stone-800/80 flex items-center justify-center text-stone-300 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>

            {fotos.length > 1 && (
              <button
                onClick={prevPhoto}
                className="absolute left-4 z-10 w-10 h-10 rounded-full bg-stone-800/80 flex items-center justify-center text-stone-300 hover:text-white transition-colors"
                aria-label="Anterior"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <ProtectedImg
              src={fotos[lightbox].url_full || fotos[lightbox].url || fotos[lightbox].thumb_url}
              alt={fotos[lightbox].titulo || ''}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            />

            {fotos.length > 1 && (
              <button
                onClick={nextPhoto}
                className="absolute right-4 z-10 w-10 h-10 rounded-full bg-stone-800/80 flex items-center justify-center text-stone-300 hover:text-white transition-colors"
                aria-label="Próximo"
              >
                <ChevronRight size={24} />
              </button>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-stone-400 text-sm bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
              {lightbox + 1} / {fotos.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
