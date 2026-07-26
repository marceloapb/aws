import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Upload, Send, Settings, Plus, Trash2, ChevronUp, ChevronDown,
  X, ChevronLeft, ChevronRight, Download, Eye,
  Image, CheckCircle2, Edit, Palette, Type, Sparkles, Monitor
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#3B82F6';

const LAYOUT_OPTIONS = [
  { id: 'colagem', label: 'Colagem', icon: '▦' },
  { id: 'mosaico', label: 'Mosaico', icon: '▧' },
  { id: 'grade', label: 'Grade', icon: '▤' },
  { id: 'miniaturas', label: 'Miniaturas', icon: '▥' },
  { id: 'slider', label: 'Slider', icon: '▬' },
  { id: 'apresentacao', label: 'Apresent...', icon: '▶' },
  { id: 'faixa', label: 'Faixa', icon: '═' },
  { id: 'coluna', label: 'Coluna', icon: '║' },
  { id: 'ladrilhos', label: 'Ladrilhos', icon: '▩' },
  { id: 'misto', label: 'Misto', icon: '⊞' },
  { id: 'alternar', label: 'Alternar', icon: '⇆' },
  { id: 'magico', label: 'Mágico', icon: '✦' },
];

const CAPA_LAYOUTS = [
  { id: 'elegante', label: 'Elegante', desc: 'Foto escura com texto centralizado embaixo' },
  { id: 'ousado', label: 'Ousado', desc: 'Foto grande com texto bold sobreposto' },
  { id: 'jovial', label: 'Jovial', desc: 'Cores vibrantes com cantos arredondados' },
  { id: 'classico', label: 'Clássico', desc: 'Layout tradicional com borda fina' },
  { id: 'minimalista', label: 'Minimalista', desc: 'Fundo branco com foto menor' },
  { id: 'atemporal', label: 'Atemporal', desc: 'Estilo cinematográfico widescreen' },
  { id: 'moderno', label: 'Moderno', desc: 'Texto grande no topo, foto abaixo' },
];

const SCROLL_EFFECTS = [
  { id: 'none', label: 'Sem efeito' },
  { id: 'gradual', label: 'Gradualm...' },
  { id: 'grayscale', label: 'Tons de ci...' },
  { id: 'slide', label: 'Deslizar' },
  { id: 'expand', label: 'Expandir' },
  { id: 'shrink', label: 'Encolher' },
  { id: 'zoom-out', label: 'Zoom out' },
  { id: 'one-color', label: 'Uma cor' },
];

const HOVER_EFFECTS = [
  { id: 'none', label: 'Sem efeito' },
  { id: 'zoom', label: 'Aproximar' },
  { id: 'blur', label: 'Desfocado' },
  { id: 'grayscale', label: 'Tons de ci...' },
  { id: 'shrink', label: 'Encolher' },
  { id: 'invert', label: 'Invertido' },
  { id: 'color', label: 'Cor' },
  { id: 'darken', label: 'Escurecer' },
];

const OVERLAY_ANIMATIONS = [
  { id: 'none', label: 'Sem efeito' },
  { id: 'gradual', label: 'Gradualm...' },
  { id: 'expand', label: 'Expandir' },
  { id: 'slide', label: 'Deslizar' },
  { id: 'slide-reverse', label: 'Deslizar p...' },
];

const FONT_PRESETS = [
  { titulo: 'Playfair Display', corpo: 'Inter' },
  { titulo: 'Cormorant Garamond', corpo: 'Open Sans' },
  { titulo: 'Montserrat', corpo: 'Lato' },
  { titulo: 'Lora', corpo: 'Roboto' },
  { titulo: 'Poppins', corpo: 'Source Sans Pro' },
  { titulo: 'Raleway', corpo: 'Nunito' },
  { titulo: 'Oswald', corpo: 'Merriweather' },
  { titulo: 'Dancing Script', corpo: 'Quicksand' },
];


export default function AlbumDetalhe() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const fileInputRef = useRef(null);

  const [album, setAlbum] = useState(null);
  const [galerias, setGalerias] = useState([]);
  const [galeriaAtiva, setGaleriaAtiva] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [selecionadas, setSelecionadas] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [novaGaleria, setNovaGaleria] = useState('');
  const [showNovaGaleria, setShowNovaGaleria] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [showGaleriaModal, setShowGaleriaModal] = useState(false);
  const [editingFoto, setEditingFoto] = useState(null);
  const [editFotoForm, setEditFotoForm] = useState({ titulo: '', descricao: '' });

  // Navigation
  const [activeTab, setActiveTab] = useState('midia');
  const [designSubTab, setDesignSubTab] = useState('main');
  const [designLayoutTab, setDesignLayoutTab] = useState('capa');
  const [designColorTab, setDesignColorTab] = useState('capa');
  const [textoTab, setTextoTab] = useState('capa');
  // Preview mode: 'capa' or 'galeria'
  const [previewMode, setPreviewMode] = useState('capa');

  // Tema
  const [tema, setTema] = useState({
    layout: 'colagem', capa_layout: 'elegante',
    orientacao: 'horizontal', espacamento: 10, densidade_colagem: 40,
    cores_capa: { texto: '#FFFFFF', overlay: '#121212' },
    cores_galerias: { texto_icones: '#FF3C00', background: '#121212', overlay_texto: '#FF3C00', overlay_hover: '#FF3C00', overlay_opacidade: 30, borda_cor: '#FF3C00', borda_largura: 3, borda_raio: 10 },
    fonte_titulo: 'Playfair Display', fonte_corpo: 'Inter',
    animacao_scroll: 'none', animacao_hover: 'none', animacao_overlay: 'none',
    qualidade_imagem: 90, capa_foto_id: null,
  });

  // Texto
  const [textoAlbum, setTextoAlbum] = useState({
    titulo: '', texto_botao: 'Ver fotos', mais_info: true,
    data_evento: '', info_negocio: true, info_tipo: 'nome', nome_negocio: '',
  });

  // Config
  const [config, setConfig] = useState({
    permite_download: true, permite_selecao: true, permite_comentarios: true,
    cota_selecao: 0, senha_acesso: '', data_expiracao: '',
  });


  // Fetch
  const fetchAlbum = useCallback(async () => {
    try {
      const albumRes = await authFetch(`/admin/albuns/${id}`);
      const albumJson = await albumRes.json();
      if (albumJson.success) {
        const data = albumJson.data;
        setAlbum(data);
        setFotos(data.fotos || []);
        setTextoAlbum(t => ({ ...t, titulo: data.titulo || '', data_evento: data.data_evento || '', nome_negocio: data.nome_negocio || '' }));
        setConfig({ permite_download: data.permite_download ?? true, permite_selecao: data.permite_selecao ?? true, permite_comentarios: data.permite_comentarios ?? true, cota_selecao: data.cota_selecao || 0, senha_acesso: data.senha_acesso || '', data_expiracao: data.data_expiracao || '' });
      }
      try { const gr = await authFetch(`/admin/albuns/${id}/galerias`); const gj = await gr.json(); if (gj.success && gj.data?.length) { setGalerias(gj.data); if (!galeriaAtiva) setGaleriaAtiva(gj.data[0].id); } } catch {}
      try { const tr = await authFetch(`/admin/albuns/${id}/tema`); const tj = await tr.json(); if (tj.success && tj.data) setTema(t => ({ ...t, ...tj.data })); } catch {}
    } catch {}
  }, [id, authFetch]);

  useEffect(() => { fetchAlbum(); }, [fetchAlbum]);

  const fotosGaleria = !galeriaAtiva ? fotos : galeriaAtiva === '__sem_galeria__' ? fotos.filter(f => !f.galeria_id) : fotos.filter(f => f.galeria_id === galeriaAtiva);
  const capaFoto = fotos.find(f => (f.id === tema.capa_foto_id) || (f.SK?.replace('FOTO#', '') === tema.capa_foto_id));

  // Actions
  const saveTema = async (t) => { const data = t || tema; try { await authFetch(`/admin/albuns/${id}/tema`, { method: 'PUT', body: JSON.stringify(data) }); } catch {} };
  const saveTexto = async () => { try { await authFetch(`/admin/albuns/${id}`, { method: 'PUT', body: JSON.stringify({ titulo: textoAlbum.titulo, data_evento: textoAlbum.data_evento, nome_negocio: textoAlbum.nome_negocio }) }); } catch {} };
  const saveConfig = async (field, value) => { try { await authFetch(`/admin/albuns/${id}`, { method: 'PUT', body: JSON.stringify({ [field]: value }) }); fetchAlbum(); } catch {} };

  const updateTema = (patch) => { const next = { ...tema, ...patch }; setTema(next); saveTema(next); };
  const updateTemaCapa = (patch) => { const next = { ...tema, cores_capa: { ...tema.cores_capa, ...patch } }; setTema(next); saveTema(next); };
  const updateTemaGalerias = (patch) => { const next = { ...tema, cores_galerias: { ...tema.cores_galerias, ...patch } }; setTema(next); saveTema(next); };

  const handlePublicar = async () => { const p = album?.pagamento_percentual || 0; if (p < 70 && !window.confirm(`Pagamento em ${p}%. Publicar mesmo assim?`)) return; const r = await authFetch(`/admin/albuns/${id}/publicar`, { method: 'POST' }); const j = await r.json(); if (j.success) fetchAlbum(); else alert(j.message || 'Erro'); };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files); if (!files.length) return;
    setUploading(true); setUploadProgress(0);
    const BATCH = 50; const confirmList = []; let uploaded = 0;
    for (let b = 0; b < files.length; b += BATCH) {
      const bf = files.slice(b, b + BATCH);
      const fd = bf.map(f => ({ filename: f.name, content_type: f.type, size_bytes: f.size }));
      const ur = await authFetch(`/admin/albuns/${id}/upload-urls`, { method: 'POST', body: JSON.stringify({ files: fd }) });
      const uj = await ur.json(); if (!uj.success) { setUploading(false); alert(uj.message || 'Erro'); return; }
      const ups = uj.data;
      for (let i = 0; i < bf.length; i += 5) {
        const chunk = bf.slice(i, i + 5);
        await Promise.all(chunk.map(async (file, j) => { const u = ups[i + j]; try { await fetch(u.upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } }); confirmList.push({ foto_id: u.foto_id, key: u.key, content_type: file.type, filename: file.name }); } catch {} }));
        uploaded += chunk.length; setUploadProgress(Math.round((uploaded / files.length) * 100));
      }
    }
    for (let i = 0; i < confirmList.length; i += BATCH) { await authFetch(`/admin/albuns/${id}/fotos/confirmar-batch`, { method: 'POST', body: JSON.stringify({ fotos: confirmList.slice(i, i + BATCH), galeria_id: galeriaAtiva }) }); }
    setUploading(false); await new Promise(r => setTimeout(r, 600)); await fetchAlbum();
  };

  const criarGaleria = async () => { if (!novaGaleria.trim()) return; const r = await authFetch(`/admin/albuns/${id}/galerias`, { method: 'POST', body: JSON.stringify({ nome: novaGaleria.trim() }) }); const j = await r.json(); if (j.success) { setNovaGaleria(''); setShowNovaGaleria(false); fetchAlbum(); } };
  const renomearGaleria = async (gid) => { await authFetch(`/admin/albuns/${id}/galerias/${gid}`, { method: 'PUT', body: JSON.stringify({ nome: renameValue }) }); setRenaming(null); fetchAlbum(); };
  const excluirGaleria = async (gid) => { if (fotos.filter(f => f.galeria_id === gid).length > 0) return alert('Só é possível excluir galerias vazias.'); if (!confirm('Excluir?')) return; await authFetch(`/admin/albuns/${id}/galerias/${gid}`, { method: 'DELETE' }); if (galeriaAtiva === gid) setGaleriaAtiva(galerias[0]?.id || null); fetchAlbum(); };
  const reordenarGaleria = async (idx, dir) => { const a = [...galerias]; const s = idx + dir; if (s < 0 || s >= a.length) return; [a[idx], a[s]] = [a[s], a[idx]]; setGalerias(a); await authFetch(`/admin/albuns/${id}/galerias/reorder`, { method: 'PUT', body: JSON.stringify(a.map((g, i) => ({ id: g.id, ordem: i }))) }); };
  const toggleSelecionada = (fid) => setSelecionadas(p => p.includes(fid) ? p.filter(x => x !== fid) : [...p, fid]);
  const excluirSelecionadas = async () => { if (!confirm(`Excluir ${selecionadas.length} fotos?`)) return; await Promise.all(selecionadas.map(fid => authFetch(`/admin/fotos/${fid}`, { method: 'DELETE' }))); setSelecionadas([]); fetchAlbum(); };
  const definirComoCapa = (fotoId) => { updateTema({ capa_foto_id: fotoId }); };

  const openEditFoto = (foto) => { const fid = foto.id?.startsWith('FOTO#') ? foto.id.replace('FOTO#', '') : foto.id; setEditingFoto({ ...foto, extractedId: fid }); setEditFotoForm({ titulo: foto.titulo || '', descricao: foto.descricao || '' }); };
  const handleSaveFotoEdit = async () => { if (!editingFoto) return; const r = await authFetch(`/admin/album/galeria/${galeriaAtiva}/foto/${editingFoto.extractedId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titulo: editFotoForm.titulo, descricao: editFotoForm.descricao }) }); const j = await r.json(); if (j.success !== false) setFotos(p => p.map(f => f.id === editingFoto.id ? { ...f, ...editFotoForm } : f)); setEditingFoto(null); };

  useEffect(() => { const h = (e) => { if (lightboxIndex === null) return; if (e.key === 'Escape') setLightboxIndex(null); if (e.key === 'ArrowRight') setLightboxIndex(i => Math.min(i + 1, fotosGaleria.length - 1)); if (e.key === 'ArrowLeft') setLightboxIndex(i => Math.max(i - 1, 0)); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [lightboxIndex, fotosGaleria.length]);

  // When tab changes, update preview mode
  useEffect(() => {
    if (activeTab === 'midia') setPreviewMode('capa');
    if (activeTab === 'texto') setPreviewMode(textoTab === 'galerias' ? 'galeria' : 'capa');
    if (activeTab === 'design') {
      if (designSubTab === 'layouts') setPreviewMode(designLayoutTab === 'galerias' ? 'galeria' : 'capa');
      else if (designSubTab === 'cores') setPreviewMode(designColorTab === 'galerias' ? 'galeria' : 'capa');
      else setPreviewMode('capa');
    }
    if (activeTab === 'config') setPreviewMode('galeria');
  }, [activeTab, textoTab, designSubTab, designLayoutTab, designColorTab]);

  if (!album) return <div className="fixed inset-0 flex items-center justify-center bg-white text-gray-400 text-sm">Carregando álbum...</div>;

  const fotoLightbox = lightboxIndex !== null ? fotosGaleria[lightboxIndex] : null;
  const coverImg = capaFoto || fotos[0];


  // ============ RENDER ============
  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100 z-[9999]">
      {/* TOP BAR - always full width */}
      <header className="h-11 bg-white border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="text-xs text-gray-500 hover:text-gray-700">← Gerenciar configurações do álbum</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400">Todas as alterações foram salvas</span>
          <button onClick={() => window.open(`/admin/albuns/${id}/preview`, '_blank')} className="text-xs px-3 py-1.5 border rounded hover:bg-gray-50 flex items-center gap-1"><Eye size={12} /> Visualizar</button>
          <button onClick={handlePublicar} className="text-xs px-3 py-1.5 rounded text-white flex items-center gap-1" style={{ backgroundColor: ACCENT }}><Send size={12} /> Publicar já</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ICON SIDEBAR */}
        <nav className="w-14 bg-white border-r flex flex-col items-center py-3 gap-0.5 shrink-0">
          {[
            { key: 'midia', icon: Image, label: 'Mídia' },
            { key: 'texto', icon: Type, label: 'Texto' },
            { key: 'design', icon: Palette, label: 'Design' },
            { key: 'config', icon: Settings, label: 'Configura...' },
          ].map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); if (tab.key === 'design') setDesignSubTab('main'); }}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg w-12 transition-colors ${activeTab === tab.key ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
              <tab.icon size={18} />
              <span className="text-[9px] leading-tight">{tab.label}</span>
            </button>
          ))}
        </nav>


        {/* CONFIG PANEL */}
        <aside className="w-72 bg-white border-r overflow-y-auto shrink-0">
          {/* MÍDIA */}
          {activeTab === 'midia' && (
            <div className="p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-0.5">Mídia do álbum</h2>
              <p className="text-[11px] text-gray-500 mb-4">Escolha uma foto de capa para o seu álbum e gerencie a mídia em cada galeria.</p>
              {/* Capa */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5"><h3 className="text-xs font-semibold text-gray-700">Capa do álbum</h3><button className="text-gray-400 hover:text-gray-600 text-xs">•••</button></div>
                <div className="relative rounded-lg overflow-hidden border-2 border-blue-400 aspect-video bg-gray-100 cursor-pointer" onClick={() => setShowGaleriaModal(true)}>
                  {coverImg ? <img src={coverImg.thumbnail_url || coverImg.url} alt="Capa" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Sem capa</div>}
                  <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center"><CheckCircle2 size={11} /></div>
                </div>
              </div>
              {/* Galeria thumbnails */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5"><h3 className="text-xs font-semibold text-gray-700">Galeria</h3><button onClick={() => setShowGaleriaModal(true)} className="text-gray-400 hover:text-gray-600 text-xs">•••</button></div>
                <div className="grid grid-cols-3 gap-1">
                  {fotosGaleria.slice(0, 5).map(foto => (<div key={foto.id} className="aspect-square rounded overflow-hidden bg-gray-100"><img src={foto.thumbnail_url || foto.url} alt="" className="w-full h-full object-cover" /></div>))}
                  {fotosGaleria.length > 5 && <div className="aspect-square rounded bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">+{fotosGaleria.length - 5}</div>}
                </div>
              </div>
              {/* Galerias list */}
              <div className="space-y-0.5 mb-3">
                {galerias.map((g, idx) => (
                  <div key={g.id} className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs cursor-pointer group ${galeriaAtiva === g.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50'}`}
                    onClick={() => { setGaleriaAtiva(g.id); setSelecionadas([]); setPreviewMode('galeria'); }}
                    onDoubleClick={() => { setRenaming(g.id); setRenameValue(g.nome); }}>
                    {renaming === g.id ? <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)} onBlur={() => renomearGaleria(g.id)} onKeyDown={e => e.key === 'Enter' && renomearGaleria(g.id)} className="flex-1 text-xs border rounded px-1 py-0.5" /> : <span className="flex-1 truncate">{g.nome}</span>}
                    <span className="text-gray-400 text-[10px]">{fotos.filter(f => f.galeria_id === g.id).length}</span>
                    <div className="hidden group-hover:flex items-center"><button onClick={e => { e.stopPropagation(); reordenarGaleria(idx, -1); }}><ChevronUp size={10} /></button><button onClick={e => { e.stopPropagation(); reordenarGaleria(idx, 1); }}><ChevronDown size={10} /></button><button onClick={e => { e.stopPropagation(); excluirGaleria(g.id); }} className="text-red-400"><Trash2 size={10} /></button></div>
                  </div>
                ))}
              </div>
              {/* Add gallery */}
              {showNovaGaleria ? (
                <div className="flex gap-1 mb-3"><input autoFocus value={novaGaleria} onChange={e => setNovaGaleria(e.target.value)} onKeyDown={e => e.key === 'Enter' && criarGaleria()} className="flex-1 text-xs border rounded px-2 py-1" placeholder="Nome..." /><button onClick={criarGaleria} className="text-xs px-2 py-1 rounded text-white" style={{ backgroundColor: ACCENT }}>OK</button></div>
              ) : (
                <button onClick={() => setShowNovaGaleria(true)} className="w-full border-2 border-dashed border-gray-300 rounded-lg py-2.5 flex flex-col items-center gap-0.5 text-xs text-gray-500 hover:border-blue-300 hover:text-blue-500 transition mb-3"><Plus size={14} /><span>Adicionar nova galeria</span></button>
              )}
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: ACCENT }}><Upload size={14} /> Upload de mídia</button>
              <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
              {uploading && <div className="mt-2"><div className="w-full bg-gray-200 rounded-full h-1.5"><div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${uploadProgress}%` }} /></div><p className="text-[10px] text-gray-400 mt-0.5">{uploadProgress}%</p></div>}
            </div>
          )}


          {/* TEXTO */}
          {activeTab === 'texto' && (
            <div className="p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-0.5">Texto do álbum</h2>
              <p className="text-[11px] text-gray-500 mb-3">Edite a capa e o texto das galerias.</p>
              <div className="flex border-b mb-4">
                <button onClick={() => { setTextoTab('capa'); setPreviewMode('capa'); }} className={`flex-1 py-2 text-xs font-medium border-b-2 transition ${textoTab === 'capa' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>Capa</button>
                <button onClick={() => { setTextoTab('galerias'); setPreviewMode('galeria'); }} className={`flex-1 py-2 text-xs font-medium border-b-2 transition ${textoTab === 'galerias' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>Galerias</button>
              </div>
              {textoTab === 'capa' && (
                <div className="space-y-4">
                  <div><label className="text-xs font-medium text-gray-700">Título do álbum <span className="text-red-500">*</span></label><input value={textoAlbum.titulo} onChange={e => setTextoAlbum({ ...textoAlbum, titulo: e.target.value })} onBlur={saveTexto} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none" /></div>
                  <div><label className="text-xs font-medium text-gray-700">Texto do botão</label><input value={textoAlbum.texto_botao} onChange={e => setTextoAlbum({ ...textoAlbum, texto_botao: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none" /></div>
                  <div className="flex items-center justify-between"><label className="text-xs font-medium text-gray-700">Mais informações</label><button onClick={() => setTextoAlbum({ ...textoAlbum, mais_info: !textoAlbum.mais_info })} className={`w-10 h-5 rounded-full relative transition-colors ${textoAlbum.mais_info ? 'bg-blue-500' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${textoAlbum.mais_info ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></div>
                  {textoAlbum.mais_info && <input value={textoAlbum.data_evento} onChange={e => setTextoAlbum({ ...textoAlbum, data_evento: e.target.value })} onBlur={saveTexto} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none" placeholder="11/07/2026" />}
                  <div className="flex items-center justify-between"><label className="text-xs font-medium text-gray-700">Informações do negócio</label><button onClick={() => setTextoAlbum({ ...textoAlbum, info_negocio: !textoAlbum.info_negocio })} className={`w-10 h-5 rounded-full relative transition-colors ${textoAlbum.info_negocio ? 'bg-blue-500' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${textoAlbum.info_negocio ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></div>
                  {textoAlbum.info_negocio && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs"><input type="radio" name="info_tipo" checked={textoAlbum.info_tipo === 'nome'} onChange={() => setTextoAlbum({ ...textoAlbum, info_tipo: 'nome' })} /> Nome do negócio</label>
                      <label className="flex items-center gap-2 text-xs"><input type="radio" name="info_tipo" checked={textoAlbum.info_tipo === 'logo'} onChange={() => setTextoAlbum({ ...textoAlbum, info_tipo: 'logo' })} /> Logo</label>
                      {textoAlbum.info_tipo === 'nome' && <input value={textoAlbum.nome_negocio} onChange={e => setTextoAlbum({ ...textoAlbum, nome_negocio: e.target.value })} onBlur={saveTexto} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none" placeholder="MARCELO BLOISE FOTOGRAFIA" />}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400">Para alterar as fontes, vá na aba Design e clique em Fontes.</p>
                </div>
              )}
              {textoTab === 'galerias' && (
                <div className="space-y-2">{galerias.map(g => (<div key={g.id} className="p-2 border rounded-lg"><p className="text-sm font-medium text-gray-700">{g.nome}</p><p className="text-[10px] text-gray-400">{fotos.filter(f => f.galeria_id === g.id).length} fotos</p></div>))}</div>
              )}
            </div>
          )}


          {/* DESIGN */}
          {activeTab === 'design' && (
            <div className="p-4">
              {/* Main menu */}
              {designSubTab === 'main' && (
                <div className="space-y-2">
                  <h2 className="text-sm font-bold text-gray-900 mb-3">Design</h2>
                  {[{ key: 'layouts', label: 'Layouts', desc: 'Capa e galerias' },{ key: 'cores', label: 'Cores', desc: 'Personalize as cores' },{ key: 'fontes', label: 'Fontes', desc: 'Tipografia do álbum' },{ key: 'animacoes', label: 'Animações', desc: 'Efeitos visuais' }].map(item => (
                    <button key={item.key} onClick={() => setDesignSubTab(item.key)} className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-blue-50 transition text-left">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">{item.key === 'layouts' ? <Palette size={14} /> : item.key === 'cores' ? <Palette size={14} /> : item.key === 'fontes' ? <Type size={14} /> : <Sparkles size={14} />}</div>
                      <div className="flex-1"><p className="text-sm font-medium text-gray-800">{item.label}</p><p className="text-[10px] text-gray-400">{item.desc}</p></div>
                      <ChevronRight size={14} className="text-gray-400" />
                    </button>
                  ))}
                </div>
              )}

              {/* LAYOUTS */}
              {designSubTab === 'layouts' && (
                <div>
                  <button onClick={() => setDesignSubTab('main')} className="text-xs text-gray-500 hover:text-gray-700 mb-2">‹ Voltar para design</button>
                  <h2 className="text-sm font-bold text-gray-900 mb-3">Layouts</h2>
                  <div className="flex border-b mb-4">
                    <button onClick={() => { setDesignLayoutTab('capa'); setPreviewMode('capa'); }} className={`flex-1 py-2 text-xs font-medium border-b-2 transition ${designLayoutTab === 'capa' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>Capa</button>
                    <button onClick={() => { setDesignLayoutTab('galerias'); setPreviewMode('galeria'); }} className={`flex-1 py-2 text-xs font-medium border-b-2 transition ${designLayoutTab === 'galerias' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>Galerias</button>
                  </div>
                  {designLayoutTab === 'capa' && (
                    <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                      {CAPA_LAYOUTS.map(layout => (
                        <button key={layout.id} onClick={() => updateTema({ capa_layout: layout.id })}
                          className={`w-full text-left rounded-lg border-2 overflow-hidden transition ${tema.capa_layout === layout.id ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'}`}>
                          {/* Mini preview of capa layout */}
                          <div className="relative h-24 bg-gray-900">
                            {coverImg && <img src={coverImg.thumbnail_url || coverImg.url} alt="" className="w-full h-full object-cover opacity-50" />}
                            <div className="absolute inset-0 flex flex-col justify-end p-3" style={{ color: '#fff' }}>
                              {layout.id !== 'minimalista' && <p className="text-[8px] opacity-60 uppercase tracking-wider">{textoAlbum.nome_negocio || 'Fotógrafo'}</p>}
                              <p className={`font-bold ${layout.id === 'ousado' ? 'text-lg' : layout.id === 'moderno' ? 'text-base' : 'text-sm'}`} style={{ fontFamily: tema.fonte_titulo }}>{textoAlbum.titulo || 'Título'}</p>
                              {layout.id !== 'moderno' && <p className="text-[8px] opacity-60">{textoAlbum.data_evento || '01/01/2026'}</p>}
                            </div>
                            {tema.capa_layout === layout.id && <div className="absolute top-2 right-2"><CheckCircle2 size={16} className="text-blue-400" /></div>}
                          </div>
                          <div className="px-3 py-1.5 bg-white"><span className="text-xs font-medium text-gray-700">{layout.label}</span></div>
                        </button>
                      ))}
                    </div>
                  )}
                  {designLayoutTab === 'galerias' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        {LAYOUT_OPTIONS.map(l => (
                          <button key={l.id} onClick={() => updateTema({ layout: l.id })} className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition ${tema.layout === l.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <div className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center text-sm">{l.icon}</div>
                            <span className="text-[9px] text-gray-600">{l.label}</span>
                          </button>
                        ))}
                      </div>
                      <div><label className="text-xs font-medium text-gray-700 mb-1.5 block">Orientação da galeria</label><div className="flex gap-4"><label className="flex items-center gap-2 text-xs"><input type="radio" name="orient" checked={tema.orientacao === 'horizontal'} onChange={() => updateTema({ orientacao: 'horizontal' })} /> Horizontal</label><label className="flex items-center gap-2 text-xs"><input type="radio" name="orient" checked={tema.orientacao === 'vertical'} onChange={() => updateTema({ orientacao: 'vertical' })} /> Vertical</label></div></div>
                      <div><label className="text-xs font-medium text-gray-700 mb-1 block">Espaçamento</label><div className="flex items-center gap-2"><input type="range" min="0" max="40" value={tema.espacamento} onChange={e => setTema({ ...tema, espacamento: Number(e.target.value) })} onMouseUp={() => saveTema()} className="flex-1 accent-blue-500" /><span className="text-xs w-8 text-center">{tema.espacamento}</span></div></div>
                      <div><label className="text-xs font-medium text-gray-700 mb-1 block">Densidade da colagem</label><div className="flex items-center gap-2"><input type="range" min="0" max="100" value={tema.densidade_colagem} onChange={e => setTema({ ...tema, densidade_colagem: Number(e.target.value) })} onMouseUp={() => saveTema()} className="flex-1 accent-blue-500" /><span className="text-xs w-8 text-center">{tema.densidade_colagem}</span></div></div>
                    </div>
                  )}
                </div>
              )}


              {/* CORES */}
              {designSubTab === 'cores' && (
                <div>
                  <button onClick={() => setDesignSubTab('main')} className="text-xs text-gray-500 hover:text-gray-700 mb-2">‹ Voltar para design</button>
                  <h2 className="text-sm font-bold text-gray-900 mb-3">Cores</h2>
                  <div className="flex border-b mb-4">
                    <button onClick={() => { setDesignColorTab('capa'); setPreviewMode('capa'); }} className={`flex-1 py-2 text-xs font-medium border-b-2 transition ${designColorTab === 'capa' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>Capa</button>
                    <button onClick={() => { setDesignColorTab('galerias'); setPreviewMode('galeria'); }} className={`flex-1 py-2 text-xs font-medium border-b-2 transition ${designColorTab === 'galerias' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>Galerias</button>
                  </div>
                  {designColorTab === 'capa' && (
                    <div className="space-y-4">
                      <div><label className="text-xs font-medium text-gray-700 mb-1 block">Cor do texto</label><div className="flex items-center gap-2"><span className="text-xs text-gray-400">#</span><input value={(tema.cores_capa?.texto || '#FFFFFF').replace('#', '')} onChange={e => updateTemaCapa({ texto: '#' + e.target.value })} className="flex-1 px-2 py-1.5 border rounded text-xs" /><input type="color" value={tema.cores_capa?.texto || '#FFFFFF'} onChange={e => updateTemaCapa({ texto: e.target.value })} className="w-8 h-8 rounded border cursor-pointer" /></div></div>
                      <div><label className="text-xs font-medium text-gray-700 mb-1 block">Cor da sobreposição do background</label><div className="flex items-center gap-2"><span className="text-xs text-gray-400">#</span><input value={(tema.cores_capa?.overlay || '#121212').replace('#', '')} onChange={e => updateTemaCapa({ overlay: '#' + e.target.value })} className="flex-1 px-2 py-1.5 border rounded text-xs" /><input type="color" value={tema.cores_capa?.overlay || '#121212'} onChange={e => updateTemaCapa({ overlay: e.target.value })} className="w-8 h-8 rounded border cursor-pointer" /></div></div>
                    </div>
                  )}
                  {designColorTab === 'galerias' && (
                    <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                      <h4 className="text-xs font-semibold text-gray-600">Background e Ícones</h4>
                      <div><label className="text-[11px] text-gray-500 mb-1 block">Cor do texto da página e ícones <span className="text-gray-400 cursor-help">ⓘ</span></label><div className="flex items-center gap-2"><span className="text-xs text-gray-400">#</span><input value={(tema.cores_galerias?.texto_icones || '#FF3C00').replace('#', '')} onChange={e => updateTemaGalerias({ texto_icones: '#' + e.target.value })} className="flex-1 px-2 py-1.5 border rounded text-xs" /><input type="color" value={tema.cores_galerias?.texto_icones || '#FF3C00'} onChange={e => updateTemaGalerias({ texto_icones: e.target.value })} className="w-8 h-8 rounded border cursor-pointer" /></div></div>
                      <div><label className="text-[11px] text-gray-500 mb-1 block">Cor do background</label><div className="flex items-center gap-2"><span className="text-xs text-gray-400">#</span><input value={(tema.cores_galerias?.background || '#121212').replace('#', '')} onChange={e => updateTemaGalerias({ background: '#' + e.target.value })} className="flex-1 px-2 py-1.5 border rounded text-xs" /><input type="color" value={tema.cores_galerias?.background || '#121212'} onChange={e => updateTemaGalerias({ background: e.target.value })} className="w-8 h-8 rounded border cursor-pointer" /></div></div>
                      <h4 className="text-xs font-semibold text-gray-600 pt-2">Dados e sobreposição</h4>
                      <div><label className="text-[11px] text-gray-500 mb-1 block">Cor do texto e ícones <span className="text-gray-400 cursor-help">ⓘ</span></label><div className="flex items-center gap-2"><span className="text-xs text-gray-400">#</span><input value={(tema.cores_galerias?.overlay_texto || '#FF3C00').replace('#', '')} onChange={e => updateTemaGalerias({ overlay_texto: '#' + e.target.value })} className="flex-1 px-2 py-1.5 border rounded text-xs" /><input type="color" value={tema.cores_galerias?.overlay_texto || '#FF3C00'} onChange={e => updateTemaGalerias({ overlay_texto: e.target.value })} className="w-8 h-8 rounded border cursor-pointer" /></div></div>
                      <div><label className="text-[11px] text-gray-500 mb-1 block">Cor ao passar o mouse <span className="text-gray-400 cursor-help">ⓘ</span></label><div className="flex items-center gap-2"><span className="text-xs text-gray-400">#</span><input value={(tema.cores_galerias?.overlay_hover || '#FF3C00').replace('#', '')} onChange={e => updateTemaGalerias({ overlay_hover: '#' + e.target.value })} className="flex-1 px-2 py-1.5 border rounded text-xs" /><input type="color" value={tema.cores_galerias?.overlay_hover || '#FF3C00'} onChange={e => updateTemaGalerias({ overlay_hover: e.target.value })} className="w-8 h-8 rounded border cursor-pointer" /></div></div>
                      <div><label className="text-[11px] text-gray-500 mb-1 block">Opacidade da sobreposição</label><div className="flex items-center gap-2"><input type="range" min="0" max="100" value={tema.cores_galerias?.overlay_opacidade || 30} onChange={e => updateTemaGalerias({ overlay_opacidade: Number(e.target.value) })} className="flex-1 accent-blue-500" /><span className="text-xs w-8 text-center">{tema.cores_galerias?.overlay_opacidade || 30}</span></div></div>
                      <h4 className="text-xs font-semibold text-gray-600 pt-2">Borda</h4>
                      <div><label className="text-[11px] text-gray-500 mb-1 block">Cor da borda da foto</label><div className="flex items-center gap-2"><span className="text-xs text-gray-400">#</span><input value={(tema.cores_galerias?.borda_cor || '#FF3C00').replace('#', '')} onChange={e => updateTemaGalerias({ borda_cor: '#' + e.target.value })} className="flex-1 px-2 py-1.5 border rounded text-xs" /><input type="color" value={tema.cores_galerias?.borda_cor || '#FF3C00'} onChange={e => updateTemaGalerias({ borda_cor: e.target.value })} className="w-8 h-8 rounded border cursor-pointer" /></div></div>
                      <div><label className="text-[11px] text-gray-500 mb-1 block">Largura da borda da foto (px)</label><div className="flex items-center gap-2"><input type="range" min="0" max="10" value={tema.cores_galerias?.borda_largura || 3} onChange={e => updateTemaGalerias({ borda_largura: Number(e.target.value) })} className="flex-1 accent-blue-500" /><span className="text-xs w-8 text-center">{tema.cores_galerias?.borda_largura || 3}</span></div></div>
                      <div><label className="text-[11px] text-gray-500 mb-1 block">Raio do canto da foto</label><div className="flex items-center gap-2"><input type="range" min="0" max="30" value={tema.cores_galerias?.borda_raio || 10} onChange={e => updateTemaGalerias({ borda_raio: Number(e.target.value) })} className="flex-1 accent-blue-500" /><span className="text-xs w-8 text-center">{tema.cores_galerias?.borda_raio || 10}</span></div></div>
                    </div>
                  )}
                </div>
              )}


              {/* FONTES */}
              {designSubTab === 'fontes' && (
                <div>
                  <button onClick={() => setDesignSubTab('main')} className="text-xs text-gray-500 hover:text-gray-700 mb-2">‹ Voltar para design</button>
                  <h2 className="text-sm font-bold text-gray-900 mb-3">Fontes</h2>
                  <div className="space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto">
                    {FONT_PRESETS.map((preset, idx) => (
                      <button key={idx} onClick={() => updateTema({ fonte_titulo: preset.titulo, fonte_corpo: preset.corpo })}
                        className={`w-full text-left p-4 rounded-lg border-2 transition ${tema.fonte_titulo === preset.titulo && tema.fonte_corpo === preset.corpo ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <p className="text-xl font-bold leading-tight" style={{ fontFamily: preset.titulo }}>Fonte do título</p>
                        <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: preset.corpo }}>Fonte do texto secundário</p>
                      </button>
                    ))}
                    <button className="w-full py-2.5 text-xs text-blue-600 border-2 border-dashed border-blue-200 rounded-lg hover:bg-blue-50 font-medium">+ Novo conjunto de fontes</button>
                  </div>
                </div>
              )}


              {/* ANIMAÇÕES */}
              {designSubTab === 'animacoes' && (
                <div>
                  <button onClick={() => setDesignSubTab('main')} className="text-xs text-gray-500 hover:text-gray-700 mb-2">‹ Voltar para design</button>
                  <h2 className="text-sm font-bold text-gray-900 mb-3">Animações</h2>
                  <div className="space-y-5 max-h-[calc(100vh-180px)] overflow-y-auto">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-2 block">Efeito de rolagem <span className="text-gray-400 cursor-help">ⓘ</span></label>
                      <div className="grid grid-cols-3 gap-2">
                        {SCROLL_EFFECTS.map(ef => (
                          <button key={ef.id} onClick={() => updateTema({ animacao_scroll: ef.id })} className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition ${tema.animacao_scroll === ef.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">{ef.id === 'none' ? <X size={12} className="text-gray-400" /> : <Sparkles size={12} className="text-blue-400" />}</div>
                            <span className="text-[9px] text-gray-600 text-center leading-tight">{ef.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-2 block">Efeito ao passar o mouse <span className="text-gray-400 cursor-help">ⓘ</span></label>
                      <div className="grid grid-cols-3 gap-2">
                        {HOVER_EFFECTS.map(ef => (
                          <button key={ef.id} onClick={() => updateTema({ animacao_hover: ef.id })} className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition ${tema.animacao_hover === ef.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">{ef.id === 'none' ? <X size={12} className="text-gray-400" /> : <Sparkles size={12} className="text-blue-400" />}</div>
                            <span className="text-[9px] text-gray-600 text-center leading-tight">{ef.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-2 block">Animação da sobreposição <span className="text-gray-400 cursor-help">ⓘ</span></label>
                      <div className="grid grid-cols-3 gap-2">
                        {OVERLAY_ANIMATIONS.map(ef => (
                          <button key={ef.id} onClick={() => updateTema({ animacao_overlay: ef.id })} className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition ${tema.animacao_overlay === ef.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">{ef.id === 'none' ? <X size={12} className="text-gray-400" /> : <Sparkles size={12} className="text-blue-400" />}</div>
                            <span className="text-[9px] text-gray-600 text-center leading-tight">{ef.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => window.open(`/admin/albuns/${id}/preview`, '_blank')} className="w-full py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2" style={{ backgroundColor: ACCENT }}><Monitor size={14} /> Visualizar Modo Passar o Mouse</button>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* CONFIGURAÇÕES */}
          {activeTab === 'config' && (
            <div className="p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-0.5">Configurações</h2>
              <p className="text-[11px] text-gray-500 mb-4">Ajuste as configurações do álbum.</p>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">Qualidade da imagem na galeria <span className="text-gray-400 cursor-help" title="Quanto maior a qualidade, mais tempo vai demorar para carregar a galeria.">ⓘ</span></label>
                  <div className="flex items-center gap-2"><input type="range" min="10" max="100" value={tema.qualidade_imagem} onChange={e => setTema({ ...tema, qualidade_imagem: Number(e.target.value) })} onMouseUp={() => saveTema()} className="flex-1 accent-blue-500" /><span className="text-xs w-8 text-center">{tema.qualidade_imagem}</span></div>
                  <p className="text-[10px] text-gray-400 mt-1">A qualidade recomendada é 90.</p>
                </div>
                <hr className="border-gray-100" />
                <div className="flex items-center justify-between"><div><p className="text-xs font-medium text-gray-800">Permitir download</p><p className="text-[10px] text-gray-400">Cliente pode baixar fotos originais</p></div><button onClick={() => { const v = !config.permite_download; setConfig({ ...config, permite_download: v }); saveConfig('permite_download', v); }} className={`w-10 h-5 rounded-full relative transition-colors ${config.permite_download ? 'bg-blue-500' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${config.permite_download ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></div>
                <div className="flex items-center justify-between"><div><p className="text-xs font-medium text-gray-800">Permitir seleção</p><p className="text-[10px] text-gray-400">Cliente pode selecionar fotos</p></div><button onClick={() => { const v = !config.permite_selecao; setConfig({ ...config, permite_selecao: v }); saveConfig('permite_selecao', v); }} className={`w-10 h-5 rounded-full relative transition-colors ${config.permite_selecao ? 'bg-blue-500' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${config.permite_selecao ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></div>
                <div className="flex items-center justify-between"><div><p className="text-xs font-medium text-gray-800">Permitir comentários</p><p className="text-[10px] text-gray-400">Cliente pode comentar nas fotos</p></div><button onClick={() => { const v = !config.permite_comentarios; setConfig({ ...config, permite_comentarios: v }); saveConfig('permite_comentarios', v); }} className={`w-10 h-5 rounded-full relative transition-colors ${config.permite_comentarios ? 'bg-blue-500' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${config.permite_comentarios ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></div>
                <hr className="border-gray-100" />
                <div><label className="text-xs font-medium text-gray-700 mb-1 block">Cota de seleção</label><input type="number" value={config.cota_selecao} min="0" onChange={e => setConfig({ ...config, cota_selecao: Number(e.target.value) })} onBlur={e => saveConfig('cota_selecao', Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm outline-none" placeholder="0 = ilimitado" /></div>
                <div><label className="text-xs font-medium text-gray-700 mb-1 block">Senha de acesso</label><input type="text" value={config.senha_acesso} onChange={e => setConfig({ ...config, senha_acesso: e.target.value })} onBlur={e => saveConfig('senha_acesso', e.target.value || null)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none" placeholder="Vazio = acesso livre" /></div>
                <div><label className="text-xs font-medium text-gray-700 mb-1 block">Data de expiração</label><input type="date" value={config.data_expiracao} onChange={e => setConfig({ ...config, data_expiracao: e.target.value })} onBlur={e => saveConfig('data_expiracao', e.target.value || null)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none" /></div>
              </div>
            </div>
          )}
        </aside>


        {/* ========== PREVIEW AREA ========== */}
        <main className="flex-1 bg-gray-200 flex items-center justify-center overflow-hidden p-4">
          <div className="w-full h-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
            {/* Browser chrome */}
            <div className="h-7 bg-gray-100 border-b flex items-center px-3 gap-2 shrink-0">
              <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-400" /><div className="w-2.5 h-2.5 rounded-full bg-green-400" /></div>
              <div className="flex-1 mx-6"><div className="bg-white rounded-full h-4 flex items-center px-3"><span className="text-[9px] text-gray-400 truncate">mbfoto.com.br/album/{album.slug || '...'}</span></div></div>
              <span className="text-gray-400 text-xs">⋮</span>
            </div>

            {/* PREVIEW CONTENT */}
            <div className="flex-1 overflow-y-auto relative">
              {/* === CAPA PREVIEW === */}
              {previewMode === 'capa' && (
                <div className="relative w-full" style={{ minHeight: '100%', backgroundColor: tema.cores_capa?.overlay || '#121212' }}>
                  {/* Background image */}
                  {coverImg && (
                    <img
                      src={coverImg.thumbnail_url || coverImg.url || ''}
                      alt="Capa"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ opacity: 0.6 }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  {/* Dark overlay */}
                  <div className="absolute inset-0" style={{ backgroundColor: tema.cores_capa?.overlay || '#121212', opacity: 0.4 }} />
                  {/* Text content */}
                  <div className="relative z-10 flex flex-col w-full" style={{ minHeight: '450px', color: tema.capa_layout === 'minimalista' ? '#1a1a1a' : (tema.cores_capa?.texto || '#FFFFFF') }}>
                    {tema.capa_layout === 'minimalista' ? (
                      /* Minimalista: fundo claro, foto menor ao lado */
                      <div className="flex items-center h-full min-h-[450px] bg-white/95 p-10">
                        <div className="flex-1">
                          {textoAlbum.info_negocio && textoAlbum.nome_negocio && (
                            <p className="text-xs text-gray-500 mb-3 tracking-wider" style={{ fontFamily: tema.fonte_corpo }}>{textoAlbum.nome_negocio}</p>
                          )}
                          <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: tema.fonte_titulo }}>{textoAlbum.titulo || 'Título do álbum'}</h1>
                          {textoAlbum.mais_info && textoAlbum.data_evento && (
                            <p className="text-sm text-gray-500" style={{ fontFamily: tema.fonte_corpo }}>{textoAlbum.data_evento}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-4" style={{ fontFamily: tema.fonte_corpo }}>{textoAlbum.texto_botao || 'Ver fotos'} →</p>
                        </div>
                        {coverImg && (
                          <div className="w-1/2 ml-6">
                            <img src={coverImg.thumbnail_url || coverImg.url} alt="" className="w-full h-56 object-cover rounded-lg" onError={(e) => { e.target.style.display = 'none'; }} />
                          </div>
                        )}
                      </div>
                    ) : tema.capa_layout === 'moderno' ? (
                      /* Moderno: texto no topo */
                      <div className="flex flex-col justify-start p-10 pt-12 min-h-[450px]">
                        {textoAlbum.info_negocio && textoAlbum.nome_negocio && (
                          <p className="text-[10px] opacity-60 tracking-widest uppercase mb-1" style={{ fontFamily: tema.fonte_corpo }}>{textoAlbum.nome_negocio}</p>
                        )}
                        {textoAlbum.mais_info && textoAlbum.data_evento && (
                          <p className="text-xs opacity-60 mb-2" style={{ fontFamily: tema.fonte_corpo }}>{textoAlbum.data_evento}</p>
                        )}
                        <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: tema.fonte_titulo }}>{textoAlbum.titulo || 'Título do álbum'}</h1>
                        <p className="text-xs opacity-60 mt-auto" style={{ fontFamily: tema.fonte_corpo }}>{textoAlbum.texto_botao || 'Ver fotos'} →</p>
                      </div>
                    ) : tema.capa_layout === 'ousado' ? (
                      /* Ousado: centralizado e grande */
                      <div className="flex flex-col items-center justify-center text-center p-10 min-h-[450px]">
                        {textoAlbum.info_negocio && textoAlbum.nome_negocio && (
                          <p className="text-xs opacity-60 tracking-widest uppercase mb-3" style={{ fontFamily: tema.fonte_corpo }}>{textoAlbum.nome_negocio}</p>
                        )}
                        <h1 className="text-5xl font-black mb-3" style={{ fontFamily: tema.fonte_titulo }}>{textoAlbum.titulo || 'Título do álbum'}</h1>
                        {textoAlbum.mais_info && textoAlbum.data_evento && (
                          <p className="text-base opacity-70 mb-4" style={{ fontFamily: tema.fonte_corpo }}>{textoAlbum.data_evento}</p>
                        )}
                        <p className="text-sm opacity-60" style={{ fontFamily: tema.fonte_corpo }}>{textoAlbum.texto_botao || 'Ver fotos'} →</p>
                      </div>
                    ) : (
                      /* Elegante / Clássico / Jovial / Atemporal: texto embaixo */
                      <div className="flex flex-col justify-end p-8 min-h-[450px]">
                        {textoAlbum.info_negocio && textoAlbum.nome_negocio && (
                          <p className="text-[10px] opacity-60 tracking-widest uppercase mb-2" style={{ fontFamily: tema.fonte_corpo }}>{textoAlbum.nome_negocio}</p>
                        )}
                        <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: tema.fonte_titulo }}>{textoAlbum.titulo || 'Título do álbum'}</h1>
                        {textoAlbum.mais_info && textoAlbum.data_evento && (
                          <p className="text-sm opacity-70 mt-1" style={{ fontFamily: tema.fonte_corpo }}>{textoAlbum.data_evento}</p>
                        )}
                        <div className="flex items-center justify-between w-full mt-6">
                          <div />
                          <span className="text-xs opacity-70" style={{ fontFamily: tema.fonte_corpo }}>{textoAlbum.texto_botao || 'Ver fotos'} →</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* === GALERIA PREVIEW === */}
              {previewMode === 'galeria' && (
                <div className="w-full min-h-full p-5" style={{ backgroundColor: tema.cores_galerias?.background || '#121212' }}>
                  <div
                    className={
                      tema.layout === 'coluna' ? 'flex flex-col items-center' :
                      tema.layout === 'slider' ? 'flex flex-col items-center' :
                      tema.layout === 'faixa' ? 'flex flex-col' :
                      tema.layout === 'mosaico' ? 'grid grid-cols-4' :
                      tema.layout === 'grade' ? 'grid grid-cols-3' :
                      tema.layout === 'ladrilhos' ? 'grid grid-cols-4' :
                      tema.layout === 'miniaturas' ? 'grid grid-cols-5' :
                      'grid grid-cols-3'
                    }
                    style={{ gap: `${tema.espacamento || 10}px` }}
                  >
                    {fotosGaleria.slice(0, 15).map((foto, idx) => (
                      <div key={foto.id}
                        className={`relative overflow-hidden group cursor-pointer ${
                          tema.layout === 'mosaico' && idx === 0 ? 'col-span-2 row-span-2' :
                          tema.layout === 'mosaico' && idx === 3 ? 'col-span-2' :
                          tema.layout === 'coluna' ? 'w-full max-w-md' :
                          tema.layout === 'slider' ? 'w-full max-w-xl' :
                          ''
                        }`}
                        style={{
                          borderRadius: `${tema.cores_galerias?.borda_raio || 0}px`,
                          border: tema.cores_galerias?.borda_largura ? `${tema.cores_galerias.borda_largura}px solid ${tema.cores_galerias?.borda_cor || 'transparent'}` : 'none',
                        }}
                        onClick={() => setLightboxIndex(idx)}>
                        <img
                          src={foto.thumbnail_url || foto.url}
                          alt=""
                          className="w-full object-cover"
                          style={{
                            height: tema.layout === 'slider' ? '280px' :
                                    tema.layout === 'faixa' ? '180px' :
                                    tema.layout === 'coluna' ? '240px' :
                                    tema.layout === 'mosaico' && idx === 0 ? '100%' :
                                    tema.layout === 'miniaturas' ? '100px' :
                                    '160px',
                          }}
                          onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="160"><rect fill="%23333" width="200" height="160"/><text x="50%" y="50%" fill="%23666" text-anchor="middle" dy=".3em" font-size="12">Foto</text></svg>'; }}
                        />
                        {/* Hover overlay */}
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                          style={{
                            backgroundColor: tema.cores_galerias?.overlay_hover || '#000000',
                            opacity: 0,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = String((tema.cores_galerias?.overlay_opacidade || 30) / 100); }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
                        >
                          <span className="text-sm font-medium" style={{ color: tema.cores_galerias?.overlay_texto || '#fff' }}>
                            {foto.titulo || foto.filename || `Foto ${idx + 1}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {fotosGaleria.length === 0 && (
                    <div className="flex items-center justify-center min-h-[300px]">
                      <p className="text-gray-500 text-sm">Nenhuma foto na galeria. Faça upload na aba Mídia.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>


      {/* MODAL: Organize as fotos */}
      {showGaleriaModal && (
        <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div><h3 className="text-lg font-bold text-gray-900">Organize as fotos dessa galeria</h3><div className="flex items-center gap-3 mt-2"><input type="text" placeholder="Buscar" className="px-3 py-1.5 border rounded-lg text-sm w-48" /><span className="text-xs text-gray-500">{selecionadas.length} selecionados</span><button onClick={() => setSelecionadas(fotosGaleria.map(f => f.id))} className="text-xs text-blue-600 hover:underline">Selecionar tudo</button><button onClick={() => setSelecionadas([])} className="text-xs text-blue-600 hover:underline">Desmarcar</button>{selecionadas.length > 0 && <button onClick={excluirSelecionadas} className="text-xs text-blue-600 hover:underline">Remover</button>}</div></div>
              <div className="flex items-center gap-2"><button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 rounded-lg text-sm text-white font-medium" style={{ backgroundColor: ACCENT }}><Upload size={14} className="inline mr-1" /> Upload de mídia</button><button onClick={() => setShowGaleriaModal(false)} className="p-1 rounded hover:bg-gray-100"><X size={20} /></button></div>
            </div>
            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {fotosGaleria.map((foto, idx) => (
                    <div key={foto.id} className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition ${selecionadas.includes(foto.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'}`} onClick={() => toggleSelecionada(foto.id)}>
                      <img src={foto.thumbnail_url || foto.url} alt="" className="w-full h-full object-cover" />
                      <span className="absolute top-1 left-1 bg-blue-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-medium">{idx + 1}</span>
                      {tema.capa_foto_id === foto.id && <span className="absolute top-1 right-1 bg-red-500 text-white text-[7px] px-1 py-0.5 rounded font-medium">CAPA</span>}
                    </div>
                  ))}
                </div>
              </div>
              {selecionadas.length === 1 && (() => { const foto = fotosGaleria.find(f => f.id === selecionadas[0]); if (!foto) return null; return (
                <div className="w-60 border-l bg-gray-50 p-3 overflow-y-auto shrink-0">
                  <img src={foto.thumbnail_url || foto.url} alt="" className="w-full aspect-video object-cover rounded-lg mb-2" />
                  <p className="text-[9px] text-gray-400 mb-1">{foto.filename || foto.nome || 'Foto'}</p>
                  <button onClick={() => definirComoCapa(foto.id)} className="w-full text-xs text-center py-1.5 border rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50 mb-3">Substituir foto da capa</button>
                  <div className="space-y-2">
                    <div><label className="text-[10px] font-medium text-gray-600">Título</label><input value={editFotoForm.titulo} onChange={e => setEditFotoForm({ ...editFotoForm, titulo: e.target.value })} className="w-full mt-0.5 px-2 py-1 border rounded text-xs" placeholder={foto.filename || ''} /></div>
                    <div><label className="text-[10px] font-medium text-gray-600">Descrição</label><textarea value={editFotoForm.descricao} onChange={e => setEditFotoForm({ ...editFotoForm, descricao: e.target.value })} className="w-full mt-0.5 px-2 py-1 border rounded text-xs resize-none" rows={2} placeholder="Escreva sobre essa foto" /></div>
                    <button onClick={() => { openEditFoto(foto); handleSaveFotoEdit(); }} className="w-full py-1.5 rounded-lg text-xs text-white font-medium" style={{ backgroundColor: ACCENT }}>OK</button>
                  </div>
                </div>
              ); })()}
            </div>
            <div className="border-t px-4 py-2 flex items-center"><input type="range" min="60" max="200" defaultValue="100" className="w-48 accent-blue-500" /><span className="text-[10px] text-gray-400 ml-2">Tamanho</span></div>
          </div>
        </div>
      )}


      {/* LIGHTBOX */}
      {fotoLightbox && (
        <div className="fixed inset-0 z-[10001] bg-black/90 flex flex-col items-center justify-center">
          <button onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 text-white hover:text-gray-300"><X size={28} /></button>
          <button onClick={() => setLightboxIndex(i => Math.max(i - 1, 0))} className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300"><ChevronLeft size={32} /></button>
          <button onClick={() => setLightboxIndex(i => Math.min(i + 1, fotosGaleria.length - 1))} className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300"><ChevronRight size={32} /></button>
          <img src={fotoLightbox.url} alt="" className="max-h-[75vh] max-w-[90vw] object-contain rounded" />
          <p className="text-white text-xs mt-3">{fotoLightbox.nome || fotoLightbox.filename || ''}</p>
        </div>
      )}

      {/* EDIT FOTO MODAL */}
      {editingFoto && (
        <div className="fixed inset-0 z-[10001] bg-black/50 flex items-center justify-center" onClick={() => setEditingFoto(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 mx-4 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Edit size={15} style={{ color: ACCENT }} /> Editar Foto</h3><button onClick={() => setEditingFoto(null)}><X size={16} /></button></div>
            <div><label className="text-xs font-medium text-gray-700">Título</label><input value={editFotoForm.titulo} onChange={e => setEditFotoForm(f => ({ ...f, titulo: e.target.value }))} className="w-full mt-0.5 px-3 py-2 rounded-lg border text-sm outline-none" /></div>
            <div><label className="text-xs font-medium text-gray-700">Descrição</label><textarea value={editFotoForm.descricao} onChange={e => setEditFotoForm(f => ({ ...f, descricao: e.target.value }))} rows={3} className="w-full mt-0.5 px-3 py-2 rounded-lg border text-sm outline-none resize-none" /></div>
            <div className="flex justify-end gap-2 pt-2 border-t"><button onClick={() => setEditingFoto(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button><button onClick={handleSaveFotoEdit} style={{ background: ACCENT }} className="px-4 py-1.5 text-sm text-white rounded-lg font-medium">Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
