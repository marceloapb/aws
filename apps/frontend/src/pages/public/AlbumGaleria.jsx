import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, ChevronLeft, ChevronRight, Share2, Download } from 'lucide-react';
import GalleryPhoto from '../../components/album/GalleryPhoto';

const API = process.env.REACT_APP_API_URL || '';
const PAGE_SIZE = 40;

export default function AlbumGaleria() {
  const { slug, galeriaId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef(null);

  useEffect(() => { loadGaleria(); }, [slug, galeriaId]);

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

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightbox === null) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowLeft') setLightbox(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setLightbox(i => Math.min(fotos.length - 1, i + 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightbox, fotos.length]);

  const loadGaleria = async () => {
    try {
      let url;
      if (galeriaId === 'all') {
        url = `${API}/public/album/${slug}/fotos`;
      } else {
        url = `${API}/public/album/${slug}/galeria/${galeriaId}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setFotos(json.data.fotos || []);
      }
    } catch {}
    setLoading(false);
  };

  const handleBack = () => {
    // Go back to sets page or album cover
    navigate(`/album/${slug}`);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: data?.galeria?.nome || data?.album_titulo, url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const handleDownload = async (foto) => {
    const url = foto?.url_original || foto?.url;
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = foto.filename || `foto-${foto.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  const [downloading, setDownloading] = useState(false);
  const handleDownloadAll = async () => {
    if (downloading || !fotos.length) return;
    setDownloading(true);
    try {
      for (let i = 0; i < fotos.length; i++) {
        await handleDownload(fotos[i]);
        // Small delay between downloads to avoid browser blocking
        if (i < fotos.length - 1) await new Promise(r => setTimeout(r, 500));
      }
    } catch {}
    setDownloading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || fotos.length === 0) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <p className="text-white/60 text-lg">Galeria não encontrada</p>
      </div>
    );
  }

  const galeriaNome = data.galeria?.nome || 'Galeria';
  const albumTitulo = data.album_titulo || '';
  const fotosVisiveis = fotos.slice(0, visibleCount);
  const tema = data.tema || {};

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#1A1A1A]/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="text-center">
            <h1 className="text-sm md:text-base font-medium text-white">{galeriaNome}</h1>
            {albumTitulo !== galeriaNome && (
              <p className="text-xs text-white/40">{albumTitulo}</p>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={handleShare} className="p-2 text-white/60 hover:text-white transition-colors">
              <Share2 size={18} />
            </button>
            {data.permite_download && (
              <button onClick={handleDownloadAll} disabled={downloading} className="p-2 text-white/60 hover:text-white transition-colors disabled:opacity-30" title="Baixar todas as fotos">
                {downloading ? <div className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={18} />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Photo Grid - Masonry style with featured first photo */}
      <main className="max-w-7xl mx-auto px-2 md:px-4 py-4">
        {/* Featured first photo (larger) + side thumbnails */}
        {fotosVisiveis.length > 0 && (
          <div className="mb-2 md:mb-3">
            <div className="grid grid-cols-3 gap-2 md:gap-3" style={{ gridTemplateRows: 'auto' }}>
              {/* Main featured photo - spans 2 cols and 2 rows */}
              <div
                className="col-span-2 row-span-2 relative cursor-pointer rounded-lg overflow-hidden"
                style={{ aspectRatio: '4/3' }}
                onClick={() => setLightbox(0)}
              >
                <GalleryPhoto
                  src={fotosVisiveis[0]?.url_thumb || fotosVisiveis[0]?.url}
                  id={fotosVisiveis[0]?.id || 'featured-0'}
                  index={0}
                  tema={tema}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>

              {/* Side photos */}
              {fotosVisiveis.slice(1, 3).map((foto, i) => (
                <div
                  key={foto.id}
                  className="relative cursor-pointer rounded-lg overflow-hidden"
                  style={{ aspectRatio: '1' }}
                  onClick={() => setLightbox(i + 1)}
                >
                  <GalleryPhoto
                    src={foto.url_thumb || foto.url}
                    id={foto.id || `side-${i}`}
                    index={i + 1}
                    tema={tema}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remaining photos in grid */}
        {fotosVisiveis.length > 3 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {fotosVisiveis.slice(3).map((foto, i) => (
              <div
                key={foto.id}
                className="relative cursor-pointer rounded-lg overflow-hidden aspect-square"
                onClick={() => setLightbox(i + 3)}
              >
                <GalleryPhoto
                  src={foto.url_thumb || foto.url}
                  id={foto.id || `grid-${i}`}
                  index={i + 3}
                  tema={tema}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Loader for infinite scroll */}
        {visibleCount < fotos.length && (
          <div ref={loaderRef} className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}

        {/* Photo count */}
        <div className="text-center py-6 text-white/30 text-sm">
          {fotos.length} fotos
        </div>
      </main>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          {/* Close */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full z-10 transition-colors"
          >
            <X size={24} />
          </button>

          {/* Nav prev */}
          {lightbox > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(i => Math.max(0, i - 1)); }}
              className="absolute left-2 md:left-4 text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft size={32} />
            </button>
          )}

          {/* Nav next */}
          {lightbox < fotos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(i => Math.min(fotos.length - 1, i + 1)); }}
              className="absolute right-2 md:right-4 text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronRight size={32} />
            </button>
          )}

          {/* Image */}
          <img
            src={fotos[lightbox]?.url || fotos[lightbox]?.url_thumb || ''}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* Bottom bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <span className="text-white/60 text-sm bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
              {lightbox + 1} / {fotos.length}
            </span>
            {data.permite_download && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(fotos[lightbox]); }}
                className="text-white/60 hover:text-white bg-black/60 p-2 rounded-full backdrop-blur-sm transition-colors"
              >
                <Download size={16} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
