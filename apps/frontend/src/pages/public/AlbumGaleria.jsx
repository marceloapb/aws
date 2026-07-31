import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, ChevronLeft, ChevronRight, Share2, Download } from 'lucide-react';
import GalleryPhoto from '../../components/album/GalleryPhoto';
import { JustifiedGallery } from '../../utils/galleryLayouts/justifiedRows';
import { MasonryGallery } from '../../utils/galleryLayouts/masonry';
import { CollageGallery } from '../../utils/galleryLayouts/collageGroups';
import JSZip from 'jszip';

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
  const gridContainerRef = useRef(null);
  const [gridWidth, setGridWidth] = useState(0);

  useEffect(() => { loadGaleria(); }, [slug, galeriaId]);

  // Measure grid container width
  useEffect(() => {
    if (!gridContainerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setGridWidth(entry.contentRect.width);
    });
    ro.observe(gridContainerRef.current);
    setGridWidth(gridContainerRef.current.clientWidth);
    return () => ro.disconnect();
  }, [data]);

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
  const [downloadProgress, setDownloadProgress] = useState('');
  const handleDownloadAll = async () => {
    if (downloading || !fotos.length) return;
    setDownloading(true);
    setDownloadProgress('Preparando...');
    try {
      const zip = new JSZip();
      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i];
        const url = foto.url_original || foto.url;
        if (!url) continue;
        setDownloadProgress(`${i + 1}/${fotos.length}`);
        const response = await fetch(url);
        const blob = await response.blob();
        const ext = foto.content_type?.includes('png') ? 'png' : foto.content_type?.includes('webp') ? 'webp' : 'jpg';
        const filename = foto.filename || `foto-${String(i + 1).padStart(3, '0')}.${ext}`;
        zip.file(filename, blob);
      }
      setDownloadProgress('ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${data.album_titulo || 'album'}-fotos.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download ZIP error:', err);
    }
    setDownloading(false);
    setDownloadProgress('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || fotos.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white/60 text-lg">Galeria não encontrada</p>
      </div>
    );
  }

  const galeriaNome = data.galeria?.nome || 'Galeria';
  const albumTitulo = data.album_titulo || '';
  const fotosVisiveis = fotos.slice(0, visibleCount);
  const tema = data.tema || {};
  const cores = tema.cores || { fundo: '#1A1A1A', texto: '#FFFFFF' };
  const coresGalerias = tema.cores_galerias || {};
  const bgColor = coresGalerias.background || cores.fundo || '#1A1A1A';
  const textColor = coresGalerias.texto_icones || cores.texto || '#FFFFFF';

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor, fontFamily: tema.fonte_corpo || 'Inter' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-sm border-b" style={{ backgroundColor: `${bgColor}ee`, borderColor: `${textColor}10` }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between relative">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 opacity-60 hover:opacity-100 transition-opacity z-10"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-semibold" style={{ fontFamily: tema.fonte_titulo || 'Playfair Display' }}>{galeriaNome}</h1>
              {albumTitulo !== galeriaNome && (
                <p className="text-base opacity-50">{albumTitulo}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 z-10">
            <button onClick={handleShare} className="flex items-center gap-1 text-sm opacity-60 hover:opacity-100 transition-opacity">
              <Share2 size={16} />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>
            {data.permite_download && (
              <button onClick={handleDownloadAll} disabled={downloading} className="flex items-center gap-1 text-sm opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30">
                {downloading ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <Download size={16} />}
                <span className="hidden sm:inline">{downloading ? downloadProgress : 'Download'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Photo Grid — uses tema.layout */}
      <main ref={gridContainerRef} className="max-w-7xl mx-auto px-2 md:px-4 py-4">
        <PublicGalleryGrid
          layout={tema.layout || 'grade'}
          fotos={fotosVisiveis}
          containerWidth={gridWidth || (typeof window !== 'undefined' ? Math.min(window.innerWidth - 48, 1280) : 1200)}
          onPhotoClick={(i) => setLightbox(i)}
          tema={tema}
        />

        {/* Loader for infinite scroll */}
        {visibleCount < fotos.length && (
          <div ref={loaderRef} className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-current/20 border-t-current/60 rounded-full animate-spin opacity-40" />
          </div>
        )}

        {/* Photo count */}
        <div className="text-center py-6 text-sm opacity-30">
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


// ═══════════════════════════════════════════════════════════
// Componente que escolhe o layout correto (igual ao AlbumPreview)
// ═══════════════════════════════════════════════════════════
function PublicGalleryGrid({ layout, fotos, containerWidth, onPhotoClick, tema }) {
  const gap = tema?.espacamento || 8;
  const photos = fotos.map(f => ({
    id: f.id || f.SK?.replace('FOTO#', ''),
    url: f.url_thumb || f.url || '',
    width: f.width || 1600,
    height: f.height || 1200,
  }));

  if (photos.length === 0) return null;

  const renderItem = ({ photo, item, index, style }) => (
    <GalleryPhoto
      key={item.id}
      src={photo?.url || ''}
      id={item.id}
      index={index}
      tema={tema}
      style={style}
      onClick={() => onPhotoClick && onPhotoClick(index)}
    />
  );

  if (layout === 'mosaico') {
    return <MasonryGallery photos={photos} containerWidth={containerWidth} options={{ columnCount: 3, gapX: gap, gapY: gap, placement: 'shortestColumn', crop: false }} onPhotoClick={onPhotoClick} renderItem={renderItem} />;
  }
  if (layout === 'colagem') {
    return <CollageGallery photos={photos} containerWidth={containerWidth} options={{ targetCellRatio: 1.33, targetRowHeight: 260, gapX: gap, gapY: gap, gapInner: Math.max(2, gap / 2) }} onPhotoClick={onPhotoClick} renderItem={renderItem} />;
  }
  if (layout === 'grade' || layout === 'ladrilhos') {
    return <JustifiedGallery photos={photos} containerWidth={containerWidth} options={{ targetRowHeight: layout === 'ladrilhos' ? 180 : 240, gapX: gap, gapY: gap }} onPhotoClick={onPhotoClick} renderItem={renderItem} />;
  }
  if (layout === 'slider') {
    return (
      <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory pb-4" style={{ scrollbarWidth: 'none' }}>
        {fotos.map((foto, i) => (
          <div key={foto.id || i} className="min-w-[70vw] md:min-w-[45vw] lg:min-w-[30vw] flex-shrink-0 snap-center rounded-lg overflow-hidden cursor-pointer" onClick={() => onPhotoClick(i)}>
            <GalleryPhoto src={foto.url_thumb || foto.url || ''} id={foto.id || `slider-${i}`} index={i} tema={tema} style={{ width: '100%', height: '60vh' }} />
          </div>
        ))}
      </div>
    );
  }
  if (layout === 'coluna') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fotos.map((foto, i) => (
          <div key={foto.id || i} className="rounded-lg overflow-hidden cursor-pointer" onClick={() => onPhotoClick(i)}>
            <GalleryPhoto src={foto.url_thumb || foto.url || ''} id={foto.id || `col-${i}`} index={i} tema={tema} style={{ width: '100%', maxHeight: '500px' }} />
          </div>
        ))}
      </div>
    );
  }
  // Fallback
  return <JustifiedGallery photos={photos} containerWidth={containerWidth} options={{ targetRowHeight: 240, gapX: gap, gapY: gap }} onPhotoClick={onPhotoClick} renderItem={renderItem} />;
}
