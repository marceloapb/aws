import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Star, ChevronDown, Play } from 'lucide-react';
import { useSiteConfig } from './SiteLayout';

const API = process.env.REACT_APP_API_URL || '';

// ═══════════════════════════════════════════════════════════════
// BLOCK RENDERERS
// ═══════════════════════════════════════════════════════════════

function HeroBlock({ props = {}, variant = 'fullscreen' }) {
  const { titulo, subtitulo, imagem_url, botao_texto, botao_url } = props;

  if (variant === 'minimal') {
    return (
      <section className="py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-stone-50 mb-4">{titulo}</h1>
          {subtitulo && <p className="text-lg text-stone-300 mb-8">{subtitulo}</p>}
          {botao_texto && (
            <a href={botao_url || '#contato'} className="inline-flex items-center gap-2 px-6 py-3 bg-[#EA580C] text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
              {botao_texto} <ArrowRight size={16} />
            </a>
          )}
        </div>
      </section>
    );
  }

  if (variant === 'split') {
    return (
      <section className="min-h-[70vh] flex flex-col md:flex-row">
        <div className="md:w-1/2 flex items-center justify-center p-8 md:p-16">
          <div>
            <h1 className="text-3xl sm:text-5xl font-bold text-stone-50 mb-4">{titulo}</h1>
            {subtitulo && <p className="text-lg text-stone-300 mb-8">{subtitulo}</p>}
            {botao_texto && (
              <a href={botao_url || '#contato'} className="inline-flex items-center gap-2 px-6 py-3 bg-[#EA580C] text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
                {botao_texto} <ArrowRight size={16} />
              </a>
            )}
          </div>
        </div>
        {imagem_url && (
          <div className="md:w-1/2 min-h-[40vh] md:min-h-full relative">
            <img src={imagem_url} alt={titulo || ''} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        )}
      </section>
    );
  }

  // fullscreen (default)
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {imagem_url && (
        <img src={imagem_url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0 bg-stone-950/60" />
      <div className="relative z-10 text-center px-4 max-w-4xl">
        <h1 className="text-4xl sm:text-6xl font-bold text-white mb-4">{titulo}</h1>
        {subtitulo && <p className="text-lg sm:text-xl text-stone-200 mb-8">{subtitulo}</p>}
        {botao_texto && (
          <a href={botao_url || '#contato'} className="inline-flex items-center gap-2 px-8 py-4 bg-[#EA580C] text-white rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity">
            {botao_texto} <ArrowRight size={18} />
          </a>
        )}
      </div>
    </section>
  );
}

function TextBlock({ props = {}, variant = 'simples' }) {
  const { titulo, conteudo, imagem_url, imagem_posicao = 'direita' } = props;

  if (variant === 'citacao') {
    return (
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <blockquote className="text-2xl sm:text-3xl italic text-stone-200 border-l-4 border-[#EA580C] pl-6 text-left">
            {conteudo}
          </blockquote>
          {titulo && <p className="text-[#EA580C] font-medium mt-4 text-left pl-6">— {titulo}</p>}
        </div>
      </section>
    );
  }

  if (variant === 'destaque') {
    return (
      <section className="py-16 px-4 bg-stone-900">
        <div className="max-w-4xl mx-auto text-center">
          {titulo && <h2 className="text-3xl font-bold text-stone-50 mb-6">{titulo}</h2>}
          {conteudo && <p className="text-lg text-stone-300 leading-relaxed">{conteudo}</p>}
          {imagem_url && <img src={imagem_url} alt="" loading="lazy" className="mt-8 rounded-xl mx-auto max-w-full" />}
        </div>
      </section>
    );
  }

  // simples
  const imgLeft = imagem_posicao === 'esquerda';
  return (
    <section className="py-16 px-4">
      <div className={`max-w-5xl mx-auto flex flex-col ${imagem_url ? (imgLeft ? 'md:flex-row-reverse' : 'md:flex-row') : ''} gap-8 items-center`}>
        <div className={imagem_url ? 'md:w-1/2' : 'w-full max-w-3xl mx-auto'}>
          {titulo && <h2 className="text-3xl font-bold text-stone-50 mb-4">{titulo}</h2>}
          {conteudo && <p className="text-stone-300 leading-relaxed whitespace-pre-line">{conteudo}</p>}
        </div>
        {imagem_url && (
          <div className="md:w-1/2">
            <img src={imagem_url} alt={titulo || ''} loading="lazy" className="rounded-xl w-full" />
          </div>
        )}
      </div>
    </section>
  );
}

function GalleryBlock({ props = {}, variant = 'grid' }) {
  const { titulo, quantidade = 6 } = props;
  const [fotos, setFotos] = useState([]);

  useEffect(() => {
    fetch(`${API}/public/portfolio/recent?limit=${quantidade}`)
      .then(r => r.json())
      .then(data => setFotos(data.data || []))
      .catch(() => {});
  }, [quantidade]);

  const gridClass = variant === 'masonry'
    ? 'columns-2 md:columns-3 gap-4 space-y-4'
    : 'grid grid-cols-2 md:grid-cols-3 gap-4';

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {titulo && <h2 className="text-3xl font-bold text-stone-50 mb-8 text-center">{titulo}</h2>}
        {fotos.length > 0 ? (
          <div className={gridClass}>
            {fotos.map((foto, idx) => (
              <div key={idx} className={`overflow-hidden rounded-lg ${variant === 'masonry' ? 'break-inside-avoid' : 'aspect-square'}`}>
                <img src={foto.url || foto.thumb_url || foto} alt="" loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-stone-500">
            <p>Configure o portfólio para exibir fotos aqui.</p>
          </div>
        )}
        <div className="text-center mt-8">
          <Link to="/portfolio" className="inline-flex items-center gap-2 text-[#EA580C] font-medium hover:underline">
            Ver portfólio completo <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function TestimonialsBlock({ props = {}, variant = 'carousel' }) {
  const { titulo, quantidade = 4 } = props;
  const [depoimentos, setDepoimentos] = useState([]);

  useEffect(() => {
    fetch(`${API}/public/site/depoimentos`)
      .then(r => r.json())
      .then(data => setDepoimentos((data.data || []).slice(0, quantidade)))
      .catch(() => {});
  }, [quantidade]);

  if (depoimentos.length === 0) return null;

  return (
    <section className="py-16 px-4 bg-stone-900/50">
      <div className="max-w-5xl mx-auto">
        {titulo && <h2 className="text-3xl font-bold text-stone-50 mb-8 text-center">{titulo}</h2>}
        <div className={variant === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-6'}>
          {depoimentos.map((dep, idx) => (
            <div key={idx} className="bg-stone-800/50 backdrop-blur rounded-xl p-6 border border-stone-700/50">
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} size={16} fill={s <= dep.estrelas ? '#FBBF24' : 'none'} className={s <= dep.estrelas ? 'text-yellow-400' : 'text-stone-600'} />
                ))}
              </div>
              <p className="text-stone-300 text-sm leading-relaxed italic mb-3">"{dep.comentario}"</p>
              <p className="text-stone-400 text-xs font-medium">— {dep.nome}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTABlock({ props = {}, variant = 'simples' }) {
  const { titulo, subtitulo, botao_texto, botao_url } = props;

  if (variant === 'banner') {
    return (
      <section className="py-20 px-4 bg-[#EA580C]">
        <div className="max-w-3xl mx-auto text-center">
          {titulo && <h2 className="text-3xl font-bold text-white mb-4">{titulo}</h2>}
          {subtitulo && <p className="text-white/80 text-lg mb-8">{subtitulo}</p>}
          {botao_texto && (
            <a href={botao_url || '#contato'} className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#EA580C] rounded-lg font-semibold hover:bg-stone-100 transition-colors">
              {botao_texto} <ArrowRight size={18} />
            </a>
          )}
        </div>
      </section>
    );
  }

  if (variant === 'destaque') {
    return (
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-stone-900 to-stone-800 rounded-2xl p-10 text-center border border-stone-700">
          {titulo && <h2 className="text-3xl font-bold text-stone-50 mb-4">{titulo}</h2>}
          {subtitulo && <p className="text-stone-300 text-lg mb-8">{subtitulo}</p>}
          {botao_texto && (
            <a href={botao_url || '#contato'} className="inline-flex items-center gap-2 px-6 py-3 bg-[#EA580C] text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
              {botao_texto} <ArrowRight size={16} />
            </a>
          )}
        </div>
      </section>
    );
  }

  // simples
  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto text-center">
        {titulo && <h2 className="text-3xl font-bold text-stone-50 mb-4">{titulo}</h2>}
        {subtitulo && <p className="text-stone-300 mb-8">{subtitulo}</p>}
        {botao_texto && (
          <a href={botao_url || '#contato'} className="inline-flex items-center gap-2 px-6 py-3 bg-[#EA580C] text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
            {botao_texto} <ArrowRight size={16} />
          </a>
        )}
      </div>
    </section>
  );
}

function FAQBlock({ props = {}, variant = 'accordion' }) {
  const { titulo, items = [] } = props;
  const [openIdx, setOpenIdx] = useState(null);

  if (items.length === 0) return null;

  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto">
        {titulo && <h2 className="text-3xl font-bold text-stone-50 mb-8 text-center">{titulo}</h2>}
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="border border-stone-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-800/50 transition-colors"
              >
                <span className="font-medium text-stone-100">{item.pergunta}</span>
                <ChevronDown size={18} className={`text-stone-400 transition-transform ${openIdx === idx ? 'rotate-180' : ''}`} />
              </button>
              {openIdx === idx && (
                <div className="px-5 pb-4 text-stone-300 text-sm leading-relaxed border-t border-stone-700/50 pt-3">
                  {item.resposta}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VideoBlock({ props = {}, variant = 'contained' }) {
  const { titulo, url } = props;

  // Extract YouTube/Vimeo embed URL
  const getEmbedUrl = (rawUrl) => {
    if (!rawUrl) return '';
    const ytMatch = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = rawUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return rawUrl;
  };

  const embedUrl = getEmbedUrl(url);
  if (!embedUrl) return null;

  const containerClass = variant === 'fullwidth' ? 'w-full' : 'max-w-4xl mx-auto';

  return (
    <section className="py-16 px-4">
      <div className={containerClass}>
        {titulo && <h2 className="text-3xl font-bold text-stone-50 mb-6 text-center">{titulo}</h2>}
        <div className="aspect-video rounded-xl overflow-hidden bg-stone-900">
          <iframe src={embedUrl} title={titulo || 'Video'} className="w-full h-full" frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen loading="lazy" />
        </div>
      </div>
    </section>
  );
}

function SeparatorBlock({ props = {}, variant = 'linha' }) {
  const { altura = 40 } = props;

  if (variant === 'espaco') {
    return <div style={{ height: `${altura}px` }} />;
  }

  if (variant === 'decorativo') {
    return (
      <div className="py-8 flex items-center justify-center gap-3">
        <div className="h-px w-16 bg-[#EA580C]/40" />
        <div className="w-2 h-2 rounded-full bg-[#EA580C]" />
        <div className="h-px w-16 bg-[#EA580C]/40" />
      </div>
    );
  }

  // linha
  return (
    <div className="py-8">
      <div className="max-w-5xl mx-auto px-4">
        <hr className="border-stone-800" />
      </div>
    </div>
  );
}

function ServicesBlock({ props = {}, variant = 'cards' }) {
  const { titulo, items = [] } = props;

  if (items.length === 0) return null;

  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {titulo && <h2 className="text-3xl font-bold text-stone-50 mb-8 text-center">{titulo}</h2>}
        <div className={variant === 'lista' ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
          {items.map((item, idx) => (
            <div key={idx} className={`${variant === 'lista' ? 'flex items-start gap-4 p-4' : 'p-6 text-center'} bg-stone-800/50 backdrop-blur rounded-xl border border-stone-700/50`}>
              {item.icone && <span className="text-2xl">{item.icone}</span>}
              <div>
                <h3 className="font-semibold text-stone-100 mb-2">{item.nome}</h3>
                {item.descricao && <p className="text-sm text-stone-400">{item.descricao}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN RENDERER
// ═══════════════════════════════════════════════════════════════

const BLOCK_MAP = {
  hero: HeroBlock,
  text: TextBlock,
  gallery: GalleryBlock,
  testimonials: TestimonialsBlock,
  cta: CTABlock,
  faq: FAQBlock,
  video: VideoBlock,
  separator: SeparatorBlock,
  services: ServicesBlock,
};

export default function SitePage() {
  const { slug } = useParams();
  const config = useSiteConfig();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(false);
    fetch(`${API}/public/site/pages/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => setPage(data.data || data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  // SEO meta tags
  useEffect(() => {
    if (!page) return;
    const title = page.seo_titulo || page.titulo || '';
    const description = page.seo_descricao || '';
    if (title) document.title = title;
    const setMeta = (attr, val, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${val}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, val); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
  }, [page]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#EA580C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-400 text-lg mb-4">Página não encontrada.</p>
          <Link to="/" className="text-[#EA580C] hover:underline font-medium">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {(page.blocos || []).map((block) => {
        const BlockComponent = BLOCK_MAP[block.type];
        if (!BlockComponent) return null;
        return <BlockComponent key={block.id} props={block.props || {}} variant={block.variant || ''} />;
      })}
    </div>
  );
}
