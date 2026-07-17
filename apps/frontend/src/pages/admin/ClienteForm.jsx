import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, X, Plus, Search, Loader2, Users } from 'lucide-react';

const ACCENT = '#EA580C';
const COMO_CONHECEU = ['Instagram', 'Google', 'Indicação', 'Site', 'Facebook', 'Outro'];

// Masks inline (sem dependência externa)
const maskPhone = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
};
const maskCPF = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};
const maskCEP = (v) => v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');

export default function ClienteForm() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', whatsapp: '', cpf: '', data_nascimento: '', instagram: '',
    endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' },
    como_conheceu: '', notas: '', tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => { if (isEditing) loadCliente(); }, [id]);

  const loadCliente = async () => {
    try {
      const res = await authFetch(`/admin/clientes/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        const c = json.data;
        setForm({
          nome: c.nome || '', email: c.email || '', telefone: c.telefone || '', whatsapp: c.whatsapp || '',
          cpf: c.cpf || '', data_nascimento: c.data_nascimento ? c.data_nascimento.slice(0, 10) : '',
          instagram: c.instagram || '',
          endereco: { cep: c.endereco?.cep || '', logradouro: c.endereco?.logradouro || c.endereco?.rua || '', numero: c.endereco?.numero || '', complemento: c.endereco?.complemento || '', bairro: c.endereco?.bairro || '', cidade: c.endereco?.cidade || '', estado: c.endereco?.estado || '' },
          como_conheceu: c.como_conheceu || '', notas: c.notas || c.observacoes || '', tags: c.tags || [],
        });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const buscarCEP = async (cep) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await resp.json();
      if (!data.erro) {
        setForm(prev => ({ ...prev, endereco: { ...prev.endereco, cep: maskCEP(digits), logradouro: data.logradouro || '', bairro: data.bairro || '', cidade: data.localidade || '', estado: data.uf || '' } }));
      }
    } catch {}
    setCepLoading(false);
  };

  const handleCEP = (value) => {
    const masked = maskCEP(value);
    setForm(prev => ({ ...prev, endereco: { ...prev.endereco, cep: masked } }));
    if (value.replace(/\D/g, '').length === 8) buscarCEP(value);
  };

  const addTag = () => { if (tagInput.trim() && !form.tags.includes(tagInput.trim())) { setForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] })); setTagInput(''); } };
  const removeTag = (t) => setForm(prev => ({ ...prev, tags: prev.tags.filter(x => x !== t) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return; }
    setError(''); setSaving(true);
    try {
      const url = isEditing ? `/admin/clientes/${id}` : '/admin/clientes';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await authFetch(url, { method, body: JSON.stringify(form) });
      const json = await res.json();
      if (json.success) navigate('/admin/clientes');
      else setError(json.message || 'Erro ao salvar');
    } catch { setError('Erro ao salvar'); }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;

  const inputCls = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200";

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/clientes')} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft size={20} /></button>
          <Users size={24} style={{ color: '#EA580C' }} />
          <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h1>
        </div>
        <div className="flex gap-2">
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Pessoais */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados Pessoais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })} placeholder="(11) 99999-9999" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: maskPhone(e.target.value) })} placeholder="(11) 99999-9999" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })} placeholder="000.000.000-00" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
              <input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
              <input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value.replace('@', '').toLowerCase() })} placeholder="@usuario" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Como Conheceu</label>
              <select value={form.como_conheceu} onChange={(e) => setForm({ ...form, como_conheceu: e.target.value })} className={inputCls}>
                <option value="">Selecione...</option>
                {COMO_CONHECEU.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Endereço com busca CEP */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Endereço</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
              <div className="relative">
                <input value={form.endereco.cep} onChange={(e) => handleCEP(e.target.value)} placeholder="00000-000" className={inputCls} />
                {cepLoading && <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-orange-500" />}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
              <input value={form.endereco.logradouro} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, logradouro: e.target.value } })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
              <input value={form.endereco.numero} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, numero: e.target.value } })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
              <input value={form.endereco.complemento} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, complemento: e.target.value } })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
              <input value={form.endereco.bairro} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, bairro: e.target.value } })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input value={form.endereco.cidade} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, cidade: e.target.value } })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <input value={form.endereco.estado} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, estado: e.target.value.toUpperCase().slice(0, 2) } })} maxLength={2} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Observações e Tags */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Adicionais</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={3} maxLength={500}
                placeholder="Notas internas sobre este cliente..." className={`${inputCls} resize-none`} />
              <p className="text-xs text-gray-400 mt-1">{form.notas.length}/500</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 text-xs rounded-full">
                    {tag} <button type="button" onClick={() => removeTag(tag)}><X size={12} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Adicionar tag..." className={`flex-1 ${inputCls}`} />
                <button type="button" onClick={addTag} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/admin/clientes')} className="px-5 py-2.5 border rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={saving} style={{ background: ACCENT }}
            className="px-5 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Cliente'}
          </button>
        </div>
      </form>
    </div>
  );
}
