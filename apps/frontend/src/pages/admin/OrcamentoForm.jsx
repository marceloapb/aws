import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, AlertTriangle, UserPlus, Send, Save } from 'lucide-react';

const ACCENT = '#EA580C';
const TIPOS_EVENTO = ['Casamento', 'Ensaio', 'Batizado', 'Aniversário', 'Corporativo', '15 anos', 'Newborn'];
const fmt = v => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

export default function OrcamentoForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [config, setConfig] = useState({});
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [quickClient, setQuickClient] = useState({ nome: '', email: '', telefone: '' });
  const [abaPayment, setAbaPayment] = useState('avista');
  const [form, setForm] = useState({
    cliente_id: searchParams.get('cliente_id') || '', tipo_evento: '', data_evento: '',
    hora_inicio: '', hora_fim: '', local: '',
    servicos: [], opcionais: [],
    desconto_tipo: 'percentual', desconto_valor: 0, desconto_obs: '',
    parcelas_sem_juros: 3, parcelas_com_juros: 6,
    validade_dias: 7, mensagem: '', condicao_pagamento: 'avista',
  });

  useEffect(() => { loadDeps(); if (id) loadOrcamento(); }, [id]);

  const loadDeps = async () => {
    const [cliRes, catRes, cfgRes] = await Promise.all([
      authFetch('/admin/clientes').then(r => r.json()).catch(() => ({ data: [] })),
      authFetch('/admin/catalogo').then(r => r.json()).catch(() => ({ data: [] })),
      authFetch('/admin/configuracoes').then(r => r.json()).catch(() => ({ data: {} })),
    ]);
    setClientes(cliRes.data || []);
    setCatalogo(catRes.data || []);
    const cfg = cfgRes.data || {};
    setConfig(cfg);
    if (!id) setForm(f => ({ ...f, validade_dias: cfg.validade_dias || 7, mensagem: cfg.mensagem_padrao || '' }));
  };

  const loadOrcamento = async () => {
    const res = await authFetch(`/admin/orcamentos/${id}`);
    const json = await res.json();
    if (json.success) setForm(f => ({ ...f, ...json.data, servicos: json.data.servicos || [], opcionais: json.data.opcionais || [] }));
  };

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
  const handleChange = e => set(e.target.name, e.target.value);

  // Duração calculada
  const duracao = useMemo(() => {
    if (!form.hora_inicio || !form.hora_fim) return null;
    const [h1, m1] = form.hora_inicio.split(':').map(Number);
    const [h2, m2] = form.hora_fim.split(':').map(Number);
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    return diff > 0 ? diff / 60 : null;
  }, [form.hora_inicio, form.hora_fim]);

  // Serviços
  const addServico = (catId) => {
    const item = catalogo.find(c => c.id === catId);
    if (!item) return;
    set('servicos', [...form.servicos, { catalogo_id: catId, nome: item.nome || item.name, valor_base: item.valor_base || item.price || 0, horas_extras: 0, valor_hora_extra: item.valor_hora_extra || 0 }]);
  };
  const updateServico = (i, field, val) => { const arr = [...form.servicos]; arr[i] = { ...arr[i], [field]: val }; set('servicos', arr); };
  const removeServico = i => set('servicos', form.servicos.filter((_, idx) => idx !== i));
  const moveServico = (i, dir) => { const arr = [...form.servicos]; const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; set('servicos', arr); };

  // Opcionais
  const addOpcional = (catId) => {
    const item = catalogo.find(c => c.id === catId);
    if (!item) return;
    set('opcionais', [...form.opcionais, { catalogo_id: catId, nome: item.nome || item.name, valor: item.valor_base || item.price || 0 }]);
  };
  const removeOpcional = i => set('opcionais', form.opcionais.filter((_, idx) => idx !== i));
  const moveOpcional = (i, dir) => { const arr = [...form.opcionais]; const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; set('opcionais', arr); };

  // Cálculos
  const subtotalServicos = form.servicos.reduce((s, it) => s + it.valor_base + (it.horas_extras * it.valor_hora_extra), 0);
  const subtotalOpcionais = form.opcionais.reduce((s, it) => s + Number(it.valor), 0);
  const subtotal = subtotalServicos + subtotalOpcionais;
  const descontoValor = form.desconto_tipo === 'percentual' ? subtotal * (form.desconto_valor / 100) : Number(form.desconto_valor);
  const valorFinal = Math.max(0, subtotal - descontoValor);
  const maxDesconto = config.desconto_maximo || 20;
  const descontoExcedido = form.desconto_tipo === 'percentual' && form.desconto_valor > maxDesconto;

  // Condições de pagamento (Price)
  const descontoAvista = config.desconto_avista || 5;
  const valorAvista = valorFinal * (1 - descontoAvista / 100);
  const maxParcelas = config.max_parcelas || 12;
  const parcelaMinima = config.parcela_minima || 200;
  const taxaJuros = config.taxa_juros || 2.5;
  const valorParcelaSemJuros = valorFinal / (form.parcelas_sem_juros || 1);
  const calcPrice = (valor, n, taxa) => { const i = taxa / 100; return valor * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1); };
  const valorParcelaComJuros = calcPrice(valorFinal, form.parcelas_com_juros || 1, taxaJuros);

  // Validade
  const dataExpiracao = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + Number(form.validade_dias || 7));
    return d.toLocaleDateString('pt-BR');
  }, [form.validade_dias]);

  // Cadastro rápido
  const handleQuickClient = async () => {
    const res = await authFetch('/admin/clientes', { method: 'POST', body: JSON.stringify(quickClient) });
    const json = await res.json();
    if (json.success || json.data) {
      const novo = json.data;
      setClientes(prev => [...prev, novo]);
      set('cliente_id', novo.id);
      setShowQuickClient(false);
      setQuickClient({ nome: '', email: '', telefone: '' });
    }
  };

  // Submit
  const handleSubmit = async (status = 'rascunho') => {
    setSaving(true);
    const payload = { ...form, subtotal, desconto: descontoValor, valor_total: valorFinal, status, duracao, condicao_pagamento: abaPayment };
    const method = id ? 'PUT' : 'POST';
    const path = id ? `/admin/orcamentos/${id}` : '/admin/orcamentos';
    const res = await authFetch(path, { method, body: JSON.stringify(payload) });
    const json = await res.json();
    if (status === 'enviado' && json.data?.id) await authFetch(`/admin/orcamentos/${json.data.id}/enviar`, { method: 'POST' });
    navigate('/admin/orcamentos');
    setSaving(false);
  };

  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none text-sm';
  const sectionCls = 'bg-white rounded-xl border p-6 space-y-4';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
  const servicosCat = catalogo.filter(c => (c.tipo || c.type) === 'Serviço Principal');
  const opcionaisCat = catalogo.filter(c => (c.tipo || c.type) === 'Adicional');

  return (
    <div>
      <button onClick={() => navigate('/admin/orcamentos')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Voltar
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{id ? 'Editar Orçamento' : 'Novo Orçamento'}</h1>

      <div className="space-y-6">
        {/* SEÇÃO 1 - Cliente */}
        <div className={sectionCls}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">1. Cliente</h3>
            <button type="button" onClick={() => setShowQuickClient(!showQuickClient)} className="text-sm font-medium flex items-center gap-1" style={{ color: ACCENT }}>
              <UserPlus size={14} /> Cadastro rápido
            </button>
          </div>
          <select name="cliente_id" value={form.cliente_id} onChange={handleChange} className={inputCls}>
            <option value="">Selecione o cliente...</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome || c.name} — {c.email}</option>)}
          </select>
          {showQuickClient && (
            <div className="grid md:grid-cols-4 gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <input placeholder="Nome" value={quickClient.nome} onChange={e => setQuickClient({ ...quickClient, nome: e.target.value })} className={inputCls} />
              <input placeholder="Email" type="email" value={quickClient.email} onChange={e => setQuickClient({ ...quickClient, email: e.target.value })} className={inputCls} />
              <input placeholder="Telefone" value={quickClient.telefone} onChange={e => setQuickClient({ ...quickClient, telefone: e.target.value })} className={inputCls} />
              <button type="button" onClick={handleQuickClient} className="px-4 py-2.5 text-white rounded-lg text-sm font-medium" style={{ background: ACCENT }}>Salvar</button>
            </div>
          )}
        </div>

        {/* SEÇÃO 2 - Evento */}
        <div className={sectionCls}>
          <h3 className="font-semibold text-gray-900">2. Evento</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className={labelCls}>Tipo de Evento</label>
              <select name="tipo_evento" value={form.tipo_evento} onChange={handleChange} className={inputCls}>
                <option value="">Selecione...</option>
                {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div><label className={labelCls}>Data do Evento</label>
              <input name="data_evento" type="date" value={form.data_evento} onChange={handleChange} className={inputCls} /></div>
            <div><label className={labelCls}>Local</label>
              <input name="local" value={form.local} onChange={handleChange} className={inputCls} /></div>
            <div><label className={labelCls}>Hora Início</label>
              <input name="hora_inicio" type="time" value={form.hora_inicio} onChange={handleChange} className={inputCls} /></div>
            <div><label className={labelCls}>Hora Fim</label>
              <input name="hora_fim" type="time" value={form.hora_fim} onChange={handleChange} className={inputCls} /></div>
            <div><label className={labelCls}>Duração</label>
              <div className="px-3 py-2.5 bg-gray-100 border rounded-lg text-sm text-gray-700">{duracao ? `${duracao.toFixed(1)}h` : 'Automático'}</div></div>
          </div>
        </div>

        {/* SEÇÃO 3 - Serviços e Opcionais */}
        <div className={sectionCls}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">3. Serviços e Opcionais</h3>
            <div className="flex gap-2">
              <select onChange={e => { addServico(e.target.value); e.target.value = ''; }} className="text-sm border rounded-lg px-2 py-1.5" defaultValue="">
                <option value="" disabled>+ Serviço</option>
                {servicosCat.map(c => <option key={c.id} value={c.id}>{c.nome || c.name}</option>)}
              </select>
              <select onChange={e => { addOpcional(e.target.value); e.target.value = ''; }} className="text-sm border rounded-lg px-2 py-1.5" defaultValue="">
                <option value="" disabled>+ Opcional</option>
                {opcionaisCat.map(c => <option key={c.id} value={c.id}>{c.nome || c.name}</option>)}
              </select>
            </div>
          </div>

          {form.servicos.length > 0 && <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Serviços Principais</p>
            {form.servicos.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => moveServico(i, -1)} className="text-gray-400 hover:text-gray-600"><ChevronUp size={14} /></button>
                  <button type="button" onClick={() => moveServico(i, 1)} className="text-gray-400 hover:text-gray-600"><ChevronDown size={14} /></button>
                </div>
                <span className="flex-1 text-sm font-medium">{s.nome}</span>
                <span className="text-sm text-gray-600">R$ {fmt(s.valor_base)}</span>
                <div className="flex items-center gap-1">
                  <input type="number" min={0} value={s.horas_extras} onChange={e => updateServico(i, 'horas_extras', Number(e.target.value))} className="w-14 px-2 py-1 border rounded text-sm text-center" />
                  <span className="text-xs text-gray-500">h.extra</span>
                </div>
                <span className="text-xs text-gray-500">× R$ {fmt(s.valor_hora_extra)}</span>
                <span className="text-sm font-semibold w-24 text-right">R$ {fmt(s.valor_base + s.horas_extras * s.valor_hora_extra)}</span>
                <button type="button" onClick={() => removeServico(i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>}

          {form.opcionais.length > 0 && <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Opcionais / Adicionais</p>
            {form.opcionais.map((o, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => moveOpcional(i, -1)} className="text-gray-400 hover:text-gray-600"><ChevronUp size={14} /></button>
                  <button type="button" onClick={() => moveOpcional(i, 1)} className="text-gray-400 hover:text-gray-600"><ChevronDown size={14} /></button>
                </div>
                <span className="flex-1 text-sm font-medium">{o.nome}</span>
                <span className="text-sm font-semibold">R$ {fmt(o.valor)}</span>
                <button type="button" onClick={() => removeOpcional(i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>}

          {form.servicos.length === 0 && form.opcionais.length === 0 && (
            <p className="text-sm text-gray-400 py-6 text-center">Adicione serviços e opcionais do catálogo</p>
          )}
          <div className="flex justify-end pt-3 border-t"><span className="text-sm text-gray-600">Sub-total: <b>R$ {fmt(subtotal)}</b></span></div>
        </div>

        {/* SEÇÃO 4 - Valores e Desconto */}
        <div className={sectionCls}>
          <h3 className="font-semibold text-gray-900">4. Valores e Desconto</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div><label className={labelCls}>Tipo de Desconto</label>
              <select name="desconto_tipo" value={form.desconto_tipo} onChange={handleChange} className={inputCls}>
                <option value="percentual">Percentual (%)</option>
                <option value="fixo">Valor Fixo (R$)</option>
              </select></div>
            <div><label className={labelCls}>Desconto</label>
              <input name="desconto_valor" type="number" step="0.01" min={0} value={form.desconto_valor} onChange={handleChange} className={inputCls} /></div>
            <div className="flex items-end"><div className="px-3 py-2.5 bg-gray-100 border rounded-lg text-sm w-full text-center">
              Subtotal: R$ {fmt(subtotal)}</div></div>
          </div>
          {descontoExcedido && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertTriangle size={16} /> Acima do máximo permitido ({maxDesconto}%)
            </div>
          )}
          {form.desconto_valor > 0 && (
            <div><label className={labelCls}>Observação do desconto <span className="text-red-500">*</span></label>
              <textarea name="desconto_obs" value={form.desconto_obs} onChange={handleChange} rows={2} className={`${inputCls} resize-none`} placeholder="Justifique o desconto aplicado..." /></div>
          )}
          <div className="flex justify-end pt-4 border-t">
            <div className="text-right">
              <p className="text-sm text-gray-500">Valor Final</p>
              <p className="text-3xl font-bold" style={{ color: ACCENT }}>R$ {fmt(valorFinal)}</p>
            </div>
          </div>
        </div>

        {/* SEÇÃO 5 - Condições de Pagamento */}
        <div className={sectionCls}>
          <h3 className="font-semibold text-gray-900">5. Condições de Pagamento</h3>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            {[['avista', 'À Vista'], ['sem_juros', 'Sem Juros'], ['com_juros', 'Com Juros']].map(([k, label]) => (
              <button key={k} type="button" onClick={() => setAbaPayment(k)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${abaPayment === k ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>

          {abaPayment === 'avista' && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">Desconto de <b>{descontoAvista}%</b> para pagamento à vista</p>
              <p className="text-2xl font-bold text-green-700 mt-1">R$ {fmt(valorAvista)}</p>
            </div>
          )}

          {abaPayment === 'sem_juros' && (
            <div className="space-y-3">
              <div><label className={labelCls}>Parcelas</label>
                <select name="parcelas_sem_juros" value={form.parcelas_sem_juros} onChange={handleChange} className={inputCls}>
                  {Array.from({ length: maxParcelas }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}x</option>)}
                </select></div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-lg font-bold text-blue-700">{form.parcelas_sem_juros}x de R$ {fmt(valorParcelaSemJuros)}</p>
                {valorParcelaSemJuros < parcelaMinima && <p className="text-sm text-red-600 mt-1">⚠ Parcela abaixo do mínimo (R$ {fmt(parcelaMinima)})</p>}
              </div>
            </div>
          )}

          {abaPayment === 'com_juros' && (
            <div className="space-y-3">
              <div><label className={labelCls}>Parcelas (taxa: {taxaJuros}% a.m.)</label>
                <select name="parcelas_com_juros" value={form.parcelas_com_juros} onChange={handleChange} className={inputCls}>
                  {Array.from({ length: maxParcelas }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}x</option>)}
                </select></div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-lg font-bold text-yellow-800">{form.parcelas_com_juros}x de R$ {fmt(valorParcelaComJuros)}</p>
                <p className="text-xs text-yellow-700">Total: R$ {fmt(valorParcelaComJuros * form.parcelas_com_juros)} (Sistema Price)</p>
                {valorParcelaComJuros < parcelaMinima && <p className="text-sm text-red-600 mt-1">⚠ Parcela abaixo do mínimo (R$ {fmt(parcelaMinima)})</p>}
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 6 - Validade e Envio */}
        <div className={sectionCls}>
          <h3 className="font-semibold text-gray-900">6. Validade e Envio</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className={labelCls}>Validade (dias)</label>
              <input name="validade_dias" type="number" min={1} value={form.validade_dias} onChange={handleChange} className={inputCls} /></div>
            <div><label className={labelCls}>Data de Expiração</label>
              <div className="px-3 py-2.5 bg-gray-100 border rounded-lg text-sm text-gray-700">{dataExpiracao}</div></div>
          </div>
          <div><label className={labelCls}>Mensagem Personalizada</label>
            <textarea name="mensagem" value={form.mensagem} onChange={handleChange} rows={3} className={`${inputCls} resize-none`}
              placeholder={config.mensagem_placeholder || 'Obrigado pelo interesse! Segue nossa proposta...'} /></div>
        </div>

        {/* Ações */}
        <div className="flex gap-3 justify-end pb-8">
          <button type="button" onClick={() => navigate('/admin/orcamentos')} className="px-5 py-2.5 border rounded-lg text-sm font-medium hover:bg-gray-50">
            Cancelar
          </button>
          <button type="button" onClick={() => handleSubmit('rascunho')} disabled={saving}
            className="px-5 py-2.5 border rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2">
            <Save size={16} /> Salvar Rascunho
          </button>
          <button type="button" onClick={() => handleSubmit('enviado')} disabled={saving} style={{ background: ACCENT }}
            className="px-5 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            <Send size={16} /> Salvar e Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
