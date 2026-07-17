import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Trash2, Star, X, CreditCard } from 'lucide-react';

const ACCENT = '#EA580C';

const METODOS_PAGAMENTO = [
  { key: 'pix', label: 'PIX' },
  { key: 'boleto', label: 'Boleto' },
  { key: 'credit_card', label: 'Cartão Crédito' },
  { key: 'debit_card', label: 'Cartão Débito' },
  { key: 'link', label: 'Link' },
  { key: 'cash', label: 'Dinheiro' },
];

const INTERVALOS = [
  { value: 7, label: '7 dias' },
  { value: 15, label: '15 dias' },
  { value: 30, label: '30 dias' },
];

const emptyCondition = {
  id: '',
  nome: '',
  entrada_percent: 0,
  parcelas: 1,
  intervalo_dias: 30,
  metodos: ['pix'],
  desconto_avista: 0,
  juros_parcela: 0,
  padrao: false,
};

export default function ConfigPagamento({ form, setForm }) {
  const { authFetch } = useAuth();
  const [condicoes, setCondicoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ ...emptyCondition });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadCondicoes(); }, []);

  const loadCondicoes = async () => {
    try {
      const res = await authFetch('/admin/configuracoes');
      const json = await res.json();
      if (json.success && json.data?.condicoes_pagamento) {
        setCondicoes(json.data.condicoes_pagamento);
      }
    } catch {} finally { setLoading(false); }
  };

  const saveCondicoes = async (updated) => {
    setSaving(true);
    try {
      await authFetch('/admin/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condicoes_pagamento: updated }),
      });
      setCondicoes(updated);
    } catch {} finally { setSaving(false); }
  };

  const openNew = () => {
    setEditing(null);
    setFormData({ ...emptyCondition, id: Date.now().toString() });
    setModalOpen(true);
  };

  const openEdit = (cond) => {
    setEditing(cond.id);
    setFormData({ ...cond });
    setModalOpen(true);
  };

  const handleSave = async () => {
    let updated;
    if (formData.padrao) {
      updated = condicoes.map(c => ({ ...c, padrao: false }));
    } else {
      updated = [...condicoes];
    }

    if (editing) {
      updated = updated.map(c => c.id === editing ? { ...formData } : c);
    } else {
      updated = [...updated, { ...formData }];
    }

    await saveCondicoes(updated);
    setModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta condição de pagamento?')) return;
    const updated = condicoes.filter(c => c.id !== id);
    await saveCondicoes(updated);
  };

  const handleSetDefault = async (id) => {
    const updated = condicoes.map(c => ({ ...c, padrao: c.id === id }));
    await saveCondicoes(updated);
  };

  const toggleMetodo = (key) => {
    const metodos = formData.metodos || [];
    setFormData({
      ...formData,
      metodos: metodos.includes(key) ? metodos.filter(m => m !== key) : [...metodos, key],
    });
  };

  // Simulação
  const simulacao = () => {
    const total = 5000;
    const entrada = total * (formData.entrada_percent / 100);
    const restante = total - entrada;
    const parcelas = formData.parcelas || 1;
    const juros = formData.juros_parcela || 0;
    const valorParcela = parcelas > 0 ? (restante * (1 + juros / 100 * parcelas)) / parcelas : 0;

    if (formData.entrada_percent === 100) {
      return `Para um serviço de R$5.000: Pagamento integral de R$${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    if (entrada > 0 && parcelas > 0) {
      return `Para um serviço de R$5.000: Entrada R$${entrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} + ${parcelas}x de R$${valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    if (parcelas > 0) {
      return `Para um serviço de R$5.000: ${parcelas}x de R$${valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    return '';
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Carregando condições...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Gerencie condições de pagamento reutilizáveis para orçamentos e cobranças.</p>
        <button type="button" onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ background: ACCENT }}>
          <Plus size={16} /> Nova Condição
        </button>
      </div>

      {/* Lista de condições */}
      {condicoes.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <CreditCard size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">Nenhuma condição cadastrada</p>
          <p className="text-xs text-gray-400 mt-1">Clique em "+ Nova Condição" para começar</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {condicoes.map(cond => (
            <div key={cond.id} className="p-4 border rounded-xl hover:shadow-md transition-shadow relative">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900">{cond.nome || 'Sem nome'}</h4>
                    {cond.padrao && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                        <Star size={10} fill="currentColor" /> Padrão
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Entrada {cond.entrada_percent}% · {cond.parcelas}x · a cada {cond.intervalo_dias} dias
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {(cond.metodos || []).map(m => {
                  const metodo = METODOS_PAGAMENTO.find(mp => mp.key === m);
                  return (
                    <span key={m} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                      {metodo?.label || m}
                    </span>
                  );
                })}
              </div>

              {(cond.desconto_avista > 0 || cond.juros_parcela > 0) && (
                <p className="text-xs text-gray-400 mb-3">
                  {cond.desconto_avista > 0 && `Desconto à vista: ${cond.desconto_avista}%`}
                  {cond.desconto_avista > 0 && cond.juros_parcela > 0 && ' · '}
                  {cond.juros_parcela > 0 && `Juros: ${cond.juros_parcela}%/parcela`}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2 border-t">
                <button type="button" onClick={() => openEdit(cond)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Edit2 size={12} /> Editar
                </button>
                {!cond.padrao && (
                  <button type="button" onClick={() => handleSetDefault(cond.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                    <Star size={12} /> Definir padrão
                  </button>
                )}
                <button type="button" onClick={() => handleDelete(cond.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto">
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                {editing ? 'Editar Condição' : 'Nova Condição de Pagamento'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Condição</label>
                <input type="text" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: 3x sem juros, 50% entrada + 2x"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
              </div>

              {/* Entrada percentual */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entrada ({formData.entrada_percent}%)</label>
                <input type="range" min={0} max={100} step={5} value={formData.entrada_percent}
                  onChange={e => setFormData({ ...formData, entrada_percent: Number(e.target.value) })}
                  className="w-full accent-orange-600" />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>

              {/* Parcelas e Intervalo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nº de Parcelas</label>
                  <input type="number" min={1} max={24} value={formData.parcelas}
                    onChange={e => setFormData({ ...formData, parcelas: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo entre parcelas</label>
                  <select value={formData.intervalo_dias}
                    onChange={e => setFormData({ ...formData, intervalo_dias: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none">
                    {INTERVALOS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Métodos aceitos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Métodos Aceitos</label>
                <div className="grid grid-cols-2 gap-2">
                  {METODOS_PAGAMENTO.map(({ key, label }) => {
                    const active = (formData.metodos || []).includes(key);
                    return (
                      <button key={key} type="button" onClick={() => toggleMetodo(key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${active ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${active ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                          {active && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                        </div>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desconto e Juros */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desconto à vista (%)</label>
                  <input type="number" min={0} max={50} step={0.5} value={formData.desconto_avista}
                    onChange={e => setFormData({ ...formData, desconto_avista: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Juros por parcela (%)</label>
                  <input type="number" min={0} max={10} step={0.1} value={formData.juros_parcela}
                    onChange={e => setFormData({ ...formData, juros_parcela: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
                </div>
              </div>

              {/* Toggle Padrão */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border">
                <div>
                  <p className="text-sm font-medium text-gray-900">Definir como padrão</p>
                  <p className="text-xs text-gray-500">Usada automaticamente em novos orçamentos</p>
                </div>
                <button type="button" onClick={() => setFormData({ ...formData, padrao: !formData.padrao })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${formData.padrao ? 'bg-orange-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${formData.padrao ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Simulação */}
              {(formData.entrada_percent > 0 || formData.parcelas > 0) && (
                <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                  <p className="text-xs font-medium text-orange-800 mb-1">📊 Simulação</p>
                  <p className="text-sm text-orange-700">{simulacao()}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t sticky bottom-0 bg-white rounded-b-2xl">
              <button type="button" onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={handleSave} disabled={saving || !formData.nome}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: ACCENT }}>
                {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Condição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
