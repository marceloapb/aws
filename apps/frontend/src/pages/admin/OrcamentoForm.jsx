import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Copy, Star, AlertTriangle,
  User, Package, DollarSign, CreditCard, Send, Check, Calendar, MapPin, FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#EA580C';
const STEPS = ['Cliente', 'Opções', 'Valores', 'Pagamento', 'Envio'];
const EVENTO_TIPOS = ['Cerimônia', 'Recepção', 'Festa', 'Ensaio', 'Making Of', 'Outro'];

const emptyEvento = () => ({ tipo: '', data: '', hora_inicio: '', hora_fim: '', local: '' });
const emptyOpcao = () => ({
  id: Date.now() + Math.random(),
  nome: '',
  descricao: '',
  destaque: false,
  eventos: [],
  itens_snapshot: [],
  desconto_tipo: 'pct',
  desconto_valor: 0,
});

export default function OrcamentoForm() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [clientes, setClientes] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [config, setConfig] = useState({ max_desconto: 30, desconto_avista: 5, taxa_juros: 1.99 });

  const [clienteId, setClienteId] = useState('');
  const [showCadastro, setShowCadastro] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ nome: '', email: '', telefone: '' });
  const [opcoes, setOpcoes] = useState([emptyOpcao()]);
  const [condicoes, setCondicoes] = useState({
    avista: { ativo: true, desconto_pct: 5 },
    sem_juros: { ativo: true, max_parcelas: 6 },
    com_juros: { ativo: true, max_parcelas: 12, taxa_mensal: 1.99 },
  });
  const [validadeDias, setValidadeDias] = useState(7);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    Promise.all([
      authFetch('/admin/clientes').then(r => r.json()),
      authFetch('/admin/catalogo').then(r => r.json()),
    ]).then(([cli, cat]) => {
      setClientes(Array.isArray(cli) ? cli : cli.data || []);
      setCatalogo(Array.isArray(cat) ? cat : cat.data || []);
    }).catch(console.error);
  }, []);

  const clienteSelecionado = useMemo(() => clientes.find(c => c.id === clienteId), [clientes, clienteId]);

  // ─── HELPERS ───
  const calcSubtotal = (op) => op.itens_snapshot.reduce((s, i) => s + i.valor_unitario * i.quantidade, 0);
  const calcDesconto = (op) => {
    const sub = calcSubtotal(op);
    return op.desconto_tipo === 'pct' ? sub * (op.desconto_valor / 100) : op.desconto_valor;
  };
  const calcTotal = (op) => Math.max(0, calcSubtotal(op) - calcDesconto(op));
  const calcPrice = (valor, parcelas, taxa) => {
    const i = taxa / 100;
    if (i === 0) return valor / parcelas;
    return valor * (i * Math.pow(1 + i, parcelas)) / (Math.pow(1 + i, parcelas) - 1);
  };
  const fmtBRL = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ─── ACTIONS ───
  const handleCadastroRapido = async () => {
    try {
      const res = await authFetch('/admin/clientes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoCliente),
      });
      const novo = await res.json();
      setClientes(prev => [...prev, novo]);
      setClienteId(novo.id);
      setShowCadastro(false);
      setNovoCliente({ nome: '', email: '', telefone: '' });
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (statusInterno) => {
    setLoading(true);
    const payload = {
      cliente_id: clienteId,
      status_interno: statusInterno,
      opcoes: opcoes.map(op => ({
        nome: op.nome,
        descricao: op.descricao,
        destaque: op.destaque,
        eventos: op.eventos,
        itens_snapshot: op.itens_snapshot.map(it => ({
          item_id: it.item_id, nome: it.nome, valor_unitario: it.valor_unitario,
          quantidade: it.quantidade, valor_total: it.valor_unitario * it.quantidade,
          snapshot_at: it.snapshot_at,
        })),
        desconto_tipo: op.desconto_tipo,
        desconto_valor: op.desconto_valor,
        valor_total: calcTotal(op),
      })),
      condicoes_pagamento: {
        avista: condicoes.avista.ativo ? { desconto_pct: condicoes.avista.desconto_pct } : {},
        sem_juros: condicoes.sem_juros.ativo ? { max_parcelas: condicoes.sem_juros.max_parcelas } : {},
        com_juros: condicoes.com_juros.ativo ? { max_parcelas: condicoes.com_juros.max_parcelas, taxa_mensal: condicoes.com_juros.taxa_mensal } : {},
      },
      validade_dias: validadeDias,
      mensagem,
    };
    try {
      await authFetch('/admin/orcamentos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      navigate('/admin/orcamentos');
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // ─── OPCAO MUTATIONS ───
  const updateOpcao = (idx, field, val) => setOpcoes(prev => prev.map((o, i) => i === idx ? { ...o, [field]: val } : o));
  const addOpcao = () => { if (opcoes.length < 5) setOpcoes([...opcoes, emptyOpcao()]); };
  const removeOpcao = (idx) => setOpcoes(prev => prev.filter((_, i) => i !== idx));
  const duplicarOpcao = (idx) => {
    if (opcoes.length >= 5) return;
    const dup = { ...JSON.parse(JSON.stringify(opcoes[idx])), id: Date.now() + Math.random(), nome: opcoes[idx].nome + ' (cópia)' };
    setOpcoes([...opcoes.slice(0, idx + 1), dup, ...opcoes.slice(idx + 1)]);
  };
  const addEvento = (oi) => { const u = [...opcoes]; u[oi].eventos.push(emptyEvento()); setOpcoes(u); };
  const updateEvento = (oi, ei, field, val) => { const u = [...opcoes]; u[oi].eventos[ei][field] = val; setOpcoes(u); };
  const removeEvento = (oi, ei) => { const u = [...opcoes]; u[oi].eventos.splice(ei, 1); setOpcoes(u); };
  const addItem = (oi, itemId) => {
    const item = catalogo.find(c => c.id === itemId);
    if (!item) return;
    const u = [...opcoes];
    u[oi].itens_snapshot.push({
      item_id: item.id, nome: item.nome, descricao: item.descricao || '',
      valor_unitario: item.valor || item.valor_unitario || 0,
      quantidade: 1, snapshot_at: new Date().toISOString(),
    });
    setOpcoes(u);
  };
  const updateItem = (oi, ii, field, val) => { const u = [...opcoes]; u[oi].itens_snapshot[ii][field] = val; setOpcoes(u); };
  const removeItem = (oi, ii) => { const u = [...opcoes]; u[oi].itens_snapshot.splice(ii, 1); setOpcoes(u); };

  // ─── PROGRESS BAR ───
  const ProgressBar = () => (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                i <= step ? 'text-white border-transparent' : 'text-gray-400 border-gray-300 bg-white'
              }`}
              style={i <= step ? { backgroundColor: ACCENT } : {}}
            >
              {i < step ? <Check size={16} /> : i + 1}
            </div>
            <span className={`text-xs mt-1 ${i <= step ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-orange-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  // ─── STEP 1: CLIENTE ───
  const StepCliente = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><User size={20} /> Selecione o Cliente</h2>
      <div className="flex gap-3">
        <select className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-300 outline-none"
          value={clienteId} onChange={e => setClienteId(e.target.value)}>
          <option value="">-- Selecionar cliente --</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome} — {c.email}</option>)}
        </select>
        <button type="button" onClick={() => setShowCadastro(!showCadastro)}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: ACCENT }}>
          Cadastro rápido
        </button>
      </div>
      {showCadastro && (
        <div className="border rounded-lg p-4 bg-orange-50 space-y-3">
          <h3 className="font-semibold text-sm">Novo cliente</h3>
          <input placeholder="Nome" className="w-full border rounded px-3 py-2 text-sm" value={novoCliente.nome} onChange={e => setNovoCliente({ ...novoCliente, nome: e.target.value })} />
          <input placeholder="Email" className="w-full border rounded px-3 py-2 text-sm" value={novoCliente.email} onChange={e => setNovoCliente({ ...novoCliente, email: e.target.value })} />
          <input placeholder="Telefone" className="w-full border rounded px-3 py-2 text-sm" value={novoCliente.telefone} onChange={e => setNovoCliente({ ...novoCliente, telefone: e.target.value })} />
          <button type="button" onClick={handleCadastroRapido} className="px-4 py-2 rounded text-white text-sm" style={{ backgroundColor: ACCENT }}>Salvar cliente</button>
        </div>
      )}
      {clienteSelecionado && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <p className="font-semibold">{clienteSelecionado.nome}</p>
          <p className="text-sm text-gray-600">{clienteSelecionado.email} • {clienteSelecionado.telefone}</p>
        </div>
      )}
    </div>
  );

  // ─── STEP 2: OPÇÕES ───
  const StepOpcoes = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2"><Package size={20} /> Opções do Orçamento</h2>
        <button type="button" onClick={addOpcao} disabled={opcoes.length >= 5}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-white text-sm disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
          <Plus size={14} /> Opção
        </button>
      </div>
      {opcoes.map((opcao, oi) => (
        <div key={opcao.id} className="border rounded-lg p-4 space-y-3 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <input placeholder="Nome da opção" className="flex-1 border rounded px-3 py-2 font-semibold"
              value={opcao.nome} onChange={e => updateOpcao(oi, 'nome', e.target.value)} />
            <div className="flex items-center gap-2 ml-3">
              <button type="button" onClick={() => updateOpcao(oi, 'destaque', !opcao.destaque)}
                className={`p-2 rounded ${opcao.destaque ? 'text-orange-600 bg-orange-100' : 'text-gray-400'}`} title="Destaque">
                <Star size={18} fill={opcao.destaque ? ACCENT : 'none'} />
              </button>
              <button type="button" onClick={() => duplicarOpcao(oi)} className="p-2 text-gray-500 hover:text-blue-600" title="Duplicar"><Copy size={16} /></button>
              <button type="button" onClick={() => removeOpcao(oi)} className="p-2 text-gray-500 hover:text-red-600" title="Remover"
                disabled={opcoes.length <= 1}><Trash2 size={16} /></button>
            </div>
          </div>
          <textarea placeholder="Descrição" className="w-full border rounded px-3 py-2 text-sm" rows={2}
            value={opcao.descricao} onChange={e => updateOpcao(oi, 'descricao', e.target.value)} />
          {/* Eventos */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold flex items-center gap-1"><Calendar size={14} /> Eventos</span>
              <button type="button" onClick={() => addEvento(oi)} className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 flex items-center gap-1"><Plus size={12} /> Evento</button>
            </div>
            {opcao.eventos.map((ev, ei) => (
              <div key={ei} className="grid grid-cols-6 gap-2 mb-2 items-center">
                <select className="border rounded px-2 py-1 text-sm" value={ev.tipo} onChange={e => updateEvento(oi, ei, 'tipo', e.target.value)}>
                  <option value="">Tipo</option>
                  {EVENTO_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="date" className="border rounded px-2 py-1 text-sm" value={ev.data} onChange={e => updateEvento(oi, ei, 'data', e.target.value)} />
                <input type="time" className="border rounded px-2 py-1 text-sm" value={ev.hora_inicio} onChange={e => updateEvento(oi, ei, 'hora_inicio', e.target.value)} />
                <input type="time" className="border rounded px-2 py-1 text-sm" value={ev.hora_fim} onChange={e => updateEvento(oi, ei, 'hora_fim', e.target.value)} />
                <input placeholder="Local" className="border rounded px-2 py-1 text-sm" value={ev.local} onChange={e => updateEvento(oi, ei, 'local', e.target.value)} />
                <button type="button" onClick={() => removeEvento(oi, ei)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          {/* Itens */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Itens de Produtos e Serviços</span>
              <select className="text-xs border rounded px-2 py-1" onChange={e => { addItem(oi, e.target.value); e.target.value = ''; }} defaultValue="">
                <option value="">+ Adicionar Item</option>
                {catalogo.map(c => <option key={c.id} value={c.id}>{c.nome} — {fmtBRL(c.valor || c.valor_unitario || 0)}</option>)}
              </select>
            </div>
            {opcao.itens_snapshot.map((it, ii) => (
              <div key={ii} className="flex items-center gap-2 mb-1 text-sm bg-gray-50 rounded px-2 py-1">
                <span className="flex-1 truncate">{it.nome}</span>
                <input type="number" min={0} step={0.01} className="w-24 border rounded px-1 py-0.5 text-center text-sm"
                  value={it.valor_unitario} onChange={e => updateItem(oi, ii, 'valor_unitario', Math.max(0, +e.target.value))} />
                <span className="text-gray-400">×</span>
                <input type="number" min={1} className="w-14 border rounded px-1 py-0.5 text-center" value={it.quantidade}
                  onChange={e => updateItem(oi, ii, 'quantidade', Math.max(1, +e.target.value))} />
                <span className="font-medium w-24 text-right">{fmtBRL(it.valor_unitario * it.quantidade)}</span>
                <button type="button" onClick={() => removeItem(oi, ii)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="border-t pt-2 text-right">
            <span className="text-sm text-gray-500">Subtotal:</span>
            <span className="ml-2 font-bold text-lg">{fmtBRL(calcSubtotal(opcao))}</span>
          </div>
        </div>
      ))}
    </div>
  );


  // ─── STEP 3: VALORES ───
  const StepValores = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><DollarSign size={20} /> Descontos e Valores Finais</h2>
      {opcoes.map((opcao, oi) => {
        const sub = calcSubtotal(opcao);
        const desc = calcDesconto(opcao);
        const total = calcTotal(opcao);
        const excede = opcao.desconto_tipo === 'pct' ? opcao.desconto_valor > config.max_desconto : desc > sub * (config.max_desconto / 100);
        return (
          <div key={opcao.id} className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
            <h3 className="font-semibold">{opcao.nome || `Opção ${oi + 1}`}</h3>
            <div className="flex items-center gap-3">
              <select className="border rounded px-3 py-2 text-sm" value={opcao.desconto_tipo}
                onChange={e => updateOpcao(oi, 'desconto_tipo', e.target.value)}>
                <option value="pct">Percentual (%)</option>
                <option value="fixo">Valor fixo (R$)</option>
              </select>
              <input type="number" min={0} step={0.01} className="w-28 border rounded px-3 py-2 text-sm"
                value={opcao.desconto_valor} onChange={e => updateOpcao(oi, 'desconto_valor', Math.max(0, +e.target.value))} />
              <span className="text-sm text-gray-500">Desconto: {fmtBRL(desc)}</span>
            </div>
            {excede && (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 text-sm">
                <AlertTriangle size={16} /> Desconto excede o máximo permitido ({config.max_desconto}%)
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-gray-500">Subtotal: {fmtBRL(sub)}</span>
              <span className="text-lg font-bold" style={{ color: ACCENT }}>Total: {fmtBRL(total)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );


  // ─── STEP 4: PAGAMENTO ───
  const StepPagamento = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><CreditCard size={20} /> Condições de Pagamento</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* À Vista */}
        <div className={`border rounded-lg p-4 space-y-3 ${condicoes.avista.ativo ? 'bg-white shadow-sm' : 'bg-gray-50 opacity-60'}`}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">À Vista</h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={condicoes.avista.ativo}
                onChange={e => setCondicoes({ ...condicoes, avista: { ...condicoes.avista, ativo: e.target.checked } })} />
              <div className="w-9 h-5 bg-gray-200 peer-checked:bg-orange-500 rounded-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Desconto %</label>
            <input type="number" min={0} max={100} className="w-20 border rounded px-2 py-1 text-sm"
              value={condicoes.avista.desconto_pct} onChange={e => setCondicoes({ ...condicoes, avista: { ...condicoes.avista, desconto_pct: +e.target.value } })} />
          </div>
          {condicoes.avista.ativo && opcoes.map((op, i) => {
            const total = calcTotal(op);
            const val = total * (1 - condicoes.avista.desconto_pct / 100);
            return <p key={i} className="text-xs text-gray-600">{op.nome || `Opção ${i+1}`}: <span className="font-semibold">{fmtBRL(val)}</span></p>;
          })}
        </div>
        {/* Sem Juros */}
        <div className={`border rounded-lg p-4 space-y-3 ${condicoes.sem_juros.ativo ? 'bg-white shadow-sm' : 'bg-gray-50 opacity-60'}`}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Sem Juros</h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={condicoes.sem_juros.ativo}
                onChange={e => setCondicoes({ ...condicoes, sem_juros: { ...condicoes.sem_juros, ativo: e.target.checked } })} />
              <div className="w-9 h-5 bg-gray-200 peer-checked:bg-orange-500 rounded-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Parcelas</label>
            <input type="number" min={1} max={24} className="w-20 border rounded px-2 py-1 text-sm"
              value={condicoes.sem_juros.max_parcelas} onChange={e => setCondicoes({ ...condicoes, sem_juros: { ...condicoes.sem_juros, max_parcelas: +e.target.value } })} />
          </div>
          {condicoes.sem_juros.ativo && opcoes.map((op, i) => {
            const total = calcTotal(op);
            const parc = total / condicoes.sem_juros.max_parcelas;
            return <p key={i} className="text-xs text-gray-600">{op.nome || `Opção ${i+1}`}: {condicoes.sem_juros.max_parcelas}× <span className="font-semibold">{fmtBRL(parc)}</span></p>;
          })}
        </div>
        {/* Com Juros */}
        <div className={`border rounded-lg p-4 space-y-3 ${condicoes.com_juros.ativo ? 'bg-white shadow-sm' : 'bg-gray-50 opacity-60'}`}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Com Juros</h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={condicoes.com_juros.ativo}
                onChange={e => setCondicoes({ ...condicoes, com_juros: { ...condicoes.com_juros, ativo: e.target.checked } })} />
              <div className="w-9 h-5 bg-gray-200 peer-checked:bg-orange-500 rounded-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Parcelas</label>
            <input type="number" min={1} max={48} className="w-16 border rounded px-2 py-1 text-sm"
              value={condicoes.com_juros.max_parcelas} onChange={e => setCondicoes({ ...condicoes, com_juros: { ...condicoes.com_juros, max_parcelas: +e.target.value } })} />
            <label className="text-xs text-gray-500">Taxa %</label>
            <input type="number" min={0} step={0.01} className="w-16 border rounded px-2 py-1 text-sm"
              value={condicoes.com_juros.taxa_mensal} onChange={e => setCondicoes({ ...condicoes, com_juros: { ...condicoes.com_juros, taxa_mensal: +e.target.value } })} />
          </div>
          {condicoes.com_juros.ativo && opcoes.map((op, i) => {
            const total = calcTotal(op);
            const parc = calcPrice(total, condicoes.com_juros.max_parcelas, condicoes.com_juros.taxa_mensal);
            return <p key={i} className="text-xs text-gray-600">{op.nome || `Opção ${i+1}`}: {condicoes.com_juros.max_parcelas}× <span className="font-semibold">{fmtBRL(parc)}</span></p>;
          })}
        </div>
      </div>
    </div>
  );


  // ─── STEP 5: ENVIO ───
  const StepEnvio = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><Send size={20} /> Envio</h2>
      <div className="border rounded-lg p-4 bg-white shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Validade (dias)</label>
          <input type="number" min={1} max={90} className="w-20 border rounded px-3 py-2 text-sm"
            value={validadeDias} onChange={e => setValidadeDias(Math.max(1, +e.target.value))} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Mensagem personalizada</label>
          <textarea className="w-full border rounded px-3 py-2 text-sm" rows={4} placeholder="Mensagem que acompanhará o orçamento..."
            value={mensagem} onChange={e => setMensagem(e.target.value)} />
        </div>
        <div className="flex items-center gap-3 pt-4 border-t">
          <button type="button" onClick={() => handleSubmit('rascunho')} disabled={loading}
            className="px-5 py-2.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Salvar Rascunho
          </button>
          <button type="button" onClick={() => handleSubmit('enviado')} disabled={loading || !clienteId}
            className="px-5 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            style={{ backgroundColor: ACCENT }}>
            <Send size={16} /> Enviar Orçamento
          </button>
        </div>
      </div>
    </div>
  );

  // ─── RENDER ───
  const stepContent = [StepCliente, StepOpcoes, StepValores, StepPagamento, StepEnvio];
  const CurrentStep = stepContent[step];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <FileText size={24} style={{ color: '#EA580C' }} />
          <h1 className="text-2xl font-bold text-gray-900">Novo Orçamento</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/admin/orcamentos')} className="text-sm text-gray-500 hover:text-gray-700">← Voltar</button>
        </div>
      </div>

      <ProgressBar />

      <div className="min-h-[400px]">
        <CurrentStep />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t">
        <button type="button" onClick={() => setStep(s => s - 1)} disabled={step === 0}
          className="flex items-center gap-1 px-4 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30">
          <ChevronLeft size={16} /> Anterior
        </button>
        <span className="text-sm text-gray-400">{step + 1} de {STEPS.length}</span>
        {step < STEPS.length - 1 && (
          <button type="button" onClick={() => setStep(s => s + 1)}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: ACCENT }}>
            Próximo <ChevronRight size={16} />
          </button>
        )}
        {step === STEPS.length - 1 && <div />}
      </div>
    </div>
  );
}
