import React, { useState, useEffect, useRef } from 'react';
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

function useInView(options = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.15, ...options });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
}

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

  const [heroRef, heroVisible] = useInView();
  const [statsRef, statsVisible] = useInView();
  const [techRef, techVisible] = useInView();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 animate-pulse">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="aspect-[3/4] bg-stone-900/50 rounded-2xl" />
            <div className="space-y-4 flex flex-col justify-center">
              <div className="h-10 bg-stone-800/50 rounded w-2/3" />
              <div className="h-4 bg-stone-800/30 rounded w-full" />
              <div className="h-4 bg-stone-800/30 rounded w-5/6" />
              <div className="h-4 bg-stone-800/30 rounded w-4/5" />
              <div className="h-4 bg-stone-800/30 rounded w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 overflow-hidden">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes countUp {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes lineGrow {
          from {
            width: 0;
          }
          to {
            width: 80px;
          }
        }
        @keyframes glowPulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(234, 88, 12, 0.3), 0 0 40px rgba(234, 88, 12, 0.1);
          }
          50% {
            box-shadow: 0 0 30px rgba(234, 88, 12, 0.5), 0 0 60px rgba(234, 88, 12, 0.2);
          }
        }
        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
        @keyframes borderGlow {
          0%, 100% {
            border-color: rgba(234, 88, 12, 0.2);
          }
          50% {
            border-color: rgba(234, 88, 12, 0.6);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animate-fade-in-up-delay-1 {
          animation: fadeInUp 0.8s ease-out 0.2s forwards;
          opacity: 0;
        }
        .animate-fade-in-up-delay-2 {
          animation: fadeInUp 0.8s ease-out 0.4s forwards;
          opacity: 0;
        }
        .animate-fade-in-up-delay-3 {
          animation: fadeInUp 0.8s ease-out 0.6s forwards;
          opacity: 0;
        }
        .animate-count-up {
          animation: countUp 0.6s ease-out forwards;
          opacity: 0;
        }
        .animate-line-grow {
          animation: lineGrow 1s ease-out 0.5s forwards;
          width: 0;
        }
        .photo-glow {
          animation: glowPulse 3s ease-in-out infinite;
        }
        .shimmer-text {
          background: linear-gradient(90deg, #ffffff 0%, #EA580C 50%, #ffffff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .border-animate {
          animation: borderGlow 2s ease-in-out infinite;
        }
      `}</style>

      {/* Hero Section - Diagonal Split */}
      <section ref={heroRef} className="relative min-h-[90vh] flex items-center">
        {/* Diagonal Background Split */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, transparent 50%, rgba(234, 88, 12, 0.03) 50%)',
            }}
          />
          {/* Ambient glow */}
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#EA580C]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-[#EA580C]/3 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 w-full">
          <div className={`grid md:grid-cols-2 gap-8 lg:gap-16 items-center transition-all duration-1000 opacity-100`}>
            {/* Photo with Modern Frame & Glow */}
            <div className="relative group animate-fade-in-up">>
              <div className="relative">
                {/* Outer glow frame */}
                <div className="absolute -inset-1 bg-gradient-to-br from-[#EA580C]/40 via-transparent to-[#EA580C]/20 rounded-2xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity" />
                
                {/* Photo container */}
                <div className="relative border-2 border-[#EA580C]/30 rounded-2xl overflow-hidden photo-glow">
                  {foto ? (
                    <img
                      src={foto}
                      alt="Sobre"
                      className="w-full aspect-[3/4] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[3/4] bg-stone-900 flex items-center justify-center">
                      <Camera size={80} className="text-stone-700" />
                    </div>
                  )}
                  
                  {/* Orange gradient overlay edge */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#EA580C]/10" />
                  <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-stone-950/80 to-transparent" />
                </div>

                {/* Corner accents */}
                <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-[#EA580C] rounded-tl-lg" />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-[#EA580C] rounded-br-lg" />
              </div>
            </div>

            {/* Bio Content */}
            <div className="flex flex-col justify-center animate-fade-in-up-delay-1">
              {/* Title with accent keyword */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-50 mb-2 leading-tight">
                {titulo === 'Sobre' ? (
                  <>Sobre <span className="text-[#EA580C]">Mim</span></>
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: titulo.replace(/(\w+)$/, '<span class="text-[#EA580C]">$1</span>') }} />
                )}
              </h1>

              {/* Animated accent line */}
              <div className={`h-0.5 bg-gradient-to-r from-[#EA580C] to-transparent mb-8 mt-4 ${heroVisible ? 'animate-line-grow' : 'w-0'}`} />

              {/* Bio text */}
              {bio ? (
                <div
                  className="prose prose-invert prose-lg max-w-none text-stone-300 leading-relaxed
                    prose-headings:text-stone-50 prose-strong:text-[#EA580C] prose-a:text-[#EA580C]
                    prose-a:no-underline hover:prose-a:underline"
                  dangerouslySetInnerHTML={{ __html: bio }}
                />
              ) : (
                <p className="text-stone-300 text-lg leading-relaxed">
                  Fotógrafo apaixonado por contar histórias através de imagens.
                  Cada clique é uma oportunidade de capturar a <span className="text-[#EA580C] font-medium">essência</span> de um momento único.
                  Combinando <span className="text-stone-50 font-medium">tecnologia</span> e arte para criar memórias que duram para sempre.
                </p>
              )}

              {/* Subtle tech detail */}
              <div className="mt-8 flex items-center gap-3 text-stone-500 text-sm">
                <div className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />
                <span className="font-mono tracking-wider">FOTÓGRAFO • ARTISTA • TECH</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Large Numbers with Gradient */}
      <section ref={statsRef} className="py-20 sm:py-28 relative">
        {/* Background subtle pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950 via-stone-900/20 to-stone-950" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className={`transition-all duration-1000 ${statsVisible ? 'opacity-100' : 'opacity-0'}`}>
            {/* Section header */}
            <div className={`text-center mb-16 ${statsVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-50 mb-3">
                Em <span className="text-[#EA580C]">Números</span>
              </h2>
              <div className="w-12 h-0.5 bg-[#EA580C]/50 mx-auto" />
            </div>

            {/* Stats Grid - Glassmorphism Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {statsToShow.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={idx}
                    className={`group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 text-center
                      hover:bg-white/10 hover:border-[#EA580C]/30 transition-all duration-500
                      ${statsVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
                    style={{ animationDelay: statsVisible ? `${idx * 0.15}s` : '0s' }}
                  >
                    {/* Icon */}
                    <div className="w-12 h-12 mx-auto rounded-xl bg-[#EA580C]/10 border border-[#EA580C]/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                      <Icon size={22} className="text-[#EA580C]" />
                    </div>

                    {/* Number with gradient */}
                    <div
                      className={`text-3xl sm:text-4xl lg:text-5xl font-black mb-2 bg-gradient-to-b from-white to-[#EA580C] bg-clip-text text-transparent
                        ${statsVisible ? 'animate-count-up' : 'opacity-0'}`}
                      style={{ animationDelay: statsVisible ? `${0.3 + idx * 0.15}s` : '0s' }}
                    >
                      {stat.numero}
                    </div>

                    {/* Label */}
                    <div className="text-sm text-stone-400 font-medium tracking-wide">
                      {stat.label}
                    </div>

                    {/* Hover glow */}
                    <div className="absolute inset-0 rounded-2xl bg-[#EA580C]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Equipamentos & Tech Section */}
      <section ref={techRef} className="py-16 sm:py-24 relative">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className={`transition-all duration-1000 ${techVisible ? 'opacity-100' : 'opacity-0'}`}>
            {/* Glowing separator line */}
            <div className={`relative mb-16 ${techVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
              <div className="h-px bg-gradient-to-r from-transparent via-[#EA580C]/50 to-transparent" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-4 bg-[#EA580C]/20 blur-xl" />
            </div>

            {/* Section title */}
            <div className={`text-center mb-12 ${techVisible ? 'animate-fade-in-up-delay-1' : 'opacity-0'}`}>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-50 mb-3">
                Equipamentos & <span className="text-[#EA580C]">Tech</span>
              </h2>
              <p className="text-stone-400 max-w-md mx-auto">
                Ferramentas que transformam visão em realidade
              </p>
            </div>

            {/* Tech Grid */}
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 ${techVisible ? 'animate-fade-in-up-delay-2' : 'opacity-0'}`}>
              {[
                { icon: Camera, label: 'Câmeras Pro' },
                { icon: Award, label: 'Lentes Premium' },
                { icon: Heart, label: 'Iluminação' },
                { icon: Users, label: 'Edição Avançada' },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 text-center
                      hover:border-[#EA580C]/40 border-animate transition-all duration-500"
                    style={{ animationDelay: `${idx * 0.5}s` }}
                  >
                    <div className="w-10 h-10 mx-auto rounded-lg bg-stone-800/50 flex items-center justify-center mb-3 group-hover:bg-[#EA580C]/10 transition-colors duration-300">
                      <Icon size={20} className="text-stone-400 group-hover:text-[#EA580C] transition-colors duration-300" />
                    </div>
                    <span className="text-sm text-stone-400 group-hover:text-stone-200 transition-colors duration-300 font-medium">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom glowing line */}
            <div className={`mt-16 ${techVisible ? 'animate-fade-in-up-delay-3' : 'opacity-0'}`}>
              <div className="h-px bg-gradient-to-r from-transparent via-[#EA580C]/30 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer spacer with ambient glow */}
      <div className="h-20 relative">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#EA580C]/20 to-transparent rounded-full" />
      </div>
    </div>
  );
}
