import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Upload, Send, Link2, Settings, Plus, Trash2, ChevronUp, ChevronDown,
  X, ChevronLeft, ChevronRight, Download, Clock, CalendarPlus, Eye,
  MessageSquare, Image, CheckCircle2, Shield, Edit, Palette, Type,
  Layers, LayoutGrid, Grid3X3, Columns, SlidersHorizontal, Move,
  Sparkles, Monitor, Smartphone
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#3B82F6';
const ACCENT_LIGHT = '#EFF6FF';


const statusColors = {
  rascunho: 'bg-gray-200 text-gray-700',
  pronto: 'bg-blue-100 text-blue-700',
  publicado: 'bg-green-100 text-green-700',
  expirado: 'bg-red-100 text-red-700',
};

const LAYOUT_OPTIONS = [
  { id: 'colagem', label: 'Colagem', icon: '▦' },
  { id: 'mosaico', label: 'Mosaico', icon: '▧' },
  { id: 'grade', label: 'Grade', icon: '▤' },
  { id: 'miniaturas', label: 'Miniaturas', icon: '▥' },
  { id: 'slider', label: 'Slider', icon: '▬' },
  { id: 'apresentacao', label: 'Apresentação', icon: '▶' },
  { id: 'faixa', label: 'Faixa', icon: '═' },
  { id: 'coluna', label: 'Coluna', icon: '║' },
  { id: 'ladrilhos', label: 'Ladrilhos', icon: '▩' },
  { id: 'misto', label: 'Misto', icon: '⊞' },
  { id: 'alternar', label: 'Alternar', icon: '⇆' },
  { id: 'magico', label: 'Mágico', icon: '✦' },
];


const CAPA_LAYOUTS = [
  { id: 'elegante', label: 'Elegante' },
  { id: 'ousado', label: 'Ousado' },
  { id: 'jovial', label: 'Jovial' },
  { id: 'classico', label: 'Clássico' },
  { id: 'minimalista', label: 'Minimalista' },
  { id: 'atemporal', label: 'Atemporal' },
  { id: 'moderno', label: 'Moderno' },
];

const SCROLL_EFFECTS = [
  { id: 'none', label: 'Sem efeito' },
  { id: 'gradual', label: 'Gradualmente' },
  { id: 'grayscale', label: 'Tons de cinza' },
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
  { id: 'grayscale', label: 'Tons de cinza' },
  { id: 'shrink', label: 'Encolher' },
  { id: 'invert', label: 'Invertido' },
  { id: 'color', label: 'Cor' },
  { id: 'darken', label: 'Escurecer' },
];

const OVERLAY_ANIMATIONS = [
  { id: 'none', label: 'Sem efeito' },
  { id: 'gradual', label: 'Gradualmente' },
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
];

export default function AlbumDetalhe() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const fileInputRef = useRef(null);

  // Core state
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


  // Sidebar navigation
  const [activeTab, setActiveTab] = useState('midia');
  const [designSubTab, setDesignSubTab] = useState('layouts');
  const [designLayoutTab, setDesignLayoutTab] = useState('galerias');
  const [designColorTab, setDesignColorTab] = useState('capa');
  const [textoTab, setTextoTab] = useState('capa');

  // Tema / Design state
  const [tema, setTema] = useState({
    layout: 'colagem',
    capa_layout: 'elegante',
    orientacao: 'horizontal',
    espacamento: 10,
    densidade_colagem: 40,
    cores_capa: { texto: '#FFFFFF', overlay: '#121212' },
    cores_galerias: {
      texto_icones: '#FF3C00',
      background: '#121212',
      overlay_texto: '#FF3C00',
      overlay_hover: '#FF3C00',
      overlay_opacidade: 30,
      borda_cor: '#FF3C00',
      borda_largura: 3,
      borda_raio: 10,
    },
    fonte_titulo: 'Playfair Display',
    fonte_corpo: 'Inter',
    animacao_scroll: 'none',
    animacao_hover: 'none',
    animacao_overlay: 'none',
    qualidade_imagem: 90,
    capa_foto_id: null,
  });


  // Texto state
  const [textoAlbum, setTextoAlbum] = useState({
    titulo: '',
    texto_botao: 'Ver fotos',
    mais_info: true,
    data_evento: '',
    info_negocio: true,
    info_tipo: 'nome',
    nome_negocio: '',
  });

  // Config state
  const [config, setConfig] = useState({
    permite_download: true,
    permite_selecao: true,
    permite_comentarios: true,
    cota_selecao: 0,
    senha_acesso: '',
    data_expiracao: '',
  });

  // Gallery media modal
  const [showGaleriaModal, setShowGaleriaModal] = useState(false);
  const [editingFoto, setEditingFoto] = useState(null);
  const [editFotoForm, setEditFotoForm] = useState({ titulo: '', descricao: '' });


  // Fetch album data
  const fetchAlbum = useCallback(async () => {
    try {
      const albumRes = await authFetch(`/admin/albuns/${id}`);
      const albumJson = await albumRes.json();
      if (albumJson.success) {
        const data = albumJson.data;
        setAlbum(data);
        setFotos(data.fotos || []);
        setTextoAlbum(t => ({
          ...t,
          titulo: data.titulo || '',
          data_evento: data.data_evento || '',
          nome_negocio: data.nome_negocio || '',
        }));
        setConfig({
          permite_download: data.permite_download ?? true,
          permite_selecao: data.permite_selecao ?? true,
          permite_comentarios: data.permite_comentarios ?? true,
          cota_selecao: data.cota_selecao || 0,
          senha_acesso: data.senha_acesso || '',
          data_expiracao: data.data_expiracao || '',
        });
      }
      try {
        const galeriasRes = await authFetch(`/admin/albuns/${id}/galerias`);
        const galeriasJson = await galeriasRes.json();
        if (galeriasJson.success && galeriasJson.data?.length) {
          setGalerias(galeriasJson.data);
          if (!galeriaAtiva) setGaleriaAtiva(galeriasJson.data[0].id);
        }
      } catch {}
      try {
        const temaRes = await authFetch(`/admin/albuns/${id}/tema`);
        const temaJson = await temaRes.json();
        if (temaJson.success && temaJson.data) {
          setTema(t => ({ ...t, ...temaJson.data }));
        }
      } catch {}
    } catch {}
  }, [id, authFetch]);

  useEffect(() => { fetchAlbum(); }, [fetchAlbum]);


  // Computed
  const fotosGaleria = !galeriaAtiva
    ? fotos
    : galeriaAtiva === '__sem_galeria__'
      ? fotos.filter(f => !f.galeria_id)
      : fotos.filter(f => f.galeria_id === galeriaAtiva);

  const capaFoto = fotos.find(f =>
    (f.id === tema.capa_foto_id) || (f.SK?.replace('FOTO#', '') === tema.capa_foto_id)
  );

  // Upload handler
  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    setUploadProgress(0);
    const BATCH_SIZE = 50;
    const confirmList = [];
    let uploaded = 0;

    for (let batch = 0; batch < files.length; batch += BATCH_SIZE) {
      const batchFiles = files.slice(batch, batch + BATCH_SIZE);
      const filesData = batchFiles.map(f => ({ filename: f.name, content_type: f.type, size_bytes: f.size }));
      const urlsRes = await authFetch(`/admin/albuns/${id}/upload-urls`, {
        method: 'POST', body: JSON.stringify({ files: filesData }),
      });
      const urlsJson = await urlsRes.json();
      if (!urlsJson.success) { setUploading(false); alert(urlsJson.message || 'Erro ao gerar URLs'); return; }
      const uploads = urlsJson.data;
      const CONCURRENT = 5;
      for (let i = 0; i < batchFiles.length; i += CONCURRENT) {
        const chunk = batchFiles.slice(i, i + CONCURRENT);
        await Promise.all(chunk.map(async (file, j) => {
          const idx = i + j;
          const upload = uploads[idx];
          try {
            await fetch(upload.upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
            confirmList.push({ foto_id: upload.foto_id, key: upload.key, content_type: file.type, filename: file.name });
          } catch {}
        }));
        uploaded += chunk.length;
        setUploadProgress(Math.round((uploaded / files.length) * 100));
      }
    }
    for (let i = 0; i < confirmList.length; i += BATCH_SIZE) {
      await authFetch(`/admin/albuns/${id}/fotos/confirmar-batch`, {
        method: 'POST', body: JSON.stringify({ fotos: confirmList.slice(i, i + BATCH_SIZE), galeria_id: galeriaAtiva }),
      });
    }
    setUploading(false);
    setUploadProgress(100);
    await new Promise(r => setTimeout(r, 800));
    await fetchAlbum();
  };


  // Gallery actions
  const criarGaleria = async () => {
    if (!novaGaleria.trim()) return;
    const res = await authFetch(`/admin/albuns/${id}/galerias`, {
      method: 'POST', body: JSON.stringify({ nome: novaGaleria.trim() }),
    });
    const json = await res.json();
    if (json.success) { setNovaGaleria(''); setShowNovaGaleria(false); fetchAlbum(); }
    else alert(json.message || 'Erro ao criar galeria');
  };

  const renomearGaleria = async (gid) => {
    await authFetch(`/admin/albuns/${id}/galerias/${gid}`, {
      method: 'PUT', body: JSON.stringify({ nome: renameValue }),
    });
    setRenaming(null);
    fetchAlbum();
  };

  const excluirGaleria = async (gid) => {
    const gFotos = fotos.filter(f => f.galeria_id === gid);
    if (gFotos.length > 0) return alert('Só é possível excluir galerias vazias.');
    if (!confirm('Excluir esta galeria?')) return;
    await authFetch(`/admin/albuns/${id}/galerias/${gid}`, { method: 'DELETE' });
    if (galeriaAtiva === gid) setGaleriaAtiva(galerias[0]?.id || null);
    fetchAlbum();
  };

  const reordenarGaleria = async (idx, dir) => {
    const newArr = [...galerias];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= newArr.length) return;
    [newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]];
    setGalerias(newArr);
    await authFetch(`/admin/albuns/${id}/galerias/reorder`, {
      method: 'PUT', body: JSON.stringify(newArr.map((g, i) => ({ id: g.id, ordem: i }))),
    });
  };


  // Photo actions
  const toggleSelecionada = (fotoId) => {
    setSelecionadas(prev => prev.includes(fotoId) ? prev.filter(x => x !== fotoId) : [...prev, fotoId]);
  };

  const excluirSelecionadas = async () => {
    if (!confirm(`Excluir ${selecionadas.length} fotos?`)) return;
    await Promise.all(selecionadas.map(fid => authFetch(`/admin/fotos/${fid}`, { method: 'DELETE' })));
    setSelecionadas([]);
    fetchAlbum();
  };

  const moverParaGaleria = async (destino) => {
    for (const fid of selecionadas) {
      await authFetch(`/admin/fotos/${fid}`, { method: 'PUT', body: JSON.stringify({ galeria_id: destino }) }).catch(() => {});
    }
    setSelecionadas([]);
    fetchAlbum();
  };

  const definirComoCapa = async (fotoId) => {
    const newTema = { ...tema, capa_foto_id: fotoId };
    setTema(newTema);
    try { await authFetch(`/admin/albuns/${id}/tema`, { method: 'PUT', body: JSON.stringify(newTema) }); } catch {}
  };

  // Save tema
  const saveTema = async () => {
    try { await authFetch(`/admin/albuns/${id}/tema`, { method: 'PUT', body: JSON.stringify(tema) }); } catch {}
  };

  // Save texto
  const saveTexto = async () => {
    try {
      await authFetch(`/admin/albuns/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ titulo: textoAlbum.titulo, data_evento: textoAlbum.data_evento, nome_negocio: textoAlbum.nome_negocio }),
      });
    } catch {}
  };

  // Save config
  const saveConfig = async (field, value) => {
    try {
      await authFetch(`/admin/albuns/${id}`, { method: 'PUT', body: JSON.stringify({ [field]: value }) });
      fetchAlbum();
    } catch {}
  };


  // Publish
  const handlePublicar = async () => {
    const pagamento = album?.pagamento_percentual || 0;
    if (pagamento < 70 && !window.confirm(`Atenção: pagamento em ${pagamento}% (recomendado mínimo 70%). Publicar mesmo assim?`)) return;
    const res = await authFetch(`/admin/albuns/${id}/publicar`, { method: 'POST' });
    const json = await res.json();
    if (json.success) fetchAlbum();
    else alert(json.message || 'Erro ao publicar');
  };

  // Edit foto
  const openEditFoto = (foto) => {
    const fotoId = foto.id?.startsWith('FOTO#') ? foto.id.replace('FOTO#', '') : foto.id;
    setEditingFoto({ ...foto, extractedId: fotoId });
    setEditFotoForm({ titulo: foto.titulo || '', descricao: foto.descricao || '' });
  };

  const handleSaveFotoEdit = async () => {
    if (!editingFoto) return;
    const fotoId = editingFoto.extractedId;
    const res = await authFetch(`/admin/album/galeria/${galeriaAtiva}/foto/${fotoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: editFotoForm.titulo, descricao: editFotoForm.descricao }),
    });
    const json = await res.json();
    if (json.success !== false) {
      setFotos(prev => prev.map(f => f.id === editingFoto.id ? { ...f, titulo: editFotoForm.titulo, descricao: editFotoForm.descricao } : f));
    }
    setEditingFoto(null);
  };

  // Lightbox keyboard
  useEffect(() => {
    const handler = (e) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') setLightboxIndex(i => Math.min(i + 1, fotosGaleria.length - 1));
      if (e.key === 'ArrowLeft') setLightboxIndex(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, fotosGaleria.length]);

  if (!album) return <div className="h-screen flex items-center justify-center text-gray-400">Carregando álbum...</div>;

  const fotoLightbox = lightboxIndex !== null ? fotosGaleria[lightboxIndex] : null;


  // ============ RENDER ============
  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* TOP BAR */}
      <header className="h-12 bg-white border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="text-sm text-gray-500 hover:text-gray-700">← Voltar</button>
          <span className="text-sm font-semibold text-gray-800">Gerenciar configurações do álbum</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColors[album.status] || statusColors.rascunho}`}>
            {album.status}
          </span>
          <button onClick={() => window.open(`/admin/albuns/${id}/preview`, '_blank')}
            className="text-xs px-3 py-1.5 border rounded hover:bg-gray-50 flex items-center gap-1">
            <Eye size={13} /> Visualizar
          </button>
          <button onClick={handlePublicar}
            className="text-xs px-3 py-1.5 rounded text-white flex items-center gap-1"
            style={{ backgroundColor: ACCENT }}>
            <Send size={13} /> Publicar
          </button>
        </div>
      </header>


      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        {/* ICON SIDEBAR */}
        <nav className="w-16 bg-white border-r flex flex-col items-center py-4 gap-1 shrink-0">
          {[
            { key: 'midia', icon: Image, label: 'Mídia' },
            { key: 'texto', icon: Type, label: 'Texto' },
            { key: 'design', icon: Palette, label: 'Design' },
            { key: 'config', icon: Settings, label: 'Configura...' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-lg w-14 transition-colors ${
                activeTab === tab.key ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}>
              <tab.icon size={20} />
              <span className="text-[10px] leading-tight">{tab.label}</span>
            </button>
          ))}
        </nav>


        {/* CONFIG PANEL */}
        <aside className="w-72 bg-white border-r overflow-y-auto shrink-0">
          {/* TAB: MÍDIA */}
          {activeTab === 'midia' && (
            <div className="p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-1">Mídia do álbum</h2>
              <p className="text-xs text-gray-500 mb-4">Escolha uma foto de capa para o seu álbum e gerencie a mídia em cada galeria.</p>

              {/* Capa do álbum */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-gray-700">Capa do álbum</h3>
                  <button className="text-gray-400 hover:text-gray-600">•••</button>
                </div>
                <div className="relative rounded-lg overflow-hidden border-2 border-blue-400 aspect-video bg-gray-100">
                  {capaFoto ? (
                    <img src={capaFoto.thumbnail_url || capaFoto.url} alt="Capa" className="w-full h-full object-cover" />
                  ) : fotos[0] ? (
                    <img src={fotos[0].thumbnail_url || fotos[0].url} alt="Capa" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Sem capa</div>
                  )}
                  <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                    <CheckCircle2 size={12} />
                  </div>
                </div>
              </div>


              {/* Galeria */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-gray-700">Galeria</h3>
                  <button onClick={() => setShowGaleriaModal(true)} className="text-gray-400 hover:text-gray-600">•••</button>
                </div>
                {/* Grid thumbnails */}
                <div className="grid grid-cols-3 gap-1">
                  {fotosGaleria.slice(0, 5).map((foto, idx) => (
                    <div key={foto.id} className="aspect-square rounded overflow-hidden bg-gray-100">
                      <img src={foto.thumbnail_url || foto.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {fotosGaleria.length > 5 && (
                    <div className="aspect-square rounded bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                      +{fotosGaleria.length - 5}
                    </div>
                  )}
                </div>
              </div>

              {/* Galerias list */}
              <div className="space-y-1 mb-3">
                {galerias.map((g, idx) => (
                  <div key={g.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer group ${galeriaAtiva === g.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50'}`}
                    onClick={() => { setGaleriaAtiva(g.id); setSelecionadas([]); }}
                    onDoubleClick={() => { setRenaming(g.id); setRenameValue(g.nome); }}>
                    {renaming === g.id ? (
                      <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                        onBlur={() => renomearGaleria(g.id)} onKeyDown={e => e.key === 'Enter' && renomearGaleria(g.id)}
                        className="flex-1 text-xs border rounded px-1 py-0.5" />
                    ) : (
                      <span className="flex-1 truncate">{g.nome}</span>
                    )}
                    <span className="text-gray-400 text-[10px]">{fotos.filter(f => f.galeria_id === g.id).length}</span>
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button onClick={e => { e.stopPropagation(); reordenarGaleria(idx, -1); }}><ChevronUp size={10} /></button>
                      <button onClick={e => { e.stopPropagation(); reordenarGaleria(idx, 1); }}><ChevronDown size={10} /></button>
                      <button onClick={e => { e.stopPropagation(); excluirGaleria(g.id); }} className="text-red-400"><Trash2 size={10} /></button>
                    </div>
                  </div>
                ))}
              </div>


              {/* Adicionar nova galeria */}
              {showNovaGaleria ? (
                <div className="flex gap-1">
                  <input autoFocus value={novaGaleria} onChange={e => setNovaGaleria(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && criarGaleria()}
                    className="flex-1 text-xs border rounded px-2 py-1" placeholder="Nome..." />
                  <button onClick={criarGaleria} className="text-xs px-2 py-1 rounded text-white" style={{ backgroundColor: ACCENT }}>OK</button>
                  <button onClick={() => setShowNovaGaleria(false)} className="text-xs px-1 text-gray-400">✕</button>
                </div>
              ) : (
                <button onClick={() => setShowNovaGaleria(true)}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 flex flex-col items-center gap-1 text-xs text-gray-500 hover:border-blue-300 hover:text-blue-500 transition">
                  <Plus size={16} />
                  <span>Adicionar nova galeria</span>
                </button>
              )}

              {/* Upload button */}
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: ACCENT }}>
                <Upload size={15} /> Upload de mídia
              </button>
              <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />

              {uploading && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{uploadProgress}%</p>
                </div>
              )}
            </div>
          )}


          {/* TAB: TEXTO */}
          {activeTab === 'texto' && (
            <div className="p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-1">Texto do álbum</h2>
              <p className="text-xs text-gray-500 mb-4">Edite a capa e o texto das galerias.</p>

              {/* Tabs Capa / Galerias */}
              <div className="flex border-b mb-4">
                <button onClick={() => setTextoTab('capa')}
                  className={`flex-1 py-2 text-xs font-medium border-b-2 transition ${textoTab === 'capa' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
                  Capa
                </button>
                <button onClick={() => setTextoTab('galerias')}
                  className={`flex-1 py-2 text-xs font-medium border-b-2 transition ${textoTab === 'galerias' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
                  Galerias
                </button>
              </div>

              {textoTab === 'capa' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                      Título do álbum <span className="text-red-500">*</span>
                    </label>
                    <input value={textoAlbum.titulo} onChange={e => setTextoAlbum({ ...textoAlbum, titulo: e.target.value })}
                      onBlur={saveTexto}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">Texto do botão</label>
                    <input value={textoAlbum.texto_botao} onChange={e => setTextoAlbum({ ...textoAlbum, texto_botao: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
                  </div>


                  {/* Mais informações toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Mais informações</label>
                    <button onClick={() => setTextoAlbum({ ...textoAlbum, mais_info: !textoAlbum.mais_info })}
                      className={`w-10 h-5 rounded-full relative transition-colors ${textoAlbum.mais_info ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${textoAlbum.mais_info ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  {textoAlbum.mais_info && (
                    <input value={textoAlbum.data_evento} onChange={e => setTextoAlbum({ ...textoAlbum, data_evento: e.target.value })}
                      onBlur={saveTexto}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                      placeholder="Data do evento" />
                  )}

                  {/* Informações do negócio */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Informações do negócio</label>
                    <button onClick={() => setTextoAlbum({ ...textoAlbum, info_negocio: !textoAlbum.info_negocio })}
                      className={`w-10 h-5 rounded-full relative transition-colors ${textoAlbum.info_negocio ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${textoAlbum.info_negocio ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  {textoAlbum.info_negocio && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs">
                        <input type="radio" name="info_tipo" checked={textoAlbum.info_tipo === 'nome'}
                          onChange={() => setTextoAlbum({ ...textoAlbum, info_tipo: 'nome' })} />
                        Nome do negócio
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input type="radio" name="info_tipo" checked={textoAlbum.info_tipo === 'logo'}
                          onChange={() => setTextoAlbum({ ...textoAlbum, info_tipo: 'logo' })} />
                        Logo
                      </label>
                      {textoAlbum.info_tipo === 'nome' && (
                        <input value={textoAlbum.nome_negocio} onChange={e => setTextoAlbum({ ...textoAlbum, nome_negocio: e.target.value })}
                          onBlur={saveTexto}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 mt-2">Para alterar as fontes de todo o texto do álbum, vá na aba Design e clique em Fontes.</p>
                </div>
              )}

              {textoTab === 'galerias' && (
                <div className="space-y-3">
                  {galerias.map(g => (
                    <div key={g.id} className="p-2 border rounded-lg">
                      <input value={g.nome} readOnly className="w-full text-sm font-medium text-gray-700 bg-transparent" />
                      <p className="text-[10px] text-gray-400">{fotos.filter(f => f.galeria_id === g.id).length} fotos</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


          {/* TAB: DESIGN */}
          {activeTab === 'design' && (
            <div className="p-4">
              {designSubTab === 'layouts' && (
                <>
                  <button onClick={() => setDesignSubTab('main')} className="text-xs text-gray-500 hover:text-gray-700 mb-2">‹ Voltar para design</button>
                  <h2 className="text-sm font-bold text-gray-900 mb-3">Layouts</h2>
                  <div className="flex border-b mb-4">
                    <button onClick={() => setDesignLayoutTab('capa')}
                      className={`flex-1 py-2 text-xs font-medium border-b-2 transition ${designLayoutTab === 'capa' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
                      Capa
                    </button>
                    <button onClick={() => setDesignLayoutTab('galerias')}
                      className={`flex-1 py-2 text-xs font-medium border-b-2 transition ${designLayoutTab === 'galerias' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
                      Galerias
                    </button>
                  </div>

                  {designLayoutTab === 'capa' && (
                    <div className="space-y-3">
                      {CAPA_LAYOUTS.map(layout => (
                        <button key={layout.id} onClick={() => { setTema({ ...tema, capa_layout: layout.id }); saveTema(); }}
                          className={`w-full text-left p-3 rounded-lg border-2 transition ${tema.capa_layout === layout.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="h-16 bg-gray-200 rounded mb-2 flex items-center justify-center text-gray-400 text-xs">
                            Preview {layout.label}
                          </div>
                          <span className="text-xs font-medium text-gray-700">{layout.label}</span>
                          {tema.capa_layout === layout.id && (
                            <CheckCircle2 size={14} className="inline ml-2 text-blue-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}


                  {designLayoutTab === 'galerias' && (
                    <div className="space-y-4">
                      {/* Layout grid */}
                      <div className="grid grid-cols-3 gap-2">
                        {LAYOUT_OPTIONS.map(layout => (
                          <button key={layout.id} onClick={() => { setTema({ ...tema, layout: layout.id }); saveTema(); }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition text-center ${
                              tema.layout === layout.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-lg">{layout.icon}</div>
                            <span className="text-[10px] text-gray-600">{layout.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Orientação */}
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-2 block">Orientação da galeria</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-xs">
                            <input type="radio" name="orientacao" checked={tema.orientacao === 'horizontal'}
                              onChange={() => setTema({ ...tema, orientacao: 'horizontal' })} />
                            Horizontal
                          </label>
                          <label className="flex items-center gap-2 text-xs">
                            <input type="radio" name="orientacao" checked={tema.orientacao === 'vertical'}
                              onChange={() => setTema({ ...tema, orientacao: 'vertical' })} />
                            Vertical
                          </label>
                        </div>
                      </div>

                      {/* Espaçamento */}
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Espaçamento</label>
                        <div className="flex items-center gap-3">
                          <input type="range" min="0" max="40" value={tema.espacamento}
                            onChange={e => setTema({ ...tema, espacamento: Number(e.target.value) })}
                            onMouseUp={saveTema}
                            className="flex-1 accent-blue-500" />
                          <input type="number" value={tema.espacamento}
                            onChange={e => setTema({ ...tema, espacamento: Number(e.target.value) })}
                            onBlur={saveTema}
                            className="w-14 text-xs border rounded px-2 py-1 text-center" />
                        </div>
                      </div>

                      {/* Densidade da colagem */}
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Densidade da colagem</label>
                        <div className="flex items-center gap-3">
                          <input type="range" min="0" max="100" value={tema.densidade_colagem}
                            onChange={e => setTema({ ...tema, densidade_colagem: Number(e.target.value) })}
                            onMouseUp={saveTema}
                            className="flex-1 accent-blue-500" />
                          <input type="number" value={tema.densidade_colagem}
                            onChange={e => setTema({ ...tema, densidade_colagem: Number(e.target.value) })}
                            onBlur={saveTema}
                            className="w-14 text-xs border rounded px-2 py-1 text-center" />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}


              {designSubTab === 'cores' && (
                <>
                  <button onClick={() => setDesignSubTab('main')} className="text-xs text-gray-500 hover:text-gray-700 mb-2">‹ Voltar para design</button>
                  <h2 className="text-sm font-bold text-gray-900 mb-3">Cores</h2>
                  <div className="flex border-b mb-4">
                    <button onClick={() => setDesignColorTab('capa')}
                      className={`flex-1 py-2 text-xs font-medium border-b-2 transition ${designColorTab === 'capa' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
                      Capa
                    </button>
                    <button onClick={() => setDesignColorTab('galerias')}
                      className={`flex-1 py-2 text-xs font-medium border-b-2 transition ${designColorTab === 'galerias' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
                      Galerias
                    </button>
                  </div>

                  {designColorTab === 'capa' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Cor do texto</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">#</span>
                          <input value={tema.cores_capa?.texto?.replace('#', '') || 'FFFFFF'}
                            onChange={e => setTema({ ...tema, cores_capa: { ...tema.cores_capa, texto: '#' + e.target.value } })}
                            onBlur={saveTema}
                            className="flex-1 px-2 py-1.5 border rounded text-xs" />
                          <input type="color" value={tema.cores_capa?.texto || '#FFFFFF'}
                            onChange={e => setTema({ ...tema, cores_capa: { ...tema.cores_capa, texto: e.target.value } })}
                            onBlur={saveTema}
                            className="w-8 h-8 rounded border cursor-pointer" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Cor da sobreposição do background</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">#</span>
                          <input value={tema.cores_capa?.overlay?.replace('#', '') || '121212'}
                            onChange={e => setTema({ ...tema, cores_capa: { ...tema.cores_capa, overlay: '#' + e.target.value } })}
                            onBlur={saveTema}
                            className="flex-1 px-2 py-1.5 border rounded text-xs" />
                          <input type="color" value={tema.cores_capa?.overlay || '#121212'}
                            onChange={e => setTema({ ...tema, cores_capa: { ...tema.cores_capa, overlay: e.target.value } })}
                            onBlur={saveTema}
                            className="w-8 h-8 rounded border cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  )}


                  {designColorTab === 'galerias' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-semibold text-gray-600">Background e Ícones</h4>
                      <div>
                        <label className="text-[11px] text-gray-500 mb-1 block">Cor do texto da página e ícones</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">#</span>
                          <input value={tema.cores_galerias?.texto_icones?.replace('#', '') || 'FF3C00'}
                            onChange={e => setTema({ ...tema, cores_galerias: { ...tema.cores_galerias, texto_icones: '#' + e.target.value } })}
                            onBlur={saveTema}
                            className="flex-1 px-2 py-1.5 border rounded text-xs" />
                          <input type="color" value={tema.cores_galerias?.texto_icones || '#FF3C00'}
                            onChange={e => setTema({ ...tema, cores_galerias: { ...tema.cores_galerias, texto_icones: e.target.value } })}
                            onBlur={saveTema}
                            className="w-8 h-8 rounded border cursor-pointer" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-500 mb-1 block">Cor do background</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">#</span>
                          <input value={tema.cores_galerias?.background?.replace('#', '') || '121212'}
                            onChange={e => setTema({ ...tema, cores_galerias: { ...tema.cores_galerias, background: '#' + e.target.value } })}
                            onBlur={saveTema}
                            className="flex-1 px-2 py-1.5 border rounded text-xs" />
                          <input type="color" value={tema.cores_galerias?.background || '#121212'}
                            onChange={e => setTema({ ...tema, cores_galerias: { ...tema.cores_galerias, background: e.target.value } })}
                            onBlur={saveTema}
                            className="w-8 h-8 rounded border cursor-pointer" />
                        </div>
                      </div>

                      <h4 className="text-xs font-semibold text-gray-600 pt-2">Dados e sobreposição</h4>
                      <div>
                        <label className="text-[11px] text-gray-500 mb-1 block">Cor do texto e ícones</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">#</span>
                          <input value={tema.cores_galerias?.overlay_texto?.replace('#', '') || 'FF3C00'}
                            onChange={e => setTema({ ...tema, cores_galerias: { ...tema.cores_galerias, overlay_texto: '#' + e.target.value } })}
                            onBlur={saveTema}
                            className="flex-1 px-2 py-1.5 border rounded text-xs" />
                          <input type="color" value={tema.cores_galerias?.overlay_texto || '#FF3C00'}
                            onChange={e => setTema({ ...tema, cores_galerias: { ...tema.cores_galerias, overlay_texto: e.target.value } })}
                            onBlur={saveTema}
                            className="w-8 h-8 rounded border cursor-pointer" />
                        </div>
                      </div>


                      <div>
                        <label className="text-[11px] text-gray-500 mb-1 block">Cor ao passar o mouse</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">#</span>
                          <input value={tema.cores_galerias?.overlay_hover?.replace('#', '') || 'FF3C00'}
                            onChange={e => setTema({ ...tema, cores_galerias: { ...tema.cores_galerias, overlay_hover: '#' + e.target.value } })}
                            onBlur={saveTema}
                            className="flex-1 px-2 py-1.5 border rounded text-xs" />
                          <input type="color" value={tema.cores_galerias?.overlay_hover || '#FF3C00'}
                            onChange={e => setTema({ ...tema, cores_galerias: { ...tema.cores_galerias, overlay_hover: e.target.value } })}
                            onBlur={saveTema}
                            className="w-8 h-8 rounded border cursor-pointer" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-500 mb-1 block">Opacidade da sobreposição</label>
                        <div className="flex items-center gap-3">
                          <input type="range" min="0" max="100" value={tema.cores_galerias?.overlay_opacidade || 30}
                            onChange={e => setTema({ ...tema, cores_galerias: { ...tema.cores_galerias, overlay_opacidade: Number(e.target.value) } })}
                            onMouseUp={saveTema}
                            className="flex-1 accent-blue-500" />
                          <input type="number" value={tema.cores_galerias?.overlay_opacidade || 30}
                            onChange={e => setTema({ ...tema, cores_galerias: { ...tema.cores_galerias, overlay_opacidade: Number(e.target.value) } })}
                            onBlur={saveTema}
                            className="w-14 text-xs border rounded px-2 py-1 text-center" />
                        </div>
                      </div>

                      <h4 className="text-xs font-semibold text-gray-600 pt-2">Borda</h4>
                      <div>
                        <label className="text-[11px] text-gray-500 mb-1 block">Cor da borda da foto</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">#</span>
                          <input value={tema.cores_galerias?.borda_cor?.replace('#', '') || 'FF3C00'}
                            onChange={e => setTema({ ...tema, cores_galerias: { ...tema.cores_galerias, borda_cor: '#' + e.target.value } })}
                            onBlur={saveTema}
                            className="flex-1 px-2 py-1.5 border rounded text-xs" />
                          <input type="color" value={tema.cores_galerias?.borda_cor || '#FF3C00'}
                            onChange={e => setTema({ ...tema, cores_galerias: { ...tema.cores_galerias, borda_cor: e.target.value } })}
                            onBlur={saveTema}
                            className="w-8 h-8 rounded border cursor-pointer" />
                        </div>
                      </div>


                      <div>
                        <label className="text-[11px] text-gray-500 mb-1 block">Largura da borda da foto (px)</label>
                        <div className="flex items-center gap-3">
                          <input type="range" min="0" max="10" value={tema.cores_galerias?.borda_largura || 3}
                            onChange={e => setTema({ ...tema, cores_galerias: { ...tema.cores_galerias, borda_largura: Number(e.target.value) } })}
                            onMouseUp={saveTema}
                            className="flex-1 accent-blue-500" />
                          <input type="number" value={tema.cores_galerias?.borda_largura || 3}
                            onChange={e => setTema({ ...tema, cores_galerias: { ...tema.cores_galerias, borda_largura: Number(e.target.value) } })}
                            onBlur={saveTema}
                            className="w-14 text-xs border rounded px-2 py-1 text-center" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-500 mb-1 block">Raio do canto da foto</label>
                        <div className="flex items-center gap-3">
                          <input type="range" min="0" max="30" value={tema.cores_galerias?.borda_raio || 10}
                            onChange={e => setTema({ ...tema, cores_galerias: { ...tema.cores_galerias, borda_raio: Number(e.target.value) } })}
                            onMouseUp={saveTema}
                            className="flex-1 accent-blue-500" />
                          <input type="number" value={tema.cores_galerias?.borda_raio || 10}
                            onChange={e => setTema({ ...tema, cores_galerias: { ...tema.cores_galerias, borda_raio: Number(e.target.value) } })}
                            onBlur={saveTema}
                            className="w-14 text-xs border rounded px-2 py-1 text-center" />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}


              {designSubTab === 'fontes' && (
                <>
                  <button onClick={() => setDesignSubTab('main')} className="text-xs text-gray-500 hover:text-gray-700 mb-2">‹ Voltar para design</button>
                  <h2 className="text-sm font-bold text-gray-900 mb-3">Fontes</h2>
                  <div className="space-y-3">
                    {FONT_PRESETS.map((preset, idx) => (
                      <button key={idx} onClick={() => { setTema({ ...tema, fonte_titulo: preset.titulo, fonte_corpo: preset.corpo }); saveTema(); }}
                        className={`w-full text-left p-4 rounded-lg border-2 transition ${
                          tema.fonte_titulo === preset.titulo && tema.fonte_corpo === preset.corpo
                            ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <p className="text-lg font-bold" style={{ fontFamily: preset.titulo }}>Fonte do título</p>
                        <p className="text-xs text-gray-500" style={{ fontFamily: preset.corpo }}>Fonte do texto secundário</p>
                      </button>
                    ))}
                    <button className="w-full py-2 text-xs text-blue-600 border-2 border-dashed border-blue-200 rounded-lg hover:bg-blue-50">
                      + Novo conjunto de fontes
                    </button>
                  </div>
                </>
              )}


              {designSubTab === 'animacoes' && (
                <>
                  <button onClick={() => setDesignSubTab('main')} className="text-xs text-gray-500 hover:text-gray-700 mb-2">‹ Voltar para design</button>
                  <h2 className="text-sm font-bold text-gray-900 mb-3">Animações</h2>
                  <div className="space-y-5">
                    {/* Efeito de rolagem */}
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-2 block">Efeito de rolagem</label>
                      <div className="grid grid-cols-3 gap-2">
                        {SCROLL_EFFECTS.map(effect => (
                          <button key={effect.id} onClick={() => { setTema({ ...tema, animacao_scroll: effect.id }); saveTema(); }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition ${
                              tema.animacao_scroll === effect.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                              {effect.id === 'none' ? <X size={12} className="text-gray-400" /> : <Sparkles size={12} className="text-blue-400" />}
                            </div>
                            <span className="text-[9px] text-gray-600 text-center leading-tight">{effect.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Efeito ao passar o mouse */}
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-2 block">Efeito ao passar o mouse</label>
                      <div className="grid grid-cols-3 gap-2">
                        {HOVER_EFFECTS.map(effect => (
                          <button key={effect.id} onClick={() => { setTema({ ...tema, animacao_hover: effect.id }); saveTema(); }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition ${
                              tema.animacao_hover === effect.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                              {effect.id === 'none' ? <X size={12} className="text-gray-400" /> : <Sparkles size={12} className="text-blue-400" />}
                            </div>
                            <span className="text-[9px] text-gray-600 text-center leading-tight">{effect.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>


                    {/* Animação da sobreposição */}
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-2 block">Animação da sobreposição</label>
                      <div className="grid grid-cols-3 gap-2">
                        {OVERLAY_ANIMATIONS.map(effect => (
                          <button key={effect.id} onClick={() => { setTema({ ...tema, animacao_overlay: effect.id }); saveTema(); }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition ${
                              tema.animacao_overlay === effect.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                              {effect.id === 'none' ? <X size={12} className="text-gray-400" /> : <Sparkles size={12} className="text-blue-400" />}
                            </div>
                            <span className="text-[9px] text-gray-600 text-center leading-tight">{effect.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Visualizar button */}
                    <button onClick={() => window.open(`/admin/albuns/${id}/preview`, '_blank')}
                      className="w-full py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2"
                      style={{ backgroundColor: ACCENT }}>
                      <Monitor size={14} /> Visualizar Modo Passar o Mouse
                    </button>
                  </div>
                </>
              )}


              {/* Design Main Menu */}
              {designSubTab === 'main' && (
                <div className="space-y-2">
                  <h2 className="text-sm font-bold text-gray-900 mb-3">Design</h2>
                  {[
                    { key: 'layouts', label: 'Layouts', icon: LayoutGrid, desc: 'Capa e galerias' },
                    { key: 'cores', label: 'Cores', icon: Palette, desc: 'Personalize as cores' },
                    { key: 'fontes', label: 'Fontes', icon: Type, desc: 'Tipografia do álbum' },
                    { key: 'animacoes', label: 'Animações', icon: Sparkles, desc: 'Efeitos visuais' },
                  ].map(item => (
                    <button key={item.key} onClick={() => setDesignSubTab(item.key)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-blue-50 transition text-left">
                      <item.icon size={18} className="text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.label}</p>
                        <p className="text-[10px] text-gray-400">{item.desc}</p>
                      </div>
                      <ChevronRight size={14} className="ml-auto text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}


          {/* TAB: CONFIGURAÇÕES */}
          {activeTab === 'config' && (
            <div className="p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-1">Configurações</h2>
              <p className="text-xs text-gray-500 mb-4">Ajuste as configurações do álbum.</p>

              <div className="space-y-5">
                {/* Qualidade da imagem */}
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                    Qualidade da imagem na galeria
                    <span className="text-gray-400 cursor-help" title="Quanto maior a qualidade, mais tempo vai demorar para carregar. Isso só afetará as imagens na galeria. O modo expansão, tela cheia e downloads não serão afetados.">ⓘ</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="10" max="100" value={tema.qualidade_imagem}
                      onChange={e => setTema({ ...tema, qualidade_imagem: Number(e.target.value) })}
                      onMouseUp={saveTema}
                      className="flex-1 accent-blue-500" />
                    <input type="number" value={tema.qualidade_imagem}
                      onChange={e => setTema({ ...tema, qualidade_imagem: Number(e.target.value) })}
                      onBlur={saveTema}
                      className="w-14 text-xs border rounded px-2 py-1 text-center" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">A qualidade recomendada é 90.</p>
                </div>

                <hr className="border-gray-100" />

                {/* Permitir download */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-800">Permitir download</p>
                    <p className="text-[10px] text-gray-400">Cliente pode baixar fotos originais</p>
                  </div>
                  <button onClick={() => { const v = !config.permite_download; setConfig({ ...config, permite_download: v }); saveConfig('permite_download', v); }}
                    className={`w-10 h-5 rounded-full relative transition-colors ${config.permite_download ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${config.permite_download ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>


                {/* Permitir seleção */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-800">Permitir seleção</p>
                    <p className="text-[10px] text-gray-400">Cliente pode selecionar fotos favoritas</p>
                  </div>
                  <button onClick={() => { const v = !config.permite_selecao; setConfig({ ...config, permite_selecao: v }); saveConfig('permite_selecao', v); }}
                    className={`w-10 h-5 rounded-full relative transition-colors ${config.permite_selecao ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${config.permite_selecao ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {/* Permitir comentários */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-800">Permitir comentários</p>
                    <p className="text-[10px] text-gray-400">Cliente pode comentar nas fotos</p>
                  </div>
                  <button onClick={() => { const v = !config.permite_comentarios; setConfig({ ...config, permite_comentarios: v }); saveConfig('permite_comentarios', v); }}
                    className={`w-10 h-5 rounded-full relative transition-colors ${config.permite_comentarios ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${config.permite_comentarios ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <hr className="border-gray-100" />

                {/* Cota de seleção */}
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Cota de seleção</label>
                  <input type="number" value={config.cota_selecao} min="0"
                    onChange={e => setConfig({ ...config, cota_selecao: Number(e.target.value) })}
                    onBlur={e => saveConfig('cota_selecao', Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none" placeholder="0 = sem limite" />
                  <p className="text-[10px] text-gray-400 mt-1">0 = ilimitado</p>
                </div>

                {/* Senha */}
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Senha de acesso</label>
                  <input type="text" value={config.senha_acesso}
                    onChange={e => setConfig({ ...config, senha_acesso: e.target.value })}
                    onBlur={e => saveConfig('senha_acesso', e.target.value || null)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none" placeholder="Vazio = acesso livre" />
                </div>

                {/* Expiração */}
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Data de expiração</label>
                  <input type="date" value={config.data_expiracao}
                    onChange={e => setConfig({ ...config, data_expiracao: e.target.value })}
                    onBlur={e => saveConfig('data_expiracao', e.target.value || null)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
                </div>
              </div>
            </div>
          )}
        </aside>


        {/* PREVIEW AREA */}
        <main className="flex-1 bg-gray-200 flex items-center justify-center overflow-hidden p-6">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl overflow-hidden">
            {/* Browser chrome */}
            <div className="h-8 bg-gray-100 border-b flex items-center px-3 gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-8">
                <div className="bg-white rounded-full h-5 flex items-center px-3">
                  <span className="text-[10px] text-gray-400 truncate">mbfoto.com.br/album/{album.slug || '...'}</span>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">⋮</button>
            </div>

            {/* Album cover preview */}
            <div className="relative h-80" style={{ backgroundColor: tema.cores_capa?.overlay || '#121212' }}>
              {(capaFoto || fotos[0]) && (
                <img
                  src={(capaFoto || fotos[0])?.url || (capaFoto || fotos[0])?.thumbnail_url}
                  alt="Capa"
                  className="w-full h-full object-cover opacity-60"
                />
              )}
              <div className="absolute inset-0 flex flex-col justify-end p-8"
                style={{ color: tema.cores_capa?.texto || '#FFFFFF' }}>
                {textoAlbum.info_negocio && textoAlbum.nome_negocio && (
                  <p className="text-xs opacity-70 mb-2 tracking-wide uppercase"
                    style={{ fontFamily: tema.fonte_corpo || 'Inter' }}>
                    {textoAlbum.nome_negocio}
                  </p>
                )}
                <h1 className="text-4xl font-bold mb-1"
                  style={{ fontFamily: tema.fonte_titulo || 'Playfair Display' }}>
                  {textoAlbum.titulo || 'Título do álbum'}
                </h1>
                {textoAlbum.mais_info && textoAlbum.data_evento && (
                  <p className="text-sm opacity-70" style={{ fontFamily: tema.fonte_corpo || 'Inter' }}>
                    {textoAlbum.data_evento}
                  </p>
                )}
                <div className="flex items-center justify-between mt-4">
                  <div />
                  <span className="text-xs opacity-70 flex items-center gap-1"
                    style={{ fontFamily: tema.fonte_corpo || 'Inter' }}>
                    {textoAlbum.texto_botao || 'Ver fotos'} →
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>


      {/* MODAL: Organize as fotos dessa galeria */}
      {showGaleriaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Organize as fotos dessa galeria</h3>
                <div className="flex items-center gap-2 mt-1">
                  <input type="text" placeholder="Buscar" className="px-3 py-1.5 border rounded-lg text-sm w-48" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg text-sm text-white font-medium"
                  style={{ backgroundColor: ACCENT }}>
                  <Upload size={14} className="inline mr-1" /> Upload de mídia
                </button>
                <button onClick={() => setShowGaleriaModal(false)} className="p-1 rounded hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3 px-4 py-2 border-b text-xs">
              <span className="text-gray-600">{selecionadas.length} selecionados</span>
              <button onClick={() => setSelecionadas(fotosGaleria.map(f => f.id))} className="text-blue-600 hover:underline">Selecionar tudo</button>
              <button onClick={() => setSelecionadas([])} className="text-blue-600 hover:underline">Desmarcar</button>
              {selecionadas.length > 0 && (
                <button onClick={excluirSelecionadas} className="text-blue-600 hover:underline">Remover</button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-gray-500">Organizar por</span>
                <select className="border rounded px-2 py-1 text-xs">
                  <option>Padrão</option>
                  <option>Nome</option>
                  <option>Data</option>
                </select>
              </div>
            </div>


            {/* Photos grid + Detail panel */}
            <div className="flex flex-1 overflow-hidden">
              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {fotosGaleria.map((foto, idx) => (
                    <div key={foto.id}
                      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition ${
                        selecionadas.includes(foto.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'
                      }`}
                      onClick={() => toggleSelecionada(foto.id)}>
                      <img src={foto.thumbnail_url || foto.url} alt="" className="w-full h-full object-cover" />
                      <span className="absolute top-1 left-1 bg-blue-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-medium">
                        {idx + 1}
                      </span>
                      {tema.capa_foto_id === foto.id && (
                        <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded font-medium">CAPA</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Detail panel (when 1 photo selected) */}
              {selecionadas.length === 1 && (() => {
                const foto = fotosGaleria.find(f => f.id === selecionadas[0]);
                if (!foto) return null;
                return (
                  <div className="w-64 border-l bg-gray-50 p-4 overflow-y-auto shrink-0">
                    <img src={foto.thumbnail_url || foto.url} alt="" className="w-full aspect-video object-cover rounded-lg mb-3" />
                    <p className="text-[10px] text-gray-400 mb-2">{foto.filename || foto.nome || 'Foto'}</p>
                    <button onClick={() => definirComoCapa(foto.id)}
                      className="w-full text-xs text-center py-1.5 border rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50 mb-3">
                      Substituir foto da capa
                    </button>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-medium text-gray-600">Título</label>
                        <input value={editFotoForm.titulo}
                          onChange={e => setEditFotoForm({ ...editFotoForm, titulo: e.target.value })}
                          className="w-full mt-0.5 px-2 py-1.5 border rounded text-sm" placeholder={foto.filename || 'Título'} />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-gray-600">Descrição</label>
                        <textarea value={editFotoForm.descricao}
                          onChange={e => setEditFotoForm({ ...editFotoForm, descricao: e.target.value })}
                          className="w-full mt-0.5 px-2 py-1.5 border rounded text-sm resize-none" rows={3} placeholder="Escreva sobre essa foto" />
                      </div>
                      <button onClick={() => { openEditFoto(foto); handleSaveFotoEdit(); }}
                        className="w-full py-2 rounded-lg text-sm text-white font-medium"
                        style={{ backgroundColor: ACCENT }}>OK</button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer slider */}
            <div className="border-t px-4 py-3 flex items-center gap-3">
              <input type="range" min="60" max="200" defaultValue="100" className="flex-1 accent-blue-500" />
            </div>
          </div>
        </div>
      )}


      {/* MODAL: Edit foto */}
      {editingFoto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setEditingFoto(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Edit size={16} style={{ color: ACCENT }} /> Editar Foto
              </h3>
              <button onClick={() => setEditingFoto(null)} className="p-1 rounded hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Título</label>
              <input value={editFotoForm.titulo}
                onChange={e => setEditFotoForm(f => ({ ...f, titulo: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Título da foto..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
              <textarea value={editFotoForm.descricao}
                onChange={e => setEditFotoForm(f => ({ ...f, descricao: e.target.value }))}
                rows={3} className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                placeholder="Descrição da foto..." />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setEditingFoto(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={handleSaveFotoEdit} style={{ background: ACCENT }} className="px-4 py-1.5 text-sm text-white rounded-lg font-medium">Salvar</button>
            </div>
          </div>
        </div>
      )}


      {/* LIGHTBOX */}
      {fotoLightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
          <button onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 text-white hover:text-gray-300"><X size={28} /></button>
          <button onClick={() => setLightboxIndex(i => Math.max(i - 1, 0))} className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300"><ChevronLeft size={32} /></button>
          <button onClick={() => setLightboxIndex(i => Math.min(i + 1, fotosGaleria.length - 1))} className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300"><ChevronRight size={32} /></button>
          <img src={fotoLightbox.url} alt={fotoLightbox.nome} className="max-h-[75vh] max-w-[90vw] object-contain rounded" />
          <div className="text-white text-xs mt-3 flex gap-4">
            <span>{fotoLightbox.nome || fotoLightbox.filename}</span>
            <span>{fotoLightbox.tamanho || ''}</span>
          </div>
        </div>
      )}
    </div>
  );
}
