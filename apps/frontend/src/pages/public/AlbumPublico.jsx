import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, X, ChevronLeft, ChevronRight, Share2, Download, Heart, Lock } from 'lucide-react';
import GalleryPhoto from '../../components/album/GalleryPhoto';
import { JustifiedGallery } from '../../utils/galleryLayouts/justifiedRows';
import { MasonryGallery } from '../../utils/galleryLayouts/masonry';
import { CollageGallery } from '../../utils/galleryLayouts/collageGroups';
import JSZip from 'jszip';

const API = process.env.REACT_APP_API_URL || '';
const PAGE_SIZE = 40;

export default function AlbumPublico() {
  const { slug } = useParams();

  // Album data
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [senha, setSenha] = useState('');
  const [senhaErro, setSenhaErro] = useState(false);

  // View state: 'cover' | 'sets' | 'gallery'
  const [view, setView] = useState('cover');
  const [activeGaleriaId, setActiveGaleriaId] = useState(null);

  // Gallery photos
  const [allFotos, setAllFotos] = useState([]);
  const [fotosLoading, setFotosLoading] = useState(false);

  // Lightbox & pagination
  const [lightbox, setLightbox] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef(null);
  const gridContainerRef = useRef(null);
  const [gridWidth, setGridWidth] = useState(0);

  // Selection
  const [selecionadas, setSelecionadas] = useState(new Set());
  const [selecaoConfirmada, setSelecaoConfirmada] = useState(false);
  const [selecaoMsg, setSelecaoMsg] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Download
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');

  // Filter photos by active galeria (local, like admin does)
  const fotos = activeGaleriaId && activeGaleriaId !== 'all'
    ? allFotos.filter(f => f.galeria_id === activeGaleriaId)
    : allFotos;

  // Load album data
  useEffect(() => { loadAlbum(); }, [slug]);

  // Measure grid container width
  useEffect(() => {
    if (!gridContainerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setGridWidth(entry.contentRect.width);
    });
    ro.observe(gridContainerRef.current);
    setGridWidth(gridContainerRef.current.clientWidth);
    return () => ro.disconnect();
  }, [view, activeGaleriaId]);

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
  }, [visibleCount, fotos.length, activeGaleriaId]);

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

  const loadAlbum = async (senhaParam) => {
    try {
      const qs = senhaParam ? `?senha=${encodeURIComponent(senhaParam)}` : '';
      const res = await fetch(`${API}/public/album/${slug}${qs}`);
      const json = await res.json();
      if (json.success) {
        setAlbum(json.data);
      }
    } catch {}
    setLoading(false);
  };

  const loadGaleriaFotos = async (galeriaId) => {
    setFotosLoading(true);
    try {
      // Always load ALL photos for the album (global selection count)
      const res = await fetch(`${API}/public/album/${slug}/fotos`);
      const json = await res.json();
      if (json.success) {
        const fotosData = json.data.fotos || [];
        setAllFotos(fotosData);
        const sel = fotosData.filter(f => f.selecionada === true).map(f => f.id);
        setSelecionadas(new Set(sel));
        setSelecaoConfirmada(json.data.selecao_confirmada || false);
      }
    } catch {}
    setFotosLoading(false);
  };

  const handleSenha = (e) => {
    e.preventDefault();
    setSenhaErro(false);
    setLoading(true);
    loadAlbum(senha).then(() => {
      if (album?.requer_senha) setSenhaErro(true);
    });
  };

  const handleVerFotos = () => {
    if (!album) return;
    const galerias = album.galerias || [];
    if (galerias.length <= 1) {
      const galeriaId = galerias.length === 1 ? galerias[0].id : 'all';
      setActiveGaleriaId(galeriaId);
      setView('gallery');
      loadGaleriaFotos(galeriaId);
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
    loadGaleriaFotos(galeriaId);
  };

  // Selection logic
  const toggleSelecao = async (fotoId) => {
    if (selecaoConfirmada) return;
    const isCurrentlySelected = selecionadas.has(fotoId);
    const cotaSelecao = album?.cota_selecao || null;

    if (!isCurrentlySelected && cotaSelecao && selecionadas.size >= cotaSelecao) {
      setSelecaoMsg(`Limite de ${cotaSelecao} fotos atingido.`);
      setTimeout(() => setSelecaoMsg(''), 3000);
      return;
    }

    setSelecionadas(prev => {
      const nova = new Set(prev);
      if (nova.has(fotoId)) nova.delete(fotoId);
      else nova.add(fotoId);
      return nova;
    });

    try {
      const res = await fetch(`${API}/public/album/${slug}/selecao/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foto_id: fotoId }),
      });
      const json = await res.json();
      if (!json.success) {
        setSelecionadas(prev => {
          const nova = new Set(prev);
          if (isCurrentlySelected) nova.add(fotoId); else nova.delete(fotoId);
          return nova;
        });
        if (json.message) { setSelecaoMsg(json.message); setTimeout(() => setSelecaoMsg(''), 3000); }
      }
    } catch {
      setSelecionadas(prev => {
        const nova = new Set(prev);
        if (isCurrentlySelected) nova.add(fotoId); else nova.delete(fotoId);
        return nova;
      });
    }
  };

  const handleLimparSelecao = async () => {
    if (!window.confirm('Limpar todas as seleções?')) return;
    const ids = [...selecionadas];
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
      setSelecaoMsg(`✓ Seleção salva! ${selecionadas.size} foto(s) selecionada(s).`);
      setTimeout(() => setSelecaoMsg(''), 4000);
      return;
    }
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
    } catch { setSelecaoMsg('Erro de conexão ao confirmar seleção.'); }
    setTimeout(() => setSelecaoMsg(''), 5000);
  };

  // Download
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
    } catch { window.open(url, '_blank'); }
  };

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
      a.download = `${album?.titulo || 'album'}-fotos.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) { console.error('Download ZIP error:', err); }
    setDownloading(false);
    setDownloadProgress('');
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: album?.titulo, url });
    else navigator.clipboard.writeText(url);
  };

  // ═══════════════════════════════════════════════════════════
  // LOADING / ERROR STATES
  // ═══════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/60 text-lg">Álbum não encontrado ou expirado</p>
      </div>
    );
  }

  // Password screen
  if (album.requer_senha) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <Lock className="mx-auto mb-4 text-white/40" size={48} />
          <h1 className="text-2xl font-bold text-white mb-2">{album.titulo}</h1>
          <p className="text-white/50 text-sm mb-6">Este álbum é protegido por senha</p>
          <form onSubmit={handleSenha} className="space-y-3">
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Digite a senha" className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/40" />
            {senhaErro && <p className="text-red-400 text-sm">Senha incorreta</p>}
            <button type="submit" className="w-full py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition">Acessar</button>
          </form>
        </div>
      </div>
    );
  }

  // Theme variables
  const tema = album.tema || {};
  const cores = tema.cores || { fundo: '#1A1A1A', texto: '#FFFFFF', acento: '#EA580C' };
  const coresCapa = tema.cores_capa || {};
  const coresGalerias = tema.cores_galerias || {};
  const fonteTitulo = tema.fonte_titulo || 'Playfair Display';
  const corTexto = coresCapa.texto || '#FFFFFF';
  const corOverlay = coresCapa.overlay || '#121212';
  const acento = cores.acento || '#EA580C';
  const textoBtn = tema.texto_botao || 'Ver fotos';
  const nomeNegocio = (tema.info_negocio !== false) ? (album.nome_negocio || tema.nome_negocio || '') : '';
  const bgColor = coresGalerias.background || cores.fundo || '#1A1A1A';
  const textColor = coresGalerias.texto_icones || cores.texto || '#FFFFFF';
  const layout = tema.layout || 'grade';

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!d) return dateStr;
    return `${d}/${m}/${y}`;
  };
  const dataEvento = (tema.mais_info !== false) && album.data_evento ? formatDate(album.data_evento) : '';


  // ═══════════════════════════════════════════════════════════
  // VIEW: COVER
  // ═══════════════════════════════════════════════════════════
  if (view === 'cover') {
    const capaLayout = tema.capa_layout || 'elegante';

    if (capaLayout === 'split') {
      return (
        <div className="flex h-full min-h-screen">
          <div className="w-1/2 h-full min-h-screen overflow-hidden">
            {album.capa_url && <img src={album.capa_url} alt="" className="w-full h-full object-cover" />}
            {!album.capa_url && <div className="w-full h-full bg-gray-700" />}
          </div>
          <div className="w-1/2 flex flex-col justify-center px-8 md:px-16" style={{ backgroundColor: corOverlay, color: corTexto }}>
            {nomeNegocio && <p className="text-sm opacity-70 mb-3 tracking-widest uppercase" style={{ fontFamily: tema.fonte_corpo }}>{nomeNegocio}</p>}
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
          <div className="px-8 md:px-16 py-8 md:py-12 border-b" style={{ backgroundColor: corOverlay, color: corTexto, borderColor: `${corTexto}15` }}>
            {nomeNegocio && <p className="text-sm md:text-base opacity-50 mb-2 tracking-widest uppercase" style={{ fontFamily: tema.fonte_corpo }}>{nomeNegocio}</p>}
            <h1 className="text-4xl md:text-6xl font-bold" style={{ fontFamily: fonteTitulo }}>{album.titulo}</h1>
            <div className="flex items-center justify-between mt-3">
              {dataEvento && <p className="text-base md:text-lg opacity-60" style={{ fontFamily: tema.fonte_corpo }}>{dataEvento}</p>}
              <button onClick={handleVerFotos} className="text-sm md:text-base opacity-60 hover:opacity-100 flex items-center gap-2 transition ml-auto" style={{ fontFamily: tema.fonte_corpo }}>
                {textoBtn} <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative">
            {album.capa_url && <img src={album.capa_url} alt="" className="w-full h-full object-cover" style={{ minHeight: '50vh' }} />}
          </div>
        </div>
      );
    }

    if (capaLayout === 'cinematico') {
      return (
        <div className="flex flex-col min-h-screen bg-black">
          <div className="h-16 md:h-24 bg-black" />
          <div className="flex-1 relative overflow-hidden">
            {album.capa_url && <img src={album.capa_url} alt="" className="w-full h-full object-cover opacity-80" />}
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

    if (capaLayout === 'full') {
      return (
        <div className="relative min-h-screen cursor-pointer" onClick={handleVerFotos}>
          {album.capa_url && <img src={album.capa_url} alt="" className="w-full h-full min-h-screen object-cover" />}
          {!album.capa_url && <div className="w-full min-h-screen bg-gray-800" />}
          <div className="absolute bottom-8 right-8 opacity-60">
            <span className="text-xs text-white bg-black/40 px-3 py-2 rounded-full backdrop-blur-sm flex items-center gap-2" style={{ fontFamily: tema.fonte_corpo }}>
              {textoBtn} <ArrowRight size={14} />
            </span>
          </div>
        </div>
      );
    }

    if (capaLayout === 'moldura') {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-12" style={{ backgroundColor: '#f3f4f6' }}>
          <div className="border-4 p-3 shadow-lg bg-white" style={{ borderColor: corOverlay }}>
            <div className="w-72 h-52 md:w-96 md:h-72 overflow-hidden">
              {album.capa_url && <img src={album.capa_url} alt="" className="w-full h-full object-cover" />}
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

    if (capaLayout === 'minimalista') {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8" style={{ backgroundColor: '#f9fafb' }}>
          <div className="w-64 h-48 md:w-80 md:h-60 rounded-lg overflow-hidden shadow-lg mb-8">
            {album.capa_url && <img src={album.capa_url} alt="" className="w-full h-full object-cover" />}
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
        {album.capa_url && (
          <div className="absolute inset-0">
            <img src={album.capa_url} alt="" className="w-full h-full object-cover opacity-50" />
            <div className="absolute inset-0" style={{ backgroundColor: corOverlay + '80' }} />
          </div>
        )}
        <div className={`relative z-10 min-h-screen flex flex-col p-8 md:p-16 ${tema.capa_layout === 'ousado' ? 'justify-center items-center text-center' : 'justify-end'}`} style={{ color: corTexto }}>
          {nomeNegocio && <p className="text-sm opacity-70 mb-3 tracking-widest uppercase" style={{ fontFamily: tema.fonte_corpo }}>{nomeNegocio}</p>}
          <h1 className={`font-bold mb-2 ${tema.capa_layout === 'ousado' ? 'text-5xl md:text-7xl' : 'text-4xl md:text-6xl'}`} style={{ fontFamily: fonteTitulo }}>{album.titulo}</h1>
          {dataEvento && <p className="text-sm opacity-70 mt-2" style={{ fontFamily: tema.fonte_corpo }}>{dataEvento}</p>}
          <button onClick={handleVerFotos} className="mt-8 text-sm opacity-70 hover:opacity-100 flex items-center gap-2 transition" style={{ fontFamily: tema.fonte_corpo }}>
            {textoBtn} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════
  // VIEW: SETS (multiple galleries)
  // ═══════════════════════════════════════════════════════════
  if (view === 'sets') {
    const galerias = album.galerias || [];

    return (
      <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor, fontFamily: tema.fonte_corpo || 'Inter' }}>
        {/* Header */}
        <header className="sticky top-0 z-20 backdrop-blur-sm border-b" style={{ backgroundColor: `${bgColor}ee`, borderColor: `${textColor}10` }}>
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between relative">
            <button onClick={() => setView('cover')} className="p-2 -ml-2 opacity-60 hover:opacity-100 transition-opacity z-10">
              <ArrowLeft size={20} />
            </button>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <h1 className="text-xl md:text-2xl font-semibold" style={{ fontFamily: fonteTitulo }}>{album.titulo}</h1>
            </div>
            <div className="flex items-center gap-3 z-10">
              <button onClick={handleShare} className="flex items-center gap-1 text-sm opacity-60 hover:opacity-100 transition-opacity">
                <Share2 size={16} /><span className="hidden sm:inline">Compartilhar</span>
              </button>
            </div>
          </div>
        </header>

        {/* Gallery cards */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className={`grid gap-6 ${galerias.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {galerias.map((galeria) => (
              <button
                key={galeria.id}
                onClick={() => handleSelectGaleria(galeria.id)}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-800 text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                {galeria.thumbnail_url ? (
                  <img src={galeria.thumbnail_url} alt={galeria.nome} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-xl md:text-2xl font-semibold drop-shadow-lg px-4 text-center" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
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
  // VIEW: GALLERY (photo grid)
  // ═══════════════════════════════════════════════════════════
  const activeGaleria = (album.galerias || []).find(g => g.id === activeGaleriaId);
  const galeriaNome = activeGaleria?.nome || album.titulo;
  const fotosVisiveis = fotos.slice(0, visibleCount);
  const galeriasCount = (album.galerias || []).length;

  if (fotosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor, fontFamily: tema.fonte_corpo || 'Inter' }}>
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-sm border-b" style={{ backgroundColor: `${bgColor}ee`, borderColor: `${textColor}10` }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between relative">
          <button onClick={() => galeriasCount > 1 ? setView('sets') : setView('cover')} className="p-2 -ml-2 opacity-60 hover:opacity-100 transition-opacity z-10">
            <ArrowLeft size={20} />
          </button>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-semibold" style={{ fontFamily: fonteTitulo }}>{galeriaNome}</h1>
              {album.titulo !== galeriaNome && <p className="text-base opacity-50">{album.titulo}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 z-10">
            <button onClick={handleShare} className="flex items-center gap-1 text-sm opacity-60 hover:opacity-100 transition-opacity">
              <Share2 size={16} /><span className="hidden sm:inline">Compartilhar</span>
            </button>
            {album.permite_download && (
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
          permiteSelecao={album.permite_selecao && !selecaoConfirmada}
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

      {/* Toast message */}
      {selecaoMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-green-600 text-white text-sm font-medium rounded-xl shadow-lg">
          {selecaoMsg}
        </div>
      )}

      {/* Selection bar — active */}
      {album.permite_selecao && !selecaoConfirmada && (
        <div className="fixed bottom-0 left-0 right-0 z-40">
          <div className="max-w-4xl mx-auto px-4 pb-4">
            <div className="px-6 py-4 bg-white/95 backdrop-blur border rounded-xl shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  <span className="text-lg font-bold" style={{ color: acento }}>{selecionadas.size}</span>
                  {' / '}
                  <span className="text-gray-500">{album.cota_selecao || allFotos.length}</span>
                  {' '}selecionadas
                </span>
                <div className="flex items-center gap-2">
                  <button disabled={selecionadas.size === 0} onClick={handleLimparSelecao} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100">
                    Limpar
                  </button>
                  <button disabled={selecionadas.size === 0} onClick={() => setShowConfirmDialog(true)} className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90" style={{ backgroundColor: acento }}>
                    Confirmar Seleção
                  </button>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min((selecionadas.size / (album.cota_selecao || allFotos.length)) * 100, 100)}%`, backgroundColor: acento }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selection confirmed bar */}
      {album.permite_selecao && selecaoConfirmada && (
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

      {/* Confirm dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmDialog(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-sm shadow-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Confirmar seleção</h3>
            <p className="text-sm text-gray-600">Você selecionou <strong>{selecionadas.size}</strong> foto(s). O que deseja fazer?</p>
            <div className="flex flex-col gap-2 pt-2">
              <button onClick={() => handleConfirmarSelecao(false)} className="w-full px-4 py-2.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                Apenas salvar (continuar selecionando)
              </button>
              <button onClick={() => handleConfirmarSelecao(true)} className="w-full px-4 py-2.5 text-sm font-medium text-white rounded-lg hover:opacity-90 transition" style={{ backgroundColor: acento }}>
                Finalizar seleção (não poderá alterar)
              </button>
              <button onClick={() => setShowConfirmDialog(false)} className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition">
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
            {album.permite_selecao && !selecaoConfirmada && (() => {
              const fotoId = fotos[lightbox]?.id;
              const sel = selecionadas.has(fotoId);
              return (
                <button onClick={(e) => { e.stopPropagation(); toggleSelecao(fotoId); }} className={`p-2 rounded-full backdrop-blur-sm transition-all ${sel ? 'bg-red-500 text-white' : 'bg-black/60 text-white/60 hover:text-white'}`}>
                  <Heart size={18} fill={sel ? 'white' : 'none'} />
                </button>
              );
            })()}
            {album.permite_download && (
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
// GalleryGrid component
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
