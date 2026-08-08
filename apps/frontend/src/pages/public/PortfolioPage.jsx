import React, { useState, useEffect } from 'react';
import { Camera, X, Eye, ArrowUpRight } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '';
const ACCENT = '#ff5c00';

export default function PortfolioPage() {
  const [categorias, setCategorias] = useState([]);
  const [allFotos, setAllFotos] = useState([]);
  const [filter, setFilter] = useState('Todos');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/public/portfolio`)
      .then(r => r.json())
      .then(data => {
        const portfolio = data.data || data;
        if (portfolio?.categorias) {
          setCategorias(portfolio.categorias);
          // Flatten all photos with category info
          const fotos = [];
          portfolio.categorias.forEach(cat => {
            (cat.fotos || []).forEach((f, i) => {
              fotos.push({
                id: `${cat.id}-${i}`,
                category: cat.nome,
                title: f.titulo || cat.nome,
                img: f.url || f.thumb_url || '',
                img_full: f.url_full || f.url || f.thumb_url || '',
              });
            });
          });
          setAllFotos(fotos);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = ['Todos', ...categorias.map(c => c.nome)];
  const filtered = filter === 'Todos' ? allFotos : allFotos.filter(f => f.category === filter);

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Lightbox */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(13,13,13,0.97)' }} onClick={() => setSelected(null)}>
          <button className="absolute top-4 right-4 sm:top-6 sm:right-8 w-10 h-10 flex items-center justify-center transition-all hover:border-orange-500 hover:text-orange-500"
            style={{ border: '1px solid rgba(255,255,255,0.15)', color: '#f0ece4' }}>
            <X size={18} />
          </button>
          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center gap-5 p-4 sm:p-6 w-full" onClick={e => e.stopPropagation()}>
            <img src={selected.img_full || selected.img} alt={selected.title} className="max-h-[75vh] object-contain shadow-2xl" />
            <div className="flex gap-4 items-center">
              <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: ACCENT }}>{selected.category}</span>
              <span className="w-px h-3 bg-stone-700" />
              <span className="font-bold text-lg uppercase tracking-wide text-stone-100">{selected.title}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <section className="pt-12 sm:pt-16 pb-6 sm:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.45em] uppercase mb-2 flex items-center gap-2" style={{ color: ACCENT }}>
                <span className="w-4 h-px inline-block" style={{ background: ACCENT }} />
                Portfolio
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase leading-none text-stone-50" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Trabalhos Selecionados
              </h1>
            </div>

            {/* Category filters */}
            <div className="flex gap-2 flex-wrap">
              {categories.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 sm:px-4 py-1.5 text-[10px] tracking-widest uppercase font-bold transition-all duration-200"
                  style={filter === f
                    ? { background: ACCENT, color: '#0d0d0d', boxShadow: '0 0 16px rgba(255,92,0,0.3)' }
                    : { border: '1px solid rgba(255,255,255,0.08)', color: '#8a8a8a' }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="pb-16 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          {loading ? (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="break-inside-avoid aspect-[3/4] bg-stone-900 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Camera size={48} className="mx-auto text-stone-700 mb-4" />
              <p className="text-stone-500 text-lg">Nenhuma foto disponível no momento.</p>
            </div>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
              {filtered.map(item => (
                <div key={item.id} className="break-inside-avoid relative group overflow-hidden cursor-pointer"
                  onClick={() => setSelected(item)} style={{ background: '#1f1f1f' }}>
                  <img src={item.img} alt={item.title} loading="lazy"
                    className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]" />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 sm:p-4"
                    style={{ background: 'linear-gradient(to top, rgba(13,13,13,0.95), rgba(13,13,13,0.2), transparent)' }}>
                    <span className="font-mono text-[9px] tracking-[0.35em] uppercase" style={{ color: ACCENT }}>{item.category}</span>
                    <p className="font-bold text-base uppercase leading-tight text-stone-100 mt-0.5">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Eye size={11} style={{ color: ACCENT }} />
                      <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: ACCENT }}>Ver foto</span>
                    </div>
                  </div>
                  {/* Top-right arrow on hover */}
                  <div className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: ACCENT }}>
                    <ArrowUpRight size={12} style={{ color: '#0d0d0d' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Google Font for Barlow Condensed */}
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&display=swap" rel="stylesheet" />
    </div>
  );
}
