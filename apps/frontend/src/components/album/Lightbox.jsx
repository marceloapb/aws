import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Info, ZoomIn, ZoomOut } from 'lucide-react';

export default function Lightbox({ fotos = [], startIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const containerRef = useRef(null);

  const foto = fotos[currentIndex];
  const total = fotos.length;

  // Preload adjacent images
  useEffect(() => {
    const preload = (idx) => {
      if (idx >= 0 && idx < total) {
        const img = new window.Image();
        img.src = fotos[idx].url || fotos[idx].thumb_url;
      }
    };
    preload(currentIndex + 1);
    preload(currentIndex - 1);
  }, [currentIndex, fotos, total]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      switch (e.key) {
        case 'ArrowLeft': goTo(currentIndex - 1); break;
        case 'ArrowRight': goTo(currentIndex + 1); break;
        case 'Escape': onClose?.(); break;
        default: break;
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [currentIndex]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const goTo = useCallback((idx) => {
    if (idx >= 0 && idx < total) { setCurrentIndex(idx); setZoom(1); }
  }, [total]);

  const handleDoubleClick = () => {
    setZoom((z) => z === 1 ? 2 : 1);
  };

  // Touch swipe
  const handleTouchStart = (e) => { setTouchStart(e.touches[0].clientX); };
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 60) {
      if (diff > 0) goTo(currentIndex - 1);
      else goTo(currentIndex + 1);
    }
    setTouchStart(null);
  };

  // Click outside image to close
  const handleOverlayClick = (e) => {
    if (e.target === containerRef.current) onClose?.();
  };

  if (!foto) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90" onClick={handleOverlayClick} ref={containerRef}>
      {/* Close button */}
      <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all" aria-label="Fechar">
        <X size={20} />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-black/50 text-white text-sm font-medium">
        {currentIndex + 1} / {total}
      </div>

      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.5))} className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all" aria-label="Diminuir zoom"><ZoomOut size={16} /></button>
        <span className="text-white text-xs min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(4, z + 0.5))} className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all" aria-label="Aumentar zoom"><ZoomIn size={16} /></button>
        <button onClick={() => setShowInfo(!showInfo)} className={`p-2 rounded-full transition-all ${showInfo ? 'bg-white/20 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`} aria-label="Informações"><Info size={16} /></button>
      </div>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button onClick={(e) => { e.stopPropagation(); goTo(currentIndex - 1); }} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all" aria-label="Anterior">
          <ChevronLeft size={24} />
        </button>
      )}
      {currentIndex < total - 1 && (
        <button onClick={(e) => { e.stopPropagation(); goTo(currentIndex + 1); }} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all" aria-label="Próxima">
          <ChevronRight size={24} />
        </button>
      )}

      {/* Image */}
      <div
        className="flex items-center justify-center w-full h-full p-16"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        <img
          src={foto.url || foto.thumb_url}
          alt={foto.nome || `Foto ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
          style={{ transform: `scale(${zoom})` }}
          draggable={false}
        />
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-5 py-3 rounded-xl bg-black/70 backdrop-blur-sm text-white text-sm space-y-1 min-w-[250px]">
          <div className="flex justify-between"><span className="text-gray-300">Arquivo:</span><span>{foto.nome || '-'}</span></div>
          {foto.dimensoes && <div className="flex justify-between"><span className="text-gray-300">Dimensões:</span><span>{foto.dimensoes}</span></div>}
          {foto.tamanho && <div className="flex justify-between"><span className="text-gray-300">Tamanho:</span><span>{typeof foto.tamanho === 'number' ? `${(foto.tamanho / (1024 * 1024)).toFixed(1)} MB` : foto.tamanho}</span></div>}
        </div>
      )}
    </div>
  );
}
