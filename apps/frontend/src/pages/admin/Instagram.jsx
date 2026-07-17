import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Instagram as IgIcon, Image, Calendar, BarChart3, Clock, DollarSign,
  Plus, Search, Filter, RefreshCw, Send, Trash2, Eye, Edit, X,
  ChevronRight, AlertTriangle, CheckCircle, XCircle, Hash, Layers,
  Play, Sparkles, Settings, TrendingUp, Users, Heart, Bookmark, Share2, Loader2
} from 'lucide-react';

const ACCENT = '#EA580C';
const TABS = ['Feed', 'Publicar', 'Stories', 'Insights', 'Agendados', 'Custos IA'];
const STATUS_COLORS = {
  publicado: 'bg-green-100 text-green-700',
  agendado: 'bg-blue-100 text-blue-700',
  falhou: 'bg-red-100 text-red-700',
  rascunho: 'bg-gray-100 text-gray-600',
};
const HASHTAGS_SUGERIDAS = ['#fotografia', '#ensaio', '#retrato', '#lifestyle', '#amor', '#brasil', '#photographer', '#booking'];

export default function Instagram() {
  const { authFetch } = useAuth();
  const [tab, setTab] = useState(0);

  // Feed state
  const [posts, setPosts] = useState([]);
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterPeriodo, setFilterPeriodo] = useState('');
  const [filterBusca, setFilterBusca] = useState('');

  // Publicar state
  const [tipoPost, setTipoPost] = useState('unico');
  const [albuns, setAlbuns] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [albumFotos, setAlbumFotos] = useState([]);
  const [gerandoCaption, setGerandoCaption] = useState(false);
  const [tomIA, setTomIA] = useState('emocional');
  const [contextIA, setContextIA] = useState('');
  const [caption, setCaption] = useState('');
  const [agendar, setAgendar] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Stories state
  const [storyMode, setStoryMode] = useState('template');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [storyFoto, setStoryFoto] = useState(null);
  const [storyPrompt, setStoryPrompt] = useState('');
  const [storyPreview, setStoryPreview] = useState(null);
  const [storyPublishing, setStoryPublishing] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ nome: '', prompt_base: '', estilo_visual: '', overlay_position: 'bottom' });
  const [storyMetrics, setStoryMetrics] = useState([]);

  // Insights state
  const [insights, setInsights] = useState(null);
  const [insightsPosts, setInsightsPosts] = useState([]);

  // Agendados state
  const [agendados, setAgendados] = useState([]);
  const [editingAgendado, setEditingAgendado] = useState(null);

  // Custos IA state
  const [custosIA, setCustosIA] = useState(null);

  // Loading
  const [loading, setLoading] = useState(false);

  // Fetch helpers
  const api = async (url, opts) => {
    const res = await authFetch(url, opts);
    return res.json();
  };

  const loadPosts = () => api('/admin/instagram/posts').then(setPosts).catch(() => {});
  const loadAlbuns = () => api('/admin/albuns').then(d => Array.isArray(d) ? setAlbuns(d) : null).catch(() => {});
  const loadTemplates = () => api('/admin/instagram/stories/templates').then(d => Array.isArray(d) ? setTemplates(d) : null).catch(() => {});
  const loadInsights = () => api('/admin/instagram/insights').then(setInsights).catch(() => {});
  const loadInsightsPosts = () => api('/admin/instagram/insights/posts').then(d => Array.isArray(d) ? setInsightsPosts(d) : null).catch(() => {});
  const loadAgendados = () => api('/admin/instagram/agendados').then(d => Array.isArray(d) ? setAgendados(d) : null).catch(() => {});
  const loadCustos = () => api('/admin/instagram/custos-ia').then(setCustosIA).catch(() => {});

  useEffect(() => {
    loadPosts();
    loadAlbuns();
  }, []);

  useEffect(() => {
    if (tab === 2) { loadTemplates(); }
    if (tab === 3) { loadInsights(); loadInsightsPosts(); }
    if (tab === 4) loadAgendados();
    if (tab === 5) loadCustos();
  }, [tab]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    let result = posts;
    if (filterStatus !== 'todos') result = result.filter(p => p.status === filterStatus);
    if (filterPeriodo) result = result.filter(p => p.created_at >= filterPeriodo);
    if (filterBusca) result = result.filter(p => p.caption?.toLowerCase().includes(filterBusca.toLowerCase()));
    return result;
  }, [posts, filterStatus, filterPeriodo, filterBusca]);

  // Publish handler
  const handlePublish = async (mode) => {
    if (selectedPhotos.length === 0 || !caption.trim()) return;
    setPublishing(true);
    try {
      const payload = {
        fotos: selectedPhotos,
        caption,
        ...(mode === 'agendar' && scheduleDate ? { scheduled_at: `${scheduleDate}T${scheduleTime || '12:00'}` } : {}),
        ...(mode === 'rascunho' ? { rascunho: true } : {}),
      };
      const endpoint = tipoPost === 'carrossel' ? '/admin/instagram/carrossel' : '/admin/instagram/publicar';
      await api(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setSelectedPhotos([]); setCaption(''); setAgendar(false); setScheduleDate(''); setScheduleTime('');
      loadPosts();
      if (mode !== 'rascunho') setTab(0);
    } catch {}
    setPublishing(false);
  };

  // Retry/Republish
  const handleRetry = async (postId) => {
    await api('/admin/instagram/publicar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ retry_post_id: postId }) });
    loadPosts();
  };

  // Delete post
  const handleDelete = async (postId) => {
    await api(`/admin/instagram/posts/${postId}`, { method: 'DELETE' });
    loadPosts();
  };

  // Story publish
  const handleStoryTemplate = async () => {
    if (!selectedTemplate || !storyFoto) return;
    setStoryPublishing(true);
    try {
      const res = await api('/admin/instagram/stories/template', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: selectedTemplate.id, foto_url: storyFoto }),
      });
      setStoryPreview(res.preview_url || res);
    } catch {}
    setStoryPublishing(false);
  };

  const handleStoryIA = async () => {
    if (!storyPrompt.trim()) return;
    setStoryPublishing(true);
    try {
      const res = await api('/admin/instagram/stories/ia-livre', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: storyPrompt, foto_url: storyFoto }),
      });
      setStoryPreview(res.preview_url || res);
    } catch {}
    setStoryPublishing(false);
  };

  // Template CRUD
  const saveTemplate = async () => {
    const method = editingTemplate ? 'PUT' : 'POST';
    const url = editingTemplate ? `/admin/instagram/stories/templates/${editingTemplate.id}` : '/admin/instagram/stories/templates';
    await api(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(templateForm) });
    loadTemplates();
    setEditingTemplate(null);
    setTemplateForm({ nome: '', prompt_base: '', estilo_visual: '', overlay_position: 'bottom' });
  };

  const deleteTemplate = async (id) => {
    await api(`/admin/instagram/stories/templates/${id}`, { method: 'DELETE' });
    loadTemplates();
  };

  // Agendados actions
  const updateAgendado = async (id, data) => {
    await api(`/admin/instagram/agendados/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    loadAgendados();
  };

  const countdown = (dateStr) => {
    const diff = new Date(dateStr) - new Date();
    if (diff <= 0) return 'Agora';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  // Photo toggle
  const togglePhoto = (url) => {
    if (tipoPost === 'unico') { setSelectedPhotos([url]); return; }
    if (selectedPhotos.includes(url)) setSelectedPhotos(selectedPhotos.filter(p => p !== url));
    else if (selectedPhotos.length < 10) setSelectedPhotos([...selectedPhotos, url]);
  };

  const addHashtag = (tag) => {
    if (caption.length + tag.length + 1 <= 2200) setCaption(prev => prev + ' ' + tag);
  };


  // ==================== RENDER ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <IgIcon size={28} style={{ color: ACCENT }} /> Instagram
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === i ? 'border-[#EA580C] text-[#EA580C]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ===================== ABA FEED ===================== */}
      {tab === 0 && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value="todos">Todos</option>
              <option value="publicado">Publicado</option>
              <option value="agendado">Agendado</option>
              <option value="falhou">Falhou</option>
              <option value="rascunho">Rascunho</option>
            </select>
            <input type="date" value={filterPeriodo} onChange={e => setFilterPeriodo(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm" />
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input value={filterBusca} onChange={e => setFilterBusca(e.target.value)}
                placeholder="Buscar posts..." className="border rounded-lg pl-9 pr-3 py-2 text-sm w-full" />
            </div>
            <button onClick={() => { setTab(1); }} className="flex items-center gap-1 text-white px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: ACCENT }}>
              <Plus size={16} /> Novo Post
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPosts.map(post => (
              <div key={post.id} className="border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                {post.thumbnail && <img src={post.thumbnail} alt="" className="w-full h-40 object-cover" />}
                <div className="p-3 space-y-2">
                  <p className="text-sm text-gray-700 line-clamp-2">{post.caption}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{post.created_at ? new Date(post.created_at).toLocaleDateString('pt-BR') : ''}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[post.status] || 'bg-gray-100 text-gray-600'}`}>
                      {post.status}
                    </span>
                  </div>
                  <div className="flex gap-1 pt-1 border-t">
                    <button onClick={() => { setTab(3); }} className="text-xs text-gray-500 hover:text-[#EA580C] flex items-center gap-0.5" title="Insights">
                      <Eye size={13} />
                    </button>
                    {post.status === 'falhou' && (
                      <button onClick={() => handleRetry(post.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5" title="Republicar">
                        <RefreshCw size={13} /> {post.retry_count ? `(${post.retry_count}x)` : ''}
                      </button>
                    )}
                    <button onClick={() => handleDelete(post.id)} className="text-xs text-gray-400 hover:text-red-500 ml-auto" title="Excluir">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredPosts.length === 0 && <p className="text-center text-gray-400 py-12">Nenhum post encontrado.</p>}
        </div>
      )}


      {/* ===================== ABA PUBLICAR ===================== */}
      {tab === 1 && (
        <div className="space-y-5">
          {/* Tipo */}
          <div className="flex gap-3">
            <button onClick={() => { setTipoPost('unico'); setSelectedPhotos([]); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${tipoPost === 'unico' ? 'border-[#EA580C] text-[#EA580C] bg-orange-50' : 'text-gray-600'}`}>
              <Image size={16} className="inline mr-1" /> Post Único
            </button>
            <button onClick={() => { setTipoPost('carrossel'); setSelectedPhotos([]); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${tipoPost === 'carrossel' ? 'border-[#EA580C] text-[#EA580C] bg-orange-50' : 'text-gray-600'}`}>
              <Layers size={16} className="inline mr-1" /> Carrossel (até 10)
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Seleção de fotos + Caption */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Selecionar Fotos {tipoPost === 'carrossel' && `(${selectedPhotos.length}/10)`}</h3>
              {/* Selecionar álbum primeiro */}
              <select value={selectedAlbumId || ''} onChange={async (e) => {
                setSelectedAlbumId(e.target.value);
                setSelectedPhotos([]);
                if (e.target.value) {
                  try { const r = await authFetch(`/admin/albuns/${e.target.value}`); const d = await r.json(); setAlbumFotos(d.data?.fotos || d.fotos || []); } catch { setAlbumFotos([]); }
                } else { setAlbumFotos([]); }
              }} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione um álbum...</option>
                {albuns.map(a => <option key={a.id} value={a.id}>{a.titulo} ({a.total_fotos || '?'} fotos)</option>)}
              </select>
              {/* Grid de fotos do álbum selecionado */}
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                {albumFotos.length === 0 && <p className="col-span-4 text-center text-xs text-gray-400 py-4">{selectedAlbumId ? 'Nenhuma foto neste álbum' : 'Selecione um álbum acima'}</p>}
                {albumFotos.map((foto, i) => (
                  <div key={i} onClick={() => togglePhoto(foto.url || foto.url_thumb)} className={`relative cursor-pointer rounded-lg overflow-hidden border-2 ${selectedPhotos.includes(foto.url || foto.url_thumb) ? 'border-[#EA580C]' : 'border-transparent'}`}>
                    <img src={foto.url_thumb || foto.url || ''} alt="" className="w-full h-16 object-cover" />
                    {selectedPhotos.includes(foto.url || foto.url_thumb) && (
                      <div className="absolute inset-0 bg-orange-500/30 flex items-center justify-center">
                        <CheckCircle size={18} className="text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Caption */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">Caption</label>
                  <button type="button" onClick={async () => {
                    setGerandoCaption(true);
                    try {
                      const r = await authFetch('/admin/instagram/gerar-caption', { method: 'POST', body: JSON.stringify({ tipo_evento: 'ensaio fotográfico', cliente_nome: '', tom: tomIA, contexto: contextIA, incluir_hashtags: true }) });
                      const d = await r.json();
                      if (d.success) setCaption(d.data.caption);
                    } catch {}
                    setGerandoCaption(false);
                  }} disabled={gerandoCaption} className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50">
                    {gerandoCaption ? <><Loader2 size={12} className="animate-spin" /> Gerando...</> : <><Sparkles size={12} /> Gerar com IA</>}
                  </button>
                </div>
                {/* Config IA (colapsável) */}
                <div className="flex gap-2 mt-1 mb-1">
                  <select value={tomIA} onChange={e => setTomIA(e.target.value)} className="text-xs border rounded px-2 py-1">
                    <option value="emocional">Tom: Emocional</option>
                    <option value="profissional">Tom: Profissional</option>
                    <option value="descontraido">Tom: Descontraído</option>
                    <option value="poetico">Tom: Poético</option>
                  </select>
                  <input value={contextIA} onChange={e => setContextIA(e.target.value)} placeholder="Contexto extra (local, momento...)" className="flex-1 text-xs border rounded px-2 py-1" />
                </div>
                <textarea value={caption} onChange={e => e.target.value.length <= 2200 && setCaption(e.target.value)}
                  rows={4} placeholder="Escreva a legenda ou gere com IA..." className="w-full border rounded-lg p-3 text-sm resize-none" />
                <span className="text-xs text-gray-400">{caption.length}/2200</span>
              </div>

              {/* Hashtags */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Hashtags sugeridas</label>
                <div className="flex flex-wrap gap-1">
                  {HASHTAGS_SUGERIDAS.map(tag => (
                    <button key={tag} onClick={() => addHashtag(tag)}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-orange-100 text-gray-600 hover:text-[#EA580C] rounded-full transition-colors">
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Agendamento */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={agendar} onChange={e => setAgendar(e.target.checked)} className="accent-[#EA580C]" />
                  <span className="text-sm font-medium">Agendar publicação</span>
                </label>
              </div>
              {agendar && (
                <div className="flex gap-2">
                  <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
                  <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-2 pt-2">
                <button onClick={() => handlePublish('publicar')} disabled={publishing}
                  className="flex items-center gap-1 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
                  <Send size={15} /> {publishing ? 'Publicando...' : 'Publicar Agora'}
                </button>
                {agendar && (
                  <button onClick={() => handlePublish('agendar')} disabled={publishing}
                    className="flex items-center gap-1 border border-[#EA580C] text-[#EA580C] px-4 py-2 rounded-lg text-sm font-medium">
                    <Calendar size={15} /> Agendar
                  </button>
                )}
                <button onClick={() => handlePublish('rascunho')} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">
                  Salvar Rascunho
                </button>
              </div>
            </div>

            {/* Right: Preview */}
            <div className="border rounded-xl p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Preview</h3>
              <div className="bg-white rounded-xl border max-w-[320px] mx-auto overflow-hidden">
                <div className="flex items-center gap-2 p-3 border-b">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-pink-500" />
                  <span className="text-sm font-semibold">seu_perfil</span>
                </div>
                {selectedPhotos[0] ? (
                  <img src={selectedPhotos[0]} alt="Preview" className="w-full h-[320px] object-cover" />
                ) : (
                  <div className="w-full h-[320px] bg-gray-200 flex items-center justify-center text-gray-400">
                    <Image size={48} />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm text-gray-700 line-clamp-3">{caption || 'Sua legenda aqui...'}</p>
                </div>
              </div>
              {tipoPost === 'carrossel' && selectedPhotos.length > 1 && (
                <p className="text-center text-xs text-gray-400 mt-2">{selectedPhotos.length} fotos no carrossel</p>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ===================== ABA STORIES ===================== */}
      {tab === 2 && (
        <div className="space-y-5">
          {/* Mode toggle + Gerenciar Templates */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button onClick={() => setStoryMode('template')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${storyMode === 'template' ? 'border-[#EA580C] text-[#EA580C] bg-orange-50' : 'text-gray-600'}`}>
                <Layers size={15} className="inline mr-1" /> Template
              </button>
              <button onClick={() => setStoryMode('ia')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${storyMode === 'ia' ? 'border-[#EA580C] text-[#EA580C] bg-orange-50' : 'text-gray-600'}`}>
                <Sparkles size={15} className="inline mr-1" /> IA Livre
              </button>
            </div>
            <button onClick={() => setShowTemplateModal(true)} className="text-sm text-gray-600 hover:text-[#EA580C] flex items-center gap-1">
              <Settings size={15} /> Gerenciar Templates
            </button>
          </div>

          {/* Story Metrics (IG-16) */}
          {storyMetrics.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {storyMetrics.slice(0, 5).map((s, i) => (
                <div key={i} className="min-w-[120px] border rounded-lg p-2 text-center bg-white">
                  <div className="w-full h-16 bg-gray-100 rounded mb-1" />
                  <span className="text-xs text-gray-500">{s.views} views · {s.respostas} resp.</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Form */}
            <div className="space-y-4">
              {storyMode === 'template' ? (
                <>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Template</label>
                    <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                      {templates.map(t => (
                        <div key={t.id} onClick={() => setSelectedTemplate(t)}
                          className={`border rounded-lg p-2 cursor-pointer text-sm ${selectedTemplate?.id === t.id ? 'border-[#EA580C] bg-orange-50' : 'hover:border-gray-300'}`}>
                          <p className="font-medium truncate">{t.nome}</p>
                          <p className="text-xs text-gray-400 truncate">{t.estilo_visual}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Foto do álbum</label>
                    <div className="grid grid-cols-5 gap-2 mt-2 max-h-32 overflow-y-auto">
                      {albuns.flatMap(a => a.fotos || []).map((f, i) => (
                        <img key={i} src={f.thumbnail || f.url} alt="" onClick={() => setStoryFoto(f.url)}
                          className={`w-full h-14 object-cover rounded cursor-pointer border-2 ${storyFoto === f.url ? 'border-[#EA580C]' : 'border-transparent'}`} />
                      ))}
                    </div>
                  </div>
                  <button onClick={handleStoryTemplate} disabled={storyPublishing || !selectedTemplate || !storyFoto}
                    className="flex items-center gap-1 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
                    <Sparkles size={15} /> {storyPublishing ? 'Gerando...' : 'Gerar com IA'}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Descreva o que deseja no story</label>
                    <textarea value={storyPrompt} onChange={e => setStoryPrompt(e.target.value)}
                      rows={4} placeholder="Ex: Story promocional com desconto de 20%..." className="w-full border rounded-lg p-3 text-sm mt-1 resize-none" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Foto (opcional)</label>
                    <div className="grid grid-cols-5 gap-2 mt-2 max-h-32 overflow-y-auto">
                      {albuns.flatMap(a => a.fotos || []).map((f, i) => (
                        <img key={i} src={f.thumbnail || f.url} alt="" onClick={() => setStoryFoto(f.url)}
                          className={`w-full h-14 object-cover rounded cursor-pointer border-2 ${storyFoto === f.url ? 'border-[#EA580C]' : 'border-transparent'}`} />
                      ))}
                    </div>
                  </div>
                  <button onClick={handleStoryIA} disabled={storyPublishing || !storyPrompt.trim()}
                    className="flex items-center gap-1 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
                    <Sparkles size={15} /> {storyPublishing ? 'Gerando...' : 'Gerar'}
                  </button>
                </>
              )}
            </div>

            {/* Right: Preview */}
            <div className="border rounded-xl p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Preview do Story</h3>
              <div className="bg-black rounded-2xl max-w-[240px] mx-auto h-[420px] flex items-center justify-center overflow-hidden">
                {storyPreview ? (
                  <img src={typeof storyPreview === 'string' ? storyPreview : storyPreview.preview_url} alt="Story" className="w-full h-full object-cover" />
                ) : (
                  <p className="text-gray-500 text-sm">Preview aparecerá aqui</p>
                )}
              </div>
              {storyPreview && (
                <button onClick={() => { /* publish story */ }} className="mt-3 w-full flex items-center justify-center gap-1 text-white py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: ACCENT }}>
                  <Send size={15} /> Publicar Story
                </button>
              )}
            </div>
          </div>

          {/* Template CRUD Modal (IG-15) */}
          {showTemplateModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Gerenciar Templates</h2>
                  <button onClick={() => setShowTemplateModal(false)}><X size={20} /></button>
                </div>
                {/* List */}
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {templates.map(t => (
                    <div key={t.id} className="flex items-center justify-between border rounded-lg p-2">
                      <div>
                        <p className="text-sm font-medium">{t.nome}</p>
                        <p className="text-xs text-gray-400">{t.estilo_visual}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingTemplate(t); setTemplateForm({ nome: t.nome, prompt_base: t.prompt_base, estilo_visual: t.estilo_visual, overlay_position: t.overlay_position }); }}
                          className="text-gray-400 hover:text-[#EA580C]"><Edit size={15} /></button>
                        <button onClick={() => deleteTemplate(t.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Form */}
                <div className="border-t pt-4 space-y-3">
                  <h3 className="text-sm font-semibold">{editingTemplate ? 'Editar' : 'Novo'} Template</h3>
                  <input value={templateForm.nome} onChange={e => setTemplateForm({ ...templateForm, nome: e.target.value })}
                    placeholder="Nome" className="w-full border rounded-lg px-3 py-2 text-sm" />
                  <textarea value={templateForm.prompt_base} onChange={e => setTemplateForm({ ...templateForm, prompt_base: e.target.value })}
                    placeholder="Prompt base" rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
                  <input value={templateForm.estilo_visual} onChange={e => setTemplateForm({ ...templateForm, estilo_visual: e.target.value })}
                    placeholder="Estilo visual (ex: minimalista, bold)" className="w-full border rounded-lg px-3 py-2 text-sm" />
                  <select value={templateForm.overlay_position} onChange={e => setTemplateForm({ ...templateForm, overlay_position: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="top">Top</option>
                    <option value="center">Center</option>
                    <option value="bottom">Bottom</option>
                  </select>
                  <button onClick={saveTemplate} className="text-white px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: ACCENT }}>
                    {editingTemplate ? 'Salvar' : 'Criar'} Template
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* ===================== ABA INSIGHTS ===================== */}
      {tab === 3 && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Seguidores', value: insights?.followers || 0, icon: Users },
              { label: 'Alcance', value: insights?.reach || 0, icon: Eye },
              { label: 'Impressões', value: insights?.impressions || 0, icon: TrendingUp },
              { label: 'Engajamento', value: `${insights?.engagement || 0}%`, icon: Heart },
              { label: 'Posts este mês', value: insights?.posts_month || 0, icon: IgIcon },
            ].map(kpi => (
              <div key={kpi.label} className="border rounded-xl p-4 bg-white">
                <kpi.icon size={18} className="text-gray-400 mb-1" />
                <p className="text-xl font-bold" style={{ color: ACCENT }}>{kpi.value}</p>
                <p className="text-xs text-gray-500">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Gráfico Alcance Diário */}
          <div className="border rounded-xl p-4 bg-white">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Alcance Diário (últimos 30 dias)</h3>
            <div className="flex items-end gap-1 h-32">
              {(insights?.daily_reach || Array(30).fill(0)).map((val, i) => {
                const max = Math.max(...(insights?.daily_reach || [1]));
                const h = max > 0 ? (val / max) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div className="w-full rounded-t" style={{ height: `${h}%`, backgroundColor: ACCENT, minHeight: val > 0 ? '2px' : '0' }} title={`${val}`} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-gray-400">30 dias atrás</span>
              <span className="text-[10px] text-gray-400">Hoje</span>
            </div>
          </div>

          {/* Insights por Post */}
          <div className="border rounded-xl overflow-hidden bg-white">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-semibold text-gray-700">Insights por Post</h3>
              <button onClick={() => { loadInsights(); loadInsightsPosts(); }} className="text-sm flex items-center gap-1 hover:text-[#EA580C] text-gray-500">
                <RefreshCw size={14} /> Atualizar Insights
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Post</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Impressões</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Alcance</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Engajamento</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Salvos</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Shares</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {insightsPosts.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 flex items-center gap-2">
                        {p.thumbnail && <img src={p.thumbnail} alt="" className="w-8 h-8 object-cover rounded" />}
                        <span className="truncate max-w-[150px]">{p.caption}</span>
                      </td>
                      <td className="text-right px-4 py-2">{p.impressions}</td>
                      <td className="text-right px-4 py-2">{p.reach}</td>
                      <td className="text-right px-4 py-2">{p.engagement}</td>
                      <td className="text-right px-4 py-2">{p.saves}</td>
                      <td className="text-right px-4 py-2">{p.shares}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* ===================== ABA AGENDADOS ===================== */}
      {tab === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Clock size={20} style={{ color: ACCENT }} /> Posts Agendados</h2>
          {agendados.length === 0 && <p className="text-center text-gray-400 py-12">Nenhum post agendado.</p>}
          <div className="space-y-3">
            {agendados.map(item => (
              <div key={item.id} className="border rounded-xl p-4 bg-white flex items-center gap-4">
                {item.thumbnail && <img src={item.thumbnail} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{item.caption}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(item.scheduled_at).toLocaleString('pt-BR')}
                  </p>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    Publica em {countdown(item.scheduled_at)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {editingAgendado === item.id ? (
                    <div className="flex gap-1">
                      <input type="datetime-local" id={`edit-${item.id}`} defaultValue={item.scheduled_at?.slice(0, 16)}
                        className="border rounded px-2 py-1 text-xs" />
                      <button onClick={() => {
                        const val = document.getElementById(`edit-${item.id}`).value;
                        if (val) updateAgendado(item.id, { scheduled_at: val });
                        setEditingAgendado(null);
                      }} className="text-xs text-[#EA580C] font-medium">OK</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => setEditingAgendado(item.id)} className="text-xs text-gray-500 hover:text-[#EA580C] flex items-center gap-1">
                        <Edit size={13} /> Editar data
                      </button>
                      <button onClick={() => updateAgendado(item.id, { publicar_agora: true })} className="text-xs text-gray-500 hover:text-green-600 flex items-center gap-1">
                        <Play size={13} /> Publicar agora
                      </button>
                      <button onClick={() => updateAgendado(item.id, { cancelar: true })} className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1">
                        <XCircle size={13} /> Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== ABA CUSTOS IA ===================== */}
      {tab === 5 && (
        <div className="space-y-5">
          {/* Budget Alert */}
          {custosIA && custosIA.custo_total > (custosIA.budget * 0.8) && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 text-sm">
              <AlertTriangle size={18} /> Atenção: consumo acima de 80% do budget mensal de IA.
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Stories gerados', value: custosIA?.stories_gerados || 0 },
              { label: 'Custo total', value: `R$ ${(custosIA?.custo_total || 0).toFixed(2)}` },
              { label: 'Média por story', value: `R$ ${(custosIA?.media_por_story || 0).toFixed(2)}` },
              { label: 'Budget restante', value: `R$ ${((custosIA?.budget || 0) - (custosIA?.custo_total || 0)).toFixed(2)}` },
            ].map(kpi => (
              <div key={kpi.label} className="border rounded-xl p-4 bg-white">
                <DollarSign size={18} className="text-gray-400 mb-1" />
                <p className="text-xl font-bold" style={{ color: ACCENT }}>{kpi.value}</p>
                <p className="text-xs text-gray-500">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Tabela de custos */}
          <div className="border rounded-xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Data</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Tipo</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Modelo LLM</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Tokens</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Custo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(custosIA?.detalhes || []).map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{new Date(item.data).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.tipo === 'template' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {item.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{item.modelo}</td>
                      <td className="text-right px-4 py-2">{item.tokens?.toLocaleString()}</td>
                      <td className="text-right px-4 py-2 font-medium">R$ {item.custo?.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(!custosIA?.detalhes || custosIA.detalhes.length === 0) && (
              <p className="text-center text-gray-400 py-8 text-sm">Nenhum custo registrado este mês.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
