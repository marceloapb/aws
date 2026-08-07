import React from 'react';
import { Image, Type, Grid3X3, Star, MousePointer, HelpCircle, Video, Minus, Briefcase } from 'lucide-react';

const ACCENT = '#EA580C';

/**
 * Mini-preview visual de cada tipo de bloco — mostra uma representação
 * estilizada do conteúdo ao invés de apenas texto/ícone
 */

function HeroPreview({ data }) {
  return (
    <div className="relative w-full h-full rounded overflow-hidden bg-gradient-to-br from-stone-900 to-stone-700 flex items-center justify-center">
      {data?.imagem_url && (
        <img src={data.imagem_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
      )}
      <div className="relative text-center px-3 z-10">
        <div className="text-white font-bold text-[10px] leading-tight truncate">
          {data?.titulo || 'Título do Hero'}
        </div>
        {data?.subtitulo && (
          <div className="text-white/70 text-[8px] mt-0.5 truncate">{data.subtitulo}</div>
        )}
        {data?.botao_texto && (
          <div className="mt-1 inline-block px-2 py-0.5 rounded text-[7px] font-medium text-white" style={{ backgroundColor: ACCENT }}>
            {data.botao_texto}
          </div>
        )}
      </div>
      <div className="absolute top-1 right-1 px-1 py-0.5 bg-black/40 rounded text-[6px] text-white/60">
        {data?.variant || 'fullscreen'}
      </div>
    </div>
  );
}

function TextPreview({ data }) {
  return (
    <div className="w-full h-full rounded bg-white border border-gray-100 p-2 flex flex-col justify-center overflow-hidden">
      {data?.titulo && (
        <div className="font-bold text-[9px] text-gray-800 truncate mb-0.5">{data.titulo}</div>
      )}
      <div className="text-[7px] text-gray-500 line-clamp-3 leading-tight">
        {data?.conteudo || 'Texto de conteúdo aqui...'}
      </div>
      {data?.imagem_url && (
        <div className="mt-1 h-6 w-10 rounded bg-gray-200 overflow-hidden">
          <img src={data.imagem_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="absolute top-1 right-1 px-1 py-0.5 bg-gray-100 rounded text-[6px] text-gray-400">
        {data?.variant || 'simples'}
      </div>
    </div>
  );
}

function GalleryPreview({ data }) {
  const count = data?.quantidade || 6;
  const cols = count <= 4 ? 2 : 3;
  return (
    <div className="w-full h-full rounded bg-stone-900 p-2 flex flex-col overflow-hidden">
      {data?.titulo && (
        <div className="text-[8px] font-bold text-white/90 mb-1 truncate">{data.titulo}</div>
      )}
      <div className={`flex-1 grid gap-0.5 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
          <div key={i} className="bg-stone-700 rounded-sm" />
        ))}
      </div>
      <div className="absolute top-1 right-1 px-1 py-0.5 bg-black/40 rounded text-[6px] text-white/60">
        {data?.variant || 'grid'}
      </div>
    </div>
  );
}

function TestimonialsPreview({ data }) {
  return (
    <div className="w-full h-full rounded bg-stone-800 p-2 flex flex-col justify-center overflow-hidden">
      {data?.titulo && (
        <div className="text-[8px] font-bold text-white/90 mb-1 truncate text-center">{data.titulo}</div>
      )}
      <div className="flex gap-1 justify-center">
        {Array.from({ length: Math.min(data?.quantidade || 3, 3) }).map((_, i) => (
          <div key={i} className="flex-1 bg-stone-700 rounded p-1">
            <div className="flex gap-0.5 mb-0.5">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} size={5} className="text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <div className="h-1.5 bg-stone-600 rounded w-full mb-0.5" />
            <div className="h-1.5 bg-stone-600 rounded w-3/4" />
          </div>
        ))}
      </div>
      <div className="absolute top-1 right-1 px-1 py-0.5 bg-black/40 rounded text-[6px] text-white/60">
        {data?.variant || 'carousel'}
      </div>
    </div>
  );
}

function CTAPreview({ data }) {
  return (
    <div className="w-full h-full rounded bg-gradient-to-r from-orange-600 to-orange-500 flex flex-col items-center justify-center p-2 overflow-hidden">
      <div className="text-[9px] font-bold text-white text-center truncate w-full">
        {data?.titulo || 'Chamada para ação'}
      </div>
      {data?.subtitulo && (
        <div className="text-[7px] text-white/80 text-center truncate w-full mt-0.5">{data.subtitulo}</div>
      )}
      {data?.botao_texto && (
        <div className="mt-1 px-2 py-0.5 bg-white rounded text-[7px] font-medium" style={{ color: ACCENT }}>
          {data.botao_texto}
        </div>
      )}
      <div className="absolute top-1 right-1 px-1 py-0.5 bg-black/20 rounded text-[6px] text-white/60">
        {data?.variant || 'simples'}
      </div>
    </div>
  );
}

function FAQPreview({ data }) {
  const items = data?.items || [];
  return (
    <div className="w-full h-full rounded bg-white border border-gray-100 p-2 flex flex-col overflow-hidden">
      {data?.titulo && (
        <div className="text-[8px] font-bold text-gray-800 mb-1 truncate">{data.titulo}</div>
      )}
      <div className="space-y-0.5 flex-1">
        {(items.length > 0 ? items.slice(0, 3) : [{ pergunta: 'Pergunta?' }]).map((item, i) => (
          <div key={i} className="flex items-center gap-1 px-1 py-0.5 bg-gray-50 rounded">
            <HelpCircle size={6} className="text-orange-500 shrink-0" />
            <span className="text-[7px] text-gray-600 truncate">{item.pergunta || 'Pergunta'}</span>
          </div>
        ))}
      </div>
      <div className="absolute top-1 right-1 px-1 py-0.5 bg-gray-100 rounded text-[6px] text-gray-400">
        {data?.variant || 'accordion'}
      </div>
    </div>
  );
}

function VideoPreview({ data }) {
  return (
    <div className="w-full h-full rounded bg-stone-900 flex items-center justify-center overflow-hidden">
      <div className="text-center">
        <div className="w-8 h-8 mx-auto rounded-full bg-white/20 flex items-center justify-center">
          <Video size={14} className="text-white" />
        </div>
        {data?.titulo && (
          <div className="text-[7px] text-white/70 mt-1 truncate px-2">{data.titulo}</div>
        )}
      </div>
      <div className="absolute top-1 right-1 px-1 py-0.5 bg-black/40 rounded text-[6px] text-white/60">
        {data?.variant || 'contained'}
      </div>
    </div>
  );
}

function SeparatorPreview({ data }) {
  const variant = data?.variant || 'linha';
  return (
    <div className="w-full h-full rounded bg-gray-50 flex items-center justify-center px-4 overflow-hidden">
      {variant === 'linha' && <div className="w-full h-px bg-gray-300" />}
      {variant === 'espaco' && <div className="text-[7px] text-gray-300">— espaço —</div>}
      {variant === 'decorativo' && (
        <div className="flex items-center gap-1">
          <div className="w-4 h-px bg-gray-300" />
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ACCENT }} />
          <div className="w-4 h-px bg-gray-300" />
        </div>
      )}
      <div className="absolute top-1 right-1 px-1 py-0.5 bg-gray-100 rounded text-[6px] text-gray-400">
        {variant}
      </div>
    </div>
  );
}

function ServicesPreview({ data }) {
  const items = data?.items || [];
  return (
    <div className="w-full h-full rounded bg-white border border-gray-100 p-2 flex flex-col overflow-hidden">
      {data?.titulo && (
        <div className="text-[8px] font-bold text-gray-800 mb-1 truncate">{data.titulo}</div>
      )}
      <div className="grid grid-cols-2 gap-1 flex-1">
        {(items.length > 0 ? items.slice(0, 4) : [{ nome: 'Serviço', icone: '📷' }]).map((item, i) => (
          <div key={i} className="bg-gray-50 rounded p-1 flex flex-col items-center justify-center">
            <span className="text-[10px]">{item.icone || '📷'}</span>
            <span className="text-[6px] text-gray-600 truncate w-full text-center">{item.nome}</span>
          </div>
        ))}
      </div>
      <div className="absolute top-1 right-1 px-1 py-0.5 bg-gray-100 rounded text-[6px] text-gray-400">
        {data?.variant || 'cards'}
      </div>
    </div>
  );
}

/**
 * Componente principal que renderiza o preview baseado no tipo de bloco
 */
export default function BlockPreview({ block, isSelected, onClick }) {
  const { type, data } = block;

  const previewMap = {
    hero: HeroPreview,
    text: TextPreview,
    gallery: GalleryPreview,
    testimonials: TestimonialsPreview,
    cta: CTAPreview,
    faq: FAQPreview,
    video: VideoPreview,
    separator: SeparatorPreview,
    services: ServicesPreview,
  };

  const Preview = previewMap[type];

  const heightMap = {
    hero: 'h-24',
    separator: 'h-10',
    text: 'h-20',
    gallery: 'h-24',
    testimonials: 'h-20',
    cta: 'h-20',
    faq: 'h-20',
    video: 'h-20',
    services: 'h-20',
  };

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 ${heightMap[type] || 'h-20'} ${
        isSelected
          ? 'ring-2 ring-orange-500 shadow-lg scale-[1.01]'
          : 'ring-1 ring-gray-200 hover:ring-orange-300 hover:shadow-md'
      }`}
    >
      {Preview ? <Preview data={data} /> : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
          Bloco desconhecido
        </div>
      )}
    </div>
  );
}
