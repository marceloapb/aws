import React, { useState, useEffect, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight, Star, ChevronLeft, ChevronRight } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '';

export default function HomePage() {
  const { config } = useOutletContext() || {};
  const [blocos, setBlocos] = useState(null);
  const [depoimentos, setDepoimentos] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const intervalRef = useRef(null);

  // Intersection Observer refs for scroll-triggered animations
  const filmStripRef = useRef(null);
  const manifestoRef = useRef(null);
  const testimonialsRef = useRef(null);
  const ctaRef = useRef(null);
  const [filmStripVisible, setFilmStripVisible] = useState(false);
  const [manifestoVisible, setManifestoVisible] = useState(false);
  const [testimonialsVisible, setTestimonialsVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);

  useEffect(() => {
    fetch(`${API}/public/site/paginas/home`)
      .then(r => r.json())
      .then(data => setBlocos(data.data || data))
      .catch(() => {});

    fetch(`${API}/public/site/depoimentos`)
      .then(r => r.json())
      .then(data => setDepoimentos(data.data || data || []))
      .catch(() => {});
  }, []);

  // Auto-scroll testimonials
  useEffect(() => {
    if (depoimentos.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % depoimentos.length);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [depoimentos.length]);

  // Intersection Observer for scroll-triggered animations
  useEffect(() => {
    const observerOptions = { threshold: 0.15, rootMargin: '0px 0px -50px 0px' };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target === filmStripRef.current) setFilmStripVisible(true);
          if (entry.target === manifestoRef.current) setManifestoVisible(true);
          if (entry.target === testimonialsRef.current) setTestimonialsVisible(true);
          if (entry.target === ctaRef.current) setCtaVisible(true);
        }
      });
    }, observerOptions);

    if (filmStripRef.current) observer.observe(filmStripRef.current);
    if (manifestoRef.current) observer.observe(manifestoRef.current);
    if (testimonialsRef.current) observer.observe(testimonialsRef.current);
    if (ctaRef.current) observer.observe(ctaRef.current);

    return () => observer.disconnect();
  }, [blocos, depoimentos]);

  const heroImage = blocos?.hero_imagem || blocos?.blocos?.hero_imagem;
  const heroTitle = blocos?.hero_titulo || blocos?.blocos?.hero_titulo || 'Fotografia que conta histórias';
  const heroTagline = blocos?.hero_tagline || blocos?.blocos?.hero_tagline || 'Transformamos momentos em memórias eternas.';
  const manifesto = blocos?.manifesto || blocos?.blocos?.manifesto;
  const ctaText = blocos?.cta_texto || blocos?.blocos?.cta_texto || 'Vamos criar algo incrível juntos?';
  const ctaButton = blocos?.cta_botao || blocos?.blocos?.cta_botao || 'Solicitar Orçamento';

  const prevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + depoimentos.length) % depoimentos.length);
  };
  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % depoimentos.length);
  };

  // Generate placeholder thumbnails for film strip if no portfolio images
  const filmStripImages = blocos?.portfolio_destaque || blocos?.blocos?.portfolio_destaque || [];

  return (
    <div className="bg-stone-950 min-h-screen overflow-hidden">
      {/* Custom Keyframes */}
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes heroTextReveal {
          0% { opacity: 0; transform: translateY(20px); filter: blur(10px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes taglineReveal {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes filmScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(234, 88, 12, 0.3), 0 0 40px rgba(234, 88, 12, 0.1); }
          50% { box-shadow: 0 0 30px rgba(234, 88, 12, 0.5), 0 0 60px rgba(234, 88, 12, 0.2); }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes glowBar {
          0%, 100% { box-shadow: 0 0 15px rgba(234, 88, 12, 0.4); }
          50% { box-shadow: 0 0 30px rgba(234, 88, 12, 0.7), 0 0 50px rgba(234, 88, 12, 0.3); }
        }
        .animate-gradient-text {
          background: linear-gradient(135deg, #EA580C, #f97316, #fbbf24, #EA580C);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 4s ease infinite;
        }
        .animate-hero-reveal {
          animation: heroTextReveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-tagline {
          animation: taglineReveal 1s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards;
          opacity: 0;
        }
        .animate-buttons {
          animation: taglineReveal 1s cubic-bezier(0.16, 1, 0.3, 1) 1s forwards;
          opacity: 0;
        }
        .animate-film-scroll {
          animation: filmScroll 30s linear infinite;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in-left {
          animation: fadeInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in-right {
          animation: fadeInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
        }
        .animate-pulse-glow {
          animation: pulseGlow 3s ease-in-out infinite;
        }
        .animate-glow-bar {
          animation: glowBar 3s ease-in-out infinite;
        }
        .section-hidden {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .section-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* Hero Section - Full Viewport */}
      <section className="relative h-screen flex items-center overflow-hidden">
        {/* Background Image with Parallax Feel */}
        {heroImage && (
          <img
            src={heroImage}
            alt="Hero"
            className="absolute inset-0 w-full h-full object-cover scale-110 transform"
            style={{ willChange: 'transform' }}
          />
        )}

        {/* Dark overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/85 to-stone-950/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/50 via-transparent to-stone-950" />

        {/* Tech grid/dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(234, 88, 12, 0.3) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Subtle animated diagonal lines */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(234, 88, 12, 0.2) 35px, rgba(234, 88, 12, 0.2) 36px)`,
          }}
        />

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl">
            {/* Accent line */}
            <div className="animate-hero-reveal mb-6">
              <div className="w-16 h-1 bg-[#EA580C] rounded-full" />
            </div>

            {/* Title with gradient animation */}
            <h1 className="animate-hero-reveal text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.9] tracking-tight">
              <span className="animate-gradient-text">{heroTitle}</span>
            </h1>

            {/* Tagline with delay */}
            <p className="animate-tagline mt-8 text-lg sm:text-xl lg:text-2xl text-stone-400 leading-relaxed max-w-xl font-light">
              {heroTagline}
            </p>

            {/* CTA Buttons */}
            <div className="animate-buttons mt-10 flex flex-wrap gap-4">
              <Link
                to="/login"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold bg-[#EA580C] text-white hover:bg-[#c2410c] transition-all duration-300 hover:scale-105 shadow-lg shadow-[#EA580C]/20 hover:shadow-[#EA580C]/40"
              >
                Solicitar orçamento
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/portfolio"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold border border-stone-700 text-stone-300 hover:border-[#EA580C]/50 hover:text-white transition-all duration-300 backdrop-blur-sm bg-white/5"
              >
                Ver portfólio
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-tagline">
          <span className="text-stone-500 text-xs uppercase tracking-widest font-medium">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-[#EA580C] to-transparent" />
        </div>
      </section>

      {/* Film Strip Section - Horizontal Auto-Scrolling Thumbnails */}
      <section
        ref={filmStripRef}
        className={`py-12 bg-stone-950 border-y border-stone-800/50 overflow-hidden section-hidden ${filmStripVisible ? 'section-visible' : ''}`}
      >
        <div className="flex items-center gap-4 animate-film-scroll" style={{ width: 'max-content', touchAction: 'pan-y' }}>
          {/* Duplicate items for infinite scroll effect */}
          {[...Array(filmStripImages.length > 0 ? 2 : 2)].map((_, setIdx) => (
            <React.Fragment key={setIdx}>
              {(filmStripImages.length > 0
                ? filmStripImages
                : Array.from({ length: 8 }, (_, i) => ({ id: i, placeholder: true }))
              ).map((img, idx) => (
                <div
                  key={`${setIdx}-${idx}`}
                  className="flex-shrink-0 w-48 h-32 sm:w-56 sm:h-36 rounded-lg overflow-hidden border border-stone-800/50 relative group"
                >
                  {img.placeholder ? (
                    <div className="w-full h-full bg-gradient-to-br from-stone-900 to-stone-800 flex items-center justify-center">
                      <div className="w-8 h-8 border border-stone-700 rounded-sm opacity-30" />
                    </div>
                  ) : (
                    <img
                      src={img.url || img.thumb || img}
                      alt={img.titulo || `Portfolio ${idx}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  )}
                  <div className="absolute inset-0 bg-stone-950/30 group-hover:bg-transparent transition-colors duration-300" />
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Manifesto Section - Asymmetric Layout */}
      {manifesto && (
        <section
          ref={manifestoRef}
          className={`py-24 sm:py-32 bg-stone-950 relative section-hidden ${manifestoVisible ? 'section-visible' : ''}`}
        >
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-[#EA580C]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-8 sm:gap-12 lg:gap-16 items-stretch">
              {/* Accent vertical bar */}
              <div className="flex-shrink-0">
                <div
                  className="w-1.5 sm:w-2 h-full min-h-[200px] rounded-full bg-gradient-to-b from-[#EA580C] via-[#EA580C]/60 to-transparent animate-glow-bar"
                />
              </div>

              {/* Text content */}
              <div className="flex-1 py-2">
                <h2 className="text-sm uppercase tracking-[0.3em] text-[#EA580C] font-semibold mb-8">
                  Manifesto
                </h2>
                <div
                  className="prose prose-invert prose-lg lg:prose-xl max-w-none text-stone-300 leading-relaxed
                    prose-headings:text-stone-50 prose-headings:font-bold prose-strong:text-stone-100
                    prose-a:text-[#EA580C] prose-a:no-underline hover:prose-a:underline
                    prose-p:text-stone-400 prose-p:leading-[1.8]"
                  dangerouslySetInnerHTML={{ __html: manifesto }}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section - Glassmorphism */}
      {depoimentos.length > 0 && (
        <section
          ref={testimonialsRef}
          className={`py-24 sm:py-32 bg-stone-950 relative section-hidden ${testimonialsVisible ? 'section-visible' : ''}`}
        >
          {/* Ambient glow */}
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-80 h-80 bg-[#EA580C]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="text-sm uppercase tracking-[0.3em] text-[#EA580C] font-semibold">Depoimentos</span>
              <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-50">
                O que dizem nossos clientes
              </h2>
            </div>

            <div className="relative">
              {/* Glassmorphism Card */}
              <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-8 sm:p-12 lg:p-16 relative overflow-hidden">
                {/* Decorative corner accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#EA580C]/10 to-transparent rounded-bl-full" />

                {/* Large quote mark */}
                <div className="absolute top-6 left-8 text-[#EA580C]/10 text-8xl font-serif leading-none select-none">"</div>

                {depoimentos.map((dep, idx) => (
                  <div
                    key={idx}
                    className={`transition-all duration-700 ${
                      idx === currentSlide ? 'block opacity-100' : 'hidden opacity-0'
                    }`}
                  >
                    {/* Stars */}
                    <div className="flex gap-1.5 mb-6 relative z-10">
                      {Array.from({ length: dep.estrelas || 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={18}
                          className="text-[#EA580C] fill-[#EA580C]"
                        />
                      ))}
                    </div>

                    {/* Quote */}
                    <p className="relative z-10 text-stone-200 text-xl sm:text-2xl lg:text-3xl leading-relaxed font-light tracking-wide">
                      {dep.comentario || dep.texto}
                    </p>

                    {/* Author */}
                    <div className="mt-8 relative z-10 flex items-center gap-3">
                      <div className="w-10 h-px bg-[#EA580C]" />
                      <p className="text-stone-400 font-medium text-sm uppercase tracking-wider">
                        {dep.nome?.split(' ')[0] || 'Cliente'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation */}
              {depoimentos.length > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <button
                    onClick={prevSlide}
                    className="w-11 h-11 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center text-stone-400 hover:text-white hover:border-[#EA580C]/50 transition-all duration-300"
                    aria-label="Anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  {/* Dots */}
                  <div className="flex items-center gap-2.5">
                    {depoimentos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`rounded-full transition-all duration-300 ${
                          idx === currentSlide
                            ? 'w-8 h-2 bg-[#EA580C]'
                            : 'w-2 h-2 bg-stone-600 hover:bg-stone-500'
                        }`}
                        aria-label={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={nextSlide}
                    className="w-11 h-11 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center text-stone-400 hover:text-white hover:border-[#EA580C]/50 transition-all duration-300"
                    aria-label="Próximo"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section - Gradient with Glowing Button */}
      <section
        ref={ctaRef}
        className={`py-24 sm:py-32 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 relative section-hidden ${ctaVisible ? 'section-visible' : ''}`}
      >
        {/* Centered glow behind */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#EA580C]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Accent dots */}
          <div className="flex justify-center gap-2 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#EA580C]/50" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#EA580C]/50" />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-50 leading-tight">
            {ctaText}
          </h2>
          <p className="mt-6 text-stone-400 text-lg max-w-lg mx-auto leading-relaxed">
            Entre em contato e receba seu orçamento personalizado em até 24h.
          </p>

          <div className="mt-10">
            <Link
              to="/login"
              className="group inline-flex items-center gap-3 px-10 py-4 rounded-full font-semibold bg-[#EA580C] text-white transition-all duration-300 hover:scale-105 animate-pulse-glow"
            >
              {ctaButton}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Bottom accent */}
          <div className="mt-16 flex justify-center">
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-[#EA580C]/50 to-transparent" />
          </div>
        </div>
      </section>
    </div>
  );
}
