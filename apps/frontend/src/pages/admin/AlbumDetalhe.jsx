import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Upload, Globe, Lock, Trash2, Image } from 'lucide-react';

const ACCENT = '#EA580C';

export default function AlbumDetalhe() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadAlbum(); }, [id]);

  const loadAlbum = async () => {
    try {
      const res = await authFetch(`/admin/albuns/${id}`);
      const json = await res.json();
      if (json.success) {
        setAlbum(json.data);
        setFotos(json.data.fotos || []);
      }
    } catch {}
    setLoading(false);
  };

  const handlePublicar = async () => {
    await authFetch(`/admin/albuns/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'publicado', publicado_em: new Date().toISOString() }) });
    loadAlbum();
  };

  const handleUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      setUploading(true);
      for (const file of e.target.files) {
        try {
          const res = await authFetch('/admin/fotos/upload-url', {
            method: 'POST',
            body: JSON.stringify({ albumId: id, contentType: file.type }),
          });
          const json = await res.json();
          if (json.success && json.data?.uploadUrl) {
            await fetch(json.data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
          }
        } catch (err) { console.error('Upload failed:', err); }
      }
      setUploading(false);
      loadAlbum();
    };
    input.click();
  };

  const handleDeleteFoto = async (fotoId) => {
    if (!window.confirm('Excluir esta foto?')) return;
    await authFetch(`/admin/fotos/${fotoId}`, { method: 'DELETE' });
    loadAlbum();
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;
  if (!album) return <div className="text-center py-20 text-gray-400">Álbum não encontrado</div>;

  return (
    <div>
      <button onClick={() => navigate('/admin/albuns')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{album.titulo || 'Álbum'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${album.status === 'publicado' ? 'bg-green-50 text-green-700' : album.status === 'expirado' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
              {album.status || 'rascunho'}
            </span>
            <span className="text-sm text-gray-500">{fotos.length} fotos</span>
            {album.data_expiracao && <span className="text-sm text-gray-400">• Expira: {new Date(album.data_expiracao).toLocaleDateString('pt-BR')}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleUpload} disabled={uploading}
            className="inline-flex items-center gap-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
            <Upload size={14} /> {uploading ? 'Enviando...' : 'Upload Fotos'}
          </button>
          {album.status !== 'publicado' && (
            <button onClick={handlePublicar} style={{ background: ACCENT }}
              className="inline-flex items-center gap-1 px-4 py-2 text-white rounded-lg text-sm hover:opacity-90">
              <Globe size={14} /> Publicar
            </button>
          )}
        </div>
      </div>

      {/* Galeria */}
      {fotos.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <Image size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">Nenhuma foto neste álbum</p>
          <button onClick={handleUpload} style={{ color: ACCENT }} className="text-sm font-medium">
            Fazer upload de fotos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {fotos.map((foto, i) => (
            <div key={foto.id || i} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border">
              <img src={foto.url || foto.url_thumb || ''} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <button onClick={() => handleDeleteFoto(foto.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 bg-white rounded-full shadow transition-opacity">
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>
              <span className="absolute bottom-1 right-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">{i + 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
