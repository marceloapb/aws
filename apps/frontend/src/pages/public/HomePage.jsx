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

  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        {heroImage && (
          <img
            src={heroImage}
            alt="Hero"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/80 to-stone-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-24 lg:py-36">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-stone-50">
              {heroTitle}
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-stone-300 leading-relaxed">
              {heroTagline}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium bg-[#EA580C] text-white hover:bg-[#c2410c] transition-colors"
              >
                Solicitar orçamento <ArrowRight size={18} />
              </Link>
              <Link
                to="/portfolio"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium border border-stone-600 text-stone-200 hover:border-stone-400 hover:text-white transition-colors"
              >
                Ver portfólio
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Manifesto Section */}
      {manifesto && (
        <section className="py-20 bg-stone-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div
              className="prose prose-invert prose-lg max-w-none text-stone-300 leading-relaxed
                prose-headings:text-stone-50 prose-strong:text-stone-50 prose-a:text-[#EA580C]"
              dangerouslySetInnerHTML={{ __html: manifesto }}
            />
          </div>
        </section>
      )}

      {/* Testimonials Carousel */}
      {depoimentos.length > 0 && (
        <section className="py-20 bg-stone-900/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12 text-stone-50">
              O que dizem nossos clientes
            </h2>

            <div className="relative">
              {/* Slides */}
              <div className="overflow-hidden rounded-2xl bg-stone-900/50 border border-stone-800 p-8 sm:p-12">
                {depoimentos.map((dep, idx) => (
                  <div
                    key={idx}
                    className={`transition-opacity duration-500 ${
                      idx === currentSlide ? 'block opacity-100' : 'hidden opacity-0'
                    }`}
                  >
                    {/* Stars */}
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: dep.estrelas || 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={20}
                          className="text-[#EA580C] fill-[#EA580C]"
                        />
                      ))}
                    </div>

                    {/* Comment */}
                    <p className="text-stone-200 text-lg sm:text-xl leading-relaxed italic">
                      "{dep.comentario || dep.texto}"
                    </p>

                    {/* Name */}
                    <p className="mt-6 text-stone-400 font-medium">
                      — {dep.nome?.split(' ')[0] || 'Cliente'}
                    </p>
                  </div>
                ))}
              </div>

              {/* Nav buttons */}
              {depoimentos.length > 1 && (
                <div className="flex justify-center gap-3 mt-6">
                  <button
                    onClick={prevSlide}
                    className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 hover:text-stone-50 hover:bg-stone-700 transition-colors"
                    aria-label="Anterior"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  {/* Dots */}
                  <div className="flex items-center gap-2">
                    {depoimentos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === currentSlide ? 'bg-[#EA580C]' : 'bg-stone-600'
                        }`}
                        aria-label={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={nextSlide}
                    className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 hover:text-stone-50 hover:bg-stone-700 transition-colors"
                    aria-label="Próximo"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-stone-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-50 mb-4">
            {ctaText}
          </h2>
          <p className="text-stone-400 mb-8">
            Entre em contato e receba seu orçamento personalizado em até 24h.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-medium bg-[#EA580C] text-white hover:bg-[#c2410c] transition-colors"
          >
            {ctaButton} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
