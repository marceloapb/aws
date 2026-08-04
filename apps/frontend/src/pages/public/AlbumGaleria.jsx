import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, ChevronLeft, ChevronRight, Share2, Download, Heart } from 'lucide-react';
import GalleryPhoto from '../../components/album/GalleryPhoto';
import { JustifiedGallery } from '../../utils/galleryLayouts/justifiedRows';
import { MasonryGallery } from '../../utils/galleryLayouts/masonry';
import { CollageGallery } from '../../utils/galleryLayouts/collageGroups';
import JSZip from 'jszip';

const API = process.env.REACT_APP_API_URL || '';
const PAGE_SIZE = 24;

export default function AlbumGaleria() {
  const { slug, galeriaId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selecionadas, setSelecionadas] = useState(new Set());
  const [selecaoConfirmada, setSelecaoConfirmada] = useState(false);
  const [selecaoMsg, setSelecaoMsg] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
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
      const url = galeriaId === 'all'
        ? `${API}/public/album/${slug}/fotos`
        : `${API}/public/album/${slug}/galeria/${galeriaId}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setFotos(json.data.fotos || []);
        // Load selection state from photo records
        const sel = (json.data.fotos || []).filter(f => f.selecionada === true).map(f => f.id);
        setSelecionadas(new Set(sel));
        // Check if selection is already confirmed (from album data)
        setSelecaoConfirmada(json.data.selecao_confirmada || false);
      }
    } catch {}
    setLoading(false);
  };

  const toggleSelecao = async (fotoId) => {
    // If selection is locked, do nothing
    if (selecaoConfirmada) return;

    const isCurrentlySelected = selecionadas.has(fotoId);
    const cotaSelecao = data?.cota_selecao || null;

    // Quota check: if selecting (not deselecting), check limit
    if (!isCurrentlySelected && cotaSelecao && selecionadas.size >= cotaSelecao) {
      setSelecaoMsg(`Limite de ${cotaSelecao} fotos atingido.`);
      setTimeout(() => setSelecaoMsg(''), 3000);
      return;
    }

    // Optimistic update
    setSelecionadas(prev => {
      const nova = new Set(prev);
      if (nova.has(fotoId)) nova.delete(fotoId);
      else nova.add(fotoId);
      return nova;
    });

    // Persist to backend
    try {
      const res = await fetch(`${API}/public/album/${slug}/selecao/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foto_id: fotoId }),
      });
      const json = await res.json();
      if (!json.success) {
        // Revert optimistic update
        setSelecionadas(prev => {
          const nova = new Set(prev);
          if (isCurrentlySelected) nova.add(fotoId);
          else nova.delete(fotoId);
          return nova;
        });
        if (json.message) {
          setSelecaoMsg(json.message);
          setTimeout(() => setSelecaoMsg(''), 3000);
        }
      }
    } catch {
      // Revert on network error
      setSelecionadas(prev => {
        const nova = new Set(prev);
        if (isCurrentlySelected) nova.add(fotoId);
        else nova.delete(fotoId);
        return nova;
      });
    }
  };

  const handleLimparSelecao = async () => {
    if (!window.confirm('Limpar todas as seleções?')) return;
    const ids = [...selecionadas];
    // Deselect all one by one
    for (const fotoId of ids) {
      try {
        await fetch(`${API}/public/album/${slug}/selecao/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foto_id: fotoId }),
        });
      } catch {}
    }
    setSelecionadas(new Set());
    setSelecaoMsg('Seleção limpa.');
    setTimeout(() => setSelecaoMsg(''), 3000);
  };

  const handleConfirmarSelecao = async (finalizar) => {
    setShowConfirmDialog(false);

    if (!finalizar) {
      // Just save — already persisted per toggle
      setSelecaoMsg(`✓ Seleção salva! ${selecionadas.size} foto(s) selecionada(s).`);
      setTimeout(() => setSelecaoMsg(''), 4000);
      return;
    }

    // Finalizar — lock selection
    try {
      const res = await fetch(`${API}/public/album/${slug}/selecao/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.success) {
        setSelecaoConfirmada(true);
        setSelecaoMsg(`✓ Seleção finalizada! ${selecionadas.size} foto(s) confirmada(s).`);
      } else {
        setSelecaoMsg(json.message || 'Erro ao confirmar seleção.');
      }
    } catch {
      setSelecaoMsg('Erro de conexão ao confirmar seleção.');
    }
    setTimeout(() => setSelecaoMsg(''), 5000);
  };

  const handleBack = () => navigate(`/album/${slug}`);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: data?.galeria?.nome || data?.album_titulo, url });
    else navigator.clipboard.writeText(url);
  };

  const handleDownload = async (foto) => {
    // If we already have a direct URL, use it; otherwise fetch a signed URL
    let url = foto?.url_original || foto?.url;
    if (!url && foto?.id) {
      try {
        const res = await fetch(`${API}/public/album/${slug}/foto/${foto.id}/url`);
        const json = await res.json();
        if (json.success) url = json.data.url_original || json.data.url;
      } catch {}
    }
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
    } catch { window.open(url, '_blank'); }
  };

  const handleDownloadAll = async () => {
    if (downloading || !fotos.length) return;
    setDownloading(true);
    setDownloadProgress('Preparando...');
    try {
      // Fetch signed URLs via batch endpoint
      const fotoIds = fotos.map(f => f.id).filter(Boolean);
      let signedUrls = {};
      try {
        const urlsRes = await fetch(`${API}/public/album/${slug}/fotos/urls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foto_ids: fotoIds }),
        });
        const urlsJson = await urlsRes.json();
        if (urlsJson.success) signedUrls = urlsJson.data || {};
      } catch (err) {
        console.error('Failed to fetch signed URLs:', err);
        setDownloading(false);
        setDownloadProgress('');
        return;
      }

      const zip = new JSZip();
      let downloadedCount = 0;
      let failedCount = 0;
      const total = fotos.length;
      const CONCURRENCY = 6;

      // Download function for a single photo
      const downloadOne = async (foto, index) => {
        const url = signedUrls[foto.id] || foto.url_original || foto.url;
        if (!url) { failedCount++; return; }
        try {
          const response = await fetch(url);
          if (!response.ok) { failedCount++; return; }
          const blob = await response.blob();
          const ext = foto.content_type?.includes('png') ? 'png' : foto.content_type?.includes('webp') ? 'webp' : 'jpg';
          const filename = foto.filename || `foto-${String(index + 1).padStart(3, '0')}.${ext}`;
          zip.file(filename, blob);
          downloadedCount++;
        } catch { failedCount++; }
        setDownloadProgress(`${downloadedCount + failedCount}/${total}`);
      };

      // Parallel download with concurrency limit
      const queue = fotos.map((foto, i) => () => downloadOne(foto, i));
      const workers = [];
      let taskIndex = 0;
      const runWorker = async () => {
        while (taskIndex < queue.length) {
          const currentTask = queue[taskIndex++];
          await currentTask();
        }
      };
      for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) {
        workers.push(runWorker());
      }
      await Promise.all(workers);

      if (downloadedCount === 0) {
        setDownloadProgress('Nenhuma foto disponível');
        setTimeout(() => { setDownloading(false); setDownloadProgress(''); }, 2000);
        return;
      }

      setDownloadProgress('Gerando ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${data.album_titulo || 'album'}-fotos.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) { console.error('Download ZIP error:', err); }
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
  const cores = tema.cores || { fundo: '#1A1A1A', texto: '#FFFFFF', acento: '#EA580C' };
  const coresGalerias = tema.cores_galerias || {};
  const bgColor = coresGalerias.background || cores.fundo || '#1A1A1A';
  const textColor = coresGalerias.texto_icones || cores.texto || '#FFFFFF';
  const acento = cores.acento || '#EA580C';
  const layout = tema.layout || 'grade';

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor, fontFamily: tema.fonte_corpo || 'Inter' }}>
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-sm border-b" style={{ backgroundColor: `${bgColor}ee`, borderColor: `${textColor}10` }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between relative">
          <button onClick={handleBack} className="p-2 -ml-2 opacity-60 hover:opacity-100 transition-opacity z-10">
            <ArrowLeft size={20} />
          </button>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-semibold" style={{ fontFamily: tema.fonte_titulo || 'Playfair Display' }}>{galeriaNome}</h1>
              {albumTitulo !== galeriaNome && <p className="text-base opacity-50">{albumTitulo}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 z-10">
            <button onClick={handleShare} className="flex items-center gap-1 text-sm opacity-60 hover:opacity-100 transition-opacity">
              <Share2 size={16} /><span className="hidden sm:inline">Compartilhar</span>
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

      {/* Photo Grid */}
      <main ref={gridContainerRef} className="max-w-7xl mx-auto px-2 md:px-4 py-4">
        <GalleryGrid
          layout={layout}
          fotos={fotosVisiveis}
          containerWidth={gridWidth || (typeof window !== 'undefined' ? Math.min(window.innerWidth - 48, 1280) : 1200)}
          onPhotoClick={(i) => setLightbox(i)}
          tema={tema}
          permiteSelecao={data.permite_selecao && !selecaoConfirmada}
          selecionadas={selecionadas}
          onToggleSelecao={toggleSelecao}
        />

        {visibleCount < fotos.length && (
          <div ref={loaderRef} className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-current/20 border-t-current/60 rounded-full animate-spin opacity-40" />
          </div>
        )}

        <div className="text-center py-6 text-sm opacity-30">{fotos.length} fotos</div>
      </main>

      {/* Selection confirmation message (toast) */}
      {selecaoMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-green-600 text-white text-sm font-medium rounded-xl shadow-lg">
          {selecaoMsg}
        </div>
      )}

      {/* Selection bar — active (not confirmed) */}
      {data.permite_selecao && !selecaoConfirmada && (
        <div className="fixed bottom-0 left-0 right-0 z-40">
          <div className="max-w-4xl mx-auto px-4 pb-4">
            <div className="px-6 py-4 bg-white/95 backdrop-blur border rounded-xl shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  <span className="text-lg font-bold" style={{ color: acento }}>{selecionadas.size}</span>
                  {' / '}
                  <span className="text-gray-500">{data.cota_selecao || fotos.length}</span>
                  {' '}selecionadas
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={selecionadas.size === 0}
                    onClick={handleLimparSelecao}
                    className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Limpar
                  </button>
                  <button
                    disabled={selecionadas.size === 0}
                    onClick={() => setShowConfirmDialog(true)}
                    className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                    style={{ backgroundColor: acento }}
                  >
                    Confirmar Seleção
                  </button>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min((selecionadas.size / (data.cota_selecao || fotos.length)) * 100, 100)}%`, backgroundColor: acento }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selection confirmed bar (locked state) */}
      {data.permite_selecao && selecaoConfirmada && (
        <div className="fixed bottom-0 left-0 right-0 z-40">
          <div className="max-w-4xl mx-auto px-4 pb-4">
            <div className="px-6 py-4 bg-green-50/95 backdrop-blur border border-green-200 rounded-xl shadow-lg flex items-center justify-center">
              <span className="text-sm font-medium text-green-700 flex items-center gap-2">
                ✓ Seleção finalizada — {selecionadas.size} foto(s) selecionada(s)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Confirm selection dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmDialog(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-sm shadow-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Confirmar seleção</h3>
            <p className="text-sm text-gray-600">
              Você selecionou <strong>{selecionadas.size}</strong> foto(s). O que deseja fazer?
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => handleConfirmarSelecao(false)}
                className="w-full px-4 py-2.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Apenas salvar (continuar selecionando)
              </button>
              <button
                onClick={() => handleConfirmarSelecao(true)}
                className="w-full px-4 py-2.5 text-sm font-medium text-white rounded-lg hover:opacity-90 transition"
                style={{ backgroundColor: acento }}
              >
                Finalizar seleção (não poderá alterar)
              </button>
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button onClick={(e) => { e.stopPropagation(); setLightbox(null); }} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full z-10 transition-colors">
            <X size={24} />
          </button>
          {lightbox > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setLightbox(i => Math.max(0, i - 1)); }} className="absolute left-2 md:left-4 text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors">
              <ChevronLeft size={32} />
            </button>
          )}
          {lightbox < fotos.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setLightbox(i => Math.min(fotos.length - 1, i + 1)); }} className="absolute right-2 md:right-4 text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors">
              <ChevronRight size={32} />
            </button>
          )}
          <img src={fotos[lightbox]?.url_original || fotos[lightbox]?.url || ''} alt="" className="max-h-[90vh] max-w-[90vw] object-contain select-none" onClick={(e) => e.stopPropagation()} draggable={false} />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <span className="text-white/60 text-sm bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">{lightbox + 1} / {fotos.length}</span>
            {data.permite_selecao && !selecaoConfirmada && (() => {
              const fotoId = fotos[lightbox]?.id;
              const sel = selecionadas.has(fotoId);
              return (
                <button onClick={(e) => { e.stopPropagation(); toggleSelecao(fotoId); }} className={`p-2 rounded-full backdrop-blur-sm transition-all ${sel ? 'bg-red-500 text-white' : 'bg-black/60 text-white/60 hover:text-white'}`}>
                  <Heart size={18} fill={sel ? 'white' : 'none'} />
                </button>
              );
            })()}
            {data.permite_download && (
              <button onClick={(e) => { e.stopPropagation(); handleDownload(fotos[lightbox]); }} className="text-white/60 hover:text-white bg-black/60 p-2 rounded-full backdrop-blur-sm transition-colors">
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
// GalleryGrid — mesmo componente do AlbumPreview
// ═══════════════════════════════════════════════════════════
function GalleryGrid({ layout, fotos, containerWidth, onPhotoClick, tema, permiteSelecao, selecionadas, onToggleSelecao }) {
  const gap = tema?.espacamento || 8;
  const photos = fotos.map(f => ({
    id: f.id || f.SK?.replace('FOTO#', ''),
    url: f.url_thumb || f.url || '',
    width: f.width || 1600,
    height: f.height || 1200,
  }));

  if (photos.length === 0) return null;

  const SelectionOverlay = ({ fotoId }) => {
    if (!permiteSelecao) return null;
    const sel = selecionadas?.has(fotoId);
    return (
      <button onClick={(e) => { e.stopPropagation(); onToggleSelecao?.(fotoId); }}
        className={`absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center transition-all z-10 ${sel ? 'bg-red-500 text-white scale-110 shadow-lg' : 'bg-white/80 text-gray-400 hover:text-red-500 hover:scale-110 shadow'}`}>
        <Heart size={18} fill={sel ? 'white' : 'none'} />
      </button>
    );
  };

  const renderItem = ({ photo, item, index, style }) => (
    <div key={item.id} className="relative" style={style}>
      <GalleryPhoto src={photo?.url || ''} id={item.id} index={index} tema={tema} style={{ width: '100%', height: '100%' }} onClick={() => onPhotoClick && onPhotoClick(index)} />
      <SelectionOverlay fotoId={item.id} />
    </div>
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
      <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory pb-4 scrollbar-hide">
        {fotos.map((foto, i) => {
          const fotoId = foto.id || foto.SK?.replace('FOTO#', '');
          return (
            <div key={fotoId || i} className="relative min-w-[70vw] md:min-w-[45vw] lg:min-w-[30vw] flex-shrink-0 snap-center rounded-lg overflow-hidden cursor-pointer" onClick={() => onPhotoClick(i)}>
              <GalleryPhoto src={foto.url_thumb || foto.url || ''} id={fotoId || `slider-${i}`} index={i} tema={tema} style={{ width: '100%', height: '60vh' }} />
              <SelectionOverlay fotoId={fotoId} />
            </div>
          );
        })}
      </div>
    );
  }
  if (layout === 'coluna') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fotos.map((foto, i) => {
          const fotoId = foto.id || foto.SK?.replace('FOTO#', '');
          return (
            <div key={fotoId || i} className="relative rounded-lg overflow-hidden cursor-pointer" onClick={() => onPhotoClick(i)}>
              <GalleryPhoto src={foto.url_thumb || foto.url || ''} id={fotoId || `col-${i}`} index={i} tema={tema} style={{ width: '100%', maxHeight: '500px' }} />
              <SelectionOverlay fotoId={fotoId} />
            </div>
          );
        })}
      </div>
    );
  }
  return <JustifiedGallery photos={photos} containerWidth={containerWidth} options={{ targetRowHeight: 240, gapX: gap, gapY: gap }} onPhotoClick={onPhotoClick} renderItem={renderItem} />;
}
