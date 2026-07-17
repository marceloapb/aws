import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

const ACCENT = '#EA580C';
const TIPOS_EVENTO = ['Casamento', 'Ensaio', 'Corporativo', 'Aniversário', 'Newborn', 'Batizado', 'Outro'];

export default function OrcamentoForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [form, setForm] = useState({
    cliente_id: searchParams.get('cliente_id') || '', tipo_evento: '', data_evento: '', local: '', duracao: '',
    itens: [], desconto_tipo: 'pct', desconto_valor: 0, condicao_pagamento: 'sinal_parcelas',
    parcelas: 6, observacoes: '', validade_dias: 7,
  });

  useEffect(() => {
    loadDeps();
    if (id) loadOrcamento();
  }, [id]);

  const loadDeps = async () => {
    const [cliRes, catRes] = await Promise.all([
      authFetch('/admin/clientes').then(r => r.json()).catch(() => ({ data: [] })),
      authFetch('/admin/catalogo').then(r => r.json()).catch(() => ({ data: [] })),
    ]);
    setClientes(cliRes.data || []);
    setCatalogo(catRes.data || []);
  };

  const loadOrcamento = async () => {
    const res = await authFetch(`/admin/orcamentos/${id}`);
    const json = await res.json();
    if (json.success) setForm({ ...form, ...json.data, itens: json.data.itens || [] });
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const addItem = () => setForm({ ...form, itens: [...form.itens, { catalogo_id: '', nome: '', qtd: 1, valor_unitario: 0 }] });
  const addCustomItem = () => setForm({ ...form, itens: [...form.itens, { catalogo_id: '', nome: '', qtd: 1, valor_unitario: 0, custom: true }] });
  const updateItem = (i, field, val) => { const arr = [...form.itens]; arr[i] = { ...arr[i], [field]: val }; setForm({ ...form, itens: arr }); };
  const removeItem = (i) => setForm({ ...form, itens: form.itens.filter((_, idx) => idx !== i) });

  const selectCatalogoItem = (i, catId) => {
    const item = catalogo.find(c => c.id === catId);
    if (item) {
      const arr = [...form.itens];
      arr[i] = { ...arr[i], catalogo_id: catId, nome: item.name || item.nome, valor_unitario: item.price || item.valor_base || 0 };
      setForm({ ...form, itens: arr });
    }
  };

  const subtotal = form.itens.reduce((sum, it) => sum + (it.qtd * it.valor_unitario), 0);
  const desconto = form.desconto_tipo === 'pct' ? subtotal * (form.desconto_valor / 100) : Number(form.desconto_valor);
  const valorFinal = subtotal - desconto;

  const handleSubmit = async (status = 'rascunho') => {
    setSaving(true);
    const payload = { ...form, subtotal, desconto, valor_total: valorFinal, status };
    const method = id ? 'PUT' : 'POST';
    const path = id ? `/admin/orcamentos/${id}` : '/admin/orcamentos';
    await authFetch(path, { method, body: JSON.stringify(payload) });
    navigate('/admin/orcamentos');
    setSaving(false);
  };

  return (
    <div>
      <button onClick={() => navigate('/admin/orcamentos')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Voltar
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{id ? 'Editar Orçamento' : 'Novo Orçamento'}</h1>

      <div className="space-y-6">
        {/* Cliente */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Cliente</h3>
          <select name="cliente_id" value={form.cliente_id} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none">
            <option value="">Selecione o cliente...</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome || c.name} — {c.email}</option>)}
          </select>
        </div>

        {/* Evento */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Evento</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Evento</label>
              <select name="tipo_evento" value={form.tipo_evento} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none">
                <option value="">Selecione...</option>
                {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Evento</label>
              <input name="data_evento" type="date" value={form.data_evento} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
              <input name="local" value={form.local} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duração (horas)</label>
              <input name="duracao" type="number" step="0.5" value={form.duracao} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none" />
            </div>
          </div>
        </div>

        {/* Itens */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Itens / Serviços</h3>
            <div className="flex gap-2">
              <button type="button" onClick={addItem} className="text-sm font-medium flex items-center gap-1" style={{ color: ACCENT }}>
                <Plus size={14} /> Do Catálogo
              </button>
              <button type="button" onClick={addCustomItem} className="text-sm font-medium flex items-center gap-1 text-gray-600">
                <Plus size={14} /> Personalizado
              </button>
            </div>
          </div>
          {form.itens.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Adicione itens do catálogo ou personalizados</p>
          ) : (
            <div className="space-y-3">
              {form.itens.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {!item.custom ? (
                    <select value={item.catalogo_id} onChange={(e) => selectCatalogoItem(i, e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm">
                      <option value="">Selecione do catálogo...</option>
                      {catalogo.map(c => <option key={c.id} value={c.id}>{c.name || c.nome} — R$ {c.price || c.valor_base}</option>)}
                    </select>
                  ) : (
                    <input value={item.nome} onChange={(e) => updateItem(i, 'nome', e.target.value)} placeholder="Nome do item"
                      className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                  )}
                  <input type="number" min={1} value={item.qtd} onChange={(e) => updateItem(i, 'qtd', Number(e.target.value))}
                    className="w-16 px-2 py-2 border rounded-lg text-sm text-center" />
                  <input type="number" step="0.01" value={item.valor_unitario} onChange={(e) => updateItem(i, 'valor_unitario', Number(e.target.value))}
                    className="w-28 px-2 py-2 border rounded-lg text-sm" placeholder="R$" />
                  <span className="text-sm font-medium w-24 text-right">R$ {(item.qtd * item.valor_unitario).toLocaleString('pt-BR')}</span>
                  <button type="button" onClick={() => removeItem(i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Valores */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Valores</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Desconto</label>
              <select name="desconto_tipo" value={form.desconto_tipo} onChange={handleChange}
                className="w-full px-3 py-2.5 border rounded-lg outline-none">
                <option value="pct">Percentual (%)</option>
                <option value="fixo">Valor Fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desconto</label>
              <input name="desconto_valor" type="number" step="0.01" value={form.desconto_valor} onChange={handleChange}
                className="w-full px-3 py-2.5 border rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Validade (dias)</label>
              <input name="validade_dias" type="number" min={1} value={form.validade_dias} onChange={handleChange}
                className="w-full px-3 py-2.5 border rounded-lg outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-6 pt-4 border-t">
            <div className="text-right">
              <p className="text-sm text-gray-500">Subtotal</p>
              <p className="text-lg font-medium">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            {desconto > 0 && <div className="text-right">
              <p className="text-sm text-gray-500">Desconto</p>
              <p className="text-lg font-medium text-red-500">- R$ {desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>}
            <div className="text-right">
              <p className="text-sm text-gray-500">Valor Final</p>
              <p className="text-2xl font-bold" style={{ color: ACCENT }}>R$ {valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Condições */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Condições e Observações</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condição de Pagamento</label>
              <select name="condicao_pagamento" value={form.condicao_pagamento} onChange={handleChange}
                className="w-full px-3 py-2.5 border rounded-lg outline-none">
                <option value="avista">À vista</option>
                <option value="sinal_parcelas">Sinal + Parcelas</option>
                <option value="parcelas">Parcelas sem sinal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parcelas</label>
              <input name="parcelas" type="number" min={1} max={24} value={form.parcelas} onChange={handleChange}
                className="w-full px-3 py-2.5 border rounded-lg outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea name="observacoes" value={form.observacoes} onChange={handleChange} rows={3}
              className="w-full px-3 py-2.5 border rounded-lg outline-none resize-none" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/admin/orcamentos')} className="px-5 py-2.5 border rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button type="button" onClick={() => handleSubmit('rascunho')} disabled={saving}
            className="px-5 py-2.5 border rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
            Salvar Rascunho
          </button>
          <button type="button" onClick={() => handleSubmit('enviado')} disabled={saving} style={{ background: ACCENT }}
            className="px-5 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            Salvar e Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
