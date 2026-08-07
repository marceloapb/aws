import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, ArrowUpRight, Camera, Instagram, Mail, Phone,
  MapPin, ChevronLeft, ChevronRight, Menu, X, Quote, Star,
  Eye, Clock
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '';
const ACCENT = '#ff5c00';

const SECTIONS = ['Home', 'Portfolio', 'Serviços', 'Sobre', 'Contato'];

const WORDS = ['Emociona', 'Conecta', 'Transforma', 'Inspira', 'Permanece'];

const SERVICES_DATA = [
  {
    number: '01', title: 'Retratos',
    desc: 'Sessões individuais e corporativas com iluminação controlada. Capturamos sua personalidade em imagens que transcendem o simples registro.',
    detail: 'A partir de R$ 800',
    img: 'https://images.unsplash.com/photo-1779351930181-7ea59558817c?w=600&h=700&fit=crop&auto=format',
    tags: ['Studio', 'Externo', 'Corporativo'],
  },
  {
    number: '02', title: 'Casamentos',
    desc: 'Cobertura completa do seu dia mais especial — do making-of à festa. Cada sorriso e abraço eternizado com sensibilidade.',
    detail: 'A partir de R$ 4.500',
    img: 'https://images.unsplash.com/photo-1784796639738-c8c06b8a89c2?w=600&h=700&fit=crop&auto=format',
    tags: ['Making-of', 'Cerimônia', 'Festa'],
  },
  {
    number: '03', title: 'Eventos Corporativos',
    desc: 'Conferências, lançamentos e campanhas empresariais. Imagens que comunicam profissionalismo e fortalecem sua marca.',
    detail: 'A partir de R$ 1.200',
    img: 'https://images.unsplash.com/photo-1551161440-88a5c5b09ba0?w=600&h=700&fit=crop&auto=format',
    tags: ['Eventos', 'Produtos', 'Institucional'],
  },
  {
    number: '04', title: 'Urbano & Editorial',
    desc: 'Fotografia de rua, arquitetura e editorial. Composições que contam histórias através da geometria das cidades.',
    detail: 'Sob consulta',
    img: 'https://images.unsplash.com/photo-1544057234-f58ade17f5d4?w=600&h=700&fit=crop&auto=format',
    tags: ['Urbano', 'Arquitetura', 'Editorial'],
  },
];

const HERO_IMGS = [
  'https://images.unsplash.com/photo-1784796639738-c8c06b8a89c2?w=1800&h=1100&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1769650795757-c901425aefbb?w=1800&h=1100&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1776266099566-676119a0f06e?w=1800&h=1100&fit=crop&auto=format',
];

const PORTFOLIO_PLACEHOLDER = [
  { id: 1, category: 'Retratos', title: 'Luz & Sombra', img: 'https://images.unsplash.com/photo-1769650795757-c901425aefbb?w=800&h=1000&fit=crop&auto=format' },
  { id: 2, category: 'Casamentos', title: 'Silhueta ao Pôr do Sol', img: 'https://images.unsplash.com/photo-1784796639738-c8c06b8a89c2?w=900&h=600&fit=crop&auto=format' },
  { id: 3, category: 'Retratos', title: 'Identidade', img: 'https://images.unsplash.com/photo-1779351930181-7ea59558817c?w=700&h=900&fit=crop&auto=format' },
  { id: 4, category: 'Casamentos', title: 'Enlace', img: 'https://images.unsplash.com/photo-1776266099566-676119a0f06e?w=800&h=1000&fit=crop&auto=format' },
  { id: 5, category: 'Urbano', title: 'Geometria', img: 'https://images.unsplash.com/photo-1551161440-88a5c5b09ba0?w=700&h=1050&fit=crop&auto=format' },
  { id: 6, category: 'Casamentos', title: 'Momento Dourado', img: 'https://images.unsplash.com/photo-1782787540837-5a43b126073e?w=900&h=600&fit=crop&auto=format' },
];

// ── Shared micro-components ──

function Label({ children }) {
  return (
    <p className="font-mono text-[10px] tracking-[0.45em] uppercase mb-3 flex items-center gap-2" style={{ color: ACCENT }}>
      <span className="w-4 h-px inline-block" style={{ background: ACCENT }} />
      {children}
    </p>
  );
}

function SectionTitle({ children, className = '' }) {
  return (
    <h2 className={`font-['Barlow_Condensed',sans-serif] font-black uppercase leading-none ${className}`}>
      {children}
    </h2>
  );
}


// ══════════════════════════════════════════════════════════════
// HOME SECTION
// ══════════════════════════════════════════════════════════════

function HomeSection({ goTo, depoimentos, config }) {
  const [entered, setEntered] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [tIdx, setTIdx] = useState(0);

  useEffect(() => { setTimeout(() => setEntered(true), 60); }, []);
  useEffect(() => { const t = setInterval(() => setImgIdx(i => (i + 1) % HERO_IMGS.length), 5000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setWordIdx(i => (i + 1) % WORDS.length), 2200); return () => clearInterval(t); }, []);
  useEffect(() => { if (depoimentos.length > 0) { const t = setInterval(() => setTIdx(i => (i + 1) % depoimentos.length), 4500); return () => clearInterval(t); } }, [depoimentos.length]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#0d0d0d' }}>
      {/* Cycling background */}
      {HERO_IMGS.map((src, i) => (
        <img key={src} src={src} alt="" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms]"
          style={{ opacity: i === imgIdx ? 0.45 : 0, transform: 'scale(1.04)' }} />
      ))}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(13,13,13,0.95), rgba(13,13,13,0.6), rgba(13,13,13,0.2))' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(13,13,13,1), transparent, transparent)' }} />

      {/* Orange left bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: `linear-gradient(to bottom, transparent, ${ACCENT}, transparent)`, opacity: 0.6 }} />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-4 sm:px-8 lg:px-16 max-w-4xl gap-0">
        {/* Eyebrow */}
        <div style={{ opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(12px)', transition: 'opacity 0.6s 0.1s, transform 0.6s 0.1s' }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="w-6 h-px" style={{ background: ACCENT }} />
            <span className="font-mono text-[10px] tracking-[0.45em] uppercase" style={{ color: ACCENT }}>São Paulo · Brasil</span>
          </div>
        </div>

        {/* Headline */}
        <div style={{ opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(24px)', transition: 'opacity 0.7s 0.2s, transform 0.7s 0.2s' }}>
          <h1 className="font-['Barlow_Condensed',sans-serif] font-black uppercase leading-[0.82] tracking-tight">
            <span className="block text-[clamp(2rem,6vw,6.5rem)]" style={{ color: '#f0ece4' }}>Fotografia que</span>
            <span className="block text-[clamp(2.4rem,8vw,8rem)]" style={{ color: ACCENT, textShadow: '0 0 60px rgba(255,92,0,0.35)' }}>
              {WORDS[wordIdx]}
            </span>
          </h1>
        </div>

        {/* Sub */}
        <div style={{ opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(16px)', transition: 'opacity 0.7s 0.38s, transform 0.7s 0.38s' }}>
          <p className="mt-3 text-sm max-w-sm font-light leading-relaxed" style={{ color: '#8a8a8a' }}>
            Cada clique é uma história. Capturo momentos que você vai querer guardar para sempre.
          </p>
        </div>

        {/* CTAs */}
        <div style={{ opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(14px)', transition: 'opacity 0.7s 0.52s, transform 0.7s 0.52s' }}>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={() => goTo(1)}
              className="group flex items-center gap-3 text-xs tracking-widest uppercase font-black px-5 sm:px-7 py-3 hover:opacity-90 transition-all"
              style={{ background: ACCENT, color: '#0d0d0d', boxShadow: '0 0 35px rgba(255,92,0,0.4)' }}>
              Ver Portfolio <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform" />
            </button>
            <button onClick={() => goTo(4)}
              className="flex items-center gap-3 px-5 sm:px-7 py-3 text-xs tracking-widest uppercase font-bold transition-all"
              style={{ border: '1px solid rgba(240,236,228,0.2)', color: 'rgba(240,236,228,0.7)' }}>
              Agendar Sessão
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ opacity: entered ? 1 : 0, transition: 'opacity 0.8s 0.72s' }}>
          <div className="mt-5 pt-5 flex flex-wrap gap-5 sm:gap-7" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {[['12+', 'Anos'], ['800+', 'Sessões'], ['200+', 'Casamentos'], ['98%', 'Satisfação']].map(([n, l]) => (
              <div key={l}>
                <span className="font-['Barlow_Condensed',sans-serif] font-black text-[1.5rem] sm:text-[1.9rem] leading-none" style={{ color: ACCENT }}>{n}</span>
                <p className="text-[9px] tracking-widest uppercase font-mono mt-0.5" style={{ color: '#8a8a8a' }}>{l}</p>
              </div>
            ))}
          </div>

          {/* Testimonial inline */}
          {depoimentos.length > 0 && (
            <div className="mt-4 max-w-xl">
              <div className="pl-4 py-0.5" style={{ borderLeft: `2px solid ${ACCENT}` }}>
                <p className="text-xs font-light leading-relaxed italic line-clamp-2" style={{ color: 'rgba(240,236,228,0.8)' }}>
                  "{depoimentos[tIdx]?.comentario || depoimentos[tIdx]?.text}"
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0" style={{ background: ACCENT }}>
                    <span className="font-['Barlow_Condensed',sans-serif] font-black text-[8px]" style={{ color: '#0d0d0d' }}>
                      {(depoimentos[tIdx]?.nome || '?').substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-semibold text-xs truncate" style={{ color: '#f0ece4' }}>{depoimentos[tIdx]?.nome}</span>
                  <div className="flex gap-0.5 ml-auto shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={9} style={{ color: ACCENT, fill: ACCENT }} />)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right photo strip (lg only) */}
      <div className="absolute right-0 top-0 bottom-0 w-[28%] hidden lg:flex flex-col gap-1 overflow-hidden">
        {HERO_IMGS.map((src, i) => (
          <div key={i} className="flex-1 overflow-hidden cursor-pointer group" onClick={() => goTo(1)}>
            <img src={src} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" />
          </div>
        ))}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to left, transparent, rgba(13,13,13,0.8))' }} />
        <button onClick={() => goTo(1)}
          className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 text-[9px] tracking-widest uppercase font-black transition-colors"
          style={{ background: `${ACCENT}e6`, color: '#0d0d0d' }}>
          Portfolio <ArrowUpRight size={11} />
        </button>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// PORTFOLIO SECTION
// ══════════════════════════════════════════════════════════════

function PortfolioSection({ goTo, portfolioData }) {
  const [filter, setFilter] = useState('Todos');
  const [selected, setSelected] = useState(null);
  const items = portfolioData.length > 0 ? portfolioData : PORTFOLIO_PLACEHOLDER;
  const categories = ['Todos', ...new Set(items.map(p => p.category))];
  const filtered = filter === 'Todos' ? items : items.filter(p => p.category === filter);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: '#0d0d0d' }}>
      {/* Lightbox */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(13,13,13,0.97)' }} onClick={() => setSelected(null)}>
          <button className="absolute top-4 right-4 sm:top-6 sm:right-8 w-10 h-10 flex items-center justify-center transition-all" style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#f0ece4' }}>
            <X size={18} />
          </button>
          <div className="max-w-3xl max-h-[85vh] flex flex-col items-center gap-5 p-4 sm:p-6 w-full" onClick={e => e.stopPropagation()}>
            <img src={selected.img} alt={selected.title} className="max-h-[72vh] object-contain shadow-2xl" />
            <div className="flex gap-4 items-center">
              <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: ACCENT }}>{selected.category}</span>
              <span className="w-px h-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <span className="font-['Barlow_Condensed',sans-serif] font-bold text-xl uppercase tracking-wide" style={{ color: '#f0ece4' }}>{selected.title}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between px-4 sm:px-8 lg:px-16 pt-5 pb-4 shrink-0 gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div>
          <Label>Portfolio</Label>
          <SectionTitle className="text-3xl sm:text-4xl md:text-5xl" style={{ color: '#f0ece4' }}>Trabalhos Selecionados</SectionTitle>
        </div>
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

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-16 py-5" style={{ scrollbarWidth: 'none' }}>
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {filtered.map(item => (
            <div key={item.id} className="break-inside-avoid relative group overflow-hidden cursor-pointer" onClick={() => setSelected(item)} style={{ background: '#1f1f1f' }}>
              <img src={item.img} alt={item.title} className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]" loading="lazy" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 flex flex-col justify-end p-3"
                style={{ background: 'linear-gradient(to top, rgba(13,13,13,0.95), rgba(13,13,13,0.2), transparent)' }}>
                <span className="font-mono text-[9px] tracking-[0.35em] uppercase" style={{ color: ACCENT }}>{item.category}</span>
                <p className="font-['Barlow_Condensed',sans-serif] font-bold text-base uppercase leading-tight" style={{ color: '#f0ece4' }}>{item.title}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Eye size={11} style={{ color: ACCENT }} />
                  <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: ACCENT }}>Ver foto</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// SERVICES SECTION
// ══════════════════════════════════════════════════════════════

function ServicesSection({ goTo }) {
  const [active, setActive] = useState(0);
  const s = SERVICES_DATA[active];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: '#0d0d0d' }}>
      <div className="px-4 sm:px-8 lg:px-16 pt-5 pb-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Label>Serviços</Label>
        <SectionTitle className="text-3xl sm:text-4xl md:text-5xl" style={{ color: '#f0ece4' }}>O que posso fazer por você</SectionTitle>
      </div>

      <div className="flex-1 flex flex-col md:grid md:grid-cols-2 min-h-0">
        {/* List */}
        <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-16 py-3 gap-0.5 overflow-y-auto" style={{ scrollbarWidth: 'none', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
          {SERVICES_DATA.map((sv, i) => (
            <div key={sv.number} onClick={() => setActive(i)} role="button" tabIndex={0}
              className="group flex flex-col text-left transition-all duration-250 px-4 py-3 sm:py-4 cursor-pointer"
              style={{ borderLeft: `2px solid ${active === i ? ACCENT : 'transparent'}`, background: active === i ? '#141414' : 'transparent' }}>
              <div className="flex items-center gap-4">
                <span className="font-mono text-[10px] tracking-widest shrink-0 w-6" style={{ color: ACCENT }}>{sv.number}</span>
                <span className="font-['Barlow_Condensed',sans-serif] font-black text-2xl sm:text-3xl md:text-4xl uppercase tracking-wide flex-1 transition-colors"
                  style={{ color: active === i ? ACCENT : '#f0ece4' }}>{sv.title}</span>
                <span className="font-mono text-xs shrink-0 hidden md:block" style={{ color: active === i ? ACCENT : 'rgba(138,138,138,0.4)' }}>{sv.detail}</span>
              </div>
              {active === i && (
                <div className="flex gap-2 mt-2 ml-10 flex-wrap">
                  {sv.tags.map(t => (
                    <span key={t} className="text-[9px] tracking-widest uppercase px-2 py-0.5 font-mono" style={{ border: `1px solid rgba(255,92,0,0.3)`, color: ACCENT }}>{t}</span>
                  ))}
                </div>
              )}
              {active === i && <p className="md:hidden text-xs leading-relaxed mt-2 ml-10 font-light" style={{ color: '#8a8a8a' }}>{sv.desc}</p>}
            </div>
          ))}
        </div>

        {/* Detail panel (desktop) */}
        <div className="hidden md:block relative overflow-hidden">
          <img key={s.img} src={s.img} alt={s.title} className="absolute inset-0 w-full h-full object-cover opacity-20 transition-all duration-700 scale-105" loading="lazy" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(13,13,13,1), rgba(13,13,13,0.8), rgba(13,13,13,0.4))' }} />
          <div className="relative z-10 flex flex-col justify-end h-full px-10 py-10">
            <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-2" style={{ color: ACCENT }}>{s.number} — {s.title}</p>
            <h3 className="font-['Barlow_Condensed',sans-serif] font-black text-5xl md:text-6xl uppercase leading-none mb-5" style={{ color: '#f0ece4' }}>{s.title}</h3>
            <p className="leading-relaxed text-sm font-light max-w-xs mb-6" style={{ color: '#8a8a8a' }}>{s.desc}</p>
            <div className="flex items-center gap-5">
              <span className="font-mono font-bold text-sm" style={{ color: ACCENT }}>{s.detail}</span>
              <button onClick={() => goTo(4)} className="group flex items-center gap-2 px-5 py-2.5 text-xs tracking-widest uppercase font-bold transition-all"
                style={{ background: ACCENT, color: '#0d0d0d', boxShadow: '0 0 20px rgba(255,92,0,0.3)' }}>
                Solicitar <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ABOUT SECTION
// ══════════════════════════════════════════════════════════════

function AboutSection({ goTo, config }) {
  const nome = config?.nome || 'Marcelo Bloise';
  const firstName = nome.split(' ')[0];
  const lastName = nome.split(' ').slice(1).join(' ');

  return (
    <div className="w-full h-full flex overflow-hidden" style={{ background: '#0d0d0d' }}>
      {/* Image half (md+) */}
      <div className="hidden md:block w-[42%] relative shrink-0">
        <img src="https://images.unsplash.com/photo-1779912217736-260b6303b6e7?w=900&h=1200&fit=crop&auto=format" alt={nome} className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, transparent, rgba(13,13,13,0.4))' }} />
        <div className="absolute bottom-10 left-8 px-5 py-4" style={{ background: ACCENT, boxShadow: '0 0 40px rgba(255,92,0,0.5)' }}>
          <div className="flex items-center gap-3">
            <Camera size={20} style={{ color: '#0d0d0d' }} />
            <div>
              <p className="font-['Barlow_Condensed',sans-serif] font-black text-lg uppercase leading-none" style={{ color: '#0d0d0d' }}>12 Anos</p>
              <p className="font-mono text-[9px] tracking-widest uppercase opacity-80" style={{ color: '#0d0d0d' }}>de experiência</p>
            </div>
          </div>
        </div>
      </div>

      {/* Text half */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="min-h-full flex flex-col justify-center pl-4 sm:pl-6 lg:pl-8 pr-4 sm:pr-8 lg:pr-[152px] py-6">
          <Label>Sobre o Fotógrafo</Label>
          <SectionTitle className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl mb-5 sm:mb-8">
            <span style={{ color: '#f0ece4' }}>{firstName} </span>
            <span style={{ WebkitTextStroke: `2px ${ACCENT}`, color: 'transparent' }}>{lastName}</span>
          </SectionTitle>

          <div className="space-y-3 sm:space-y-4 font-light leading-relaxed w-full text-justify text-sm sm:text-base" style={{ color: '#8a8a8a' }}>
            <p>A fotografia é muito mais do que apertar um botão. É sobre capturar a luz e a sombra, a cor e a textura, a <span style={{ color: '#f0ece4', fontWeight: 500 }}>emoção e a expressão</span>. Cada imagem é uma obra única que reflete minha visão e a personalidade de cada cliente.</p>
            <p>Sou um fotógrafo apaixonado por contar histórias através de imagens. Combino habilidade técnica com uma abordagem pessoal e criativa para criar fotografias autênticas e emocionais.</p>
            <p>Meu objetivo é capturar a essência única de cada pessoa e transformá-la em <span style={{ color: '#f0ece4', fontWeight: 500 }}>imagens atemporais</span>.</p>
          </div>

          {/* Quote */}
          <div className="mt-5 sm:mt-7 w-full pl-4 sm:pl-5 py-1" style={{ borderLeft: `2px solid ${ACCENT}` }}>
            <Quote size={18} style={{ color: 'rgba(255,92,0,0.4)' }} className="mb-2" />
            <p className="text-xs sm:text-sm font-light leading-relaxed italic" style={{ color: 'rgba(240,236,228,0.75)' }}>
              "O escritor e o fotógrafo utilizam as mesmas ferramentas, mas enquanto um descreve uma imagem com mil palavras o outro descreve mil palavras com uma imagem."
            </p>
            <p className="font-mono text-[9px] tracking-widest uppercase mt-3" style={{ color: ACCENT }}>— Jefferson Luiz Maleski</p>
          </div>

          {/* Skills */}
          <div className="mt-5 sm:mt-8 grid grid-cols-3 gap-3 sm:gap-4 w-full">
            {[{ icon: Eye, label: 'Visão Artística' }, { icon: Clock, label: 'Pontualidade' }, { icon: Camera, label: 'Alta Qualidade' }].map(({ icon: Icon, label }) => (
              <div key={label} className="p-2 sm:p-3 flex flex-col items-center gap-2 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <Icon size={16} style={{ color: ACCENT }} />
                <span className="font-mono text-[8px] sm:text-[9px] tracking-widest uppercase text-center" style={{ color: '#8a8a8a' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CONTACT SECTION
// ══════════════════════════════════════════════════════════════

function ContactSection({ config }) {
  const [sent, setSent] = useState(false);

  return (
    <div className="w-full h-full flex overflow-hidden" style={{ background: '#0d0d0d' }}>
      {/* Left info (md+) */}
      <div className="hidden md:flex w-2/5 shrink-0 flex-col justify-between px-8 lg:px-14 py-10" style={{ borderRight: '1px solid rgba(255,255,255,0.04)', background: 'rgba(20,20,20,0.3)' }}>
        <div>
          <Label>Contato</Label>
          <SectionTitle className="text-4xl md:text-5xl lg:text-6xl mb-8">
            <span style={{ color: '#f0ece4' }}>Vamos criar</span><br /><span style={{ color: ACCENT }}>algo único</span>
          </SectionTitle>
          <p className="font-light leading-relaxed text-sm max-w-xs" style={{ color: '#8a8a8a' }}>
            Cada projeto começa com uma conversa. Conte-me sobre o seu momento especial.
          </p>
        </div>

        <div className="space-y-5">
          {[
            { Icon: Mail, label: 'E-mail', value: 'contato@marcelobloise.com.br' },
            { Icon: Phone, label: 'WhatsApp', value: '+55 (11) 99481-2037' },
            { Icon: MapPin, label: 'Localização', value: 'São Paulo, SP — Brasil' },
            { Icon: Instagram, label: 'Instagram', value: '@marcelobloisefoto' },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 group">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <Icon size={13} style={{ color: '#8a8a8a' }} />
              </div>
              <div>
                <p className="text-[9px] tracking-widest uppercase font-mono" style={{ color: '#8a8a8a' }}>{label}</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: '#f0ece4' }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="font-mono text-[9px] tracking-widest uppercase mb-3" style={{ color: '#8a8a8a' }}>Resposta em até</p>
          <p className="font-['Barlow_Condensed',sans-serif] font-black text-4xl" style={{ color: ACCENT }}>24 horas</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-14 py-6 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {sent ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
            <div className="w-16 h-16 flex items-center justify-center" style={{ background: ACCENT, boxShadow: '0 0 40px rgba(255,92,0,0.5)' }}>
              <ArrowRight size={28} style={{ color: '#0d0d0d' }} />
            </div>
            <SectionTitle className="text-4xl" style={{ color: '#f0ece4' }}>Mensagem<br />enviada!</SectionTitle>
            <p className="font-light" style={{ color: '#8a8a8a' }}>Responderei em até 24 horas.</p>
            <button onClick={() => setSent(false)} className="px-6 py-2.5 text-xs tracking-widest uppercase font-bold transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#8a8a8a' }}>Nova mensagem</button>
          </div>
        ) : (
          <>
            <div className="md:hidden mb-5">
              <Label>Contato</Label>
              <SectionTitle className="text-3xl sm:text-4xl mb-2" style={{ color: '#f0ece4' }}>Fale Comigo</SectionTitle>
            </div>
            <form onSubmit={e => { e.preventDefault(); setSent(true); }} className="flex flex-col gap-3 sm:gap-4 max-w-lg w-full">
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                {[['Nome completo', 'text', 'Seu nome'], ['E-mail', 'email', 'seu@email.com']].map(([label, type, ph]) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <label className="text-[9px] tracking-widest uppercase font-mono" style={{ color: '#8a8a8a' }}>{label}</label>
                    <input type={type} placeholder={ph} required className="px-4 py-2.5 sm:py-3 text-sm focus:outline-none transition-colors"
                      style={{ background: '#1f1f1f', border: '1px solid rgba(255,255,255,0.08)', color: '#f0ece4' }} />
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] tracking-widest uppercase font-mono" style={{ color: '#8a8a8a' }}>Telefone / WhatsApp</label>
                <input type="tel" placeholder="+55 (11) 00000-0000" className="px-4 py-2.5 sm:py-3 text-sm focus:outline-none transition-colors"
                  style={{ background: '#1f1f1f', border: '1px solid rgba(255,255,255,0.08)', color: '#f0ece4' }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] tracking-widest uppercase font-mono" style={{ color: '#8a8a8a' }}>Mensagem</label>
                <textarea rows={3} required placeholder="Conte-me sobre seu projeto..." className="px-4 py-2.5 sm:py-3 text-sm focus:outline-none transition-colors resize-none"
                  style={{ background: '#1f1f1f', border: '1px solid rgba(255,255,255,0.08)', color: '#f0ece4' }} />
              </div>
              <button type="submit" className="group flex items-center justify-center gap-3 py-3 sm:py-4 text-xs tracking-widest uppercase font-bold transition-all"
                style={{ background: ACCENT, color: '#0d0d0d', boxShadow: '0 0 20px rgba(255,92,0,0.25)' }}>
                Enviar Mensagem <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// MAIN APP SHELL
// ══════════════════════════════════════════════════════════════

export default function SiteV2() {
  const [current, setCurrent] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [config, setConfig] = useState(null);
  const [depoimentos, setDepoimentos] = useState([]);
  const [portfolioData, setPortfolioData] = useState([]);
  const [logoUrl, setLogoUrl] = useState('');

  // Load data
  useEffect(() => {
    fetch(`${API}/public/site/config`)
      .then(r => r.json())
      .then(json => {
        const d = json.data || json;
        setConfig(d);
        setLogoUrl(d?.logo_dark_url || d?.logo_url || '');
      })
      .catch(() => {});

    fetch(`${API}/public/site/depoimentos`)
      .then(r => r.json())
      .then(json => setDepoimentos(json.data || []))
      .catch(() => {});

    // Try to load portfolio
    fetch(`${API}/public/portfolio/recent?limit=8`)
      .then(r => r.json())
      .then(json => {
        if (json.data && json.data.length > 0) {
          setPortfolioData(json.data.map((f, i) => ({
            id: i + 1,
            category: f.categoria || 'Fotografia',
            title: f.titulo || `Foto ${i + 1}`,
            img: f.url || f.thumb_url || f,
          })));
        }
      })
      .catch(() => {});
  }, []);

  const goTo = (i) => { setCurrent(i); setMobileMenu(false); };
  const prev = () => current > 0 && goTo(current - 1);
  const next = () => current < SECTIONS.length - 1 && goTo(current + 1);

  const nome = config?.nome || 'Marcelo Bloise Fotografia';

  const sections = [
    <HomeSection goTo={goTo} depoimentos={depoimentos} config={config} />,
    <PortfolioSection goTo={goTo} portfolioData={portfolioData} />,
    <ServicesSection goTo={goTo} />,
    <AboutSection goTo={goTo} config={config} />,
    <ContactSection config={config} />,
  ];

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: '#0d0d0d', color: '#f0ece4', fontFamily: "'Barlow', sans-serif" }}>
      {/* NAV */}
      <header className="shrink-0 h-16 sm:h-[72px] z-40 grid grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-8 lg:px-16"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(13,13,13,0.98)' }}>
        {/* Left nav (desktop) */}
        <nav className="hidden md:flex items-center gap-1.5">
          {SECTIONS.map((name, i) => (
            <button key={name} onClick={() => goTo(i)}
              className="relative px-3.5 py-2 text-[11px] tracking-widest uppercase font-bold transition-colors"
              style={{ color: current === i ? ACCENT : '#8a8a8a' }}>
              {name}
              {current === i && <span className="absolute bottom-0 left-3 right-3 h-px" style={{ background: ACCENT }} />}
            </button>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button className="md:hidden justify-self-start" style={{ color: '#f0ece4' }} onClick={() => setMobileMenu(!mobileMenu)}>
          {mobileMenu ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Center logo */}
        <button onClick={() => goTo(0)} className="flex items-center justify-center h-10 sm:h-12">
          {logoUrl ? (
            <img src={logoUrl} alt={nome} className="h-10 sm:h-12 w-auto object-contain" />
          ) : (
            <span className="font-['Barlow_Condensed',sans-serif] font-black text-xl uppercase tracking-wide" style={{ color: '#f0ece4' }}>{nome}</span>
          )}
        </button>

        {/* Right */}
        <div className="flex items-center justify-end gap-3 sm:gap-4">
          <span className="hidden md:flex font-mono text-[11px] items-center gap-1" style={{ color: '#8a8a8a' }}>
            <span className="font-bold" style={{ color: ACCENT }}>{String(current + 1).padStart(2, '0')}</span>
            <span className="opacity-30 mx-0.5">/</span>
            {String(SECTIONS.length).padStart(2, '0')}
          </span>
          <button onClick={() => goTo(4)} className="hidden md:flex items-center gap-2 px-5 py-2 text-[10px] tracking-widest uppercase font-black transition-all"
            style={{ border: `1px solid rgba(255,92,0,0.4)`, color: ACCENT }}>
            Contato <ArrowRight size={11} />
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="md:hidden shrink-0 flex flex-col z-30" style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {SECTIONS.map((name, i) => (
            <button key={name} onClick={() => goTo(i)}
              className="px-4 sm:px-8 py-4 text-left text-xs tracking-widest uppercase font-bold transition-colors"
              style={{ color: current === i ? ACCENT : '#8a8a8a', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {name}
            </button>
          ))}
        </div>
      )}

      {/* CONTENT - Horizontal slides */}
      <main className="flex-1 relative overflow-hidden">
        {sections.map((section, i) => (
          <div key={i} className="absolute inset-0"
            style={{ transform: `translateX(${(i - current) * 100}%)`, transition: 'transform 0.55s cubic-bezier(0.77,0,0.175,1)', pointerEvents: i === current ? 'auto' : 'none' }}>
            {section}
          </div>
        ))}
      </main>

      {/* BOTTOM BAR */}
      <footer className="shrink-0 h-10 sm:h-11 flex items-center justify-between px-4 sm:px-8 lg:px-16 z-40"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: '#0d0d0d' }}>
        <div className="flex items-center gap-2">
          <button onClick={prev} disabled={current === 0}
            className="w-7 h-7 flex items-center justify-center transition-all disabled:opacity-20 disabled:pointer-events-none"
            style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#8a8a8a' }}>
            <ChevronLeft size={13} />
          </button>
          <button onClick={next} disabled={current === SECTIONS.length - 1}
            className="w-7 h-7 flex items-center justify-center transition-all disabled:opacity-20 disabled:pointer-events-none"
            style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#8a8a8a' }}>
            <ChevronRight size={13} />
          </button>
          <span className="font-mono text-[9px] tracking-widest uppercase ml-2 hidden sm:block" style={{ color: '#8a8a8a' }}>
            {SECTIONS[current]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {SECTIONS.map((name, i) => (
            <button key={name} onClick={() => goTo(i)}
              className="transition-all duration-300"
              style={current === i
                ? { width: '20px', height: '6px', background: ACCENT, boxShadow: '0 0 8px rgba(255,92,0,0.6)' }
                : { width: '6px', height: '6px', background: 'rgba(255,255,255,0.08)' }}
              aria-label={name} />
          ))}
        </div>

        {logoUrl && <img src={logoUrl} alt={nome} className="h-5 sm:h-6 w-auto object-contain hidden sm:block opacity-50" />}
      </footer>

      {/* Google Font */}
      <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;700;900&family=Barlow+Condensed:wght@700;900&display=swap" rel="stylesheet" />
    </div>
  );
}
