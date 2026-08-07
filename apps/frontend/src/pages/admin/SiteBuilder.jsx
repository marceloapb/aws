import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Layout, Plus, Trash2, GripVertical, Save, Eye, Image, Type, Grid3X3,
  Star, MousePointer, HelpCircle, Video, Minus, Briefcase, ChevronDown,
  ChevronUp, Copy, Globe, EyeOff, Home, FileText, Settings2, Sparkles
} from 'lucide-react';
import { SITE_TEMPLATES } from './siteTemplates';

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

function SortablePageItem({ page, isActive, onSelect, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: page.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${isActive ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`} onClick={() => onSelect(page)}>
      <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical size={14} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{page.titulo || 'Sem título'}</p>
        <p className="text-xs text-gray-500 truncate">/{page.slug}</p>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(page.id); }} className="text-gray-400 hover:text-red-500 p-1">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function SortableBlock({ block, onToggle, onDelete, onDuplicate, onUpdate, expanded, authFetch }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const blockType = BLOCK_TYPES.find(b => b.type === block.type);
  const Icon = blockType?.icon || FileText;

  return (
    <div ref={setNodeRef} style={style} className="border border-gray-200 rounded-lg bg-white mb-2">
      <div className="flex items-center gap-2 p-3">
        <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
          <GripVertical size={16} />
        </button>
        <Icon size={16} style={{ color: ACCENT }} />
        <span className="text-sm font-medium flex-1">{blockType?.label || block.type}</span>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{block.data?.variant || '—'}</span>
        <button onClick={() => onDuplicate(block)} className="p-1 text-gray-400 hover:text-blue-500"><Copy size={14} /></button>
        <button onClick={() => onDelete(block.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
        <button onClick={() => onToggle(block.id)} className="p-1 text-gray-400 hover:text-gray-700">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <BlockForm block={block} onUpdate={onUpdate} authFetch={authFetch} />
        </div>
      )}
    </div>
  );
}

function BlockForm({ block, onUpdate, authFetch }) {
  const update = (field, value) => onUpdate(block.id, { ...block.data, [field]: value });
  const inputCls = "w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1";
  const selectCls = inputCls;

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
          // Use CDN URL directly
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

  const renderField = (label, field, type = 'text', options = null) => (
    <div key={field}>
      <label className={labelCls}>{label}</label>
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
            <button type="button" onClick={() => handleImageUpload(field)} className="shrink-0 px-3 py-1.5 text-xs font-medium text-white rounded hover:opacity-90" style={{ background: ACCENT }}>
              Upload
            </button>
          </div>
          {block.data?.[field] && (
            <img src={block.data[field]} alt="" className="h-20 w-auto rounded border border-gray-200 object-cover" />
          )}
        </div>
      ) : (
        <input type="text" className={inputCls} value={block.data?.[field] || ''} onChange={e => update(field, e.target.value)} />
      )}
    </div>
  );

  const renderItems = (fields) => {
    const items = block.data?.items || [];
    return (
      <div>
        <label className={labelCls}>Itens</label>
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 mb-2 items-start">
            <div className="flex-1 space-y-1">
              {fields.map(f => (
                <input key={f} className={inputCls} placeholder={f} value={item[f] || ''} onChange={e => {
                  const newItems = [...items];
                  newItems[i] = { ...newItems[i], [f]: e.target.value };
                  update('items', newItems);
                }} />
              ))}
            </div>
            <button onClick={() => update('items', items.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 mt-1"><Trash2 size={14} /></button>
          </div>
        ))}
        <button onClick={() => update('items', [...items, fields.reduce((a, f) => ({ ...a, [f]: '' }), {})])} className="text-sm flex items-center gap-1 mt-1" style={{ color: ACCENT }}>
          <Plus size={14} /> Adicionar item
        </button>
      </div>
    );
  };

  const formFields = {
    hero: () => (
      <div className="space-y-3">
        {renderField('Título', 'titulo')}
        {renderField('Subtítulo', 'subtitulo')}
        {renderField('Imagem', 'imagem_url', 'image')}
        {renderField('Texto do botão', 'botao_texto')}
        {renderField('URL do botão', 'botao_url')}
        {renderField('Variante', 'variant', 'select', ['fullscreen', 'minimal', 'split'])}
      </div>
    ),
    text: () => (
      <div className="space-y-3">
        {renderField('Título', 'titulo')}
        {renderField('Conteúdo', 'conteudo', 'textarea')}
        {renderField('Imagem', 'imagem_url', 'image')}
        {renderField('Posição da imagem', 'imagem_posicao', 'select', ['acima', 'direita', 'esquerda'])}
        {renderField('Variante', 'variant', 'select', ['citacao', 'destaque', 'simples'])}
      </div>
    ),
    gallery: () => (
      <div className="space-y-3">
        {renderField('Título', 'titulo')}
        {renderField('Quantidade', 'quantidade', 'number', { min: 4, max: 12 })}
        {renderField('Variante', 'variant', 'select', ['carousel', 'grid', 'masonry'])}
      </div>
    ),
    testimonials: () => (
      <div className="space-y-3">
        {renderField('Título', 'titulo')}
        {renderField('Quantidade', 'quantidade', 'number', { min: 3, max: 6 })}
        {renderField('Variante', 'variant', 'select', ['carousel', 'grid', 'lista'])}
      </div>
    ),
    cta: () => (
      <div className="space-y-3">
        {renderField('Título', 'titulo')}
        {renderField('Subtítulo', 'subtitulo')}
        {renderField('Texto do botão', 'botao_texto')}
        {renderField('URL do botão', 'botao_url')}
        {renderField('Variante', 'variant', 'select', ['banner', 'destaque', 'simples'])}
      </div>
    ),
    faq: () => (
      <div className="space-y-3">
        {renderField('Título', 'titulo')}
        {renderItems(['pergunta', 'resposta'])}
        {renderField('Variante', 'variant', 'select', ['accordion', 'cards', 'lista'])}
      </div>
    ),
    video: () => (
      <div className="space-y-3">
        {renderField('Título', 'titulo')}
        {renderField('URL do vídeo', 'url')}
        {renderField('Variante', 'variant', 'select', ['background', 'contained', 'fullwidth'])}
      </div>
    ),
    separator: () => (
      <div className="space-y-3">
        {renderField('Variante', 'variant', 'select', ['decorativo', 'espaco', 'linha'])}
        {renderField('Altura (px)', 'altura', 'number', { min: 10, max: 200 })}
      </div>
    ),
    services: () => (
      <div className="space-y-3">
        {renderField('Título', 'titulo')}
        {renderItems(['nome', 'descricao', 'icone'])}
        {renderField('Variante', 'variant', 'select', ['cards', 'grid', 'lista'])}
      </div>
    ),
  };

  const FormContent = formFields[block.type];
  return FormContent ? <FormContent /> : <p className="text-sm text-gray-500">Tipo de bloco desconhecido.</p>;
}

export default function SiteBuilder() {
  const { authFetch } = useAuth();
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [expandedBlocks, setExpandedBlocks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [error, setError] = useState(null);

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
      const res = await authFetch(`/admin/site/pages/${page.id}`);
      const json = await res.json();
      const data = json.data || json;
      setSelectedPage(data);
      // Convert API format {id, type, variant, props} to internal {id, type, data}
      const internalBlocks = (data.blocos || []).map(b => ({
        id: b.id,
        type: b.type,
        data: { variant: b.variant || '', ...(b.props || {}) },
      }));
      setBlocks(internalBlocks);
      setExpandedBlocks({});
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
      const newPage = await res.json();
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
      // Convert internal format {id, type, data} to API format {id, type, variant, props}
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
    setExpandedBlocks(prev => ({ ...prev, [newBlock.id]: true }));
    setShowBlockModal(false);
  };

  const deleteBlock = (id) => setBlocks(prev => prev.filter(b => b.id !== id));
  const duplicateBlock = (block) => {
    const newBlock = { ...block, id: crypto.randomUUID(), data: { ...block.data } };
    setBlocks(prev => [...prev, newBlock]);
  };
  const updateBlockData = (id, data) => setBlocks(prev => prev.map(b => b.id === id ? { ...b, data } : b));
  const toggleBlock = (id) => setExpandedBlocks(prev => ({ ...prev, [id]: !prev[id] }));

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

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 -m-6">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <Layout size={20} style={{ color: ACCENT }} />
          <h2 className="font-semibold text-gray-800">Páginas</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <DndContext collisionDetection={closestCenter} onDragEnd={handlePageReorder}>
            <SortableContext items={pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
              {pages.map(page => (
                <SortablePageItem key={page.id} page={page} isActive={selectedPage?.id === page.id} onSelect={selectPage} onDelete={deletePage} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        <div className="p-3 border-t border-gray-200">
          <button onClick={addPage} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg" style={{ backgroundColor: ACCENT }}>
            <Plus size={16} /> Nova Página
          </button>
          <button onClick={() => setShowTemplateModal(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 mt-2">
            <Sparkles size={16} /> Usar Template
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        {selectedPage && (
          <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
            <input type="text" value={selectedPage.titulo || ''} onChange={e => setSelectedPage(prev => ({ ...prev, titulo: e.target.value }))} placeholder="Título da página" className="text-lg font-semibold border-none outline-none flex-1 bg-transparent" />
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span>/</span>
              <input type="text" value={selectedPage.slug || ''} onChange={e => setSelectedPage(prev => ({ ...prev, slug: e.target.value }))} className="w-32 border border-gray-300 rounded px-2 py-1 text-sm" />
            </div>
            <button onClick={() => setSelectedPage(prev => ({ ...prev, visivel: !prev.visivel }))} className="p-2 rounded hover:bg-gray-100" title={selectedPage.visivel ? 'Visível' : 'Oculta'}>
              {selectedPage.visivel ? <Globe size={18} className="text-green-600" /> : <EyeOff size={18} className="text-gray-400" />}
            </button>
            <button onClick={savePage} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
              <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => window.open(`/${selectedPage.slug}`, '_blank')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">
              <Eye size={16} /> Preview
            </button>
          </header>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">×</button>
          </div>
        )}

        {/* Block Editor */}
        {selectedPage ? (
          <div className="flex-1 overflow-y-auto p-6">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleBlockReorder}>
              <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                {blocks.map(block => (
                  <SortableBlock key={block.id} block={block} expanded={!!expandedBlocks[block.id]} onToggle={toggleBlock} onDelete={deleteBlock} onDuplicate={duplicateBlock} onUpdate={updateBlockData} authFetch={authFetch} />
                ))}
              </SortableContext>
            </DndContext>
            {blocks.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Settings2 size={40} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhum bloco adicionado. Clique abaixo para começar.</p>
              </div>
            )}
            <button onClick={() => setShowBlockModal(true)} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-orange-400 hover:text-orange-600 transition-colors">
              <Plus size={18} /> Adicionar Bloco
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Home size={40} className="mx-auto mb-3 opacity-50" />
              <p>Selecione ou crie uma página para editar</p>
            </div>
          </div>
        )}
      </main>

      {/* Block Type Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBlockModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Adicionar Bloco</h3>
            <div className="grid grid-cols-3 gap-3">
              {BLOCK_TYPES.map(bt => (
                <button key={bt.type} onClick={() => addBlock(bt.type)} className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors">
                  <bt.icon size={24} style={{ color: ACCENT }} />
                  <span className="text-sm font-medium">{bt.label}</span>
                  <span className="text-xs text-gray-500 text-center leading-tight">{bt.description}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowBlockModal(false)} className="mt-4 w-full py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !applyingTemplate && setShowTemplateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles size={20} style={{ color: ACCENT }} /> Templates Prontos
              </h3>
              <p className="text-sm text-gray-500 mt-1">Escolha um template para criar as páginas automaticamente.</p>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SITE_TEMPLATES.map(tpl => (
                <button key={tpl.key} onClick={() => applyTemplate(tpl)} disabled={applyingTemplate}
                  className="text-left p-4 border border-gray-200 rounded-xl hover:border-orange-300 hover:bg-orange-50/50 transition-colors disabled:opacity-50">
                  <h4 className="font-semibold text-gray-900 mb-1">{tpl.label}</h4>
                  <p className="text-xs text-gray-500 mb-2">{tpl.description}</p>
                  <p className="text-xs text-gray-400">{tpl.pages.length} página(s)</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
