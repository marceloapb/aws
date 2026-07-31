import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '';

export default function AlbumPublico() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [senha, setSenha] = useState('');
  const [senhaErro, setSenhaErro] = useState(false);

  useEffect(() => { loadAlbum(); }, [slug]);

  const loadAlbum = async (senhaParam) => {
    try {
      const qs = senhaParam ? `?senha=${encodeURIComponent(senhaParam)}` : '';
      const res = await fetch(`${API}/public/album/${slug}${qs}`);
      const json = await res.json();
      if (json.success) {
        setAlbum(json.data);
        // Se requer senha, não redireciona
        if (!json.data.requer_senha) {
          // Auto-redirect: se só tem 1 galeria, vai direto para ela
          if (json.data.total_galerias === 1 && json.data.galerias?.length === 1) {
            // Não redireciona imediatamente — mostra capa primeiro
          }
        }
      }
    } catch {}
    setLoading(false);
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
    if (album.total_galerias === 1 && album.galerias?.length === 1) {
      // Galeria única — vai direto
      navigate(`/album/${slug}/set/${album.galerias[0].id}`);
    } else if (album.total_galerias > 1) {
      // Múltiplas galerias — mostra seleção
      navigate(`/album/${slug}/sets`);
    } else {
      // Fallback: todas as fotos
      navigate(`/album/${slug}/set/all`);
    }
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/60 text-lg">Álbum não encontrado ou expirado</p>
      </div>
    );
  }

  // Tela de senha
  if (album.requer_senha) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <Lock className="mx-auto mb-4 text-white/40" size={48} />
          <h1 className="text-2xl font-bold text-white mb-2">{album.titulo}</h1>
          <p className="text-white/50 text-sm mb-6">Este álbum é protegido por senha</p>
          <form onSubmit={handleSenha} className="space-y-3">
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite a senha"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/40"
            />
            {senhaErro && <p className="text-red-400 text-sm">Senha incorreta</p>}
            <button
              type="submit"
              className="w-full py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition"
            >
              Acessar
            </button>
          </form>
        </div>
      </div>
    );
  }

  const tema = album.tema || {};
  const cores = tema.cores || { fundo: '#1A1A1A', texto: '#FFFFFF', acento: '#EA580C' };
  const fonteTitulo = tema.fonte_titulo || 'Playfair Display';
  const capaLayout = tema.capa_layout || 'elegante';
  const coresCapa = tema.cores_capa || {};
  const corTexto = coresCapa.texto || '#FFFFFF';
  const corOverlay = coresCapa.overlay || '#121212';
  const textoBtn = tema.texto_botao || 'Ver fotos';
  const nomeNegocio = (tema.info_negocio !== false) ? (album.nome_negocio || tema.nome_negocio || '') : '';

  // Formatar data
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!d) return dateStr;
    return `${d}/${m}/${y}`;
  };

  const dataEvento = (tema.mais_info !== false) && album.data_evento ? formatDate(album.data_evento) : '';

  // Layout: split
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
            {textoBtn} →
          </button>
        </div>
      </div>
    );
  }

  // Layout: editorial
  if (capaLayout === 'editorial') {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="px-8 md:px-16 py-8 md:py-12 border-b" style={{ backgroundColor: corOverlay, color: corTexto, borderColor: `${corTexto}15` }}>
          {nomeNegocio && <p className="text-sm md:text-base opacity-50 mb-2 tracking-widest uppercase" style={{ fontFamily: tema.fonte_corpo }}>{nomeNegocio}</p>}
          <h1 className="text-4xl md:text-6xl font-bold" style={{ fontFamily: fonteTitulo }}>{album.titulo}</h1>
          <div className="flex items-center justify-between mt-3">
            {dataEvento && <p className="text-base md:text-lg opacity-60" style={{ fontFamily: tema.fonte_corpo }}>{dataEvento}</p>}
            <button onClick={handleVerFotos} className="text-sm md:text-base opacity-60 hover:opacity-100 flex items-center gap-2 transition ml-auto" style={{ fontFamily: tema.fonte_corpo }}>
              {textoBtn} →
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden relative">
          {album.capa_url && <img src={album.capa_url} alt="" className="w-full h-full object-cover" style={{ minHeight: '50vh' }} />}
        </div>
      </div>
    );
  }

  // Layout: cinematico
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
              {textoBtn} →
            </button>
          </div>
        </div>
        <div className="h-16 md:h-24 bg-black" />
      </div>
    );
  }

  // Layout: full
  if (capaLayout === 'full') {
    return (
      <div className="relative min-h-screen cursor-pointer" onClick={handleVerFotos}>
        {album.capa_url && <img src={album.capa_url} alt="" className="w-full h-full min-h-screen object-cover" />}
        {!album.capa_url && <div className="w-full min-h-screen bg-gray-800" />}
        <div className="absolute bottom-8 right-8 opacity-60">
          <span className="text-xs text-white bg-black/40 px-3 py-2 rounded-full backdrop-blur-sm flex items-center gap-2" style={{ fontFamily: tema.fonte_corpo }}>
            {textoBtn} →
          </span>
        </div>
      </div>
    );
  }

  // Layout: minimalista
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
          {textoBtn} →
        </button>
      </div>
    );
  }

  // Layout: elegante / ousado (default)
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: corOverlay }}>
      {album.capa_url && (
        <div className="absolute inset-0">
          <img src={album.capa_url} alt="" className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0" style={{ backgroundColor: corOverlay + '80' }} />
        </div>
      )}
      <div className={`relative z-10 min-h-screen flex flex-col p-8 md:p-16 ${capaLayout === 'ousado' ? 'justify-center items-center text-center' : 'justify-end'}`} style={{ color: corTexto }}>
        {nomeNegocio && <p className="text-sm opacity-70 mb-3 tracking-widest uppercase" style={{ fontFamily: tema.fonte_corpo }}>{nomeNegocio}</p>}
        <h1 className={`font-bold mb-2 ${capaLayout === 'ousado' ? 'text-5xl md:text-7xl' : 'text-4xl md:text-6xl'}`} style={{ fontFamily: fonteTitulo }}>{album.titulo}</h1>
        {dataEvento && <p className="text-sm opacity-70 mt-2" style={{ fontFamily: tema.fonte_corpo }}>{dataEvento}</p>}
        <button onClick={handleVerFotos} className="mt-8 text-sm opacity-70 hover:opacity-100 flex items-center gap-2 transition" style={{ fontFamily: tema.fonte_corpo }}>
          {textoBtn} →
        </button>
      </div>
    </div>
  );
}
