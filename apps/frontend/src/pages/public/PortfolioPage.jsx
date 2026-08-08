import React, { useState, useEffect } from 'react';
import { Camera, X, Eye, ArrowLeft, ArrowUpRight } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '';
const ACCENT = '#ff5c00';

export default function PortfolioPage() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGaleria, setSelectedGaleria] = useState(null);
  const [selectedFoto, setSelectedFoto] = useState(null);

  useEffect(() => {
    fetch(`${API}/public/portfolio`)
      .then(r => r.json())
      .then(data => {
        const portfolio = data.data || data;
        if (portfolio?.categorias) {
          setCategorias(portfolio.categorias);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Lightbox ──
  if (selectedFoto) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(13,13,13,0.97)' }} onClick={() => setSelectedFoto(null)}>
        <button className="absolute top-4 right-4 sm:top-6 sm:right-8 w-10 h-10 flex items-center justify-center transition-all hover:border-orange-500 hover:text-orange-500"
          style={{ border: '1px solid rgba(255,255,255,0.15)', color: '#f0ece4' }}>
          <X size={18} />
        </button>
        <div className="max-w-4xl max-h-[85vh] flex flex-col items-center gap-5 p-4 sm:p-6 w-full" onClick={e => e.stopPropagation()}>
          <img src={selectedFoto.img_full || selectedFoto.img} alt={selectedFoto.title} className="max-h-[75vh] object-contain shadow-2xl" />
          {selectedFoto.title && (
            <p className="font-bold text-lg uppercase tracking-wide text-stone-100">{selectedFoto.title}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Galeria aberta (fotos da categoria) ──
  if (selectedGaleria) {
    const fotos = (selectedGaleria.fotos || []).map((f, i) => ({
      id: `${selectedGaleria.id}-${i}`,
      title: f.titulo || '',
      img: f.url || f.thumb_url || '',
      img_full: f.url_full || f.url || f.thumb_url || '',
    }));

    return (
      <div className="min-h-screen bg-stone-950">
        {/* Header da galeria */}
        <section className="pt-10 sm:pt-14 pb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
            <button onClick={() => setSelectedGaleria(null)}
              className="flex items-center gap-2 text-sm font-medium mb-6 transition-colors hover:opacity-80" style={{ color: ACCENT }}>
              <ArrowLeft size={16} /> Voltar às galerias
            </button>
            <p className="font-mono text-[10px] tracking-[0.45em] uppercase mb-2 flex items-center gap-2" style={{ color: ACCENT }}>
              <span className="w-4 h-px inline-block" style={{ background: ACCENT }} />
              {selectedGaleria.nome}
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase leading-none text-stone-50" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {selectedGaleria.nome}
            </h1>
            {selectedGaleria.texto && (
              <p className="text-stone-400 text-sm mt-3 max-w-xl">{selectedGaleria.texto}</p>
            )}
            <p className="text-stone-500 text-xs mt-2 font-mono">{fotos.length} foto{fotos.length !== 1 ? 's' : ''}</p>
          </div>
        </section>

        {/* Grid masonry de fotos */}
        <section className="pb-16 sm:pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
            {fotos.length === 0 ? (
              <div className="text-center py-20">
                <Camera size={48} className="mx-auto text-stone-700 mb-4" />
                <p className="text-stone-500">Nenhuma foto nesta galeria.</p>
              </div>
            ) : (
              <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
                {fotos.map(foto => (
                  <div key={foto.id} className="break-inside-avoid relative group overflow-hidden cursor-pointer"
                    onClick={() => setSelectedFoto(foto)} style={{ background: '#1f1f1f' }}>
                    <img src={foto.img} alt={foto.title} loading="lazy"
                      className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 sm:p-4"
                      style={{ background: 'linear-gradient(to top, rgba(13,13,13,0.95), rgba(13,13,13,0.2), transparent)' }}>
                      {foto.title && <p className="font-bold text-sm uppercase leading-tight text-stone-100">{foto.title}</p>}
                      <div className="flex items-center gap-2 mt-1.5">
                        <Eye size={11} style={{ color: ACCENT }} />
                        <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: ACCENT }}>Ver foto</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&display=swap" rel="stylesheet" />
      </div>
    );
  }

  // ── Listagem de galerias (categorias) ──
  return (
    <div className="min-h-screen bg-stone-950">
      {/* Header */}
      <section className="pt-12 sm:pt-16 pb-6 sm:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <p className="font-mono text-[10px] tracking-[0.45em] uppercase mb-2 flex items-center gap-2" style={{ color: ACCENT }}>
            <span className="w-4 h-px inline-block" style={{ background: ACCENT }} />
            Portfolio
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase leading-none text-stone-50" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Galerias
          </h1>
          <p className="text-stone-400 text-sm mt-3">Selecione uma galeria para ver as fotos.</p>
        </div>
      </section>

      {/* Grid de galerias */}
      <section className="pb-16 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] bg-stone-900 animate-pulse" />
              ))}
            </div>
          ) : categorias.length === 0 ? (
            <div className="text-center py-20">
              <Camera size={48} className="mx-auto text-stone-700 mb-4" />
              <p className="text-stone-500 text-lg">Nenhuma galeria disponível no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {categorias.map(cat => {
                const capa = cat.fotos?.[0];
                const qtd = (cat.fotos || []).length;

                return (
                  <div key={cat.id} onClick={() => setSelectedGaleria(cat)}
                    className="group relative aspect-[4/3] overflow-hidden cursor-pointer" style={{ background: '#1f1f1f' }}>
                    {/* Cover image */}
                    {capa?.url || capa?.thumb_url ? (
                      <img src={capa.url || capa.thumb_url} alt={cat.nome} loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Camera size={40} className="text-stone-700" />
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(13,13,13,0.9), rgba(13,13,13,0.1), transparent)' }} />

                    {/* Hover overlay */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'rgba(255,92,0,0.08)' }} />

                    {/* Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h2 className="font-black text-xl uppercase tracking-wide text-stone-50 group-hover:text-orange-400 transition-colors"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                        {cat.nome}
                      </h2>
                      {cat.texto && <p className="text-stone-300 text-xs mt-1 line-clamp-1">{cat.texto}</p>}
                      <p className="text-stone-500 text-[10px] font-mono tracking-widest uppercase mt-2">{qtd} foto{qtd !== 1 ? 's' : ''}</p>
                    </div>

                    {/* Top-right arrow */}
                    <div className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: ACCENT }}>
                      <ArrowUpRight size={14} style={{ color: '#0d0d0d' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&display=swap" rel="stylesheet" />
    </div>
  );
}
