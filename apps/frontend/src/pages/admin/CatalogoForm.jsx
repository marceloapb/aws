import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Package, ExternalLink, Upload, X, Image } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#EA580C';

export default function CatalogoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { authFetch } = useAuth();
  const isEditing = !!id && id !== 'novo';

  const [categorias, setCategorias] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const [form, setForm] = useState({
    nome: '',
    tipo: 'servico_principal',
    categoria_id: '',
    descricao: '',
    valor_base: '',
    duracao_base: '',
    valor_hora_adicional: '',
    quantidade_estoque: '',
    exibir_ao_cliente: true,
    ativo: true,
    // Campos fornecedor/precificação (SPEC-CAT-001)
    fornecedor_nome: '',
    fornecedor_link: '',
    nome_no_fornecedor: '',
    preco_custo: '',
    frete: '',
    outros_custos: '',
    margem_percentual: '',
    valor_base_override: '',
    usar_override: false,
    fotos_exemplo: [],
  });

  useEffect(() => {
    // Carregar categorias
    authFetch('/admin/catalogo?tipo=categorias')
      .then(r => r.json())
      .then(d => { if (d.success) setCategorias(d.data || []); })
      .catch(console.error);

    // Se editando, carregar item
    if (isEditing) {
      setLoading(true);
      authFetch(`/admin/catalogo/${id}`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data) {
            setForm({
              nome: d.data.nome || '',
              tipo: d.data.tipo || 'servico_principal',
              categoria_id: d.data.categoria_id || '',
              descricao: d.data.descricao || '',
              valor_base: d.data.valor_base || '',
              duracao_base: d.data.duracao_base || '',
              valor_hora_adicional: d.data.valor_hora_adicional || '',
              quantidade_estoque: d.data.quantidade_estoque || '',
              exibir_ao_cliente: d.data.exibir_ao_cliente ?? true,
              ativo: d.data.ativo ?? true,
              fornecedor_nome: d.data.fornecedor_nome || '',
              fornecedor_link: d.data.fornecedor_link || '',
              nome_no_fornecedor: d.data.nome_no_fornecedor || '',
              preco_custo: d.data.preco_custo ?? '',
              frete: d.data.frete ?? '',
              outros_custos: d.data.outros_custos ?? '',
              margem_percentual: d.data.margem_percentual ?? '',
              valor_base_override: d.data.valor_base_override ?? '',
              usar_override: d.data.valor_base_override != null,
              fotos_exemplo: d.data.fotos_exemplo || [],
            });
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Verificar se bloco de fornecedor deve aparecer
  const categoriaSelecionada = useMemo(() => {
    return categorias.find(c => c.id === form.categoria_id);
  }, [categorias, form.categoria_id]);

  const mostrarFornecedor = form.tipo === 'produto' && categoriaSelecionada?.tem_fornecedor === true;

  // Cálculo em tempo real do preço final
  const precoCalculado = useMemo(() => {
    if (!mostrarFornecedor) return null;
    const custo = Number(form.preco_custo) || 0;
    const frete = Number(form.frete) || 0;
    const outros = Number(form.outros_custos) || 0;
    const margem = Number(form.margem_percentual) || 0;
    if (custo === 0 && frete === 0) return 0;
    const custoTotal = custo + frete + outros;
    return Math.round(custoTotal * (1 + margem / 100));
  }, [mostrarFornecedor, form.preco_custo, form.frete, form.outros_custos, form.margem_percentual]);

  const precoFinalEfetivo = useMemo(() => {
    if (!mostrarFornecedor) return null;
    if (form.usar_override && form.valor_base_override) {
      return Number(form.valor_base_override);
    }
    return precoCalculado;
  }, [mostrarFornecedor, form.usar_override, form.valor_base_override, precoCalculado]);

  // Upload de foto de exemplo
  const handleUploadFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isEditing) return;

    setUploadingFoto(true);
    try {
      // 1. Obter presigned URL
      const presignedRes = await authFetch(`/admin/catalogo/items/${id}/fotos-exemplo/presigned`, {
        method: 'POST',
        body: JSON.stringify({ content_type: file.type, filename: file.name })
      });
      const presignedData = await presignedRes.json();
      if (!presignedData.success) {
        alert(presignedData.error || 'Erro ao gerar URL de upload');
        return;
      }

      // 2. Upload direto ao S3
      await fetch(presignedData.data.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      // 3. Salvar referência no item
      const novaFoto = {
        id: presignedData.data.foto_id,
        key: presignedData.data.key,
        url_thumb: URL.createObjectURL(file), // preview local temporário
        filename: file.name,
      };

      const novasFotos = [...form.fotos_exemplo, novaFoto];
      setForm(prev => ({ ...prev, fotos_exemplo: novasFotos }));

      // Salvar no backend
      await authFetch(`/admin/catalogo/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ fotos_exemplo: novasFotos })
      });
    } catch (err) {
      console.error(err);
      alert('Erro ao fazer upload da foto');
    }
    setUploadingFoto(false);
    e.target.value = '';
  };

  // Remover foto de exemplo
  const handleRemoverFoto = async (fotoId) => {
    if (!isEditing) return;
    try {
      const res = await authFetch(`/admin/catalogo/items/${id}/fotos-exemplo/${fotoId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setForm(prev => ({ ...prev, fotos_exemplo: prev.fotos_exemplo.filter(f => f.id !== fotoId) }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.tipo) return;

    // Validação: se não é fornecedor, valor_base é obrigatório
    if (!mostrarFornecedor && !form.valor_base) return;

    setSaving(true);
    const payload = {
      nome: form.nome,
      tipo: form.tipo,
      categoria_id: form.categoria_id || null,
      descricao: form.descricao,
      exibir_ao_cliente: form.exibir_ao_cliente,
      ativo: form.ativo,
    };

    if (form.tipo === 'servico_principal') {
      payload.valor_base = Number(form.valor_base) || 0;
      payload.duracao_base = form.duracao_base ? Number(form.duracao_base) : null;
      payload.valor_hora_adicional = form.valor_hora_adicional ? Number(form.valor_hora_adicional) : null;
    } else if (mostrarFornecedor) {
      // Campos de fornecedor/precificação
      payload.fornecedor_nome = form.fornecedor_nome;
      payload.fornecedor_link = form.fornecedor_link || null;
      payload.nome_no_fornecedor = form.nome_no_fornecedor || null;
      payload.preco_custo = Number(form.preco_custo) || 0;
      payload.frete = Number(form.frete) || 0;
      payload.outros_custos = Number(form.outros_custos) || 0;
      payload.margem_percentual = Number(form.margem_percentual) || 0;
      payload.valor_base_override = form.usar_override && form.valor_base_override ? Number(form.valor_base_override) : null;
      payload.fotos_exemplo = form.fotos_exemplo;
    } else {
      payload.valor_base = Number(form.valor_base) || 0;
    }

    if (form.tipo === 'produto') {
      payload.quantidade_estoque = form.quantidade_estoque ? Number(form.quantidade_estoque) : null;
    }

    try {
      const url = isEditing ? `/admin/catalogo/${id}` : '/admin/catalogo';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await authFetch(url, { method, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        navigate('/admin/catalogo');
      } else {
        alert(data.error || data.message || 'Erro ao salvar');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão');
    }
    setSaving(false);
  };

  const formatCurrency = (v) => {
    if (v == null || v === '') return 'R$ 0,00';
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Carregando...</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/catalogo')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <Package size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Item' : 'Novo Item'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 space-y-5">
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input type="text" value={form.nome} onChange={e => handleChange('nome', e.target.value)}
            required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none" />
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
          <select value={form.tipo} onChange={e => handleChange('tipo', e.target.value)}
            required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none">
            <option value="servico_principal">Serviço Principal</option>
            <option value="produto">Produto</option>
            <option value="adicional">Adicional</option>
          </select>
        </div>

        {/* Categoria */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <select value={form.categoria_id} onChange={e => handleChange('categoria_id', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none">
            <option value="">Sem categoria</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea value={form.descricao} onChange={e => handleChange('descricao', e.target.value)}
            rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none" />
        </div>

        {/* Valor Base (só se NÃO é bloco de fornecedor) */}
        {!mostrarFornecedor && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor Base (R$) *</label>
            <input type="number" min="0" step="0.01" value={form.valor_base} onChange={e => handleChange('valor_base', e.target.value)}
              required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none" />
          </div>
        )}

        {/* Campos Serviço Principal */}
        {form.tipo === 'servico_principal' && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">Duração Base (horas)</label>
              <input type="number" min="0" step="0.5" value={form.duracao_base} onChange={e => handleChange('duracao_base', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">Valor Hora Adicional (R$)</label>
              <input type="number" min="0" step="0.01" value={form.valor_hora_adicional} onChange={e => handleChange('valor_hora_adicional', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        {/* Campos Produto — Estoque */}
        {form.tipo === 'produto' && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <label className="block text-sm font-medium text-green-800 mb-1">Quantidade em Estoque</label>
            <input type="number" min="0" value={form.quantidade_estoque} onChange={e => handleChange('quantidade_estoque', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        )}

        {/* ===== BLOCO FORNECEDOR E CUSTO (SPEC-CAT-001) ===== */}
        {mostrarFornecedor && (
          <div className="p-5 bg-amber-50 rounded-xl border border-amber-200 space-y-4">
            <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <Package size={16} /> Fornecedor e Precificação
            </h3>

            {/* Fornecedor Nome + Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">Nome do Fornecedor *</label>
                <input type="text" value={form.fornecedor_nome} onChange={e => handleChange('fornecedor_nome', e.target.value)}
                  required placeholder="Ex: Nicephotos, Dreambook..."
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">Link do Fornecedor</label>
                <div className="flex gap-2">
                  <input type="url" value={form.fornecedor_link} onChange={e => handleChange('fornecedor_link', e.target.value)}
                    placeholder="https://..."
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-500 outline-none" />
                  {form.fornecedor_link && (
                    <a href={form.fornecedor_link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center px-2 border border-amber-200 rounded-lg hover:bg-amber-100">
                      <ExternalLink size={16} className="text-amber-700" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Nome no fornecedor */}
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-1">Nome no Fornecedor</label>
              <input type="text" value={form.nome_no_fornecedor} onChange={e => handleChange('nome_no_fornecedor', e.target.value)}
                placeholder="Como o fornecedor chama este produto"
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-500 outline-none" />
            </div>

            {/* Custos */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">Preço de Custo (R$) *</label>
                <input type="number" min="0" step="0.01" value={form.preco_custo} onChange={e => handleChange('preco_custo', e.target.value)}
                  required placeholder="0,00"
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">Frete (R$)</label>
                <input type="number" min="0" step="0.01" value={form.frete} onChange={e => handleChange('frete', e.target.value)}
                  placeholder="0,00"
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">Outros Custos (R$)</label>
                <input type="number" min="0" step="0.01" value={form.outros_custos} onChange={e => handleChange('outros_custos', e.target.value)}
                  placeholder="0,00" title="Embalagem, acabamento especial..."
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-500 outline-none" />
              </div>
            </div>

            {/* Margem */}
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-1">
                Margem de Lucro (%) * — {form.margem_percentual || 0}%
              </label>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="200" step="5" value={form.margem_percentual || 0}
                  onChange={e => handleChange('margem_percentual', e.target.value)}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-amber-600" />
                <input type="number" min="0" max="500" value={form.margem_percentual}
                  onChange={e => handleChange('margem_percentual', e.target.value)}
                  className="w-20 border border-amber-200 rounded-lg px-2 py-1 text-sm text-center" />
              </div>
            </div>

            {/* Preço Final Calculado */}
            <div className="bg-white rounded-lg border border-amber-300 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Custo Total</p>
                  <p className="text-sm font-medium text-gray-700">
                    {formatCurrency((Number(form.preco_custo) || 0) + (Number(form.frete) || 0) + (Number(form.outros_custos) || 0))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Margem</p>
                  <p className="text-sm font-medium text-gray-700">{form.margem_percentual || 0}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Preço Calculado</p>
                  <p className="text-xl font-bold" style={{ color: ACCENT }}>{formatCurrency(precoCalculado)}</p>
                </div>
              </div>
            </div>

            {/* Override manual */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={form.usar_override} onChange={e => handleChange('usar_override', e.target.checked)}
                  className="accent-amber-600 w-4 h-4" id="override-check" />
                <label htmlFor="override-check" className="text-sm text-amber-800 cursor-pointer">
                  Sobrescrever preço manualmente
                </label>
              </div>
              {form.usar_override && (
                <div>
                  <input type="number" min="0" step="0.01" value={form.valor_base_override}
                    onChange={e => handleChange('valor_base_override', e.target.value)}
                    placeholder="Valor manual (R$)"
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-500 outline-none" />
                </div>
              )}
              {precoFinalEfetivo != null && (
                <p className="text-sm font-semibold text-amber-900">
                  Preço final efetivo: <span style={{ color: ACCENT }}>{formatCurrency(precoFinalEfetivo)}</span>
                </p>
              )}
            </div>

            {/* Fotos de Exemplo */}
            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-2">Fotos de Exemplo (máx 5)</label>
                <div className="flex flex-wrap gap-3">
                  {form.fotos_exemplo.map(foto => (
                    <div key={foto.id} className="relative w-20 h-20 rounded-lg border overflow-hidden group">
                      {foto.url_thumb ? (
                        <img src={foto.url_thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <Image size={20} className="text-gray-400" />
                        </div>
                      )}
                      <button type="button" onClick={() => handleRemoverFoto(foto.id)}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {form.fotos_exemplo.length < 5 && (
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-amber-300 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-100 transition-colors">
                      <Upload size={16} className="text-amber-500" />
                      <span className="text-xs text-amber-600 mt-1">{uploadingFoto ? '...' : 'Foto'}</span>
                      <input type="file" accept="image/*" onChange={handleUploadFoto} className="hidden" disabled={uploadingFoto} />
                    </label>
                  )}
                </div>
                {!isEditing && form.tipo === 'produto' && (
                  <p className="text-xs text-amber-600 mt-1">Salve o item primeiro para adicionar fotos de exemplo.</p>
                )}
              </div>
            )}
            {!isEditing && (
              <p className="text-xs text-amber-600">Salve o item primeiro para adicionar fotos de exemplo.</p>
            )}
          </div>
        )}

        {/* Toggles */}
        <div className="flex flex-wrap gap-6 py-2">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => handleChange('exibir_ao_cliente', !form.exibir_ao_cliente)}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.exibir_ao_cliente ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.exibir_ao_cliente ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className="text-sm text-gray-700">Exibir ao cliente</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => handleChange('ativo', !form.ativo)}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.ativo ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.ativo ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className="text-sm text-gray-700">Ativo</span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={() => navigate('/admin/catalogo')}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={saving} style={{ backgroundColor: ACCENT }}
            className="flex items-center gap-2 px-5 py-2 text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
            <Save size={16} /> {saving ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Salvar')}
          </button>
        </div>
      </form>
    </div>
  );
}
