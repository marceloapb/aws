import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import RichTextEditor from '../../components/ui/RichTextEditor';
import {
  ArrowLeft, Save, Send, Upload, Image, Loader2, X, Clock,
  Tag, Plus, Eye, Zap
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
  const [showPreview, setShowPreview] = useState(false);

  // Categorias
  const [categorias, setCategorias] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [showNewCategoria, setShowNewCategoria] = useState(false);
  const [newCatNome, setNewCatNome] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  const [form, setForm] = useState({
    titulo: '',
    resumo: '',
    corpo_html: '',
    capa_url: '',
    categoria: '',
    status: 'rascunho',
  });

  const [errors, setErrors] = useState({});

  // IA
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiNecessidade, setAiNecessidade] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Load categorias
  useEffect(() => {
    loadCategorias();
  }, []);

  // Load post data when editing
  useEffect(() => {
    if (isEditing) {
      loadPost();
    }
  }, [id]);

  const loadCategorias = async () => {
    try {
      setLoadingCategorias(true);
      const res = await authFetch('/admin/novidades/categorias');
      const json = await res.json();
      if (res.ok) {
        setCategorias(json.data || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingCategorias(false);
    }
  };

  const createCategoria = async () => {
    if (!newCatNome.trim()) return;
    try {
      setCreatingCat(true);
      const res = await authFetch('/admin/novidades/categorias', {
        method: 'POST',
        body: JSON.stringify({ nome: newCatNome.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setCategorias(prev => [...prev, json.data]);
        handleChange('categoria', json.data.nome);
        setNewCatNome('');
        setShowNewCategoria(false);
        toast.success('Categoria criada!');
      } else {
        toast.error(json.message || 'Erro ao criar categoria');
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setCreatingCat(false);
    }
  };

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
          categoria: post.categoria || '',
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

  // Cover image upload
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }

    try {
      setUploading(true);
      const url = await uploadImage(file);
      if (url) {
        handleChange('capa_url', url);
        toast.success('Imagem de capa enviada!');
      }
    } catch {
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Generic image upload — returns CDN URL
  const uploadImage = useCallback(async (file) => {
    const uploadRes = await authFetch('/admin/novidades/imagens/upload', {
      method: 'POST',
      body: JSON.stringify({
        post_id: id || 'novo',
        filename: file.name,
        content_type: file.type,
        size: file.size,
      }),
    });
    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      toast.error(uploadData.message || 'Erro ao iniciar upload');
      return null;
    }

    const { upload_url, cdn_url } = uploadData.data || uploadData;

    // PUT file to presigned URL
    const putRes = await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!putRes.ok) {
      toast.error('Erro ao enviar imagem para o servidor');
      return null;
    }

    return cdn_url;
  }, [authFetch, id, toast]);

  // Inline image upload for the rich editor
  const handleInlineImageUpload = useCallback(async (file) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 10MB');
      return null;
    }
    return await uploadImage(file);
  }, [uploadImage, toast]);

  // AI content generation
  const handleAiGenerate = async () => {
    if (!aiNecessidade.trim()) {
      toast.error('Descreva o que você precisa');
      return;
    }

    try {
      setAiGenerating(true);
      const res = await authFetch('/admin/novidades/gerar-conteudo', {
        method: 'POST',
        body: JSON.stringify({
          necessidade: aiNecessidade.trim(),
          prompt_agente: aiPrompt.trim() || undefined,
        }),
      });
      const json = await res.json();

      if (res.ok && json.data) {
        const { titulo, resumo, corpo_html } = json.data;

        // Preencher campos se estiverem vazios (ou perguntar se quer substituir)
        if (titulo && !form.titulo) {
          handleChange('titulo', titulo);
        }
        if (resumo && !form.resumo) {
          handleChange('resumo', resumo);
        }
        if (corpo_html) {
          // Append ou substituir baseado se já tem conteúdo
          if (form.corpo_html.trim()) {
            handleChange('corpo_html', form.corpo_html + '\n' + corpo_html);
          } else {
            handleChange('corpo_html', corpo_html);
          }
        }

        toast.success('Conteúdo gerado pela IA! Revise e ajuste conforme necessário.');
        setShowAiModal(false);
        setAiNecessidade('');
      } else {
        toast.error(json.message || 'Erro ao gerar conteúdo');
      }
    } catch {
      toast.error('Erro de conexão com a IA');
    } finally {
      setAiGenerating(false);
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
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
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
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={12} />
              Salvo às {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => setShowAiModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-sm transition-all"
            title="Gerar conteúdo com IA"
          >
            <Zap size={14} />
            <span className="hidden sm:inline">IA</span>
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`p-2 rounded-lg transition-colors ${showPreview ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
            title="Pré-visualizar"
          >
            <Eye size={18} />
          </button>
        </div>
      </div>

      {/* AI Generation Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !aiGenerating && setShowAiModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500">
                  <Zap size={16} className="text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Assistente IA</h2>
              </div>
              <button
                onClick={() => !aiGenerating && setShowAiModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-5">
              {/* Campo: Necessidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  O que você precisa? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={aiNecessidade}
                  onChange={(e) => setAiNecessidade(e.target.value)}
                  rows={3}
                  placeholder="Ex: Um post sobre formas de entrega das fotografias, explicando a galeria digital online e a opção de pendrive personalizado..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-transparent resize-none placeholder-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">Descreva o tema, assunto e o que quer comunicar no post.</p>
              </div>

              {/* Campo: Prompt do agente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Instruções para a IA <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={4}
                  placeholder="Ex: Você é um fotógrafo profissional que escreve de forma pessoal e acolhedora. Use linguagem simples, direta e com exemplos práticos. Inclua seções com subtítulos..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-transparent resize-none placeholder-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Defina o tom, estilo e formato. Se vazio, usa o padrão do sistema.
                </p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => { setShowAiModal(false); }}
                disabled={aiGenerating}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAiGenerate}
                disabled={aiGenerating || !aiNecessidade.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    Gerar Conteúdo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content area - two columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Left: Main editor */}
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
              <span className="ml-2 text-xs font-normal text-gray-400">(exibido na listagem)</span>
            </label>
            <textarea
              value={form.resumo}
              onChange={(e) => handleChange('resumo', e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Breve descrição do post..."
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

          {/* Conteúdo - Editor WYSIWYG */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conteúdo
            </label>
            {showPreview ? (
              <div className="border border-gray-200 rounded-lg p-6 min-h-[400px] bg-white">
                <div
                  className="prose prose-sm max-w-none text-gray-800
                    prose-headings:text-gray-900 prose-strong:text-gray-900
                    prose-a:text-[#EA580C] prose-a:no-underline hover:prose-a:underline
                    prose-img:rounded-xl prose-blockquote:border-[#EA580C]
                    prose-p:leading-relaxed prose-li:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: form.corpo_html }}
                />
                {!form.corpo_html && (
                  <p className="text-gray-400 text-sm italic">Nenhum conteúdo para pré-visualizar.</p>
                )}
              </div>
            ) : (
              <RichTextEditor
                value={form.corpo_html}
                onChange={(html) => handleChange('corpo_html', html)}
                onImageUpload={handleInlineImageUpload}
                placeholder="Escreva o conteúdo do post. Use a toolbar para formatar texto, inserir imagens, links..."
                minHeight="400px"
              />
            )}
          </div>
        </div>

        {/* Right: Sidebar (cover image, categoria, actions) */}
        <div className="space-y-6">
          {/* Capa */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagem de Capa
            </label>
            {form.capa_url ? (
              <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <img
                  src={form.capa_url}
                  alt="Capa"
                  className="w-full h-40 object-cover"
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
                className="w-full h-32 rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-300 flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 size={20} className="animate-spin text-gray-400" />
                    <span className="text-xs text-gray-500">Enviando...</span>
                  </>
                ) : (
                  <>
                    <Upload size={20} className="text-gray-400" />
                    <span className="text-xs text-gray-500">Clique para enviar</span>
                    <span className="text-xs text-gray-400">JPG, PNG, WebP • Máx 5MB</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />
          </div>

          {/* Categoria */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <Tag size={14} className="text-gray-500" />
              Categoria
            </label>
            {loadingCategorias ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 size={14} className="animate-spin text-gray-400" />
                <span className="text-xs text-gray-400">Carregando...</span>
              </div>
            ) : (
              <>
                <select
                  value={form.categoria}
                  onChange={(e) => handleChange('categoria', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-transparent"
                >
                  <option value="">Sem categoria</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                  ))}
                </select>

                {/* Create new category */}
                {!showNewCategoria ? (
                  <button
                    onClick={() => setShowNewCategoria(true)}
                    className="mt-2 flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
                  >
                    <Plus size={12} />
                    Nova categoria
                  </button>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newCatNome}
                      onChange={(e) => setNewCatNome(e.target.value)}
                      placeholder="Nome da categoria"
                      maxLength={100}
                      className="flex-1 px-2.5 py-1.5 rounded border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-orange-200"
                      onKeyDown={(e) => e.key === 'Enter' && createCategoria()}
                    />
                    <button
                      onClick={createCategoria}
                      disabled={creatingCat || !newCatNome.trim()}
                      className="px-2.5 py-1.5 rounded text-xs font-medium text-white disabled:opacity-50"
                      style={{ backgroundColor: ACCENT }}
                    >
                      {creatingCat ? '...' : 'Criar'}
                    </button>
                    <button
                      onClick={() => { setShowNewCategoria(false); setNewCatNome(''); }}
                      className="px-2 py-1.5 rounded text-xs text-gray-500 hover:text-gray-700"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Status info */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              form.status === 'publicado'
                ? 'text-green-700 bg-green-50 border-green-200'
                : 'text-yellow-700 bg-yellow-50 border-yellow-200'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                form.status === 'publicado' ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              {form.status === 'publicado' ? 'Publicado' : 'Rascunho'}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <button
              onClick={() => handleSave('publicado')}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
              style={{ backgroundColor: ACCENT }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Publicar
            </button>

            <button
              onClick={() => handleSave('rascunho')}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar Rascunho
            </button>

            <button
              onClick={() => navigate('/admin/novidades')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
