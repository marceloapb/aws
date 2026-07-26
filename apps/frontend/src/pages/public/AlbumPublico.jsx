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

  // Formatar data
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!d) return dateStr;
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: cores.fundo }}>
      {/* Background image - full screen cover */}
      {album.capa_url && (
        <div className="absolute inset-0">
          <img
            src={album.capa_url}
            alt=""
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
        </div>
      )}

      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex flex-col justify-between p-6 md:p-12">
        {/* Top - Logo/Brand */}
        <div>
          <p className="text-white/60 text-xs md:text-sm tracking-widest uppercase font-medium">
            Marcelo Bloise Fotografia
          </p>
        </div>

        {/* Bottom - Title, Date, CTA */}
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div className="max-w-lg">
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight"
              style={{ fontFamily: fonteTitulo, color: cores.acento }}
            >
              {album.titulo}
            </h1>
            {album.data_evento && (
              <p className="mt-3 text-lg md:text-xl" style={{ color: cores.acento, opacity: 0.8 }}>
                {formatDate(album.data_evento)}
              </p>
            )}
          </div>

          {/* CTA Button */}
          <button
            onClick={handleVerFotos}
            className="group flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm md:text-base"
          >
            <span>Ver fotos</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
