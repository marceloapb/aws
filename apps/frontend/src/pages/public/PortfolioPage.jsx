import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

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

export default function PortfolioPage() {
  const [categorias, setCategorias] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [selected, setSelected] = useState('todas');
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null); // index of active photo

  // Protection: block right-click, Ctrl+S, Ctrl+P, PrintScreen on this page
  useEffect(() => {
    const blockContext = (e) => e.preventDefault();
    const blockKeys = (e) => {
      // Block Ctrl+S (save), Ctrl+P (print), Ctrl+Shift+I (devtools), PrintScreen
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
          setCategorias(portfolio.categorias.map(c => c.nome));
          const allFotos = portfolio.categorias.flatMap(c =>
            (c.fotos || []).map(f => ({ ...f, categoria: c.nome }))
          );
          setFotos(allFotos);
        } else if (portfolio?.fotos) {
          setFotos(portfolio.fotos);
          const cats = [...new Set(portfolio.fotos.map(f => f.categoria).filter(Boolean))];
          setCategorias(cats);
        } else if (Array.isArray(portfolio)) {
          setFotos(portfolio);
          const cats = [...new Set(portfolio.map(f => f.categoria).filter(Boolean))];
          setCategorias(cats);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredFotos = selected === 'todas'
    ? fotos
    : fotos.filter(f => f.categoria === selected);

  const openLightbox = (idx) => setLightbox(idx);
  const closeLightbox = () => setLightbox(null);

  const prevPhoto = useCallback(() => {
    setLightbox(prev => (prev - 1 + filteredFotos.length) % filteredFotos.length);
  }, [filteredFotos.length]);

  const nextPhoto = useCallback(() => {
    setLightbox(prev => (prev + 1) % filteredFotos.length);
  }, [filteredFotos.length]);

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

  return (
    <div className="min-h-screen" style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>
      {/* Anti-print/screenshot CSS */}
      <style>{`
        @media print { .portfolio-protected { display: none !important; } }
        .portfolio-protected img { -webkit-user-drag: none; user-drag: none; }
      `}</style>
      <div className="portfolio-protected">
      {/* Header */}
      <section className="py-16 sm:py-20 bg-stone-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-50 text-center mb-4">
            Portfólio
          </h1>
          <p className="text-stone-400 text-center max-w-2xl mx-auto">
            Conheça nosso trabalho. Cada foto é uma história contada com luz e emoção.
          </p>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="sticky top-16 z-30 bg-stone-950/90 backdrop-blur-md border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelected('todas')}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selected === 'todas'
                  ? 'bg-[#EA580C] text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-700'
              }`}
            >
              Todas
            </button>
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => setSelected(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selected === cat
                    ? 'bg-[#EA580C] text-white'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Photo Grid - Masonry 2 columns */}
      <section className="py-6 bg-stone-950">
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          {loading ? (
            <div className="columns-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="mb-2 bg-stone-900 animate-pulse" style={{ height: i % 2 === 0 ? '200px' : '260px' }} />
              ))}
            </div>
          ) : filteredFotos.length === 0 ? (
            <p className="text-center text-stone-500 py-12">Nenhuma foto encontrada.</p>
          ) : (
            <div className="columns-2 gap-2">
              {filteredFotos.map((foto, idx) => (
                <button
                  key={foto.id || idx}
                  onClick={() => openLightbox(idx)}
                  className="group relative w-full mb-2 overflow-hidden bg-stone-900 block break-inside-avoid focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  onContextMenu={e => e.preventDefault()}
                >
                  <ProtectedImg
                    src={foto.url || foto.thumb_url}
                    alt={foto.titulo || foto.alt || ''}
                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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
      {lightbox !== null && filteredFotos[lightbox] && (
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
          {filteredFotos.length > 1 && (
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
            src={filteredFotos[lightbox].url_full || filteredFotos[lightbox].url || filteredFotos[lightbox].thumb_url}
            alt={filteredFotos[lightbox].titulo || ''}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
          />

          {/* Next */}
          {filteredFotos.length > 1 && (
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
            {lightbox + 1} / {filteredFotos.length}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
