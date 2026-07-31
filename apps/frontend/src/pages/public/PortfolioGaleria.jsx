import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '';

// Protected image component - prevents download/save
function ProtectedImg({ src, alt, className }) {
  return (
    <div className="relative select-none" style={{ WebkitTouchCallout: 'none' }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        draggable={false}
        onContextMenu={e => e.preventDefault()}
        onDragStart={e => e.preventDefault()}
        className={`${className} pointer-events-none`}
      />
      {/* Transparent overlay to block right-click save */}
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

  // Protection: block right-click, Ctrl+S, Ctrl+P, PrintScreen on this page
  useEffect(() => {
    const blockContext = (e) => e.preventDefault();
    const blockKeys = (e) => {
      if ((e.ctrlKey && (e.key === 's' || e.key === 'p' || e.key === 'u')) ||
          (e.ctrlKey && e.shiftKey && e.key === 'i') ||
          e.key === 'PrintScreen') {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', blockContext);
    document.addEventListener('keydown', blockKeys);
    return () => {
      document.removeEventListener('contextmenu', blockContext);
      document.removeEventListener('keydown', blockKeys);
    };
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-8 w-48 bg-stone-800 rounded animate-pulse mb-8" />
          <div className="columns-2 md:columns-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="mb-2 bg-stone-900 rounded-lg animate-pulse" style={{ height: `${180 + (i % 3) * 60}px` }} />
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
      {/* Anti-print CSS */}
      <style>{`
        @media print { .portfolio-protected { display: none !important; } }
        .portfolio-protected img { -webkit-user-drag: none; user-drag: none; }
      `}</style>

      <div className="portfolio-protected">
        {/* Header with back link */}
        <section className="py-12 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-2 text-stone-400 hover:text-[#EA580C] transition-colors mb-6 text-sm font-medium"
            >
              <ArrowLeft size={16} />
              Voltar ao Portfólio
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-50 mb-2">
              {categoria.nome}
            </h1>
            {categoria.texto && (
              <p className="text-stone-400 max-w-2xl">{categoria.texto}</p>
            )}
            <p className="text-stone-500 text-sm mt-2">
              {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'}
            </p>
          </div>
        </section>

        {/* Photo Grid - Masonry */}
        <section className="pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            {fotos.length === 0 ? (
              <p className="text-center text-stone-500 py-12">Nenhuma foto nesta galeria ainda.</p>
            ) : (
              <div className="columns-2 md:columns-3 gap-2">
                {fotos.map((foto, idx) => (
                  <button
                    key={foto.id || idx}
                    onClick={() => openLightbox(idx)}
                    className="group relative w-full mb-2 overflow-hidden rounded-lg bg-stone-900 block break-inside-avoid focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                    onContextMenu={e => e.preventDefault()}
                  >
                    <ProtectedImg
                      src={foto.url || foto.thumb_url}
                      alt={foto.titulo || ''}
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {foto.titulo && (
                      <span className="absolute bottom-3 left-3 right-3 text-sm text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity truncate">
                        {foto.titulo}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Lightbox */}
        {lightbox !== null && fotos[lightbox] && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95">
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-stone-800/80 flex items-center justify-center text-stone-300 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>

            {/* Prev */}
            {fotos.length > 1 && (
              <button
                onClick={prevPhoto}
                className="absolute left-4 z-10 w-10 h-10 rounded-full bg-stone-800/80 flex items-center justify-center text-stone-300 hover:text-white transition-colors"
                aria-label="Anterior"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Image */}
            <ProtectedImg
              src={fotos[lightbox].url_full || fotos[lightbox].url || fotos[lightbox].thumb_url}
              alt={fotos[lightbox].titulo || ''}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            />

            {/* Next */}
            {fotos.length > 1 && (
              <button
                onClick={nextPhoto}
                className="absolute right-4 z-10 w-10 h-10 rounded-full bg-stone-800/80 flex items-center justify-center text-stone-300 hover:text-white transition-colors"
                aria-label="Próximo"
              >
                <ChevronRight size={24} />
              </button>
            )}

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-stone-400 text-sm">
              {lightbox + 1} / {fotos.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
