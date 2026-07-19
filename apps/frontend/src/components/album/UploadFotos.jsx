import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, FileImage, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';

const ACCENT = '#EA580C';
const MAX_FILE_SIZE = 30 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PARALLEL = 3;

const STATUS_ICONS = { pending: FileImage, uploading: Loader2, done: CheckCircle2, error: AlertCircle };
const STATUS_COLORS = { pending: 'text-gray-400', uploading: 'text-orange-500', done: 'text-green-500', error: 'text-red-500' };

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadFotos({ albumId, onComplete }) {
  const { authFetch } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef(null);
  const abortControllersRef = useRef({});

  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) return `Tipo não suportado: ${file.type}`;
    if (file.size > MAX_FILE_SIZE) return `Arquivo excede 30MB (${formatSize(file.size)})`;
    return null;
  };

  const addFiles = useCallback((newFiles) => {
    const entries = Array.from(newFiles).map((file) => {
      const error = validateFile(file);
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file, name: file.name, size: file.size,
        status: error ? 'error' : 'pending', progress: 0, error,
      };
    });
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); };
  const handleFileSelect = (e) => { if (e.target.files.length) { addFiles(e.target.files); e.target.value = ''; } };

  const removeFile = (fileId) => {
    if (abortControllersRef.current[fileId]) { abortControllersRef.current[fileId].abort(); delete abortControllersRef.current[fileId]; }
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const uploadSingleFile = async (fileEntry, presignedUrl) => {
    const controller = new AbortController();
    abortControllersRef.current[fileEntry.id] = controller;
    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setFiles((prev) => prev.map((f) => (f.id === fileEntry.id ? { ...f, progress } : f)));
          }
        });
        xhr.addEventListener('load', () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error(`HTTP ${xhr.status}`)); });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Cancelled')));
        controller.signal.addEventListener('abort', () => xhr.abort());
        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', fileEntry.file.type);
        xhr.send(fileEntry.file);
      });
      setFiles((prev) => prev.map((f) => (f.id === fileEntry.id ? { ...f, status: 'done', progress: 100 } : f)));
    } catch (err) {
      if (err.message === 'Cancelled') return;
      setFiles((prev) => prev.map((f) => f.id === fileEntry.id ? { ...f, status: 'error', error: err.message } : f));
    } finally {
      delete abortControllersRef.current[fileEntry.id];
    }
  };

  const startUpload = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (!pendingFiles.length) return;
    setIsUploading(true);
    setFiles((prev) => prev.map((f) => (f.status === 'pending' ? { ...f, status: 'uploading' } : f)));

    try {
      const res = await authFetch(`/admin/albuns/${albumId}/upload-urls`, {
        method: 'POST',
        body: JSON.stringify({ arquivos: pendingFiles.map((f) => ({ nome: f.name, tipo: f.file.type, tamanho: f.size })) }),
      });
      if (!res.ok) throw new Error('Falha ao obter URLs de upload');
      const { urls } = await res.json();

      const queue = pendingFiles.map((file, idx) => ({ fileEntry: file, url: urls[idx]?.url || urls[idx] }));
      for (let i = 0; i < queue.length; i += MAX_PARALLEL) {
        const batch = queue.slice(i, i + MAX_PARALLEL);
        await Promise.allSettled(batch.map(({ fileEntry, url }) => uploadSingleFile(fileEntry, url)));
      }

      await authFetch(`/admin/albuns/${albumId}/fotos/confirmar-batch`, {
        method: 'POST',
        body: JSON.stringify({ arquivos: pendingFiles.map((f) => f.name) }),
      });

      toast.success('Upload concluído com sucesso!');
      onComplete?.();
    } catch (err) {
      toast.error(err.message || 'Erro durante o upload');
      setFiles((prev) => prev.map((f) => f.status === 'uploading' ? { ...f, status: 'error', error: 'Upload interrompido' } : f));
    } finally {
      setIsUploading(false);
    }
  };

  const overallProgress = files.length ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length) : 0;
  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const doneCount = files.filter((f) => f.status === 'done').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${dragOver ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}
      >
        <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_TYPES.join(',')} onChange={handleFileSelect} className="hidden" />
        <Upload size={40} className={`mx-auto mb-3 ${dragOver ? 'text-orange-500' : 'text-gray-400'}`} />
        <p className="text-sm font-medium text-gray-700">Arraste fotos aqui ou <span style={{ color: ACCENT }}>clique para selecionar</span></p>
        <p className="text-xs text-gray-500 mt-1">JPG, PNG ou WebP • Máximo 30MB por arquivo</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {isUploading && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1"><span>Progresso geral</span><span>{overallProgress}%</span></div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-300" style={{ width: `${overallProgress}%`, backgroundColor: ACCENT }} /></div>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>{files.length} arquivo(s){doneCount > 0 && <span className="text-green-600 ml-2">✓ {doneCount}</span>}{errorCount > 0 && <span className="text-red-600 ml-2">✗ {errorCount}</span>}</span>
            {doneCount > 0 && <button onClick={() => setFiles((p) => p.filter((f) => f.status !== 'done'))} className="text-gray-400 hover:text-gray-600">Limpar concluídos</button>}
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {files.map((f) => {
              const Icon = STATUS_ICONS[f.status];
              return (
                <div key={f.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                  <Icon size={16} className={`flex-shrink-0 ${STATUS_COLORS[f.status]} ${f.status === 'uploading' ? 'animate-spin' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{f.name}</p>
                    <div className="flex items-center gap-2"><span className="text-xs text-gray-400">{formatSize(f.size)}</span>{f.error && <span className="text-xs text-red-500">{f.error}</span>}</div>
                    {f.status === 'uploading' && <div className="h-1 bg-gray-200 rounded-full mt-1 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${f.progress}%`, backgroundColor: ACCENT }} /></div>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeFile(f.id); }} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600" title="Remover"><X size={14} /></button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button onClick={startUpload} disabled={isUploading || pendingCount === 0} className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90" style={{ backgroundColor: ACCENT }}>
              {isUploading ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Enviando...</span> : `Enviar ${pendingCount} arquivo(s)`}
            </button>
            {!isUploading && files.length > 0 && <button onClick={() => setFiles([])} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all">Limpar tudo</button>}
          </div>
        </div>
      )}
    </div>
  );
}
