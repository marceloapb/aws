import React, { useState, useEffect, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { MessageCircle, Camera, Phone, Mail, MapPin } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '';

export default function ContatoPage() {
  const { config } = useOutletContext() || {};
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visibleElements, setVisibleElements] = useState(new Set());
  const observerRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/public/site/paginas/contato`)
      .then(r => r.json())
      .then(data => setPageData(data.data || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Scroll-triggered animation observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleElements((prev) => new Set([...prev, entry.target.dataset.animId]));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = document.querySelectorAll('[data-anim-id]');
    elements.forEach((el) => observerRef.current.observe(el));

    return () => observerRef.current?.disconnect();
  }, [loading]);

  const isVisible = (id) => visibleElements.has(id);

  const whatsapp = config?.whatsapp || pageData?.whatsapp;
  const telefone = config?.telefone || pageData?.telefone;
  const email = config?.email || pageData?.email;
  const cidade = config?.cidade || pageData?.cidade;
  const titulo = pageData?.titulo || 'Entre em Contato';
  const subtitulo = pageData?.subtitulo || 'Estamos prontos para transformar seus momentos em memórias eternas.';

  const whatsappLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=Olá! Gostaria de saber mais sobre os serviços de fotografia.`
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 animate-pulse">
          <div className="h-10 bg-stone-800/50 rounded w-1/3 mb-4" />
          <div className="h-4 bg-stone-800/30 rounded w-2/3 mb-16" />
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="h-80 bg-stone-900/50 rounded-3xl" />
            <div className="space-y-6">
              <div className="h-48 bg-stone-900/30 rounded-2xl" />
              <div className="h-48 bg-stone-900/30 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 relative overflow-hidden">
      {/* Keyframes & Background Styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(3deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes typewriter {
          from { width: 0; }
          to { width: 100%; }
        }
        @keyframes grid-fade {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.06; }
        }
        .anim-visible {
          animation: fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .anim-hidden {
          opacity: 0;
          transform: translateY(30px);
        }
        .card-glow-green:hover {
          box-shadow: 0 0 40px rgba(34, 197, 94, 0.15), 0 0 80px rgba(34, 197, 94, 0.05);
        }
        .card-glow-orange:hover {
          box-shadow: 0 0 40px rgba(234, 88, 12, 0.15), 0 0 80px rgba(234, 88, 12, 0.05);
        }
        .icon-pulse:hover .icon-inner {
          animation: pulse-glow 1.5s ease-in-out infinite;
        }
        .bg-grid {
          background-image: radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: grid-fade 8s ease-in-out infinite;
        }
        .orb-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>

      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-grid pointer-events-none" />

      {/* Floating Dots Decoration */}
      <div className="absolute top-20 left-10 w-2 h-2 rounded-full bg-[#EA580C]/20 orb-float" style={{ animationDelay: '0s' }} />
      <div className="absolute top-40 right-20 w-1.5 h-1.5 rounded-full bg-white/10 orb-float" style={{ animationDelay: '1s' }} />
      <div className="absolute top-60 left-1/4 w-1 h-1 rounded-full bg-[#EA580C]/15 orb-float" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-40 right-1/3 w-2 h-2 rounded-full bg-white/5 orb-float" style={{ animationDelay: '3s' }} />
      <div className="absolute bottom-60 left-16 w-1.5 h-1.5 rounded-full bg-[#EA580C]/10 orb-float" style={{ animationDelay: '4s' }} />

      {/* Header - Bold Asymmetric */}
      <section className="pt-20 sm:pt-28 pb-12 sm:pb-16 relative z-10">
        <div
          className={`max-w-6xl mx-auto px-4 sm:px-6 ${isVisible('header') ? 'anim-visible' : 'anim-hidden'}`}
          data-anim-id="header"
        >
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-stone-50 leading-[1.1] mb-5">
              {titulo.split(' ').map((word, i, arr) => (
                <span key={i}>
                  {i === arr.length - 1 ? (
                    <span className="text-[#EA580C]">{word}</span>
                  ) : (
                    word
                  )}{' '}
                </span>
              ))}
            </h1>
            <p className="text-stone-500 text-lg sm:text-xl font-light tracking-wide font-mono">
              {'// '}{subtitulo}
            </p>
          </div>
        </div>
      </section>

      {/* Main Layout - Two Columns */}
      <section className="pb-20 sm:pb-28 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left - Decorative Element */}
            <div
              className={`hidden lg:flex items-center justify-center ${isVisible('orb') ? 'anim-visible' : 'anim-hidden'}`}
              data-anim-id="orb"
            >
              <div className="relative w-80 h-80">
                {/* Gradient Orb */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#EA580C]/20 via-orange-600/5 to-transparent blur-3xl orb-float" />
                <div className="absolute inset-8 rounded-full bg-gradient-to-tr from-[#EA580C]/10 via-transparent to-stone-800/20 blur-2xl orb-float" style={{ animationDelay: '1s' }} />
                {/* Geometric Shape */}
                <div className="absolute inset-12 border border-[#EA580C]/20 rounded-3xl rotate-12 orb-float" style={{ animationDelay: '0.5s' }} />
                <div className="absolute inset-16 border border-white/5 rounded-2xl -rotate-6 orb-float" style={{ animationDelay: '1.5s' }} />
                <div className="absolute inset-20 border border-[#EA580C]/10 rounded-xl rotate-3 orb-float" style={{ animationDelay: '2s' }} />
                {/* Center Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                    <Camera size={36} className="text-[#EA580C]/70" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Contact Cards */}
            <div className="space-y-6">
              {/* WhatsApp Card */}
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`icon-pulse group block p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-green-500/30 transition-all duration-500 card-glow-green ${isVisible('whatsapp') ? 'anim-visible' : 'anim-hidden'}`}
                  data-anim-id="whatsapp"
                  style={{ animationDelay: '0.1s' }}
                >
                  <div className="flex items-start gap-5">
                    <div className="relative shrink-0">
                      <div className="icon-inner w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:bg-green-500/20 transition-all duration-500">
                        <MessageCircle size={26} className="text-green-400" />
                      </div>
                      <div className="absolute -inset-1 rounded-2xl bg-green-500/0 group-hover:bg-green-500/5 blur-md transition-all duration-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-stone-50 mb-1.5 group-hover:text-green-50 transition-colors">
                        WhatsApp
                      </h3>
                      <p className="text-stone-400 text-sm leading-relaxed mb-4">
                        Converse diretamente conosco. Respondemos rápido!
                      </p>
                      <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-medium text-sm group-hover:bg-green-500 group-hover:text-white group-hover:border-green-500 transition-all duration-300">
                        Abrir WhatsApp
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                      </span>
                    </div>
                  </div>
                </a>
              )}

              {/* Orçamento Card */}
              <Link
                to="/login"
                className={`icon-pulse group block p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-[#EA580C]/30 transition-all duration-500 card-glow-orange ${isVisible('orcamento') ? 'anim-visible' : 'anim-hidden'}`}
                data-anim-id="orcamento"
                style={{ animationDelay: '0.25s' }}
              >
                <div className="flex items-start gap-5">
                  <div className="relative shrink-0">
                    <div className="icon-inner w-14 h-14 rounded-2xl bg-[#EA580C]/10 border border-[#EA580C]/20 flex items-center justify-center group-hover:bg-[#EA580C]/20 transition-all duration-500">
                      <Camera size={26} className="text-[#EA580C]" />
                    </div>
                    <div className="absolute -inset-1 rounded-2xl bg-[#EA580C]/0 group-hover:bg-[#EA580C]/5 blur-md transition-all duration-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-stone-50 mb-1.5 group-hover:text-orange-50 transition-colors">
                      Orçamento Online
                    </h3>
                    <p className="text-stone-400 text-sm leading-relaxed mb-4">
                      Solicite seu orçamento personalizado em poucos cliques.
                    </p>
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#EA580C]/10 border border-[#EA580C]/20 text-[#EA580C] font-medium text-sm group-hover:bg-[#EA580C] group-hover:text-white group-hover:border-[#EA580C] transition-all duration-300">
                      Solicitar Orçamento
                      <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Info - Horizontal with Dividers */}
      <section className="pb-20 sm:pb-28 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div
            className={`bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-10 ${isVisible('info') ? 'anim-visible' : 'anim-hidden'}`}
            data-anim-id="info"
            style={{ animationDelay: '0.4s' }}
          >
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#EA580C] mb-8">
              {'// '}Informações
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8 sm:gap-4">
              {telefone && (
                <div className="icon-pulse group flex items-center gap-4">
                  <div className="relative">
                    <div className="icon-inner w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#EA580C]/30 transition-all duration-500">
                      <Phone size={20} className="text-stone-400 group-hover:text-[#EA580C] transition-colors duration-500" />
                    </div>
                    <div className="absolute -inset-1 rounded-xl bg-[#EA580C]/0 group-hover:bg-[#EA580C]/5 blur-md transition-all duration-500" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-600 uppercase tracking-wider mb-0.5">Telefone</p>
                    <p className="text-stone-200 font-medium">{telefone}</p>
                  </div>
                </div>
              )}

              {telefone && email && (
                <div className="hidden sm:block w-px h-12 bg-white/10" />
              )}

              {email && (
                <div className="icon-pulse group flex items-center gap-4">
                  <div className="relative">
                    <div className="icon-inner w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#EA580C]/30 transition-all duration-500">
                      <Mail size={20} className="text-stone-400 group-hover:text-[#EA580C] transition-colors duration-500" />
                    </div>
                    <div className="absolute -inset-1 rounded-xl bg-[#EA580C]/0 group-hover:bg-[#EA580C]/5 blur-md transition-all duration-500" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-600 uppercase tracking-wider mb-0.5">E-mail</p>
                    <a href={`mailto:${email}`} className="text-stone-200 font-medium hover:text-[#EA580C] transition-colors duration-300">
                      {email}
                    </a>
                  </div>
                </div>
              )}

              {email && cidade && (
                <div className="hidden sm:block w-px h-12 bg-white/10" />
              )}

              {cidade && (
                <div className="icon-pulse group flex items-center gap-4">
                  <div className="relative">
                    <div className="icon-inner w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#EA580C]/30 transition-all duration-500">
                      <MapPin size={20} className="text-stone-400 group-hover:text-[#EA580C] transition-colors duration-500" />
                    </div>
                    <div className="absolute -inset-1 rounded-xl bg-[#EA580C]/0 group-hover:bg-[#EA580C]/5 blur-md transition-all duration-500" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-600 uppercase tracking-wider mb-0.5">Localização</p>
                    <p className="text-stone-200 font-medium">{cidade}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
