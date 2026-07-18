import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import {
  ArrowLeft, Save, Send, Upload, Image, Loader2, X, Clock
} from 'lucide-react';

const ACCENT = '#EA580C';

export default function NovidadesEditor() {
  const { id } = useParams();
  const isEditing = !!id;
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const [form, setForm] = useState({
    titulo: '',
    resumo: '',
    corpo_html: '',
    capa_url: '',
    status: 'rascunho',
  });

  const [errors, setErrors] = useState({});

  // Load post data when editing
  useEffect(() => {
    if (isEditing) {
      loadPost();
    }
  }, [id]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`/admin/novidades/${id}`);
      const json = await res.json();
      if (res.ok) {
        const post = json.data || json;
        setForm({
          titulo: post.titulo || '',
          resumo: post.resumo || '',
          corpo_html: post.corpo_html || '',
          capa_url: post.capa_url || '',
          status: post.status || 'rascunho',
        });
      } else {
        toast.error(json.message || 'Erro ao carregar post');
        navigate('/admin/novidades');
      }
    } catch {
      toast.error('Erro de conexão');
      navigate('/admin/novidades');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.titulo.trim()) errs.titulo = 'Título é obrigatório';
    else if (form.titulo.length > 150) errs.titulo = 'Máximo de 150 caracteres';
    if (form.resumo.length > 300) errs.resumo = 'Máximo de 300 caracteres';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }

    try {
      setUploading(true);

      // Get presigned URL
      const uploadRes = await authFetch('/admin/novidades/imagens/upload', {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
        }),
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        toast.error(uploadData.message || 'Erro ao iniciar upload');
        return;
      }

      const { upload_url, cdn_url } = uploadData;

      // PUT file to presigned URL
      const putRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!putRes.ok) {
        toast.error('Erro ao enviar imagem');
        return;
      }

      handleChange('capa_url', cdn_url);
      toast.success('Imagem enviada com sucesso');
    } catch {
      toast.error('Erro de conexão ao enviar imagem');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save post
  const handleSave = async (status) => {
    if (!validate()) return;

    try {
      setSaving(true);
      const payload = { ...form, status };

      let res;
      if (isEditing) {
        res = await authFetch(`/admin/novidades/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await authFetch('/admin/novidades', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();

      if (res.ok) {
        const msg = status === 'publicado'
          ? 'Post publicado com sucesso!'
          : 'Rascunho salvo com sucesso!';
        toast.success(msg);
        setLastSaved(new Date());
        navigate('/admin/novidades');
      } else {
        toast.error(json.message || 'Erro ao salvar post');
      }
    } catch {
      toast.error('Erro de conexão ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/novidades')}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Post' : 'Novo Post'}
          </h1>
        </div>
        {lastSaved && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock size={12} />
            Salvo às {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.titulo}
            onChange={(e) => handleChange('titulo', e.target.value)}
            maxLength={150}
            placeholder="Título do post"
            className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
              errors.titulo ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-orange-200'
            }`}
          />
          <div className="flex items-center justify-between mt-1">
            {errors.titulo && <p className="text-xs text-red-500">{errors.titulo}</p>}
            <p className="text-xs text-gray-400 ml-auto">{form.titulo.length}/150</p>
          </div>
        </div>

        {/* Resumo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resumo
          </label>
          <textarea
            value={form.resumo}
            onChange={(e) => handleChange('resumo', e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Breve descrição do post (exibido na listagem)"
            className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none transition-colors ${
              errors.resumo ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-orange-200'
            }`}
          />
          <div className="flex items-center justify-between mt-1">
            {errors.resumo && <p className="text-xs text-red-500">{errors.resumo}</p>}
            <p className={`text-xs ml-auto ${form.resumo.length > 280 ? 'text-orange-500' : 'text-gray-400'}`}>
              {form.resumo.length}/300
            </p>
          </div>
        </div>

        {/* Capa */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Imagem de Capa
          </label>
          {form.capa_url ? (
            <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <img
                src={form.capa_url}
                alt="Capa"
                className="w-full h-48 object-cover"
              />
              <button
                onClick={() => handleChange('capa_url', '')}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                title="Remover imagem"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-40 rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-300 flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 size={24} className="animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">Enviando...</span>
                </>
              ) : (
                <>
                  <Upload size={24} className="text-gray-400" />
                  <span className="text-sm text-gray-500">Clique para enviar imagem de capa</span>
                  <span className="text-xs text-gray-400">JPG, PNG ou WebP • Máximo 5MB</span>
                </>
              )}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Corpo HTML */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Conteúdo
            <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              Suporta HTML
            </span>
          </label>
          <textarea
            value={form.corpo_html}
            onChange={(e) => handleChange('corpo_html', e.target.value)}
            placeholder="<h2>Subtítulo</h2>\n<p>Escreva o conteúdo do post aqui...</p>"
            className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-transparent resize-y min-h-[400px] transition-colors"
            style={{ minHeight: '400px' }}
          />
          <p className="text-xs text-gray-400 mt-1">
            Use tags HTML para formatar: &lt;h2&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;img&gt;, etc.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={() => navigate('/admin/novidades')}
            className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors order-3 sm:order-1"
          >
            <span className="flex items-center justify-center gap-2">
              <ArrowLeft size={16} />
              Voltar
            </span>
          </button>

          <div className="flex-1 order-1 sm:order-2" />

          <button
            onClick={() => handleSave('rascunho')}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors order-2 sm:order-3"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar como Rascunho
          </button>

          <button
            onClick={() => handleSave('publicado')}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm order-1 sm:order-4"
            style={{ backgroundColor: ACCENT }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Publicar
          </button>
        </div>
      </div>
    </div>
  );
}
