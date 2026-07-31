import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '';

export default function PortfolioPage() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Header */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-50 text-center mb-4">
            Portfólio
          </h1>
          <p className="text-stone-400 text-center max-w-2xl mx-auto">
            Conheça nosso trabalho. Cada foto é uma história contada com luz e emoção.
          </p>
        </div>
      </section>

      {/* Category Galleries Grid */}
      <section className="pb-16 sm:pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] bg-stone-900 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : categorias.length === 0 ? (
            <div className="text-center py-20">
              <Camera size={48} className="mx-auto text-stone-700 mb-4" />
              <p className="text-stone-500 text-lg">Nenhuma galeria disponível no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categorias.map(cat => {
                // Use first photo as cover
                const capa = cat.fotos?.[0];

                return (
                  <Link
                    key={cat.id}
                    to={`/portfolio/${cat.id}`}
                    className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-stone-900 block focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:ring-offset-2 focus:ring-offset-stone-950"
                  >
                    {/* Cover image */}
                    {capa?.url || capa?.thumb_url ? (
                      <img
                        src={capa.url || capa.thumb_url}
                        alt={cat.nome}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-stone-900">
                        <Camera size={40} className="text-stone-700" />
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-[#EA580C]/0 group-hover:bg-[#EA580C]/10 transition-colors duration-300" />

                    {/* Category info */}
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-[#EA580C] transition-colors">
                        {cat.nome}
                      </h2>
                      {cat.texto && (
                        <p className="text-stone-300 text-sm line-clamp-2 mt-1">{cat.texto}</p>
                      )}
                    </div>

                    {/* Top-right badge */}
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                      <span className="text-xs text-stone-200 font-medium">Ver galeria</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
