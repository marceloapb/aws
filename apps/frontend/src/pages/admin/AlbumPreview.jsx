import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, X, ChevronLeft, ChevronRight, Download, ArrowRight, ArrowLeft, Share2 } from 'lucide-react';
import JSZip from 'jszip';
import { JustifiedGallery } from '../../utils/galleryLayouts/justifiedRows';
import { MasonryGallery } from '../../utils/galleryLayouts/masonry';
import { CollageGallery } from '../../utils/galleryLayouts/collageGroups';
import GalleryPhoto from '../../components/album/GalleryPhoto';

const DEFAULTS_TEMA = {
  capa_foto_id: null,
  capa_modo: 'cover',
  capa_layout: 'elegante',
  cores: { fundo: '#1A1A1A', texto: '#FFFFFF', acento: '#EA580C' },
  cores_capa: { texto: '#FFFFFF', overlay: '#121212' },
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
  }, [view, activeGaleriaId]);

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

  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');

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

  // Foto de capa — usar url_full (original, alta resolução) para não distorcer
  const capaFoto = tema.capa_foto_id
    ? fotos.find(f => f.id === tema.capa_foto_id || f.SK?.replace('FOTO#', '') === tema.capa_foto_id)
    : fotos[0];
  const capaUrl = capaFoto ? (capaFoto.url_full || capaFoto.url || '') : '';

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!d) return dateStr;
    return `${d}/${m}/${y}`;
  };

  const handleDownload = async (foto) => {
    const url = foto?.url_full || foto?.url;
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = foto.filename || `foto-${foto.id || 'download'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleDownloadAll = async () => {
    if (downloading) return;
    const fotosToDownload = getActiveFotos();
    if (!fotosToDownload.length) return;
    setDownloading(true);
    setDownloadProgress('Preparando...');
    try {
      const zip = new JSZip();
      for (let i = 0; i < fotosToDownload.length; i++) {
        const foto = fotosToDownload[i];
        const url = foto.url_full || foto.url;
        if (!url) continue;
        setDownloadProgress(`Baixando ${i + 1}/${fotosToDownload.length}`);
        const response = await fetch(url);
        const blob = await response.blob();
        const ext = foto.content_type?.includes('png') ? 'png' : foto.content_type?.includes('webp') ? 'webp' : 'jpg';
        const filename = foto.filename || `foto-${String(i + 1).padStart(3, '0')}.${ext}`;
        zip.file(filename, blob);
      }
      setDownloadProgress('Gerando ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${album.titulo || 'album'}-fotos.zip`;
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

  // ═══════════════════════════════════════════════════════════
  // VIEW: COVER (Capa full-screen usando tema.capa_layout)
  // ═══════════════════════════════════════════════════════════
  if (view === 'cover') {
    const capaLayout = tema.capa_layout || 'elegante';
    const coresCapa = tema.cores_capa || {};
    const corTexto = coresCapa.texto || '#FFFFFF';
    const corOverlay = coresCapa.overlay || '#121212';
    const textoBtn = tema.texto_botao || 'Ver fotos';
    const nomeNegocio = (tema.info_negocio !== false) ? (album.nome_negocio || tema.nome_negocio || '') : '';
    const dataEvento = (tema.mais_info !== false) && album.data_evento ? formatDate(album.data_evento) : '';

    const coverContent = () => {
      if (capaLayout === 'split') {
        return (
          <div className="flex h-full min-h-screen">
            <div className="w-1/2 h-full overflow-hidden">
              {capaFoto && <img src={capaFoto.url_full || capaFoto.url || ''} alt="" className="w-full h-full object-cover" />}
              {!capaFoto && <div className="w-full h-full bg-gray-700" />}
            </div>
            <div className="w-1/2 flex flex-col justify-center px-8 md:px-16" style={{ backgroundColor: corOverlay, color: corTexto }}>
              {nomeNegocio && <p className="text-xs opacity-70 mb-3 tracking-widest uppercase" style={{ fontFamily: tema.fonte_corpo }}>{nomeNegocio}</p>}
              <h1 className="text-3xl md:text-5xl font-bold mb-2" style={{ fontFamily: fonteTitulo }}>{album.titulo}</h1>
              {dataEvento && <p className="text-sm opacity-70 mt-2" style={{ fontFamily: tema.fonte_corpo }}>{dataEvento}</p>}
              <button onClick={handleVerFotos} className="mt-8 text-sm opacity-70 hover:opacity-100 flex items-center gap-2 transition" style={{ fontFamily: tema.fonte_corpo }}>
                {textoBtn} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        );
      }
      if (capaLayout === 'editorial') {
        return (
          <div className="flex flex-col min-h-screen">
            <div className="px-8 md:px-16 py-8 md:py-12 border-b" style={{ backgroundColor: '#fff', color: corTexto, borderColor: `${corTexto}15` }}>
              {nomeNegocio && <p className="text-xs opacity-50 mb-2 tracking-widest uppercase" style={{ fontFamily: tema.fonte_corpo }}>{nomeNegocio}</p>}
              <h1 className="text-4xl md:text-6xl font-bold" style={{ fontFamily: fonteTitulo }}>{album.titulo}</h1>
              {dataEvento && <p className="text-sm opacity-60 mt-3" style={{ fontFamily: tema.fonte_corpo }}>{dataEvento}</p>}
              <button onClick={handleVerFotos} className="mt-6 text-sm opacity-60 hover:opacity-100 flex items-center gap-2 transition" style={{ fontFamily: tema.fonte_corpo }}>
                {textoBtn} <ArrowRight size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              {capaFoto && <img src={capaFoto.url_full || capaFoto.url || ''} alt="" className="w-full h-full object-cover" style={{ minHeight: '50vh' }} />}
            </div>
          </div>
        );
      }
      if (capaLayout === 'cinematico') {
        return (
          <div className="flex flex-col min-h-screen bg-black">
            <div className="h-16 md:h-24 bg-black" />
            <div className="flex-1 relative overflow-hidden">
              {capaFoto && <img src={capaFoto.url_full || capaFoto.url || ''} alt="" className="w-full h-full object-cover opacity-80" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 md:left-16 md:right-16" style={{ color: corTexto }}>
                <h1 className="text-2xl md:text-4xl tracking-[0.2em] uppercase font-light" style={{ fontFamily: fonteTitulo }}>{album.titulo}</h1>
                {dataEvento && <p className="text-xs opacity-60 mt-3 tracking-wider" style={{ fontFamily: tema.fonte_corpo }}>{dataEvento}</p>}
                <button onClick={handleVerFotos} className="mt-6 text-sm opacity-60 hover:opacity-100 flex items-center gap-2 transition tracking-wider" style={{ fontFamily: tema.fonte_corpo }}>
                  {textoBtn} <ArrowRight size={16} />
                </button>
              </div>
            </div>
            <div className="h-16 md:h-24 bg-black" />
          </div>
        );
      }
      if (capaLayout === 'moldura') {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-12" style={{ backgroundColor: '#f3f4f6' }}>
            <div className="border-4 p-3 shadow-lg bg-white" style={{ borderColor: corOverlay }}>
              <div className="w-72 h-52 md:w-96 md:h-72 overflow-hidden">
                {capaFoto && <img src={capaFoto.url_full || capaFoto.url || ''} alt="" className="w-full h-full object-cover" />}
              </div>
            </div>
            <div className="text-center mt-8" style={{ color: corTexto }}>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: fonteTitulo }}>{album.titulo}</h1>
              {dataEvento && <p className="text-sm opacity-60 mt-3" style={{ fontFamily: tema.fonte_corpo }}>{dataEvento}</p>}
            </div>
            <button onClick={handleVerFotos} className="mt-8 text-sm opacity-60 hover:opacity-100 flex items-center gap-2 transition" style={{ color: corTexto, fontFamily: tema.fonte_corpo }}>
              {textoBtn} <ArrowRight size={16} />
            </button>
          </div>
        );
      }
      if (capaLayout === 'full') {
        return (
          <div className="relative min-h-screen cursor-pointer" onClick={handleVerFotos}>
            {capaFoto && <img src={capaFoto.url_full || capaFoto.url || ''} alt="" className="w-full h-full min-h-screen object-cover" />}
            {!capaFoto && <div className="w-full min-h-screen bg-gray-800" />}
            <div className="absolute bottom-8 right-8 opacity-60">
              <span className="text-xs text-white bg-black/40 px-3 py-2 rounded-full backdrop-blur-sm flex items-center gap-2" style={{ fontFamily: tema.fonte_corpo }}>
                {textoBtn} <ArrowRight size={14} />
              </span>
            </div>
          </div>
        );
      }
      if (capaLayout === 'minimalista') {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-8" style={{ backgroundColor: '#f9fafb' }}>
            <div className="w-64 h-48 md:w-80 md:h-60 rounded-lg overflow-hidden shadow-lg mb-8">
              {capaFoto && <img src={capaFoto.url_full || capaFoto.url || ''} alt="" className="w-full h-full object-cover" />}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-2" style={{ fontFamily: fonteTitulo, color: corTexto }}>{album.titulo}</h1>
            {nomeNegocio && <p className="text-xs opacity-60 tracking-widest uppercase" style={{ fontFamily: tema.fonte_corpo, color: corTexto }}>{nomeNegocio}</p>}
            {dataEvento && <p className="text-sm opacity-60 mt-3" style={{ fontFamily: tema.fonte_corpo, color: corTexto }}>{dataEvento}</p>}
            <button onClick={handleVerFotos} className="mt-10 text-sm opacity-60 hover:opacity-100 flex items-center gap-2 transition" style={{ color: corTexto, fontFamily: tema.fonte_corpo }}>
              {textoBtn} <ArrowRight size={16} />
            </button>
          </div>
        );
      }
      // ELEGANTE / OUSADO (default)
      return (
        <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: corOverlay }}>
          {capaFoto && (
            <div className="absolute inset-0">
              <img src={capaFoto.url_full || capaFoto.url || ''} alt="" className="w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0" style={{ backgroundColor: corOverlay + '80' }} />
            </div>
          )}
          <div className={`relative z-10 min-h-screen flex flex-col p-8 md:p-16 ${capaLayout === 'ousado' ? 'justify-center items-center text-center' : 'justify-end'}`} style={{ color: corTexto }}>
            {nomeNegocio && <p className="text-xs opacity-70 mb-3 tracking-widest uppercase" style={{ fontFamily: tema.fonte_corpo }}>{nomeNegocio}</p>}
            <h1 className={`font-bold mb-2 ${capaLayout === 'ousado' ? 'text-5xl md:text-7xl' : 'text-4xl md:text-6xl'}`} style={{ fontFamily: fonteTitulo }}>{album.titulo}</h1>
            {dataEvento && <p className="text-sm opacity-70 mt-2" style={{ fontFamily: tema.fonte_corpo }}>{dataEvento}</p>}
            <button onClick={handleVerFotos} className="mt-8 text-sm opacity-70 hover:opacity-100 flex items-center gap-2 transition" style={{ fontFamily: tema.fonte_corpo }}>
              {textoBtn} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      );
    };

    return (
      <div>
        {/* Banner de preview */}
        <div className="fixed top-0 left-0 right-0 z-30 bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center">
          <span className="inline-flex items-center gap-2 text-sm text-yellow-800 font-medium">
            <Eye size={14} /> Pré-visualização — é assim que o cliente verá o álbum
          </span>
        </div>
        <div className="pt-10">
          {coverContent()}
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
      <div className="min-h-screen" style={{ backgroundColor: tema.cores_galerias?.background || cores.fundo, color: tema.cores_galerias?.texto_icones || cores.texto }}>
        {/* Banner preview */}
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center">
          <span className="inline-flex items-center gap-2 text-sm text-yellow-800 font-medium">
            <Eye size={14} /> Pré-visualização — Seleção de galerias
          </span>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-20 backdrop-blur-sm border-b" style={{ backgroundColor: `${tema.cores_galerias?.background || cores.fundo}ee`, borderColor: `${tema.cores_galerias?.texto_icones || cores.texto}10` }}>
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => setView('cover')} className="p-2 -ml-2 opacity-60 hover:opacity-100 transition-opacity">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg md:text-xl font-semibold" style={{ fontFamily: tema.fonte_titulo || 'Playfair Display' }}>{album.titulo}</h1>
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: tema.cores_galerias?.background || cores.fundo, color: tema.cores_galerias?.texto_icones || cores.texto, fontFamily: tema.fonte_corpo || 'Inter' }}>
      {/* CSS Animations are handled by galleryAnimations.css */}
      <style>{`
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
      <header className="sticky top-0 z-20 backdrop-blur-sm border-b" style={{ backgroundColor: `${tema.cores_galerias?.background || cores.fundo}ee`, borderColor: `${tema.cores_galerias?.texto_icones || cores.texto}10` }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => galeriasAtivas.length > 1 ? setView('sets') : setView('cover')}
            className="p-2 -ml-2 opacity-60 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-lg md:text-xl font-semibold" style={{ fontFamily: tema.fonte_titulo || 'Playfair Display' }}>{galeriaNome}</h1>
            {album.titulo !== galeriaNome && (
              <p className="text-sm opacity-50">{album.titulo}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { const url = `${window.location.origin}/album/${album.slug || album.id}`; if (navigator.share) { navigator.share({ title: album.titulo, url }); } else { navigator.clipboard.writeText(url); } }} className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100 transition-opacity">
              <Share2 size={16} />
              <span>Compartilhar</span>
            </button>
            {album.permite_download && (
              <button onClick={handleDownloadAll} disabled={downloading} className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30">
                {downloading ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <Download size={16} />}
                <span>{downloading ? downloadProgress : 'Download'}</span>
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
        />

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
            {album.permite_download && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(activeFotos[lightbox]); }}
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

  // renderItem function that applies animations via GalleryPhoto
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

  // Mosaico → Masonry (colunas, foto inteira sem corte)
  if (layout === 'mosaico') {
    return (
      <MasonryGallery
        photos={photos}
        containerWidth={containerWidth}
        options={{ columnCount: 3, gapX: 8, gapY: 8, placement: 'shortestColumn', crop: false }}
        onPhotoClick={onPhotoClick}
        renderItem={renderItem}
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
        renderItem={renderItem}
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
        renderItem={renderItem}
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
            <GalleryPhoto
              src={foto.url || ''}
              id={foto.id || `slider-${i}`}
              index={i}
              tema={tema}
              style={{ width: '100%', height: '60vh' }}
            />
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
            <GalleryPhoto
              src={foto.url || ''}
              id={foto.id || `col-${i}`}
              index={i}
              tema={tema}
              style={{ width: '100%', maxHeight: '500px' }}
            />
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
      renderItem={renderItem}
    />
  );
}
