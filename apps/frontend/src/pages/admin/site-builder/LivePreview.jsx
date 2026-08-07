import React, { useState } from 'react';
import { ArrowRight, Star, ChevronDown, Play, Monitor, Smartphone } from 'lucide-react';

const ACCENT = '#EA580C';

// ═══════════════════════════════════════════════════════════════
// BLOCK RENDERERS — versão simplificada para preview ao vivo
// Renderiza os blocos com estilos reais mas em escala reduzida
// ═══════════════════════════════════════════════════════════════

function HeroBlock({ props = {}, variant = 'fullscreen' }) {
  const { titulo, subtitulo, imagem_url, botao_texto, botao_url } = props;

  if (variant === 'minimal') {
    return (
      <section className="py-12 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-50 mb-2">{titulo || 'Título do Hero'}</h1>
          {subtitulo && <p className="text-sm text-stone-300 mb-4">{subtitulo}</p>}
          {botao_texto && (
            <span className="inline-flex items-center gap-1 px-4 py-2 bg-[#EA580C] text-white rounded-lg text-xs font-medium">
              {botao_texto} <ArrowRight size={12} />
            </span>
          )}
        </div>
      </section>
    );
  }

  if (variant === 'split') {
    return (
      <section className="min-h-[200px] flex flex-col md:flex-row">
        <div className="md:w-1/2 flex items-center justify-center p-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-50 mb-2">{titulo || 'Título'}</h1>
            {subtitulo && <p className="text-sm text-stone-300 mb-4">{subtitulo}</p>}
            {botao_texto && (
              <span className="inline-flex items-center gap-1 px-4 py-2 bg-[#EA580C] text-white rounded-lg text-xs font-medium">
                {botao_texto} <ArrowRight size={12} />
              </span>
            )}
          </div>
        </div>
        <div className="md:w-1/2 min-h-[150px] relative bg-stone-800">
          {imagem_url ? (
            <img src={imagem_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-stone-600 text-xs">Imagem</div>
          )}
        </div>
      </section>
    );
  }

  // fullscreen
  return (
    <section className="relative min-h-[250px] flex items-center justify-center overflow-hidden">
      {imagem_url ? (
        <img src={imagem_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-stone-900" />
      )}
      <div className="absolute inset-0 bg-stone-950/60" />
      <div className="relative z-10 text-center px-4 max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{titulo || 'Título do Hero'}</h1>
        {subtitulo && <p className="text-sm text-stone-200 mb-4">{subtitulo}</p>}
        {botao_texto && (
          <span className="inline-flex items-center gap-1 px-4 py-2 bg-[#EA580C] text-white rounded-lg text-xs font-medium">
            {botao_texto} <ArrowRight size={12} />
          </span>
        )}
      </div>
    </section>
  );
}

function TextBlock({ props = {}, variant = 'simples' }) {
  const { titulo, conteudo, imagem_url, imagem_posicao = 'direita' } = props;

  if (variant === 'citacao') {
    return (
      <section className="py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <blockquote className="text-lg italic text-stone-200 border-l-4 border-[#EA580C] pl-4">
            {conteudo || 'Texto da citação aqui...'}
          </blockquote>
          {titulo && <p className="text-[#EA580C] text-sm font-medium mt-2 pl-4">— {titulo}</p>}
        </div>
      </section>
    );
  }

  if (variant === 'destaque') {
    return (
      <section className="py-10 px-4 bg-stone-900">
        <div className="max-w-3xl mx-auto text-center">
          {titulo && <h2 className="text-xl font-bold text-stone-50 mb-3">{titulo}</h2>}
          {conteudo && <p className="text-sm text-stone-300 leading-relaxed">{conteudo}</p>}
          {imagem_url && <img src={imagem_url} alt="" className="mt-4 rounded-lg mx-auto max-w-full h-24 object-cover" />}
        </div>
      </section>
    );
  }

  // simples
  const imgLeft = imagem_posicao === 'esquerda';
  return (
    <section className="py-10 px-4">
      <div className={`max-w-4xl mx-auto flex flex-col ${imagem_url ? (imgLeft ? 'md:flex-row-reverse' : 'md:flex-row') : ''} gap-4 items-center`}>
        <div className={imagem_url ? 'md:w-1/2' : 'w-full'}>
          {titulo && <h2 className="text-xl font-bold text-stone-50 mb-2">{titulo}</h2>}
          {conteudo && <p className="text-sm text-stone-300 leading-relaxed line-clamp-4">{conteudo}</p>}
        </div>
        {imagem_url && (
          <div className="md:w-1/2">
            <img src={imagem_url} alt="" className="rounded-lg w-full h-24 object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}

function GalleryBlock({ props = {}, variant = 'grid' }) {
  const { titulo, quantidade = 6 } = props;
  const cols = variant === 'masonry' ? 'columns-2 md:columns-3 gap-2 space-y-2' : 'grid grid-cols-2 md:grid-cols-3 gap-2';

  return (
    <section className="py-10 px-4">
      <div className="max-w-4xl mx-auto">
        {titulo && <h2 className="text-xl font-bold text-stone-50 mb-4 text-center">{titulo}</h2>}
        <div className={cols}>
          {Array.from({ length: Math.min(quantidade, 6) }).map((_, i) => (
            <div key={i} className={`bg-stone-800 rounded-lg ${variant === 'masonry' ? 'break-inside-avoid' : 'aspect-square'} ${variant === 'masonry' ? (i % 3 === 0 ? 'h-20' : 'h-14') : ''} flex items-center justify-center`}>
              <span className="text-stone-600 text-[10px]">Foto {i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsBlock({ props = {}, variant = 'carousel' }) {
  const { titulo, quantidade = 3 } = props;

  return (
    <section className="py-10 px-4 bg-stone-900/50">
      <div className="max-w-4xl mx-auto">
        {titulo && <h2 className="text-xl font-bold text-stone-50 mb-4 text-center">{titulo}</h2>}
        <div className={variant === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
          {Array.from({ length: Math.min(quantidade, 3) }).map((_, i) => (
            <div key={i} className="bg-stone-800/50 rounded-lg p-3 border border-stone-700/50">
              <div className="flex gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} size={10} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-stone-400 text-[10px] italic">"Depoimento do cliente aqui..."</p>
              <p className="text-stone-500 text-[9px] mt-1">— Cliente {i + 1}</p>
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
      <section className="py-12 px-4 bg-[#EA580C]">
        <div className="max-w-3xl mx-auto text-center">
          {titulo && <h2 className="text-xl font-bold text-white mb-2">{titulo}</h2>}
          {subtitulo && <p className="text-white/80 text-sm mb-4">{subtitulo}</p>}
          {botao_texto && (
            <span className="inline-flex items-center gap-1 px-4 py-2 bg-white text-[#EA580C] rounded-lg text-xs font-semibold">
              {botao_texto} <ArrowRight size={12} />
            </span>
          )}
        </div>
      </section>
    );
  }

  if (variant === 'destaque') {
    return (
      <section className="py-10 px-4">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-stone-900 to-stone-800 rounded-xl p-6 text-center border border-stone-700">
          {titulo && <h2 className="text-xl font-bold text-stone-50 mb-2">{titulo}</h2>}
          {subtitulo && <p className="text-stone-300 text-sm mb-4">{subtitulo}</p>}
          {botao_texto && (
            <span className="inline-flex items-center gap-1 px-4 py-2 bg-[#EA580C] text-white rounded-lg text-xs font-medium">
              {botao_texto} <ArrowRight size={12} />
            </span>
          )}
        </div>
      </section>
    );
  }

  // simples
  return (
    <section className="py-10 px-4">
      <div className="max-w-3xl mx-auto text-center">
        {titulo && <h2 className="text-xl font-bold text-stone-50 mb-2">{titulo}</h2>}
        {subtitulo && <p className="text-stone-300 text-sm mb-4">{subtitulo}</p>}
        {botao_texto && (
          <span className="inline-flex items-center gap-1 px-4 py-2 bg-[#EA580C] text-white rounded-lg text-xs font-medium">
            {botao_texto} <ArrowRight size={12} />
          </span>
        )}
      </div>
    </section>
  );
}

function FAQBlock({ props = {}, variant = 'accordion' }) {
  const { titulo, items = [] } = props;

  if (items.length === 0) {
    return (
      <section className="py-10 px-4">
        <div className="max-w-3xl mx-auto text-center text-stone-500 text-xs">
          {titulo && <h2 className="text-xl font-bold text-stone-50 mb-4">{titulo}</h2>}
          <p>Adicione perguntas frequentes</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {titulo && <h2 className="text-xl font-bold text-stone-50 mb-4 text-center">{titulo}</h2>}
        <div className="space-y-2">
          {items.slice(0, 4).map((item, idx) => (
            <div key={idx} className="border border-stone-700 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-stone-100">{item.pergunta || 'Pergunta?'}</span>
              <ChevronDown size={14} className="text-stone-400" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VideoBlock({ props = {}, variant = 'contained' }) {
  const { titulo, url } = props;

  return (
    <section className="py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {titulo && <h2 className="text-xl font-bold text-stone-50 mb-4 text-center">{titulo}</h2>}
        <div className="aspect-video rounded-lg overflow-hidden bg-stone-800 flex items-center justify-center">
          {url ? (
            <div className="text-center">
              <Play size={24} className="text-white/50 mx-auto mb-1" />
              <span className="text-stone-400 text-[10px]">Vídeo</span>
            </div>
          ) : (
            <div className="text-center">
              <Play size={24} className="text-stone-600 mx-auto mb-1" />
              <span className="text-stone-600 text-[10px]">Adicione a URL do vídeo</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SeparatorBlock({ props = {}, variant = 'linha' }) {
  const { altura = 40 } = props;

  if (variant === 'espaco') {
    return <div style={{ height: `${Math.min(altura, 60)}px` }} />;
  }

  if (variant === 'decorativo') {
    return (
      <div className="py-4 flex items-center justify-center gap-2">
        <div className="h-px w-12 bg-[#EA580C]/40" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
        <div className="h-px w-12 bg-[#EA580C]/40" />
      </div>
    );
  }

  // linha
  return (
    <div className="py-4">
      <div className="max-w-4xl mx-auto px-4">
        <hr className="border-stone-800" />
      </div>
    </div>
  );
}

function ServicesBlock({ props = {}, variant = 'cards' }) {
  const { titulo, items = [] } = props;

  if (items.length === 0) {
    return (
      <section className="py-10 px-4">
        <div className="max-w-3xl mx-auto text-center text-stone-500 text-xs">
          {titulo && <h2 className="text-xl font-bold text-stone-50 mb-4">{titulo}</h2>}
          <p>Adicione serviços</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 px-4">
      <div className="max-w-4xl mx-auto">
        {titulo && <h2 className="text-xl font-bold text-stone-50 mb-4 text-center">{titulo}</h2>}
        <div className={variant === 'lista' ? 'space-y-2' : 'grid grid-cols-2 md:grid-cols-3 gap-3'}>
          {items.map((item, idx) => (
            <div key={idx} className={`${variant === 'lista' ? 'flex items-start gap-3 p-3' : 'p-4 text-center'} bg-stone-800/50 rounded-lg border border-stone-700/50`}>
              {item.icone && <span className="text-lg">{item.icone}</span>}
              <div>
                <h3 className="font-medium text-stone-100 text-sm">{item.nome}</h3>
                {item.descricao && <p className="text-[10px] text-stone-400 mt-0.5">{item.descricao}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// LIVE PREVIEW — Painel de preview ao vivo
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

export default function LivePreview({ blocks = [], pageTitle = '', selectedBlockId = null, onBlockClick }) {
  const [viewport, setViewport] = useState('desktop'); // 'desktop' | 'mobile'

  return (
    <div className="flex flex-col h-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <span className="text-xs text-gray-500 ml-2">Preview ao vivo</span>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewport('desktop')}
            className={`p-1.5 rounded ${viewport === 'desktop' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            title="Desktop"
          >
            <Monitor size={14} />
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={`p-1.5 rounded ${viewport === 'mobile' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            title="Mobile"
          >
            <Smartphone size={14} />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-y-auto flex justify-center p-4">
        <div
          className={`bg-stone-950 rounded-lg shadow-xl overflow-hidden transition-all duration-300 ${
            viewport === 'mobile' ? 'w-[375px]' : 'w-full max-w-[900px]'
          }`}
          style={{ minHeight: '400px' }}
        >
          {/* Site Header Mock */}
          <div className="border-t-2 border-[#EA580C] bg-stone-950 px-4 py-3 flex items-center justify-between">
            <div className="w-6 h-6 rounded-full bg-stone-800" />
            <div className="flex gap-3">
              <div className="w-10 h-1.5 bg-stone-800 rounded" />
              <div className="w-10 h-1.5 bg-stone-800 rounded" />
              <div className="w-10 h-1.5 bg-stone-800 rounded" />
            </div>
            <div className="w-12 h-5 rounded bg-stone-800" />
          </div>

          {/* Blocks */}
          {blocks.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-stone-600 text-sm">
              Adicione blocos para visualizar o preview
            </div>
          ) : (
            blocks.map((block) => {
              const BlockComponent = BLOCK_MAP[block.type];
              if (!BlockComponent) return null;

              const { variant, ...restProps } = block.data || {};
              const isSelected = block.id === selectedBlockId;

              return (
                <div
                  key={block.id}
                  onClick={() => onBlockClick?.(block.id)}
                  className={`relative cursor-pointer transition-all duration-200 ${
                    isSelected ? 'ring-2 ring-inset ring-orange-500' : 'hover:ring-1 hover:ring-inset hover:ring-orange-300/50'
                  }`}
                >
                  <BlockComponent props={restProps} variant={variant || ''} />
                  {isSelected && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-orange-500 text-white text-[9px] font-medium rounded shadow">
                      {block.type}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Site Footer Mock */}
          <div className="bg-stone-900 px-4 py-4 mt-4 border-t border-stone-800">
            <div className="flex items-center justify-between">
              <div className="w-6 h-6 rounded-full bg-stone-800" />
              <div className="flex gap-2">
                <div className="w-5 h-5 rounded-full bg-stone-800" />
                <div className="w-5 h-5 rounded-full bg-stone-800" />
              </div>
            </div>
            <div className="text-center mt-2">
              <div className="w-24 h-1.5 bg-stone-800 rounded mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
