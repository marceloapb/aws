import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { GripVertical, Eye, EyeOff, Plus, Trash2, Edit2, Upload, X, Image, AlertTriangle, CheckCircle } from 'lucide-react';

const ACCENT = '#EA580C';

export default function Portfolio() {
  const { authFetch } = useAuth();
  const [categorias, setCategorias] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFotos, setLoadingFotos] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [form, setForm] = useState({ nome: '', texto: '', visivel: true });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // { total, completed, currentFile, currentPercent, errors }
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragType, setDragType] = useState(null);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCategorias = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/admin/portfolio/categorias');
      const data = await res.json();
      if (data.success) setCategorias(data.data || []);
    } catch {} finally { setLoading(false); }
  }, [authFetch]);

  const loadFotos = useCallback(async (catId) => {
    setLoadingFotos(true);
    try {
      const res = await authFetch(`/admin/portfolio/categorias/${catId}/fotos`);
      const data = await res.json();
      if (data.success) setFotos(data.data || []);
    } catch {} finally { setLoadingFotos(false); }
  }, [authFetch]);

  useEffect(() => { loadCategorias(); }, [loadCategorias]);
  useEffect(() => { if (selectedCat) loadFotos(selectedCat); }, [selectedCat, loadFotos]);

  // Category CRUD
  const handleSaveCat = async () => {
    try {
      if (editingCat) {
        await authFetch(`/admin/portfolio/categorias/${editingCat.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      } else {
        await authFetch('/admin/portfolio/categorias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, ordem: categorias.length }) });
      }
      setShowModal(false);
      setEditingCat(null);
      setForm({ nome: '', texto: '', visivel: true });
      loadCategorias();
      showToast(editingCat ? 'Categoria atualizada' : 'Categoria criada');
    } catch { showToast('Erro ao salvar', 'error'); }
  };

  const handleDeleteCat = async (id) => {
    if (!window.confirm('Excluir esta categoria e todas as fotos?')) return;
    try {
      await authFetch(`/admin/portfolio/categorias/${id}`, { method: 'DELETE' });
      if (selectedCat === id) { setSelectedCat(null); setFotos([]); }
      loadCategorias();
      showToast('Categoria excluída');
    } catch { showToast('Erro ao excluir', 'error'); }
  };

  const handleToggleVisivel = async (cat) => {
    try {
      await authFetch(`/admin/portfolio/categorias/${cat.id}/visibilidade`, { method: 'PATCH' });
      setCategorias(prev => prev.map(c => c.id === cat.id ? { ...c, visivel: !c.visivel } : c));
    } catch { showToast('Erro ao alterar visibilidade', 'error'); }
  };

  // Drag & Drop Categories
  const handleCatDragStart = (e, idx) => { setDragIndex(idx); setDragType('cat'); e.dataTransfer.effectAllowed = 'move'; };
  const handleCatDragOver = (e, idx) => { e.preventDefault(); setDragOverIndex(idx); };
  const handleCatDrop = async (e, idx) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) { setDragIndex(null); setDragOverIndex(null); return; }
    const items = [...categorias];
    const [moved] = items.splice(dragIndex, 1);
    items.splice(idx, 0, moved);
    setCategorias(items);
    setDragIndex(null); setDragOverIndex(null); setDragType(null);
    try {
      await authFetch('/admin/portfolio/categorias/ordem', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items.map((c, i) => ({ id: c.id, ordem: i }))) });
    } catch { loadCategorias(); showToast('Erro ao reordenar', 'error'); }
  };

  // Drag & Drop Fotos
  const handleFotoDragStart = (e, idx) => { setDragIndex(idx); setDragType('foto'); e.dataTransfer.effectAllowed = 'move'; };
  const handleFotoDragOver = (e, idx) => { e.preventDefault(); setDragOverIndex(idx); };
  const handleFotoDrop = async (e, idx) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) { setDragIndex(null); setDragOverIndex(null); return; }
    const items = [...fotos];
    const [moved] = items.splice(dragIndex, 1);
    items.splice(idx, 0, moved);
    setFotos(items);
    setDragIndex(null); setDragOverIndex(null); setDragType(null);
    try {
      await authFetch(`/admin/portfolio/categorias/${selectedCat}/fotos/ordem`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items.map((f, i) => ({ id: f.id, ordem: i }))) });
    } catch { loadFotos(selectedCat); showToast('Erro ao reordenar fotos', 'error'); }
  };

  // Upload with progress tracking via XMLHttpRequest
  const uploadFileWithProgress = (url, file, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed with status ${xhr.status}`));
      });
      xhr.addEventListener('error', () => reject(new Error('Upload network error')));
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));
      xhr.send(file);
    });
  };

  const handleUpload = async (files) => {
    if (!selectedCat || !files.length) return;
    setUploading(true);
    setUploadProgress({ total: files.length, completed: 0, currentFile: '', currentPercent: 0, errors: [] });
    const errors = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => ({ ...prev, completed: i, currentFile: file.name, currentPercent: 0 }));

        // 1. Get presigned URL
        const res = await authFetch('/admin/portfolio/fotos/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoria_id: selectedCat, filename: file.name, content_type: file.type, size_bytes: file.size }) });
        const data = await res.json();
        if (!data.success) { errors.push(file.name); showToast(`Erro: ${data.message}`, 'error'); continue; }

        // 2. Upload to S3 with progress
        await uploadFileWithProgress(data.data.upload_url, file, (percent) => {
          setUploadProgress(prev => ({ ...prev, currentPercent: percent }));
        });

        // 3. Confirm upload
        await authFetch('/admin/portfolio/fotos/confirmar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ foto_id: data.data.foto_id, categoria_id: selectedCat, key: data.data.key }) });

        setUploadProgress(prev => ({ ...prev, completed: i + 1, currentPercent: 100 }));
      }
      const successCount = files.length - errors.length;
      if (successCount > 0) showToast(`${successCount} foto(s) enviada(s)`);
      loadFotos(selectedCat);
    } catch { showToast('Erro no upload', 'error'); }
    finally { setUploading(false); setTimeout(() => setUploadProgress(null), 2000); }
  };

  const handleDeleteFoto = async (fotoId) => {
    if (!window.confirm('Excluir esta foto?')) return;
    try {
      await authFetch(`/admin/portfolio/fotos/${fotoId}`, { method: 'DELETE' });
      setFotos(prev => prev.filter(f => f.id !== fotoId));
      showToast('Foto excluída');
    } catch { showToast('Erro ao excluir foto', 'error'); }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Portfólio</h1>
          <p className="text-sm text-gray-500">{categorias.length} categoria{categorias.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditingCat(null); setForm({ nome: '', texto: '', visivel: true }); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: ACCENT }}>
          <Plus size={16} /> Nova Categoria
        </button>
      </div>

      {/* Categories */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : categorias.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Image size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">Nenhuma categoria criada</p>
          <p className="text-xs text-gray-400 mt-1">Crie categorias para organizar seu portfólio</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categorias.map((cat, idx) => (
            <div key={cat.id}
              draggable onDragStart={(e) => handleCatDragStart(e, idx)} onDragOver={(e) => handleCatDragOver(e, idx)}
              onDrop={(e) => handleCatDrop(e, idx)} onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
              className={`flex items-center gap-3 p-4 rounded-xl border bg-white transition-all cursor-pointer
                ${selectedCat === cat.id ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-200 hover:border-gray-300'}
                ${!cat.visivel ? 'opacity-50' : ''}
                ${dragType === 'cat' && dragOverIndex === idx ? 'border-dashed border-2 border-orange-400' : ''}
                ${dragType === 'cat' && dragIndex === idx ? 'opacity-30' : ''}`}
              onClick={() => setSelectedCat(cat.id === selectedCat ? null : cat.id)}
            >
              <GripVertical size={16} className="text-gray-400 cursor-grab shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{cat.nome}</p>
                  {!cat.visivel && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-stone-100 text-stone-500 rounded">Oculta</span>}
                </div>
                {cat.texto && <p className="text-xs text-gray-500 truncate mt-0.5">{cat.texto}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => handleToggleVisivel(cat)} className="p-1.5 rounded-lg hover:bg-gray-100" title={cat.visivel ? 'Ocultar' : 'Mostrar'}>
                  {cat.visivel ? <Eye size={14} className="text-gray-500" /> : <EyeOff size={14} className="text-gray-400" />}
                </button>
                <button onClick={() => { setEditingCat(cat); setForm({ nome: cat.nome, texto: cat.texto || '', visivel: cat.visivel }); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <Edit2 size={14} className="text-gray-500" />
                </button>
                <button onClick={() => handleDeleteCat(cat.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photos Section */}
      {selectedCat && (
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Fotos — {categorias.find(c => c.id === selectedCat)?.nome}</h2>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              <Upload size={14} /> {uploading ? 'Enviando...' : 'Upload'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
              onChange={(e) => handleUpload(Array.from(e.target.files))} />
          </div>

          {/* Upload Progress Bar */}
          {uploadProgress && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload size={16} className="text-orange-500 animate-pulse" />
                  <span className="text-sm font-medium text-gray-700">
                    {uploadProgress.completed < uploadProgress.total
                      ? `Enviando foto ${uploadProgress.completed + 1} de ${uploadProgress.total}...`
                      : `${uploadProgress.total} foto(s) enviada(s)!`}
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-500">
                  {uploadProgress.completed < uploadProgress.total
                    ? `${uploadProgress.currentPercent}%`
                    : <CheckCircle size={16} className="text-green-500" />}
                </span>
              </div>

              {/* Overall progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${Math.round(((uploadProgress.completed + (uploadProgress.currentPercent / 100)) / uploadProgress.total) * 100)}%`,
                    background: uploadProgress.completed === uploadProgress.total ? '#16a34a' : ACCENT
                  }}
                />
              </div>

              {/* Current file name */}
              {uploadProgress.completed < uploadProgress.total && uploadProgress.currentFile && (
                <p className="text-xs text-gray-400 truncate">
                  Arquivo: {uploadProgress.currentFile}
                </p>
              )}
            </div>
          )}

          {loadingFotos ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <div key={i} className="aspect-square bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : fotos.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <Upload size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Nenhuma foto nesta categoria</p>
              <p className="text-xs text-gray-400 mt-1">Faça upload de imagens para começar</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {fotos.map((foto, idx) => (
                <div key={foto.id} draggable
                  onDragStart={(e) => handleFotoDragStart(e, idx)} onDragOver={(e) => handleFotoDragOver(e, idx)}
                  onDrop={(e) => handleFotoDrop(e, idx)} onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                  className={`relative aspect-square rounded-lg overflow-hidden border bg-gray-100 group
                    ${dragType === 'foto' && dragOverIndex === idx ? 'border-dashed border-2 border-orange-400' : 'border-gray-200'}
                    ${dragType === 'foto' && dragIndex === idx ? 'opacity-30' : ''}`}
                >
                  {foto.url_thumb || foto.url_web ? (
                    <img src={foto.url_thumb || foto.url_web} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image size={24} className="text-gray-300" />
                    </div>
                  )}
                  {/* Status badge */}
                  {foto.status !== 'pronta' && (
                    <span className={`absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-medium rounded ${foto.status === 'processando' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {foto.status === 'processando' ? 'Processando' : 'Erro'}
                    </span>
                  )}
                  {/* Delete overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => handleDeleteFoto(foto.id)} className="p-2 bg-white/90 rounded-full hover:bg-white">
                      <Trash2 size={14} className="text-red-600" />
                    </button>
                  </div>
                  {/* Drag handle */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical size={14} className="text-white drop-shadow cursor-grab" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Categoria */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editingCat ? 'Editar Categoria' : 'Nova Categoria'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} maxLength={100}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" placeholder="Ex: Casamentos" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} maxLength={500} rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none resize-none" placeholder="Breve descrição..." />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Visível no site</span>
                <button type="button" onClick={() => setForm({ ...form, visivel: !form.visivel })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${form.visivel ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${form.visivel ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSaveCat} disabled={!form.nome.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ background: ACCENT }}>
                {editingCat ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
