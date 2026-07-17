import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Plus, X, Trash2 } from 'lucide-react';

const ACCENT = '#EA580C';
const CATEGORIAS = ['Casamento', 'Ensaio', 'Corporativo', 'Newborn', 'Produto', 'Aniversário', 'Outros'];

export default function CatalogoForm() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', category: '', price: '', duration: '',
    status: 'ativo', includes: [], variations: [], tags: [],
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => { if (id) loadItem(); }, [id]);

  const loadItem = async () => {
    try {
      const res = await authFetch(`/admin/catalogo/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setForm({ ...json.data, includes: json.data.includes || [], variations: json.data.variations || [], tags: json.data.tags || [] });
      }
    } catch {}
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = id ? 'PUT' : 'POST';
      const path = id ? `/admin/catalogo/${id}` : '/admin/catalogo';
      const payload = {
        nome: form.name,
        descricao: form.description,
        tipo: form.category?.toLowerCase() || 'custom',
        preco: Number(form.price),
        duracaoHoras: Number(form.duration) || 0,
        itensInclusos: form.includes || [],
        quantidadeFotos: 0,
      };
      await authFetch(path, { method, body: JSON.stringify(payload) });
      navigate('/admin/catalogo');
    } catch {}
    setSaving(false);
  };

  // Includes management
  const addInclude = () => setForm({ ...form, includes: [...form.includes, ''] });
  const updateInclude = (i, val) => { const arr = [...form.includes]; arr[i] = val; setForm({ ...form, includes: arr }); };
  const removeInclude = (i) => setForm({ ...form, includes: form.includes.filter((_, idx) => idx !== i) });

  // Variations management
  const addVariation = () => setForm({ ...form, variations: [...form.variations, { description: '', price: '' }] });
  const updateVariation = (i, field, val) => { const arr = [...form.variations]; arr[i] = { ...arr[i], [field]: val }; setForm({ ...form, variations: arr }); };
  const removeVariation = (i) => setForm({ ...form, variations: form.variations.filter((_, idx) => idx !== i) });

  // Tags
  const addTag = () => { if (tagInput.trim()) { setForm({ ...form, tags: [...form.tags, tagInput.trim()] }); setTagInput(''); } };
  const removeTag = (i) => setForm({ ...form, tags: form.tags.filter((_, idx) => idx !== i) });

  return (
    <div>
      <button onClick={() => navigate('/admin/catalogo')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Voltar para Catálogo
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">{id ? 'Editar Item' : 'Novo Item do Catálogo'}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info básica */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Informações Básicas</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Serviço/Pacote *</label>
              <input name="name" value={form.name} onChange={handleChange} required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select name="category" value={form.category} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none">
                <option value="">Selecione...</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço Base (R$) *</label>
              <input name="price" type="number" step="0.01" value={form.price} onChange={handleChange} required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duração Estimada (horas)</label>
              <input name="duration" type="number" step="0.5" value={form.duration} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none">
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none resize-none" />
          </div>
        </div>

        {/* Variações de preço */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Variações de Preço</h3>
            <button type="button" onClick={addVariation} className="text-sm font-medium flex items-center gap-1" style={{ color: ACCENT }}>
              <Plus size={14} /> Adicionar
            </button>
          </div>
          {form.variations.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma variação. Ex: "até 100 fotos = R$X"</p>
          ) : (
            <div className="space-y-2">
              {form.variations.map((v, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input value={v.description} onChange={(e) => updateVariation(i, 'description', e.target.value)} placeholder="Ex: até 200 fotos"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <input type="number" step="0.01" value={v.price} onChange={(e) => updateVariation(i, 'price', e.target.value)} placeholder="R$"
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <button type="button" onClick={() => removeVariation(i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* O que inclui */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">O que Inclui</h3>
            <button type="button" onClick={addInclude} className="text-sm font-medium flex items-center gap-1" style={{ color: ACCENT }}>
              <Plus size={14} /> Adicionar
            </button>
          </div>
          {form.includes.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum item listado</p>
          ) : (
            <div className="space-y-2">
              {form.includes.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-gray-400">•</span>
                  <input value={item} onChange={(e) => updateInclude(i, e.target.value)} placeholder="Ex: 50 fotos editadas"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <button type="button" onClick={() => removeInclude(i)} className="p-1 text-red-400 hover:text-red-600"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Tags</h3>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.tags.map((tag, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 text-xs rounded-full">
                {tag} <button type="button" onClick={() => removeTag(i)}><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Adicionar tag..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <button type="button" onClick={addTag} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">Adicionar</button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/admin/catalogo')} className="px-5 py-2.5 border rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={saving} style={{ background: ACCENT }}
            className="px-5 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? 'Salvando...' : id ? 'Salvar Alterações' : 'Criar Item'}
          </button>
        </div>
      </form>
    </div>
  );
}
