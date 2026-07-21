import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Package } from 'lucide-react';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.tipo || !form.valor_base) return;

    setSaving(true);
    const payload = {
      nome: form.nome,
      tipo: form.tipo,
      categoria_id: form.categoria_id || null,
      descricao: form.descricao,
      valor_base: Number(form.valor_base),
      exibir_ao_cliente: form.exibir_ao_cliente,
      ativo: form.ativo,
    };

    if (form.tipo === 'servico_principal') {
      payload.duracao_base = form.duracao_base ? Number(form.duracao_base) : null;
      payload.valor_hora_adicional = form.valor_hora_adicional ? Number(form.valor_hora_adicional) : null;
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
        alert(data.message || 'Erro ao salvar');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão');
    }
    setSaving(false);
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
          <Package size={24} style={{ color: '#EA580C' }} />
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Item' : 'Novo Item'}
          </h1>
        </div>
        <div className="flex gap-2">
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

        {/* Valor Base */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor Base (R$) *</label>
          <input type="number" min="0" step="0.01" value={form.valor_base} onChange={e => handleChange('valor_base', e.target.value)}
            required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none" />
        </div>

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

        {/* Campos Produto */}
        {form.tipo === 'produto' && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <label className="block text-sm font-medium text-green-800 mb-1">Quantidade em Estoque</label>
            <input type="number" min="0" value={form.quantidade_estoque} onChange={e => handleChange('quantidade_estoque', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
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
