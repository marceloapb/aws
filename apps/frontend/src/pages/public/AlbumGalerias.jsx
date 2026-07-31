import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Download } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '';

export default function AlbumGalerias() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAlbum(); }, [slug]);

  const loadAlbum = async () => {
    try {
      const res = await fetch(`${API}/public/album/${slug}`);
      const json = await res.json();
      if (json.success && !json.data.requer_senha) {
        setAlbum(json.data);
      } else if (json.data?.requer_senha) {
        // Redireciona para a capa com senha
        navigate(`/album/${slug}`);
      }
    } catch {}
    setLoading(false);
  };

  const handleGaleriaClick = (galeriaId) => {
    navigate(`/album/${slug}/set/${galeriaId}`);
  };

  const handleShare = () => {
    const url = window.location.origin + `/album/${slug}`;
    if (navigator.share) {
      navigator.share({ title: album?.titulo, url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white/60 text-lg">Álbum não encontrado</p>
      </div>
    );
  }

  const galerias = album.galerias || [];
  const tema = album.tema || {};
  const cores = tema.cores || { fundo: '#1A1A1A', texto: '#FFFFFF' };
  const coresGalerias = tema.cores_galerias || {};
  const bgColor = coresGalerias.background || cores.fundo || '#1A1A1A';
  const textColor = coresGalerias.texto_icones || cores.texto || '#FFFFFF';

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor, fontFamily: tema.fonte_corpo || 'Inter' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-sm border-b" style={{ backgroundColor: `${bgColor}ee`, borderColor: `${textColor}10` }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between relative">
          <button
            onClick={() => navigate(`/album/${slug}`)}
            className="p-2 -ml-2 opacity-60 hover:opacity-100 transition-opacity z-10"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <h1 className="text-xl md:text-2xl font-semibold" style={{ fontFamily: tema.fonte_titulo || 'Playfair Display' }}>
              {album.titulo}
            </h1>
          </div>
          <div className="flex items-center gap-3 z-10">
            <button onClick={handleShare} className="flex items-center gap-1 text-sm opacity-60 hover:opacity-100 transition-opacity">
              <Share2 size={16} />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Gallery Grid */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className={`grid gap-6 ${galerias.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {galerias.map((galeria) => (
            <button
              key={galeria.id}
              onClick={() => handleGaleriaClick(galeria.id)}
              className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-800 text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              {/* Thumbnail */}
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

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

              {/* Gallery name centered */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-white text-xl md:text-2xl font-semibold drop-shadow-lg px-4 text-center"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
                >
                  {galeria.nome}
                </span>
              </div>

              {/* Photo count badge */}
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
