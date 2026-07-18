import React, { useState, useEffect } from 'react';
import { Camera, Users, Award, Heart } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '';

const DEFAULT_STATS = [
  { icon: Camera, numero: '500+', label: 'Sessões realizadas' },
  { icon: Users, numero: '300+', label: 'Clientes atendidos' },
  { icon: Award, numero: '10+', label: 'Anos de experiência' },
  { icon: Heart, numero: '100%', label: 'Dedicação' },
];

const ICON_MAP = {
  camera: Camera,
  users: Users,
  award: Award,
  heart: Heart,
};

export default function SobrePage() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/public/site/paginas/sobre`)
      .then(r => r.json())
      .then(data => setPageData(data.data || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const foto = pageData?.foto || pageData?.blocos?.foto;
  const bio = pageData?.bio || pageData?.blocos?.bio || pageData?.conteudo;
  const numeros = pageData?.numeros || pageData?.blocos?.numeros || [];
  const titulo = pageData?.titulo || pageData?.blocos?.titulo || 'Sobre';

  const statsToShow = numeros.length > 0
    ? numeros.map(n => ({
        icon: ICON_MAP[n.icone] || Camera,
        numero: n.numero || n.valor,
        label: n.label || n.texto,
      }))
    : DEFAULT_STATS;

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 animate-pulse">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="aspect-[3/4] bg-stone-900 rounded-2xl" />
            <div className="space-y-4">
              <div className="h-8 bg-stone-800 rounded w-1/2" />
              <div className="h-4 bg-stone-800 rounded w-full" />
              <div className="h-4 bg-stone-800 rounded w-5/6" />
              <div className="h-4 bg-stone-800 rounded w-4/5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Hero section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Photo */}
            <div className="relative">
              {foto ? (
                <img
                  src={foto}
                  alt="Sobre"
                  className="w-full aspect-[3/4] object-cover rounded-2xl shadow-2xl"
                />
              ) : (
                <div className="w-full aspect-[3/4] bg-stone-900 rounded-2xl flex items-center justify-center">
                  <Camera size={64} className="text-stone-700" />
                </div>
              )}
              {/* Decorative accent */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#EA580C]/20 rounded-2xl -z-10" />
            </div>

            {/* Bio */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-stone-50 mb-6">
                {titulo}
              </h1>
              {bio ? (
                <div
                  className="prose prose-invert max-w-none text-stone-300 leading-relaxed
                    prose-headings:text-stone-50 prose-strong:text-stone-50 prose-a:text-[#EA580C]"
                  dangerouslySetInnerHTML={{ __html: bio }}
                />
              ) : (
                <p className="text-stone-400 leading-relaxed">
                  Fotógrafo apaixonado por contar histórias através de imagens.
                  Cada clique é uma oportunidade de capturar a essência de um momento único.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Number Cards */}
      <section className="py-16 bg-stone-900/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {statsToShow.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="bg-stone-900/50 border border-stone-800 rounded-xl p-6 text-center hover:border-[#EA580C]/30 transition-colors"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#EA580C]/10 flex items-center justify-center mb-4">
                    <Icon size={24} className="text-[#EA580C]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-stone-50 mb-1">
                    {stat.numero}
                  </div>
                  <div className="text-sm text-stone-400">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
