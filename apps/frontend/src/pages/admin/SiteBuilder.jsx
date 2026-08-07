import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Layout, Plus, Trash2, GripVertical, Save, Image, Type, Grid3X3,
  Star, MousePointer, HelpCircle, Video, Minus, Briefcase,
  Copy, Globe, EyeOff, Home, FileText, Settings2, Sparkles,
  X, PanelRightOpen, PanelRightClose, Layers, Bot, Search,
  Wand2, Zap
} from 'lucide-react';
import { SITE_TEMPLATES } from './siteTemplates';
import BlockPreview from './site-builder/BlockPreview';
import LivePreview from './site-builder/LivePreview';
import AIAssistant from './site-builder/AIAssistant';
import AIFieldHelper, { AIFaqGenerator, AIServicesGenerator, AISeoGenerator } from './site-builder/AIFieldHelper';

const ACCENT = '#EA580C';

const BLOCK_TYPES = [
  { type: 'hero', label: 'Hero', icon: Image, description: 'Banner principal com imagem e texto' },
  { type: 'text', label: 'Texto', icon: Type, description: 'Seção de texto com/sem imagem' },
  { type: 'gallery', label: 'Galeria', icon: Grid3X3, description: 'Grid de fotos do portfolio' },
  { type: 'testimonials', label: 'Depoimentos', icon: Star, description: 'Carousel de depoimentos' },
  { type: 'cta', label: 'CTA', icon: MousePointer, description: 'Chamada para ação (WhatsApp/contato)' },
  { type: 'faq', label: 'FAQ', icon: HelpCircle, description: 'Perguntas frequentes' },
  { type: 'video', label: 'Vídeo', icon: Video, description: 'Embed de vídeo YouTube/Vimeo' },
  { type: 'separator', label: 'Separador', icon: Minus, description: 'Linha divisória ou espaço' },
  { type: 'services', label: 'Serviços', icon: Briefcase, description: 'Cards de serviços oferecidos' },
];

const getDefaultData = (type) => {
  const defaults = {
    hero: { titulo: '', subtitulo: '', imagem_url: '', botao_texto: '', botao_url: '', variant: 'fullscreen' },
    text: { titulo: '', conteudo: '', imagem_url: '', imagem_posicao: 'acima', variant: 'simples' },
    gallery: { titulo: '', quantidade: 6, variant: 'grid' },
    testimonials: { titulo: '', quantidade: 3, variant: 'carousel' },
    cta: { titulo: '', subtitulo: '', botao_texto: '', botao_url: '', variant: 'simples' },
    faq: { titulo: '', items: [{ pergunta: '', resposta: '' }], variant: 'accordion' },
    video: { titulo: '', url: '', variant: 'contained' },
    separator: { variant: 'linha', altura: 40 },
    services: { titulo: '', items: [{ nome: '', descricao: '', icone: '' }], variant: 'cards' },
  };
  return defaults[type] || {};
};


// ═══════════════════════════════════════════════════════════════
// SORTABLE PAGE ITEM
// ═══════════════════════════════════════════════════════════════

function SortablePageItem({ page, isActive, onSelect, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: page.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}
      className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${
        isActive
          ? 'border-orange-500 bg-orange-50 shadow-sm'
          : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
      }`}
      onClick={() => onSelect(page)}
    >
      <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical size={14} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{page.titulo || 'Sem título'}</p>
        <p className="text-xs text-gray-500 truncate">/{page.slug}</p>
      </div>
      {page.is_home && <Home size={12} className="text-orange-500" />}
      <button onClick={(e) => { e.stopPropagation(); onDelete(page.id); }}
        className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 size={14} />
      </button>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// SORTABLE BLOCK CARD — Visual com preview thumbnail
// ═══════════════════════════════════════════════════════════════

function SortableBlockCard({ block, isSelected, onSelect, onDelete, onDuplicate }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const blockType = BLOCK_TYPES.find(b => b.type === block.type);
  const Icon = blockType?.icon || FileText;

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div className={`relative transition-all duration-200 ${isSelected ? 'scale-[1.02]' : ''}`}>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-t-lg text-xs font-medium ${
          isSelected ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
        }`}>
          <button {...attributes} {...listeners} className="cursor-grab hover:opacity-70">
            <GripVertical size={12} />
          </button>
          <Icon size={12} />
          <span className="flex-1 truncate">{blockType?.label || block.type}</span>
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(block); }}
            className="opacity-0 group-hover:opacity-100 hover:text-blue-300 transition-opacity p-0.5">
            <Copy size={11} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
            className="opacity-0 group-hover:opacity-100 hover:text-red-300 transition-opacity p-0.5">
            <Trash2 size={11} />
          </button>
        </div>
        <BlockPreview block={block} isSelected={isSelected} onClick={() => onSelect(block.id)} />
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// EDIT PANEL — Painel lateral com IA integrada em cada campo
// ═══════════════════════════════════════════════════════════════

function EditPanel({ block, onUpdate, onClose, authFetch }) {
  if (!block) return null;

  const update = (field, value) => onUpdate(block.id, { ...block.data, [field]: value });
  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition-all";
  const labelCls = "block text-xs font-semibold text-gray-700 mb-1.5";
  const selectCls = inputCls;
  const blockType = BLOCK_TYPES.find(b => b.type === block.type);
  const Icon = blockType?.icon || FileText;

  const handleImageUpload = async (field) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const res = await authFetch('/admin/fotos/upload-url', {
          method: 'POST',
          body: JSON.stringify({ albumId: 'site', contentType: file.type }),
        });
        const json = await res.json();
        if (json.success && json.data?.uploadUrl) {
          await fetch(json.data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
          const cdnDomain = 'd2112x4m4e89fv.cloudfront.net';
          const cdnUrl = `https://${cdnDomain}/${json.data.key}`;
          update(field, cdnUrl);
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    };
    input.click();
  };

  // Renderiza campo com botão IA integrado
  const renderField = (label, field, type = 'text', options = null) => {
    const isTextType = type === 'text' || type === 'textarea';
    const tipoCampo = field === 'titulo' ? 'titulo' : field === 'subtitulo' ? 'subtitulo' : field === 'conteudo' ? 'conteudo' : field === 'botao_texto' ? 'botao_texto' : 'titulo';

    return (
      <div key={field}>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-gray-700">{label}</label>
          {isTextType && (
            <AIFieldHelper
              authFetch={authFetch}
              tipoCampo={tipoCampo}
              contexto={`${blockType?.label || block.type} - ${block.data?.titulo || ''}`}
              valorAtual={block.data?.[field] || ''}
              onGenerated={(texto) => update(field, texto)}
              compact={true}
            />
          )}
        </div>
        {type === 'textarea' ? (
          <textarea className={inputCls} rows={3} value={block.data?.[field] || ''} onChange={e => update(field, e.target.value)} />
        ) : type === 'select' ? (
          <select className={selectCls} value={block.data?.[field] || ''} onChange={e => update(field, e.target.value)}>
            {options.sort().map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : type === 'number' ? (
          <input type="number" className={inputCls} value={block.data?.[field] || ''} onChange={e => update(field, parseInt(e.target.value) || 0)} min={options?.min} max={options?.max} />
        ) : type === 'image' ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input type="text" className={inputCls} value={block.data?.[field] || ''} onChange={e => update(field, e.target.value)} placeholder="URL da imagem ou faça upload" />
              <button type="button" onClick={() => handleImageUpload(field)}
                className="shrink-0 px-3 py-2 text-xs font-medium text-white rounded-lg hover:opacity-90 transition-opacity" style={{ background: ACCENT }}>
                Upload
              </button>
            </div>
            {block.data?.[field] && (
              <img src={block.data[field]} alt="" className="h-24 w-full rounded-lg border border-gray-200 object-cover" />
            )}
          </div>
        ) : (
          <input type="text" className={inputCls} value={block.data?.[field] || ''} onChange={e => update(field, e.target.value)} />
        )}
      </div>
    );
  };

  // Renderiza itens (FAQ/Services) com IA
  const renderItems = (fields, blockType) => {
    const items = block.data?.items || [];
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelCls}>Itens</label>
          {blockType === 'faq' && (
            <AIFaqGenerator authFetch={authFetch} onGenerated={(newItems) => update('items', newItems)} />
          )}
          {blockType === 'services' && (
            <AIServicesGenerator authFetch={authFetch} onGenerated={(newItems) => update('items', newItems)} />
          )}
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 items-start p-2 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex-1 space-y-1.5">
                {fields.map(f => (
                  <input key={f} className={inputCls} placeholder={f.charAt(0).toUpperCase() + f.slice(1)} value={item[f] || ''} onChange={e => {
                    const newItems = [...items];
                    newItems[i] = { ...newItems[i], [f]: e.target.value };
                    update('items', newItems);
                  }} />
                ))}
              </div>
              <button onClick={() => update('items', items.filter((_, idx) => idx !== i))}
                className="text-gray-400 hover:text-red-500 mt-1 p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => update('items', [...items, fields.reduce((a, f) => ({ ...a, [f]: '' }), {})])}
          className="text-sm flex items-center gap-1 mt-2 font-medium" style={{ color: ACCENT }}>
          <Plus size={14} /> Adicionar item
        </button>
      </div>
    );
  };

  const formFields = {
    hero: () => (
      <div className="space-y-4">
        {renderField('Variante', 'variant', 'select', ['fullscreen', 'minimal', 'split'])}
        {renderField('Título', 'titulo')}
        {renderField('Subtítulo', 'subtitulo')}
        {renderField('Imagem de fundo', 'imagem_url', 'image')}
        {renderField('Texto do botão', 'botao_texto')}
        {renderField('URL do botão', 'botao_url')}
      </div>
    ),
    text: () => (
      <div className="space-y-4">
        {renderField('Variante', 'variant', 'select', ['citacao', 'destaque', 'simples'])}
        {renderField('Título', 'titulo')}
        {renderField('Conteúdo', 'conteudo', 'textarea')}
        {renderField('Imagem', 'imagem_url', 'image')}
        {renderField('Posição da imagem', 'imagem_posicao', 'select', ['acima', 'direita', 'esquerda'])}
      </div>
    ),
    gallery: () => (
      <div className="space-y-4">
        {renderField('Variante', 'variant', 'select', ['carousel', 'grid', 'masonry'])}
        {renderField('Título', 'titulo')}
        {renderField('Quantidade de fotos', 'quantidade', 'number', { min: 4, max: 12 })}
      </div>
    ),
    testimonials: () => (
      <div className="space-y-4">
        {renderField('Variante', 'variant', 'select', ['carousel', 'grid', 'lista'])}
        {renderField('Título', 'titulo')}
        {renderField('Quantidade', 'quantidade', 'number', { min: 3, max: 6 })}
      </div>
    ),
    cta: () => (
      <div className="space-y-4">
        {renderField('Variante', 'variant', 'select', ['banner', 'destaque', 'simples'])}
        {renderField('Título', 'titulo')}
        {renderField('Subtítulo', 'subtitulo')}
        {renderField('Texto do botão', 'botao_texto')}
        {renderField('URL do botão', 'botao_url')}
      </div>
    ),
    faq: () => (
      <div className="space-y-4">
        {renderField('Variante', 'variant', 'select', ['accordion', 'cards', 'lista'])}
        {renderField('Título', 'titulo')}
        {renderItems(['pergunta', 'resposta'], 'faq')}
      </div>
    ),
    video: () => (
      <div className="space-y-4">
        {renderField('Variante', 'variant', 'select', ['background', 'contained', 'fullwidth'])}
        {renderField('Título', 'titulo')}
        {renderField('URL do vídeo (YouTube/Vimeo)', 'url')}
      </div>
    ),
    separator: () => (
      <div className="space-y-4">
        {renderField('Variante', 'variant', 'select', ['decorativo', 'espaco', 'linha'])}
        {renderField('Altura (px)', 'altura', 'number', { min: 10, max: 200 })}
      </div>
    ),
    services: () => (
      <div className="space-y-4">
        {renderField('Variante', 'variant', 'select', ['cards', 'grid', 'lista'])}
        {renderField('Título', 'titulo')}
        {renderItems(['nome', 'descricao', 'icone'], 'services')}
      </div>
    ),
  };

  const FormContent = formFields[block.type];

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200 overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <Icon size={16} style={{ color: ACCENT }} />
        <h3 className="font-semibold text-sm text-gray-800 flex-1">{blockType?.label || block.type}</h3>
        <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
          {block.data?.variant || '—'}
        </span>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200 transition-colors">
          <X size={16} />
        </button>
      </div>
      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {FormContent ? <FormContent /> : <p className="text-sm text-gray-500">Tipo de bloco desconhecido.</p>}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// SEO PANEL — Painel de SEO com geração por IA
// ═══════════════════════════════════════════════════════════════

function SeoPanel({ page, onUpdate, authFetch, blocks }) {
  if (!page) return null;

  return (
    <div className="border-t border-gray-200 bg-gray-50 px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-600 flex items-center gap-1">
          <Search size={11} /> SEO
        </h4>
        <AISeoGenerator
          authFetch={authFetch}
          tituloPagina={page.titulo}
          blocos={blocks}
          onGenerated={(seo) => {
            onUpdate(prev => ({ ...prev, seo_titulo: seo.seo_titulo, seo_descricao: seo.seo_descricao }));
          }}
        />
      </div>
      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-gray-500 mb-0.5 block">Título SEO</label>
          <input
            type="text"
            value={page.seo_titulo || ''}
            onChange={e => onUpdate(prev => ({ ...prev, seo_titulo: e.target.value }))}
            placeholder="Título para buscadores (50-60 chars)"
            className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300"
          />
          <span className="text-[9px] text-gray-400">{(page.seo_titulo || '').length}/60</span>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 mb-0.5 block">Meta Description</label>
          <textarea
            value={page.seo_descricao || ''}
            onChange={e => onUpdate(prev => ({ ...prev, seo_descricao: e.target.value }))}
            placeholder="Descrição para buscadores (130-155 chars)"
            rows={2}
            className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300 resize-none"
          />
          <span className="text-[9px] text-gray-400">{(page.seo_descricao || '').length}/155</span>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// MAIN SITE BUILDER — Layout split view + IA
// ═══════════════════════════════════════════════════════════════

export default function SiteBuilder() {
  const { authFetch } = useAuth();
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  const [error, setError] = useState(null);

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  // ─── Data Operations ──────────────────────────────────────

  const loadPages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/admin/site/pages');
      const json = await res.json();
      const data = json.data || json || [];
      setPages(data);
      if (data.length > 0 && !selectedPage) {
        await selectPage(data[0]);
      }
    } catch (err) {
      setError('Erro ao carregar páginas');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const selectPage = async (page) => {
    try {
      setSelectedPage(page);
      setSelectedBlockId(null);
      const res = await authFetch(`/admin/site/pages/${page.id}`);
      const json = await res.json();
      const data = json.data || json;
      setSelectedPage(data);
      const internalBlocks = (data.blocos || []).map(b => ({
        id: b.id,
        type: b.type,
        data: { variant: b.variant || '', ...(b.props || {}) },
      }));
      setBlocks(internalBlocks);
    } catch (err) {
      setError('Erro ao carregar página');
    }
  };

  const addPage = async () => {
    try {
      const res = await authFetch('/admin/site/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: 'Nova Página', slug: 'nova-pagina', visivel: false, blocos: [] }),
      });
      const json = await res.json();
      const newPage = json.data || json;
      setPages(prev => [...prev, newPage]);
      await selectPage(newPage);
    } catch (err) {
      setError('Erro ao criar página');
    }
  };

  const deletePage = async (id) => {
    if (!confirm('Excluir esta página?')) return;
    try {
      await authFetch(`/admin/site/pages/${id}`, { method: 'DELETE' });
      const updated = pages.filter(p => p.id !== id);
      setPages(updated);
      if (selectedPage?.id === id) {
        if (updated.length > 0) await selectPage(updated[0]);
        else { setSelectedPage(null); setBlocks([]); }
      }
    } catch (err) {
      setError('Erro ao excluir página');
    }
  };

  const savePage = async () => {
    if (!selectedPage) return;
    try {
      setSaving(true);
      const blocosForApi = blocks.map(b => {
        const { variant, ...props } = b.data || {};
        return { id: b.id, type: b.type, variant: variant || '', props };
      });
      await authFetch(`/admin/site/pages/${selectedPage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...selectedPage, blocos: blocosForApi }),
      });
      setError(null);
    } catch (err) {
      setError('Erro ao salvar página');
    } finally {
      setSaving(false);
    }
  };

  const handlePageReorder = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = pages.findIndex(p => p.id === active.id);
    const newIdx = pages.findIndex(p => p.id === over.id);
    const reordered = arrayMove(pages, oldIdx, newIdx);
    setPages(reordered);
    try {
      await authFetch('/admin/site/pages/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: reordered.map(p => p.id) }),
      });
    } catch (err) {
      setError('Erro ao reordenar páginas');
    }
  };

  const handleBlockReorder = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex(b => b.id === active.id);
    const newIdx = blocks.findIndex(b => b.id === over.id);
    setBlocks(arrayMove(blocks, oldIdx, newIdx));
  };

  const addBlock = (type) => {
    const newBlock = { id: crypto.randomUUID(), type, data: getDefaultData(type) };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
    setShowBlockModal(false);
  };

  const deleteBlock = (id) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const duplicateBlock = (block) => {
    const newBlock = { ...block, id: crypto.randomUUID(), data: { ...block.data } };
    const idx = blocks.findIndex(b => b.id === block.id);
    setBlocks(prev => [...prev.slice(0, idx + 1), newBlock, ...prev.slice(idx + 1)]);
    setSelectedBlockId(newBlock.id);
  };

  const updateBlockData = (id, data) => setBlocks(prev => prev.map(b => b.id === id ? { ...b, data } : b));

  // ─── AI Page Generation ───────────────────────────────────

  const handleAIPageGenerated = async (pageData) => {
    try {
      // Create the page via API
      const blocosForApi = (pageData.blocos || []).map(b => ({
        id: b.id || crypto.randomUUID(),
        type: b.type,
        variant: b.variant || '',
        props: b.props || {},
      }));

      const res = await authFetch('/admin/site/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: pageData.titulo,
          slug: pageData.slug,
          visivel: false,
          blocos: blocosForApi,
          seo_titulo: pageData.seo_titulo || '',
          seo_descricao: pageData.seo_descricao || '',
        }),
      });
      const json = await res.json();
      const newPage = json.data || json;
      setPages(prev => [...prev, newPage]);
      await selectPage(newPage);
    } catch (err) {
      setError('Erro ao aplicar página gerada pela IA');
    }
  };

  // ─── Template Application ─────────────────────────────────

  const applyTemplate = async (template) => {
    if (!window.confirm(`Aplicar template "${template.label}"? Isso vai criar ${template.pages.length} página(s) novas.`)) return;
    setApplyingTemplate(true);
    try {
      for (const page of template.pages) {
        const blocos = page.blocos.map(b => ({
          id: crypto.randomUUID(),
          type: b.type,
          variant: b.variant || '',
          props: b.props || {},
        }));
        await authFetch('/admin/site/pages', {
          method: 'POST',
          body: JSON.stringify({ titulo: page.titulo, slug: page.slug, is_home: page.is_home, ordem: page.ordem, visivel: true, blocos }),
        });
      }
      setShowTemplateModal(false);
      await loadPages();
    } catch {
      setError('Erro ao aplicar template');
    }
    setApplyingTemplate(false);
  };

  useEffect(() => { loadPages(); }, [loadPages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: ACCENT }} />
      </div>
    );
  }


  // ─── RENDER ─────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 -m-6">
      {/* ══════ LEFT SIDEBAR — Páginas ══════ */}
      <aside className="w-56 border-r border-gray-200 bg-white flex flex-col shrink-0">
        <div className="p-3 border-b border-gray-200 flex items-center gap-2">
          <Layout size={18} style={{ color: ACCENT }} />
          <h2 className="font-semibold text-sm text-gray-800">Páginas</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          <DndContext collisionDetection={closestCenter} onDragEnd={handlePageReorder}>
            <SortableContext items={pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
              {pages.map(page => (
                <SortablePageItem key={page.id} page={page} isActive={selectedPage?.id === page.id}
                  onSelect={selectPage} onDelete={deletePage} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        <div className="p-2 border-t border-gray-200 space-y-1.5">
          <button onClick={addPage}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: ACCENT }}>
            <Plus size={14} /> Nova Página
          </button>
          <button onClick={() => setShowTemplateModal(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50">
            <Sparkles size={14} /> Templates
          </button>
          {/* AI Assistant Toggle */}
          <button onClick={() => setShowAI(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-sm">
            <Bot size={14} /> Assistente IA
          </button>
        </div>
      </aside>

      {/* ══════ CENTER — Block List (visual cards) ══════ */}
      <div className="flex flex-col w-72 shrink-0 border-r border-gray-200 bg-gray-50">
        {/* Page toolbar */}
        {selectedPage && (
          <header className="bg-white border-b border-gray-200 px-3 py-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <input type="text" value={selectedPage.titulo || ''}
                onChange={e => setSelectedPage(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Título" className="text-sm font-semibold border-none outline-none flex-1 bg-transparent min-w-0" />
              <button onClick={() => setSelectedPage(prev => ({ ...prev, visivel: !prev.visivel }))}
                className="p-1.5 rounded hover:bg-gray-100" title={selectedPage.visivel ? 'Visível' : 'Oculta'}>
                {selectedPage.visivel ? <Globe size={14} className="text-green-600" /> : <EyeOff size={14} className="text-gray-400" />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-gray-500 flex-1 min-w-0">
                <span>/</span>
                <input type="text" value={selectedPage.slug || ''}
                  onChange={e => setSelectedPage(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
              </div>
              <button onClick={() => setShowSeo(!showSeo)}
                className={`p-1.5 rounded transition-colors ${showSeo ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100 text-gray-400'}`}
                title="SEO">
                <Search size={12} />
              </button>
              <button onClick={savePage} disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ backgroundColor: ACCENT }}>
                <Save size={12} /> {saving ? '...' : 'Salvar'}
              </button>
            </div>
          </header>
        )}

        {/* SEO Panel (collapsible) */}
        {showSeo && selectedPage && (
          <SeoPanel
            page={selectedPage}
            onUpdate={setSelectedPage}
            authFetch={authFetch}
            blocks={blocks}
          />
        )}

        {/* Error Banner */}
        {error && (
          <div className="mx-3 mt-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">×</button>
          </div>
        )}

        {/* Block list */}
        {selectedPage ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Layers size={12} /> Blocos ({blocks.length})
              </h3>
              <button onClick={() => setShowPreview(prev => !prev)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200" title={showPreview ? 'Esconder preview' : 'Mostrar preview'}>
                {showPreview ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
              </button>
            </div>

            <DndContext collisionDetection={closestCenter} onDragEnd={handleBlockReorder}>
              <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                {blocks.map(block => (
                  <SortableBlockCard key={block.id} block={block}
                    isSelected={selectedBlockId === block.id}
                    onSelect={setSelectedBlockId}
                    onDelete={deleteBlock}
                    onDuplicate={duplicateBlock} />
                ))}
              </SortableContext>
            </DndContext>

            {blocks.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <Settings2 size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">Nenhum bloco adicionado</p>
                <p className="text-[10px] text-gray-300 mt-1">Use o Assistente IA ou adicione manualmente</p>
              </div>
            )}

            <button onClick={() => setShowBlockModal(true)}
              className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-orange-400 hover:text-orange-600 text-xs font-medium transition-colors">
              <Plus size={14} /> Adicionar Bloco
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Home size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs">Selecione uma página</p>
            </div>
          </div>
        )}
      </div>


      {/* ══════ RIGHT — Live Preview + Edit Panel ══════ */}
      <div className="flex-1 flex overflow-hidden">
        {/* Live Preview */}
        {showPreview && (
          <div className="flex-1 p-3 overflow-hidden">
            <LivePreview
              blocks={blocks}
              pageTitle={selectedPage?.titulo || ''}
              selectedBlockId={selectedBlockId}
              onBlockClick={(id) => setSelectedBlockId(id)}
            />
          </div>
        )}

        {/* Edit Panel (shows when a block is selected) */}
        {selectedBlock && (
          <div className="w-80 shrink-0">
            <EditPanel
              block={selectedBlock}
              onUpdate={updateBlockData}
              onClose={() => setSelectedBlockId(null)}
              authFetch={authFetch}
            />
          </div>
        )}
      </div>

      {/* ══════ MODAL — Adicionar Bloco ══════ */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowBlockModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Adicionar Bloco</h3>
              <button onClick={() => setShowBlockModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {BLOCK_TYPES.map(bt => (
                <button key={bt.type} onClick={() => addBlock(bt.type)}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-gray-100 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all hover:shadow-md group">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-50 group-hover:bg-orange-100 transition-colors">
                    <bt.icon size={20} style={{ color: ACCENT }} />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{bt.label}</span>
                  <span className="text-[10px] text-gray-500 text-center leading-tight">{bt.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════ MODAL — Templates com Preview Visual ══════ */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !applyingTemplate && setShowTemplateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles size={20} style={{ color: ACCENT }} /> Templates Prontos
                </h3>
                <p className="text-sm text-gray-500 mt-1">Escolha um template para criar as páginas automaticamente.</p>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SITE_TEMPLATES.map(tpl => (
                <button key={tpl.key} onClick={() => applyTemplate(tpl)} disabled={applyingTemplate}
                  className="text-left border-2 border-gray-100 rounded-xl hover:border-orange-300 hover:shadow-lg transition-all disabled:opacity-50 overflow-hidden group">
                  {/* Template preview thumbnail */}
                  <div className="h-32 bg-stone-900 p-3 relative overflow-hidden">
                    <div className="border-t-2 border-[#EA580C] rounded-t bg-stone-950 p-1.5 mb-1">
                      <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-stone-700" />
                        <div className="w-4 h-1 bg-stone-800 rounded" />
                        <div className="w-4 h-1 bg-stone-800 rounded" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      {tpl.pages[0]?.blocos.slice(0, 3).map((b, i) => (
                        <div key={i} className={`rounded ${
                          b.type === 'hero' ? 'h-8 bg-gradient-to-r from-stone-700 to-stone-800' :
                          b.type === 'gallery' ? 'h-5 bg-stone-800 grid grid-cols-3 gap-0.5 p-0.5' :
                          b.type === 'cta' ? 'h-5 bg-orange-600/30' :
                          b.type === 'testimonials' ? 'h-4 bg-stone-800' :
                          b.type === 'text' ? 'h-4 bg-stone-800/50' :
                          'h-3 bg-stone-800/30'
                        }`}>
                          {b.type === 'gallery' && Array.from({length: 3}).map((_, j) => (
                            <div key={j} className="bg-stone-700 rounded-sm" />
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium bg-black/50 px-3 py-1 rounded-full">
                        Usar template
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-semibold text-gray-900 text-sm">{tpl.label}</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{tpl.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{tpl.pages.length} página(s)</span>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {tpl.pages.reduce((acc, p) => acc + p.blocos.length, 0)} blocos
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════ AI ASSISTANT (floating chat) ══════ */}
      <AIAssistant
        isOpen={showAI}
        onClose={() => setShowAI(false)}
        authFetch={authFetch}
        currentPage={selectedPage}
        onPageGenerated={handleAIPageGenerated}
      />
    </div>
  );
}
