import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Upload, Send, Link2, Settings, Plus, Trash2, ChevronUp, ChevronDown,
  X, ChevronLeft, ChevronRight, Download, Clock, CalendarPlus, Eye,
  MessageSquare, Image, CheckCircle2, Shield, Edit, Palette
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#EA580C';

const statusColors = {
  rascunho: 'bg-gray-200 text-gray-700',
  pronto: 'bg-blue-100 text-blue-700',
  publicado: 'bg-green-100 text-green-700',
  expirado: 'bg-red-100 text-red-700',
};

export default function AlbumDetalhe() {
  const { id } = useParams();
  const { authFetch, token } = useAuth();
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
  const [watermark, setWatermark] = useState(true);
  const [comentario, setComentario] = useState('');
  const [showProrrogar, setShowProrrogar] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showTema, setShowTema] = useState(false);
  const [tema, setTema] = useState({ cores: { fundo: '#FFFFFF', texto: '#1A1A1A', acento: '#EA580C' }, layout: 'grade', animacao: 'none' });
  const [prorrogarData, setProrrogarData] = useState('');
  const [prorrogarValor, setProrrogarValor] = useState('');
  const [editingFoto, setEditingFoto] = useState(null);
  const [editFotoForm, setEditFotoForm] = useState({ titulo: '', descricao: '' });

  const fetchAlbum = useCallback(async () => {
    try {
      const albumRes = await authFetch(`/admin/albuns/${id}`);
      const albumJson = await albumRes.json();

      if (albumJson.success) {
        const data = albumJson.data;
        setAlbum(data);
        setFotos(data.fotos || []);
      }

      // Galerias em separado (não bloqueia se falhar)
      try {
        const galeriasRes = await authFetch(`/admin/albuns/${id}/galerias`);
        const galeriasJson = await galeriasRes.json();
        if (galeriasJson.success && galeriasJson.data?.length) {
          setGalerias(galeriasJson.data);
          if (!galeriaAtiva) setGaleriaAtiva(galeriasJson.data[0].id);
        }
      } catch {}
    } catch {}
  }, [id, authFetch]);

  useEffect(() => { fetchAlbum(); }, [fetchAlbum]);

  const fotosGaleria = galeriaAtiva
    ? fotos.filter(f => f.galeria_id === galeriaAtiva || !f.galeria_id)
    : fotos;
  const totalFotos = fotos.length;
  const selecionadasCliente = fotos.filter(f => f.selecionada_cliente).length;
  const pagamento = album?.pagamento_percentual || 0;
  const podePubilcar = pagamento >= 70;
  const diasExpiracao = album?.data_expiracao
    ? Math.max(0, Math.ceil((new Date(album.data_expiracao) - new Date()) / 86400000)) : null;

  // ALB-07 Publicar
  const handlePublicar = async () => {
    if (!podePubilcar) return;
    const res = await authFetch(`/admin/albuns/${id}/publicar`, { method: 'POST' });
    if (res.ok) fetchAlbum();
  };

  // ALB-02 Upload
  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    setUploadProgress(0);

    // Batch upload URLs
    const filesData = files.map(f => ({ filename: f.name, content_type: f.type, size_bytes: f.size }));
    const urlsRes = await authFetch(`/admin/albuns/${id}/upload-urls`, {
      method: 'POST',
      body: JSON.stringify({ files: filesData }),
    });
    const urlsJson = await urlsRes.json();
    if (!urlsJson.success) { setUploading(false); alert(urlsJson.message || 'Erro ao gerar URLs'); return; }

    const uploads = urlsJson.data;
    const confirmList = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const upload = uploads[i];
      try {
        await fetch(upload.upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        confirmList.push({ foto_id: upload.foto_id, key: upload.key, content_type: file.type });
      } catch {}
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    // Confirm batch
    if (confirmList.length > 0) {
      await authFetch(`/admin/albuns/${id}/fotos/confirmar-batch`, {
        method: 'POST',
        body: JSON.stringify({ fotos: confirmList, galeria_id: galeriaAtiva }),
      });
    }

    setUploading(false);
    setUploadProgress(100);
    // Pequeno delay para garantir consistência do S3
    await new Promise(r => setTimeout(r, 1000));
    await fetchAlbum();
  };

  // ALB-05 Galerias
  const criarGaleria = async () => {
    if (!novaGaleria.trim()) return;
    const res = await authFetch(`/admin/albuns/${id}/galerias`, {
      method: 'POST',
      body: JSON.stringify({ nome: novaGaleria.trim() }),
    });
    const json = await res.json();
    if (json.success) {
      setNovaGaleria('');
      setShowNovaGaleria(false);
      fetchAlbum();
    } else {
      alert(json.message || 'Erro ao criar galeria');
    }
  };

  const renomearGaleria = async (gid) => {
    await authFetch(`/admin/albuns/${id}/galerias/${gid}`, {
      method: 'PUT',
      body: JSON.stringify({ nome: renameValue }),
    });
    setRenaming(null);
    fetchAlbum();
  };

  const excluirGaleria = async (gid) => {
    const gFotos = fotos.filter(f => f.galeria_id === gid);
    if (gFotos.length > 0) return alert('Só é possível excluir galerias vazias.');
    if (!confirm('Excluir esta galeria?')) return;
    const res = await authFetch(`/admin/albuns/${id}/galerias/${gid}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) { alert(json.message || 'Erro ao excluir'); return; }
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
      method: 'PUT',
      body: JSON.stringify(newArr.map((g, i) => ({ id: g.id, ordem: i }))),
    });
  };

  // ALB-06 Organização
  const toggleSelecionada = (fotoId) => {
    setSelecionadas(prev => prev.includes(fotoId) ? prev.filter(x => x !== fotoId) : [...prev, fotoId]);
  };

  const excluirSelecionadas = async () => {
    if (!confirm(`Excluir ${selecionadas.length} fotos?`)) return;
    await Promise.all(selecionadas.map(fid =>
      authFetch(`/admin/fotos/${fid}`, { method: 'DELETE' })
    ));
    setSelecionadas([]);
    fetchAlbum();
  };

  const moverParaGaleria = async (destino) => {
    for (const fid of selecionadas) {
      await authFetch(`/admin/fotos/${fid}`, {
        method: 'PUT',
        body: JSON.stringify({ galeria_id: destino }),
      }).catch(() => {});
    }
    setSelecionadas([]);
    fetchAlbum();
  };

  // ALB-09 Download
  const downloadFoto = async (foto) => {
    const res = await authFetch(`/admin/fotos/upload-url`, { method: 'POST',
      body: JSON.stringify({ download: true, foto_id: foto.id }),
    });
    const { url } = await res.json();
    window.open(url, '_blank');
  };

  const downloadTodas = () => fotos.forEach(f => downloadFoto(f));

  // ALB-11 Prorrogar
  const handleProrrogar = async () => {
    await authFetch(`/admin/albuns/${id}`, {
      method: 'PUT', 
      body: JSON.stringify({ data_expiracao: prorrogarData, valor_prorrogacao: prorrogarValor }),
    });
    setShowProrrogar(false);
    fetchAlbum();
  };

  // ALB-14 Comentários
  const enviarComentario = async (fotoId) => {
    await authFetch(`/admin/albuns/${id}`, {
      method: 'PUT', 
      body: JSON.stringify({ comentario: { foto_id: fotoId, texto: comentario } }),
    });
    setComentario('');
    fetchAlbum();
  };

  // G2 - Edit foto titulo/descricao
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

  // ALB-12 Lightbox keyboard
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

  if (!album) return <div className="p-8 text-center">Carregando...</div>;

  const fotoLightbox = lightboxIndex !== null ? fotosGaleria[lightboxIndex] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-3">
            <Image size={24} style={{ color: '#EA580C' }} />
            <h1 className="text-2xl font-bold text-gray-900">{album.titulo}</h1>
            <p className="text-gray-600 text-sm">{album.cliente} • {album.data_evento}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[album.status] || statusColors.rascunho}`}>
              {album.status}
            </span>
            {/* ALB-10 Expiração */}
            {album.status === 'publicado' && diasExpiracao !== null && (
              <span className="flex items-center gap-1 text-xs text-orange-600">
                <Clock size={14} /> Expira em {diasExpiracao} dias
              </span>
            )}
          </div>
        </div>

        {/* ALB-15 Estatísticas */}
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Image size={13} /> {totalFotos} fotos</span>
          <span className="flex items-center gap-1"><Eye size={13} /> {album.visualizacoes || 0} views</span>
          <span className="flex items-center gap-1"><Download size={13} /> {album.downloads || 0} downloads</span>
          <span>Último acesso: {album.ultimo_acesso || '—'}</span>
        </div>

        {/* ALB-08 Seleção */}
        <div className="flex items-center gap-2 mt-2 text-xs">
          <CheckCircle2 size={14} className="text-green-600" />
          <span>Cliente selecionou {selecionadasCliente}/{totalFotos} fotos</span>
        </div>

        {/* Barra pagamento ALB-04 */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span>Pagamento: {pagamento}% (mínimo 70% para publicar)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="h-2 rounded-full transition-all" style={{ width: `${pagamento}%`, backgroundColor: ACCENT }} />
          </div>
        </div>

        {/* ALB-10 Barra expiração */}
        {album.status === 'publicado' && album.dias_totais && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-orange-400" style={{ width: `${Math.max(0, (diasExpiracao / album.dias_totais) * 100)}%` }} />
            </div>
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-3 py-2 rounded text-sm text-white" style={{ backgroundColor: ACCENT }}>
            <Upload size={15} /> Upload Fotos
          </button>
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />

          <div className="relative group">
            <button onClick={handlePublicar} disabled={!podePubilcar}
              className={`flex items-center gap-1 px-3 py-2 rounded text-sm text-white ${podePubilcar ? '' : 'opacity-50 cursor-not-allowed'}`}
              style={{ backgroundColor: ACCENT }}>
              <Send size={15} /> Publicar
            </button>
            {!podePubilcar && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                Pagamento insuficiente
              </span>
            )}
          </div>

          {album.status === 'publicado' && (
            <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/album/${album.slug}`)}
              className="flex items-center gap-1 px-3 py-2 rounded text-sm border border-gray-300 hover:bg-gray-100">
              <Link2 size={15} /> Compartilhar Link
            </button>
          )}

          <button onClick={downloadTodas} className="flex items-center gap-1 px-3 py-2 rounded text-sm border border-gray-300 hover:bg-gray-100">
            <Download size={15} /> Download Todas
          </button>

          {/* ALB-11 */}
          {album.status === 'publicado' && (
            <button onClick={() => setShowProrrogar(true)} className="flex items-center gap-1 px-3 py-2 rounded text-sm border border-gray-300 hover:bg-gray-100">
              <CalendarPlus size={15} /> Prorrogar
            </button>
          )}

          {/* ALB-13 Watermark */}
          <label className="flex items-center gap-1 px-3 py-2 rounded text-sm border border-gray-300 cursor-pointer select-none">
            <Shield size={15} />
            <input type="checkbox" checked={watermark} onChange={() => setWatermark(!watermark)} className="sr-only" />
            <span className={watermark ? 'font-medium' : 'text-gray-400'}>Watermark {watermark ? 'ativo' : 'inativo'}</span>
          </label>

          <button onClick={() => setShowConfig(true)} className="flex items-center gap-1 px-3 py-2 rounded text-sm border border-gray-300 hover:bg-gray-100">
            <Settings size={15} /> Configurações
          </button>
          <button onClick={async () => { try { const r = await authFetch(`/admin/albuns/${id}/tema`); const j = await r.json(); if (j.success) setTema(j.data); } catch {} setShowTema(true); }} className="flex items-center gap-1 px-3 py-2 rounded text-sm border border-gray-300 hover:bg-gray-100">
            <Palette size={15} /> Tema
          </button>
          {album.slug && (
            <a href={`/album/${album.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-2 rounded text-sm text-white hover:opacity-90" style={{ background: ACCENT }}>
              <Eye size={15} /> Visualização do Cliente
            </a>
          )}
        </div>

        {/* Upload progress */}
        {uploading && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="h-2 rounded-full transition-all bg-blue-500" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">Enviando... {uploadProgress}%</p>
          </div>
        )}

        {/* Link público ALB-07 */}
        {album.status === 'publicado' && album.slug && (
          <p className="mt-2 text-xs text-green-700 bg-green-50 px-3 py-1 rounded inline-block">
            Link público: {window.location.origin}/album/{album.slug}
          </p>
        )}
      </header>

      {/* CORPO */}
      <div className="flex">
        {/* ALB-05 SIDEBAR GALERIAS */}
        <aside className="w-56 bg-white border-r min-h-[calc(100vh-220px)] p-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Galerias</h3>
          <ul className="space-y-1">
            {galerias.map((g, idx) => (
              <li key={g.id} className={`flex items-center gap-1 px-2 py-1.5 rounded text-sm cursor-pointer group ${galeriaAtiva === g.id ? 'bg-orange-50 font-medium' : 'hover:bg-gray-100'}`}
                onClick={() => { setGaleriaAtiva(g.id); setSelecionadas([]); }}
                onDoubleClick={() => { setRenaming(g.id); setRenameValue(g.nome); }}>
                {renaming === g.id ? (
                  <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => renomearGaleria(g.id)} onKeyDown={e => e.key === 'Enter' && renomearGaleria(g.id)}
                    className="flex-1 text-sm border rounded px-1" />
                ) : (
                  <span className="flex-1 truncate">{g.nome}</span>
                )}
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button onClick={e => { e.stopPropagation(); reordenarGaleria(idx, -1); }} className="p-0.5 hover:bg-gray-200 rounded"><ChevronUp size={12} /></button>
                  <button onClick={e => { e.stopPropagation(); reordenarGaleria(idx, 1); }} className="p-0.5 hover:bg-gray-200 rounded"><ChevronDown size={12} /></button>
                  <button onClick={e => { e.stopPropagation(); excluirGaleria(g.id); }} className="p-0.5 hover:bg-red-100 rounded text-red-500"><Trash2 size={12} /></button>
                </div>
              </li>
            ))}
          </ul>
          {showNovaGaleria ? (
            <div className="mt-2 flex gap-1">
              <input autoFocus value={novaGaleria} onChange={e => setNovaGaleria(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && criarGaleria()}
                className="flex-1 text-sm border rounded px-2 py-1" placeholder="Nome..." />
              <button onClick={criarGaleria} className="text-xs px-2 py-1 rounded text-white" style={{ backgroundColor: ACCENT }}>OK</button>
            </div>
          ) : (
            <button onClick={() => setShowNovaGaleria(true)} className="mt-2 flex items-center gap-1 text-xs hover:underline" style={{ color: ACCENT }}>
              <Plus size={13} /> Nova Galeria
            </button>
          )}
        </aside>

        {/* ALB-06 GRID DE FOTOS */}
        <main className="flex-1 p-4">
          {/* Ações em lote */}
          {selecionadas.length > 0 && (
            <div className="flex items-center gap-2 mb-3 p-2 bg-orange-50 rounded text-sm">
              <span>{selecionadas.length} selecionadas</span>
              <select onChange={e => { if (e.target.value) moverParaGaleria(e.target.value); e.target.value = ''; }}
                className="border rounded px-2 py-1 text-xs">
                <option value="">Mover para...</option>
                {galerias.filter(g => g.id !== galeriaAtiva).map(g => (
                  <option key={g.id} value={g.id}>{g.nome}</option>
                ))}
              </select>
              <button onClick={excluirSelecionadas} className="flex items-center gap-1 text-red-600 text-xs hover:underline">
                <Trash2 size={13} /> Excluir
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {fotosGaleria.map((foto, idx) => (
              <div key={foto.id} className="relative group border rounded overflow-hidden bg-white">
                <div className="relative cursor-pointer" onClick={() => setLightboxIndex(idx)}>
                  <img src={foto.thumbnail_url || foto.url} alt={foto.nome} className="w-full h-32 object-cover" />
                  {/* ALB-13 Watermark overlay */}
                  {watermark && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                      <span className="text-white/40 text-lg font-bold rotate-[-25deg] select-none">WATERMARK</span>
                    </div>
                  )}
                  {/* ALB-08 Badge seleção cliente */}
                  {foto.selecionada_cliente && (
                    <span className="absolute top-1 right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                      Selecionada
                    </span>
                  )}
                </div>
                <div className="p-1.5 flex items-center justify-between">
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={selecionadas.includes(foto.id)}
                      onChange={() => toggleSelecionada(foto.id)} className="rounded" />
                    #{idx + 1}
                  </label>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                    <button onClick={() => openEditFoto(foto)} title="Editar título/descrição"><Edit size={13} /></button>
                    <button onClick={() => downloadFoto(foto)} title="Download"><Download size={13} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {fotosGaleria.length === 0 && (
            <p className="text-center text-gray-400 mt-12">Nenhuma foto nesta galeria. Faça upload!</p>
          )}
        </main>
      </div>

      {/* ALB-12 LIGHTBOX */}
      {fotoLightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
          <button onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 text-white hover:text-gray-300"><X size={28} /></button>
          <button onClick={() => setLightboxIndex(i => Math.max(i - 1, 0))} className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300"><ChevronLeft size={32} /></button>
          <button onClick={() => setLightboxIndex(i => Math.min(i + 1, fotosGaleria.length - 1))} className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300"><ChevronRight size={32} /></button>

          <img src={fotoLightbox.url} alt={fotoLightbox.nome} className="max-h-[70vh] max-w-[90vw] object-contain rounded" />

          {/* Metadados */}
          <div className="text-white text-xs mt-3 flex gap-4">
            <span>{fotoLightbox.nome}</span>
            <span>{fotoLightbox.tamanho || '—'}</span>
            <span>{fotoLightbox.data_upload || '—'}</span>
          </div>

          {/* ALB-14 Comentários */}
          <div className="mt-4 w-full max-w-lg px-4">
            <div className="bg-white/10 rounded p-3 max-h-32 overflow-y-auto mb-2">
              {(fotoLightbox.comentarios || []).map((c, i) => (
                <div key={i} className="text-xs text-gray-200 mb-1">
                  <span className="font-medium text-white">{c.autor}:</span> {c.texto}
                </div>
              ))}
              {(!fotoLightbox.comentarios || fotoLightbox.comentarios.length === 0) && (
                <p className="text-xs text-gray-400">Nenhum comentário.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input value={comentario} onChange={e => setComentario(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && enviarComentario(fotoLightbox.id)}
                placeholder="Adicionar comentário..."
                className="flex-1 rounded px-3 py-1.5 text-sm bg-white/20 text-white placeholder-gray-300 border border-white/20" />
              <button onClick={() => enviarComentario(fotoLightbox.id)} className="px-3 py-1.5 rounded text-sm text-white" style={{ backgroundColor: ACCENT }}>
                <MessageSquare size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALB-11 Modal Prorrogar */}
      {showProrrogar && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-4">Prorrogar Álbum</h3>
            <label className="block text-sm mb-1">Nova data de expiração</label>
            <input type="date" value={prorrogarData} onChange={e => setProrrogarData(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3 text-sm" />
            <label className="block text-sm mb-1">Valor (R$)</label>
            <input type="number" value={prorrogarValor} onChange={e => setProrrogarValor(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4 text-sm" placeholder="0,00" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowProrrogar(false)} className="px-4 py-2 text-sm rounded border hover:bg-gray-50">Cancelar</button>
              <button onClick={handleProrrogar} className="px-4 py-2 text-sm rounded text-white" style={{ backgroundColor: ACCENT }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configurações do Álbum */}
      {showConfig && album && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Configurações do Álbum</h3>
              <button onClick={() => setShowConfig(false)} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Permitir download</p>
                  <p className="text-xs text-gray-500">Cliente pode baixar fotos originais</p>
                </div>
                <button onClick={async () => { await authFetch(`/admin/albuns/${id}`, { method: 'PUT', body: JSON.stringify({ permite_download: !album.permite_download }) }); fetchAlbum(); }}
                  className={`w-12 h-6 rounded-full relative transition-colors ${album.permite_download ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${album.permite_download ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Permitir seleção</p>
                  <p className="text-xs text-gray-500">Cliente pode selecionar fotos favoritas</p>
                </div>
                <button onClick={async () => { await authFetch(`/admin/albuns/${id}`, { method: 'PUT', body: JSON.stringify({ permite_selecao: !album.permite_selecao }) }); fetchAlbum(); }}
                  className={`w-12 h-6 rounded-full relative transition-colors ${album.permite_selecao ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${album.permite_selecao ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Permitir comentários</p>
                  <p className="text-xs text-gray-500">Cliente pode comentar nas fotos</p>
                </div>
                <button onClick={async () => { await authFetch(`/admin/albuns/${id}`, { method: 'PUT', body: JSON.stringify({ permite_comentarios: !album.permite_comentarios }) }); fetchAlbum(); }}
                  className={`w-12 h-6 rounded-full relative transition-colors ${album.permite_comentarios ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${album.permite_comentarios ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cota de seleção</label>
                <input type="number" defaultValue={album.cota_selecao || 0} min="0"
                  onBlur={async (e) => { await authFetch(`/admin/albuns/${id}`, { method: 'PUT', body: JSON.stringify({ cota_selecao: Number(e.target.value) }) }); fetchAlbum(); }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none" placeholder="0 = sem limite" />
                <p className="text-xs text-gray-400 mt-1">Quantas fotos o cliente pode selecionar (0 = ilimitado)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha de acesso</label>
                <input type="text" defaultValue={album.senha_acesso || ''}
                  onBlur={async (e) => { await authFetch(`/admin/albuns/${id}`, { method: 'PUT', body: JSON.stringify({ senha_acesso: e.target.value || null }) }); fetchAlbum(); }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none" placeholder="Deixe vazio para acesso livre" />
                <p className="text-xs text-gray-400 mt-1">Senha que o cliente precisa digitar para acessar</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de expiração</label>
                <input type="date" defaultValue={album.data_expiracao || ''}
                  onBlur={async (e) => { await authFetch(`/admin/albuns/${id}`, { method: 'PUT', body: JSON.stringify({ data_expiracao: e.target.value || null }) }); fetchAlbum(); }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none" />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t">
              <button onClick={() => setShowConfig(false)} className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: ACCENT }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* G2 - Modal Editar Foto (titulo/descricao) */}
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
              <input
                value={editFotoForm.titulo}
                onChange={e => setEditFotoForm(f => ({ ...f, titulo: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                placeholder="Título da foto..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={editFotoForm.descricao}
                onChange={e => setEditFotoForm(f => ({ ...f, descricao: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
                placeholder="Descrição da foto..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => setEditingFoto(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
              <button onClick={handleSaveFotoEdit} style={{ background: ACCENT }} className="px-4 py-1.5 text-sm text-white rounded-lg font-medium hover:opacity-90 transition shadow-sm">Salvar</button>
            </div>
          </div>
        </div>
      )}
      {/* G3 - Modal Tema do Álbum */}
      {showTema && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setShowTema(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4 space-y-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Palette size={18} style={{ color: ACCENT }} /> Tema do Álbum</h3>
              <button onClick={() => setShowTema(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            {/* Layout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Layout</label>
              <div className="flex flex-wrap gap-2">
                {['grade', 'mosaico', 'colagem', 'slider', 'coluna', 'ladrilhos'].map(l => (
                  <button key={l} onClick={() => setTema({ ...tema, layout: l })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${tema.layout === l ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    {l.charAt(0).toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Cores */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cores</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Fundo</label>
                  <input type="color" value={tema.cores?.fundo || '#FFFFFF'} onChange={e => setTema({ ...tema, cores: { ...tema.cores, fundo: e.target.value } })}
                    className="w-full h-9 rounded border cursor-pointer" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Texto</label>
                  <input type="color" value={tema.cores?.texto || '#1A1A1A'} onChange={e => setTema({ ...tema, cores: { ...tema.cores, texto: e.target.value } })}
                    className="w-full h-9 rounded border cursor-pointer" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Acento</label>
                  <input type="color" value={tema.cores?.acento || '#EA580C'} onChange={e => setTema({ ...tema, cores: { ...tema.cores, acento: e.target.value } })}
                    className="w-full h-9 rounded border cursor-pointer" />
                </div>
              </div>
            </div>

            {/* Fontes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fontes</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Título</label>
                  <select value={tema.fonte_titulo || 'Inter'} onChange={e => setTema({ ...tema, fonte_titulo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none">
                    <option value="Inter">Inter</option>
                    <option value="Playfair Display">Playfair Display</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Lora">Lora</option>
                    <option value="Poppins">Poppins</option>
                    <option value="Cormorant Garamond">Cormorant Garamond</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Corpo</label>
                  <select value={tema.fonte_corpo || 'Inter'} onChange={e => setTema({ ...tema, fonte_corpo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none">
                    <option value="Inter">Inter</option>
                    <option value="Open Sans">Open Sans</option>
                    <option value="Lato">Lato</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Source Sans Pro">Source Sans Pro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Animação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Animação</label>
              <select value={tema.animacao || 'none'} onChange={e => setTema({ ...tema, animacao: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none">
                <option value="none">Nenhuma</option>
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="zoom">Zoom</option>
              </select>
            </div>

            {/* Capa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Foto de Capa</label>
              {fotos.length > 0 ? (
                <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto">
                  {fotos.map(foto => (
                    <button key={foto.id || foto.SK} onClick={() => setTema({ ...tema, capa_foto_id: foto.id || foto.SK?.replace('FOTO#', '') })}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all ${(tema.capa_foto_id === (foto.id || foto.SK?.replace('FOTO#', ''))) ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200 hover:border-gray-300'}`}>
                      <img src={foto.url || foto.thumbnail_url} alt="" className="w-full h-16 object-cover" />
                      {(tema.capa_foto_id === (foto.id || foto.SK?.replace('FOTO#', ''))) && (
                        <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                          <CheckCircle2 size={16} className="text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Nenhuma foto disponível. Faça upload primeiro.</p>
              )}
            </div>

            {/* Modo da Capa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Modo da Capa</label>
              <div className="flex gap-2">
                {['cover', 'contain', 'fill'].map(m => (
                  <button key={m} onClick={() => setTema({ ...tema, capa_modo: m })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${(tema.capa_modo || 'cover') === m ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Posição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Posição do Logo</label>
              <select value={tema.logo_posicao || 'top-left'} onChange={e => setTema({ ...tema, logo_posicao: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none">
                <option value="top-left">Topo Esquerda</option>
                <option value="top-center">Topo Centro</option>
                <option value="top-right">Topo Direita</option>
                <option value="bottom-left">Rodapé Esquerda</option>
                <option value="bottom-center">Rodapé Centro</option>
                <option value="bottom-right">Rodapé Direita</option>
              </select>
            </div>

            {/* Salvar */}
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setShowTema(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={async () => {
                try {
                  await authFetch(`/admin/albuns/${id}/tema`, { method: 'PUT', body: JSON.stringify(tema) });
                  setShowTema(false);
                } catch {}
              }} style={{ background: ACCENT }} className="px-4 py-2 text-sm text-white rounded-lg font-medium hover:opacity-90">
                Salvar Tema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

