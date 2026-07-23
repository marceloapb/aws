import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft, Plus, Trash2, Search, ChevronDown, ChevronUp,
  AlertTriangle, Check, Send, Save, Package, Tag,
  DollarSign, CreditCard, Info, Star, Copy, RefreshCw, Clock, MapPin, Navigation,
} from 'lucide-react';
import MapEmbed from '../../components/MapEmbed';
import DistanceBadge from '../../components/DistanceBadge';

const ACCENT = '#EA580C';
const fmtBRL = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '-';

// ─── Helpers de cálculo (puras) ────────────────────────────────────────────
function calcSubtotal(itens) {
  return (itens || []).reduce((s, i) => s + (Number(i.valor_unitario) || 0) * (Number(i.quantidade) || 1), 0);
}
function calcDesconto(subtotal, tipo, valor) {
  if (!valor || valor <= 0) return 0;
  return tipo === 'pct' ? subtotal * (valor / 100) : Math.min(valor, subtotal);
}
function calcTotal(itens, dTipo, dValor) {
  const sub = calcSubtotal(itens);
  return Math.max(0, sub - calcDesconto(sub, dTipo, dValor));
}
function calcParcela(valor, parcelas, taxaMensal) {
  if (!parcelas || parcelas <= 0) return 0;
  const i = (taxaMensal || 0) / 100;
  if (i === 0) return valor / parcelas;
  return valor * (i * Math.pow(1 + i, parcelas)) / (Math.pow(1 + i, parcelas) - 1);
}

// Calcula horas do evento a partir de horario_inicio e horario_fim
function calcHorasEvento(horarioInicio, horarioFim) {
  if (!horarioInicio || !horarioFim) return 0;
  const [hi, mi] = horarioInicio.split(':').map(Number);
  const [hf, mf] = horarioFim.split(':').map(Number);
  const horas = (hf + mf / 60) - (hi + mi / 60);
  return Math.max(0, horas);
}

// Calcula horas inclusas nos itens de serviço
function calcHorasInclusas(itens) {
  return (itens || []).reduce(
    (sum, item) => sum + ((item.duracao_base || item.horas_incluidas || item.duracao || 0) * (item.quantidade || 1)), 0
  );
}

const TIPO_LABEL = { servico_principal: 'Serviço', produto: 'Produto', adicional: 'Adicional', pacote: 'Pacote', manual: 'Manual' };
const TIPO_COLOR = { servico_principal: 'bg-blue-50 text-blue-700', produto: 'bg-purple-50 text-purple-700', adicional: 'bg-teal-50 text-teal-700', pacote: 'bg-orange-50 text-orange-700', manual: 'bg-gray-100 text-gray-700' };


// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export default function OrcamentoEditar() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNovaOpcao = searchParams.get('novaOpcao') === 'true';

  // ─── Estado remoto ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orcamento, setOrcamento] = useState(null);
  const [catalogoItens, setCatalogoItens] = useState([]);
  const [catalogoPacotes, setCatalogoPacotes] = useState([]);
  const [config, setConfig] = useState({ max_desconto: 30, desconto_avista: 5, taxa_juros: 1.99 });
  const [toast, setToast] = useState(null);

  // ─── Estado de edição ──────────────────────────────────────────────────────
  const [itens, setItens] = useState([]);
  const [descontoTipo, setDescontoTipo] = useState('pct');
  const [descontoValor, setDescontoValor] = useState(0);
  const [descontoAplicarEm, setDescontoAplicarEm] = useState('tudo'); // 'tudo', 'avista', 'parcelado'
  const [condicoes, setCondicoes] = useState({
    avista: { ativo: true, desconto_pct: 5 },
    sem_juros: { ativo: true, max_parcelas: 6 },
    com_juros: { ativo: true, max_parcelas: 12, taxa_mensal: 1.99 },
  });
  const [validadeDias, setValidadeDias] = useState(7);
  const [mensagem, setMensagem] = useState('');
  const [titulo, setTitulo] = useState('');

  // ─── UI state ────────────────────────────────────────────────────────────
  const [searchCatalog, setSearchCatalog] = useState('');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [catalogTab, setCatalogTab] = useState('todos'); // 'todos', 'pacotes', 'produtos', 'servicos'
  const [expandedSections, setExpandedSections] = useState({ cliente: false, evento: true, pagamento: false });

  // ─── Carregar dados ───────────────────────────────────────────────────────
  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/admin/orcamentos/${id}/editar`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      const { orcamento: orc, itens_sugeridos, catalogo, config: cfg } = json.data;
      setOrcamento(orc);
      setCatalogoItens(catalogo?.itens || []);
      setCatalogoPacotes(catalogo?.pacotes || []);
      setConfig({ max_desconto: cfg?.max_desconto ?? 30, desconto_avista: cfg?.desconto_avista ?? 5, taxa_juros: cfg?.taxa_juros ?? 1.99 });
      setTitulo(orc.titulo || orc.nome_evento || orc.tipo_evento || '');
      setMensagem(orc.mensagem || '');
      setValidadeDias(orc.validade_dias || 7);

      // Se já tem opções salvas, usa a primeira; senão usa os itens sugeridos
      // Se isNovaOpcao, começar com itens em branco para criar nova opção
      const opcaoSalva = isNovaOpcao ? null : (orc.opcoes || [])[0];
      const catalogoItensArr = catalogo?.itens || [];
      if (opcaoSalva && (opcaoSalva.itens_snapshot || []).length > 0) {
        // Re-enriquecer itens do snapshot com dados atuais do catálogo
        // (para itens salvos antes de duracao_base/valor_hora_adicional existirem)
        const itensEnriquecidos = opcaoSalva.itens_snapshot.map(i => {
          const catalogoItem = i.item_id ? catalogoItensArr.find(c => c.id === i.item_id) : null;
          return {
            ...i,
            duracao_base: i.duracao_base || (catalogoItem?.duracao_base ?? 0),
            valor_hora_adicional: i.valor_hora_adicional || (catalogoItem?.valor_hora_adicional ?? 0),
            _key: Math.random(),
          };
        });
        setItens(itensEnriquecidos);
        setDescontoTipo(opcaoSalva.desconto_tipo || 'pct');
        setDescontoValor(opcaoSalva.desconto_valor || 0);
        setDescontoAplicarEm(opcaoSalva.desconto_aplicar_em || 'tudo');
        // Valor hora adicional agora é sempre automático (do catálogo)
      } else if (itens_sugeridos && itens_sugeridos.length > 0) {
        setItens(itens_sugeridos.map(i => ({ ...i, _key: Math.random() })));
      }

      // Condições de pagamento
      const cond = orc.condicoes_pagamento || orc.condicoes;
      if (cond) {
        setCondicoes({
          avista: { ativo: cond.avista?.ativo ?? true, desconto_pct: cond.avista?.desconto_pct ?? cfg?.desconto_avista ?? 5 },
          sem_juros: { ativo: cond.sem_juros?.ativo ?? true, max_parcelas: cond.sem_juros?.max_parcelas ?? 6 },
          com_juros: { ativo: cond.com_juros?.ativo ?? true, max_parcelas: cond.com_juros?.max_parcelas ?? 12, taxa_mensal: cond.com_juros?.taxa_mensal ?? cfg?.taxa_juros ?? 1.99 },
        });
      } else {
        setCondicoes(c => ({ ...c, avista: { ...c.avista, desconto_pct: cfg?.desconto_avista ?? 5 }, com_juros: { ...c.com_juros, taxa_mensal: cfg?.taxa_juros ?? 1.99 } }));
      }
    } catch (e) {
      showToast('Erro ao carregar orçamento: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Toast helper ────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };


  // ─── Cálculos derivados ───────────────────────────────────────────────────
  const subtotal = useMemo(() => calcSubtotal(itens), [itens]);
  const descontoValorCalculado = useMemo(() => calcDesconto(subtotal, descontoTipo, descontoValor), [subtotal, descontoTipo, descontoValor]);
  // Desconto aplicado no total geral só quando é "tudo"
  const total = useMemo(() => {
    if (descontoAplicarEm === 'tudo') return Math.max(0, subtotal - descontoValorCalculado);
    return subtotal;
  }, [subtotal, descontoValorCalculado, descontoAplicarEm]);

  const maxDescontoExcedido = useMemo(() => {
    if (!descontoValor || descontoValor <= 0) return false;
    const pct = descontoTipo === 'pct' ? descontoValor : (subtotal > 0 ? (descontoValorCalculado / subtotal) * 100 : 0);
    return pct > config.max_desconto;
  }, [descontoValor, descontoTipo, descontoValorCalculado, subtotal, config.max_desconto]);

  // ─── Horas extras ─────────────────────────────────────────────────────────
  const horasEvento = useMemo(() => {
    if (!orcamento) return 0;
    return calcHorasEvento(orcamento.horario_inicio, orcamento.horario_fim);
  }, [orcamento]);

  const horasInclusas = useMemo(() => calcHorasInclusas(itens), [itens]);
  const horasExtras = useMemo(() => Math.max(0, horasEvento - horasInclusas), [horasEvento, horasInclusas]);

  // Valor hora adicional: derivado do maior valor_hora_adicional dos itens de serviço
  // Só existe se algum item do catálogo tiver esse campo > 0
  const valorHoraExtraDosItens = useMemo(() => {
    const valores = (itens || [])
      .filter(i => i.valor_hora_adicional && i.valor_hora_adicional > 0)
      .map(i => Number(i.valor_hora_adicional));
    return valores.length > 0 ? Math.max(...valores) : 0;
  }, [itens]);

  const valorHoraExtra = valorHoraExtraDosItens;
  const temHoraAdicional = valorHoraExtraDosItens > 0;

  const subtotalHorasExtras = useMemo(() => temHoraAdicional ? horasExtras * valorHoraExtra : 0, [horasExtras, valorHoraExtra, temHoraAdicional]);

  // Total incluindo horas extras
  const totalComExtras = useMemo(() => total + subtotalHorasExtras, [total, subtotalHorasExtras]);

  const parcelaAvista = useMemo(() => {
    let base = totalComExtras;
    if (descontoAplicarEm === 'avista') base = Math.max(0, base - descontoValorCalculado);
    return base * (1 - (condicoes.avista.desconto_pct || 0) / 100);
  }, [totalComExtras, condicoes.avista.desconto_pct, descontoAplicarEm, descontoValorCalculado]);
  const parcelaSemJuros = useMemo(() => {
    let base = totalComExtras;
    if (descontoAplicarEm === 'parcelado') base = Math.max(0, base - descontoValorCalculado);
    return base / Math.max(1, condicoes.sem_juros.max_parcelas);
  }, [totalComExtras, condicoes.sem_juros.max_parcelas, descontoAplicarEm, descontoValorCalculado]);
  const parcelaComJuros = useMemo(() => {
    let base = totalComExtras;
    if (descontoAplicarEm === 'parcelado') base = Math.max(0, base - descontoValorCalculado);
    return calcParcela(base, condicoes.com_juros.max_parcelas, condicoes.com_juros.taxa_mensal);
  }, [totalComExtras, condicoes.com_juros, descontoAplicarEm, descontoValorCalculado]);

  // ─── Mutações de itens ────────────────────────────────────────────────────
  const updateItem = useCallback((key, field, val) =>
    setItens(prev => prev.map(i => i._key === key ? { ...i, [field]: field === 'valor_unitario' || field === 'quantidade' ? Math.max(0, Number(val)) : val } : i)),
  []);
  const removeItem = useCallback((key) => setItens(prev => prev.filter(i => i._key !== key)), []);
  const addFromCatalog = useCallback((catalogItem) => {
    setItens(prev => [...prev, {
      item_id: catalogItem.id,
      nome: catalogItem.nome,
      descricao: catalogItem.descricao || '',
      valor_unitario: catalogItem.valor_base || 0,
      valor_sugerido: catalogItem.valor_base || 0,
      quantidade: 1,
      tipo: catalogItem.tipo || 'servico_principal',
      origem: 'admin',
      duracao_base: catalogItem.duracao_base || 0,
      valor_hora_adicional: catalogItem.valor_hora_adicional || 0,
      _key: Math.random(),
      snapshot_at: new Date().toISOString(),
    }]);
    setShowAddPanel(false);
    setSearchCatalog('');
    setCatalogTab('todos');
  }, []);
  const addItemManual = useCallback(() => {
    setItens(prev => [...prev, {
      item_id: null,
      nome: '',
      descricao: '',
      valor_unitario: 0,
      valor_sugerido: 0,
      quantidade: 1,
      tipo: 'manual',
      origem: 'admin_manual',
      _key: Math.random(),
      snapshot_at: new Date().toISOString(),
    }]);
  }, []);

  // ─── Catálogo filtrado para busca ─────────────────────────────────────────
  const catalogoFiltrado = useMemo(() => {
    let items = catalogoItens;
    // Filter by tab
    if (catalogTab === 'pacotes') {
      // Return pacotes as items
      let pacotes = catalogoPacotes.map(p => ({ ...p, tipo: 'pacote', valor_base: p.valor_base || 0 }));
      if (searchCatalog.trim()) {
        const q = searchCatalog.toLowerCase();
        pacotes = pacotes.filter(p => p.nome.toLowerCase().includes(q) || (p.descricao || '').toLowerCase().includes(q));
      }
      return pacotes;
    } else if (catalogTab === 'produtos') {
      items = catalogoItens.filter(c => c.tipo === 'produto');
    } else if (catalogTab === 'servicos') {
      items = catalogoItens.filter(c => c.tipo === 'servico_principal' || c.tipo === 'adicional');
    }
    if (!searchCatalog.trim()) return items;
    const q = searchCatalog.toLowerCase();
    return items.filter(c => c.nome.toLowerCase().includes(q) || (c.descricao || '').toLowerCase().includes(q));
  }, [catalogoItens, catalogoPacotes, searchCatalog, catalogTab]);

  // ─── Salvar ───────────────────────────────────────────────────────────────
  const handleSave = async (enviar = false) => {
    // Bloquear se desconto excede o limite configurado
    if (maxDescontoExcedido) {
      showToast(`Desconto excede o limite de ${config.max_desconto}%. Corrija o valor antes de salvar.`, 'error');
      return;
    }

    setSaving(true);
    try {
      const novaOpcao = {
          id: isNovaOpcao ? `opcao-${Date.now()}` : 'principal',
          nome: titulo || (isNovaOpcao ? `Opção ${(orcamento?.opcoes?.length || 0) + 1}` : 'Proposta'),
          destaque: !isNovaOpcao,
          itens_snapshot: itens.map(({ _key, ...i }) => ({ ...i, valor_total: (i.valor_unitario || 0) * (i.quantidade || 1) })),
          desconto_tipo: descontoTipo,
          desconto_valor: descontoValor,
          desconto_aplicar_em: descontoAplicarEm,
          valor_total: totalComExtras,
          horas_evento: horasEvento,
          horas_inclusas: horasInclusas,
          horas_extras: horasExtras,
          valor_hora_extra: valorHoraExtra,
          subtotal_horas_extras: subtotalHorasExtras,
        };

      const opcoesFinais = isNovaOpcao
        ? [...(orcamento?.opcoes || []), novaOpcao]
        : [novaOpcao];

      const payload = {
        titulo: titulo || orcamento?.nome_evento || 'Orçamento',
        opcoes: opcoesFinais,
        condicoes_pagamento: {
          avista: condicoes.avista.ativo ? { ativo: true, desconto_pct: condicoes.avista.desconto_pct } : { ativo: false },
          sem_juros: condicoes.sem_juros.ativo ? { ativo: true, max_parcelas: condicoes.sem_juros.max_parcelas } : { ativo: false },
          com_juros: condicoes.com_juros.ativo ? { ativo: true, max_parcelas: condicoes.com_juros.max_parcelas, taxa_mensal: condicoes.com_juros.taxa_mensal } : { ativo: false },
        },
        valor_total: totalComExtras,
        validade_dias: validadeDias,
        mensagem,
        status: enviar ? 'enviado' : (orcamento?.status === 'solicitado' || orcamento?.status === 'rascunho' ? 'rascunho' : orcamento?.status),
        updatedAt: new Date().toISOString(),
      };

      const res = await authFetch(`/admin/orcamentos/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      if (enviar) {
        await authFetch(`/admin/orcamentos/${id}/enviar`, { method: 'POST' });
        showToast('Orçamento salvo e enviado ao cliente!', 'success');
        setTimeout(() => navigate(`/admin/orcamentos/${id}`), 1200);
      } else {
        showToast('Orçamento salvo com sucesso!', 'success');
        setTimeout(() => navigate(`/admin/orcamentos/${id}`), 1200);
      }
    } catch (e) {
      showToast('Erro ao salvar: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };


  // ─── Loading / Not found ─────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">Carregando orçamento...</span>
    </div>
  );
  if (!orcamento) return (
    <div className="text-center py-24 text-gray-400">Orçamento não encontrado.</div>
  );

  const cliente = orcamento.cliente || {};
  const itensSugeridosCount = itens.filter(i => i.origem === 'pacote' || i.origem === 'cliente').length;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/admin/orcamentos/${id}`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{isNovaOpcao ? 'Nova Opção' : 'Editar Orçamento'}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {orcamento.nome_evento || orcamento.tipo_evento || `#${id?.slice(0, 8)}`}
              {orcamento.data_evento && <> · <span className="font-medium">{fmtDate(orcamento.data_evento)}</span></>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleSave(false)} disabled={saving || maxDescontoExcedido}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {saving ? <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <Save size={14} />}
            Salvar Rascunho
          </button>
          <button onClick={() => handleSave(true)} disabled={saving || maxDescontoExcedido}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 hover:opacity-90"
            style={{ background: ACCENT }}>
            {saving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={14} />}
            Salvar e Enviar
          </button>
        </div>
      </div>

      {/* ── Banner de itens sugeridos ── */}
      {itensSugeridosCount > 0 && (
        <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <Info size={16} className="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <span className="font-semibold">{itensSugeridosCount} item{itensSugeridosCount > 1 ? 'ns' : ''} pré-selecionado{itensSugeridosCount > 1 ? 's' : ''} pelo cliente</span>
            <span className="text-blue-600"> — verifique os preços sugeridos e ajuste conforme necessário.</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ══════════════════════════════════════════════
            COLUNA ESQUERDA — Dados + Itens
        ══════════════════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-5">

          {/* Título do orçamento */}
          <div className="bg-white rounded-xl border p-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Título do Orçamento</label>
            <input
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
              placeholder="Ex: Casamento João e Maria — Pacote Premium"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
            />
          </div>

          {/* Dados do Cliente */}
          <Collapsible
            title="Cliente"
            badge={cliente.nome}
            expanded={expandedSections.cliente}
            onToggle={() => setExpandedSections(s => ({ ...s, cliente: !s.cliente }))}>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <InfoField label="Nome" value={cliente.nome} />
              <InfoField label="E-mail" value={cliente.email} />
              <InfoField label="Telefone" value={cliente.telefone} />
            </div>
          </Collapsible>

          {/* Evento */}
          <Collapsible
            title="Evento"
            badge={orcamento.nome_evento || orcamento.tipo_evento}
            expanded={expandedSections.evento}
            onToggle={() => setExpandedSections(s => ({ ...s, evento: !s.evento }))}>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <InfoField label="Nome do Evento" value={orcamento.nome_evento || orcamento.tipo_evento} />
              <InfoField label="Data" value={fmtDate(orcamento.data_evento)} />
              {orcamento.horario_inicio && <InfoField label="Horário Início" value={orcamento.horario_inicio} />}
              {orcamento.horario_fim && <InfoField label="Horário Fim" value={orcamento.horario_fim} />}
              {(orcamento.local || orcamento.local_evento) && <InfoField label="Local" value={orcamento.local || orcamento.local_evento} className="sm:col-span-2" />}
            </div>
            {orcamento.observacoes && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                <span className="font-semibold block mb-1">Observações do cliente:</span>
                {orcamento.observacoes}
              </div>
            )}
            {/* Google Maps + Distância */}
            {(orcamento.local || orcamento.local_evento) && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase">Localização do Evento</span>
                </div>
                <MapEmbed endereco={orcamento.local || orcamento.local_evento} lat={orcamento.local_lat} lng={orcamento.local_lng} altura={180} />
                <DistanceBadge
                  distancia_km={orcamento.distancia_km}
                  duracao_minutos={orcamento.duracao_minutos}
                  endereco={orcamento.local || orcamento.local_evento}
                />
              </div>
            )}
          </Collapsible>

          {/* ─── TABELA DE ITENS ─── */}
          <div className="bg-white rounded-xl border">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Produtos, Serviços e Pacotes</h3>
              <div className="flex gap-2">
                <button onClick={addItemManual}
                  className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                  <Plus size={12} /> Item manual
                </button>
                <button onClick={() => setShowAddPanel(v => !v)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-medium hover:opacity-90"
                  style={{ background: ACCENT }}>
                  <Package size={12} /> Do catálogo
                </button>
              </div>
            </div>

            {/* Painel de busca no catálogo */}
            {showAddPanel && (
              <div className="px-5 py-4 border-b bg-orange-50">
                {/* Tabs: Pacotes, Produtos, Serviços */}
                <div className="flex gap-1 mb-3 overflow-x-auto">
                  {[
                    { key: 'todos', label: 'Todos' },
                    { key: 'pacotes', label: 'Pacotes' },
                    { key: 'produtos', label: 'Produtos' },
                    { key: 'servicos', label: 'Serviços' },
                  ].map(tab => (
                    <button key={tab.key} onClick={() => setCatalogTab(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        catalogTab === tab.key
                          ? 'bg-orange-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    autoFocus
                    className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none bg-white"
                    placeholder={`Buscar ${catalogTab === 'pacotes' ? 'pacote' : catalogTab === 'produtos' ? 'produto' : catalogTab === 'servicos' ? 'serviço' : 'item'} do catálogo...`}
                    value={searchCatalog}
                    onChange={e => setSearchCatalog(e.target.value)}
                  />
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {catalogoFiltrado.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">Nenhum item encontrado</p>
                  )}
                  {catalogoFiltrado.map(item => (
                    <button key={item.id} onClick={() => addFromCatalog(item)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white border border-transparent hover:border-orange-200 text-left transition-all group">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${TIPO_COLOR[item.tipo] || 'bg-gray-100 text-gray-600'}`}>
                          {TIPO_LABEL[item.tipo] || item.tipo}
                        </span>
                        <span className="text-sm font-medium text-gray-800 truncate">{item.nome}</span>
                      </div>
                      {item.valor_base > 0 && (
                        <span className="shrink-0 ml-3 text-sm font-bold text-orange-600">{fmtBRL(item.valor_base)}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de itens */}
            <div className="divide-y">
              {itens.length === 0 && (
                <div className="flex flex-col items-center py-12 text-gray-400 gap-2">
                  <Package size={32} strokeWidth={1} />
                  <p className="text-sm">Nenhum item adicionado ainda.</p>
                  <p className="text-xs">Use "Do catálogo" ou "Item manual" para começar.</p>
                </div>
              )}
              {itens.map((item) => (
                <ItemRow
                  key={item._key}
                  item={item}
                  onUpdate={(f, v) => updateItem(item._key, f, v)}
                  onRemove={() => removeItem(item._key)}
                />
              ))}
            </div>

            {itens.length > 0 && (
              <div className="px-5 py-3 bg-gray-50 rounded-b-xl flex justify-end gap-6 text-sm border-t">
                <span className="text-gray-500">Subtotal: <span className="font-semibold text-gray-800">{fmtBRL(subtotal)}</span></span>
              </div>
            )}
          </div>

          {/* ─── CONDIÇÕES DE PAGAMENTO ─── */}
          <Collapsible
            title="Condições de Pagamento"
            expanded={expandedSections.pagamento}
            onToggle={() => setExpandedSections(s => ({ ...s, pagamento: !s.pagamento }))}>
            <div className="grid sm:grid-cols-3 gap-4">
              <PaymentOption
                title="À Vista"
                active={condicoes.avista.ativo}
                onToggle={v => setCondicoes(c => ({ ...c, avista: { ...c.avista, ativo: v } }))}
                color="green">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Desconto</label>
                  <div className="flex items-center border rounded overflow-hidden">
                    <input type="number" min={0} max={config.max_desconto} step={0.5}
                      className="w-16 px-2 py-1.5 text-sm text-center outline-none"
                      value={condicoes.avista.desconto_pct}
                      onChange={e => setCondicoes(c => ({ ...c, avista: { ...c.avista, desconto_pct: Number(e.target.value) } }))} />
                    <span className="px-2 bg-gray-50 text-xs text-gray-500 border-l">%</span>
                  </div>
                </div>
                {condicoes.avista.ativo && <p className="text-lg font-bold text-green-700 mt-2">{fmtBRL(parcelaAvista)}</p>}
              </PaymentOption>

              <PaymentOption
                title="Sem Juros"
                active={condicoes.sem_juros.ativo}
                onToggle={v => setCondicoes(c => ({ ...c, sem_juros: { ...c.sem_juros, ativo: v } }))}
                color="blue">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Parcelas</label>
                  <input type="number" min={1} max={24}
                    className="w-16 border rounded px-2 py-1.5 text-sm text-center outline-none"
                    value={condicoes.sem_juros.max_parcelas}
                    onChange={e => setCondicoes(c => ({ ...c, sem_juros: { ...c.sem_juros, max_parcelas: Number(e.target.value) } }))} />
                  <span className="text-xs text-gray-400">×</span>
                </div>
                {condicoes.sem_juros.ativo && <p className="text-lg font-bold text-blue-700 mt-2">{condicoes.sem_juros.max_parcelas}× {fmtBRL(parcelaSemJuros)}</p>}
              </PaymentOption>

              <PaymentOption
                title="Com Juros"
                active={condicoes.com_juros.ativo}
                onToggle={v => setCondicoes(c => ({ ...c, com_juros: { ...c.com_juros, ativo: v } }))}
                color="purple">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 w-14">Parcelas</label>
                    <input type="number" min={1} max={48}
                      className="w-14 border rounded px-2 py-1 text-sm text-center outline-none"
                      value={condicoes.com_juros.max_parcelas}
                      onChange={e => setCondicoes(c => ({ ...c, com_juros: { ...c.com_juros, max_parcelas: Number(e.target.value) } }))} />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 w-14">Taxa/mês</label>
                    <div className="flex items-center border rounded overflow-hidden">
                      <input type="number" min={0} step={0.01}
                        className="w-14 px-2 py-1 text-sm text-center outline-none"
                        value={condicoes.com_juros.taxa_mensal}
                        onChange={e => setCondicoes(c => ({ ...c, com_juros: { ...c.com_juros, taxa_mensal: Number(e.target.value) } }))} />
                      <span className="px-1.5 bg-gray-50 text-xs text-gray-500 border-l">%</span>
                    </div>
                  </div>
                </div>
                {condicoes.com_juros.ativo && <p className="text-lg font-bold text-purple-700 mt-2">{condicoes.com_juros.max_parcelas}× {fmtBRL(parcelaComJuros)}</p>}
              </PaymentOption>
            </div>
          </Collapsible>

          {/* Mensagem ao cliente */}
          <div className="bg-white rounded-xl border p-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Mensagem personalizada ao cliente</label>
            <textarea rows={3} placeholder="Olá! Segue abaixo o orçamento personalizado para o seu evento..."
              className="w-full border rounded-lg px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
              value={mensagem} onChange={e => setMensagem(e.target.value)} />
          </div>

          {/* Validade */}
          <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Validade do orçamento</label>
            <div className="flex items-center border rounded-lg overflow-hidden">
              <input type="number" min={1} max={90}
                className="w-16 px-3 py-2 text-sm text-center outline-none"
                value={validadeDias}
                onChange={e => setValidadeDias(Math.max(1, Number(e.target.value)))} />
              <span className="px-3 py-2 bg-gray-50 text-xs text-gray-500 border-l">dias</span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            COLUNA DIREITA — Painel de valores (sticky)
        ══════════════════════════════════════════════ */}
        <div className="space-y-4 lg:sticky lg:top-4 self-start">

          {/* Card de Desconto */}
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Tag size={16} /> Desconto Manual</h3>
            <div className="flex items-center gap-2">
              <select
                className="flex-1 border rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                value={descontoTipo}
                onChange={e => { setDescontoTipo(e.target.value); setDescontoValor(0); }}>
                <option value="pct">Percentual (%)</option>
                <option value="fixo">Valor fixo (R$)</option>
              </select>
              <div className="flex items-center border rounded-lg overflow-hidden">
                <input
                  type="number" min={0} step={descontoTipo === 'pct' ? 0.5 : 1}
                  className="w-20 px-2 py-2 text-sm text-center outline-none"
                  value={descontoValor}
                  onChange={e => setDescontoValor(Math.max(0, Number(e.target.value)))}
                />
                <span className="px-2 bg-gray-50 text-xs text-gray-500 border-l">{descontoTipo === 'pct' ? '%' : 'R$'}</span>
              </div>
            </div>
            {/* Aplicar em */}
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Aplicar desconto em:</label>
              <div className="flex gap-2">
                {[
                  { key: 'tudo', label: 'Tudo' },
                  { key: 'avista', label: 'Somente à vista' },
                  { key: 'parcelado', label: 'Somente parcelado' },
                ].map(opt => (
                  <button key={opt.key} type="button"
                    onClick={() => setDescontoAplicarEm(opt.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      descontoAplicarEm === opt.key
                        ? 'border-orange-400 bg-orange-50 text-orange-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {maxDescontoExcedido && (
              <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-300 rounded-lg text-xs text-red-800">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                Desconto excede o limite configurado ({config.max_desconto}%). Não é possível salvar enquanto o desconto não for corrigido.
              </div>
            )}

            {descontoValorCalculado > 0 && (
              <div className="flex justify-between text-sm text-red-500 font-medium">
                <span>Desconto aplicado</span>
                <span>-{fmtBRL(descontoValorCalculado)}</span>
              </div>
            )}
          </div>

          {/* Card Resumo financeiro */}
          <div className="bg-white rounded-xl border p-5 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><DollarSign size={16} /> Resumo</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{itens.length} item{itens.length !== 1 ? 'ns' : ''}</span>
                <span className="font-medium">{fmtBRL(subtotal)}</span>
              </div>
              {descontoValorCalculado > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Desconto</span>
                  <span>-{fmtBRL(descontoValorCalculado)}</span>
                </div>
              )}
              {/* Horas Adicionais */}
              {horasEvento > 0 && temHoraAdicional && (
                <div className="pt-2 border-t space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock size={11} /> Horas do evento</span>
                    <span className="font-medium">{horasEvento.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Horas inclusas nos itens</span>
                    <span className="font-medium">{horasInclusas.toFixed(1)}h</span>
                  </div>
                  {horasExtras > 0 && (
                    <>
                      <div className="flex justify-between text-xs text-orange-600 font-medium">
                        <span>Horas Adicionais ({horasExtras.toFixed(1)}h × {fmtBRL(valorHoraExtra)})</span>
                        <span>+{fmtBRL(subtotalHorasExtras)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-gray-400">Valor/hora do catálogo</span>
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="pt-2 border-t flex justify-between items-baseline">
                <span className="text-sm font-semibold text-gray-700">Total</span>
                <span className="text-2xl font-bold" style={{ color: ACCENT }}>{fmtBRL(totalComExtras)}</span>
              </div>
            </div>

            {/* Simulação rápida de pagamento */}
            {total > 0 && (
              <div className="pt-3 border-t space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase">Formas de pagamento</p>
                {condicoes.avista.ativo && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">À vista{condicoes.avista.desconto_pct > 0 && ` (${condicoes.avista.desconto_pct}% off)`}</span>
                    <span className="font-semibold text-green-700">{fmtBRL(parcelaAvista)}</span>
                  </div>
                )}
                {condicoes.sem_juros.ativo && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{condicoes.sem_juros.max_parcelas}× sem juros</span>
                    <span className="font-semibold text-blue-700">{fmtBRL(parcelaSemJuros)}</span>
                  </div>
                )}
                {condicoes.com_juros.ativo && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{condicoes.com_juros.max_parcelas}× c/ {condicoes.com_juros.taxa_mensal}% a.m.</span>
                    <span className="font-semibold text-purple-700">{fmtBRL(parcelaComJuros)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ações rápidas */}
          <div className="flex flex-col gap-2">
            <button onClick={() => handleSave(false)} disabled={saving || maxDescontoExcedido}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {saving ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
              Salvar Rascunho
            </button>
            <button onClick={() => handleSave(true)} disabled={saving || maxDescontoExcedido}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              style={{ background: ACCENT }}>
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={15} />}
              Salvar e Enviar ao Cliente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

function ItemRow({ item, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const total = (Number(item.valor_unitario) || 0) * (Number(item.quantidade) || 1);
  const diferencaSugerido = item.valor_sugerido > 0 && item.valor_unitario !== item.valor_sugerido;

  return (
    <div className={`px-5 py-3 ${item.origem === 'pacote' || item.origem === 'cliente' ? 'bg-blue-50/30' : ''}`}>
      {/* Mobile: stack vertically; Desktop: horizontal */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
        {/* Tipo badge + Nome */}
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${TIPO_COLOR[item.tipo] || 'bg-gray-100 text-gray-600'}`}>
            {TIPO_LABEL[item.tipo] || 'Item'}
          </span>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                autoFocus
                className="w-full border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-orange-300"
                value={item.nome}
                onChange={e => onUpdate('nome', e.target.value)}
                onBlur={() => setEditing(false)}
                onKeyDown={e => e.key === 'Enter' && setEditing(false)}
              />
            ) : (
              <button onClick={() => setEditing(true)} className="text-sm font-medium text-gray-800 text-left hover:text-orange-600 truncate max-w-full block">
                {item.nome || <span className="text-gray-400 italic">Sem nome — clique para editar</span>}
              </button>
            )}
            {item.origem === 'cliente' && (
              <span className="inline-block mt-0.5 text-[10px] text-blue-500 font-medium">selecionado pelo cliente</span>
            )}
            {item.origem === 'pacote' && (
              <span className="inline-block mt-0.5 text-[10px] text-orange-500 font-medium">incluso no pacote</span>
            )}
            {diferencaSugerido && (
              <button onClick={() => onUpdate('valor_unitario', item.valor_sugerido)}
                className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-amber-600 hover:underline">
                <RefreshCw size={9} /> Usar sugerido ({fmtBRL(item.valor_sugerido)})
              </button>
            )}
          </div>
        </div>

        {/* Quantidade + Valor + Total + Remove */}
        <div className="flex items-center gap-2 sm:gap-3 ml-6 sm:ml-0 flex-wrap sm:flex-nowrap">
          {/* Quantidade */}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onUpdate('quantidade', Math.max(1, (Number(item.quantidade) || 1) - 1))}
              className="w-6 h-6 rounded border text-gray-500 hover:bg-gray-100 text-sm font-bold flex items-center justify-center">−</button>
            <input type="number" min={1}
              className="w-10 border rounded px-1 py-1 text-xs text-center outline-none"
              value={item.quantidade || 1}
              onChange={e => onUpdate('quantidade', Math.max(1, Number(e.target.value)))} />
            <button onClick={() => onUpdate('quantidade', (Number(item.quantidade) || 1) + 1)}
              className="w-6 h-6 rounded border text-gray-500 hover:bg-gray-100 text-sm font-bold flex items-center justify-center">+</button>
          </div>

          {/* Valor unitário */}
          <div className="flex items-center border rounded-lg overflow-hidden shrink-0">
            <span className="px-2 py-1.5 bg-gray-50 text-xs text-gray-400 border-r">R$</span>
            <input type="number" min={0} step={0.01}
              className="w-20 sm:w-24 px-2 py-1.5 text-sm text-right outline-none"
              value={item.valor_unitario || 0}
              onChange={e => onUpdate('valor_unitario', Number(e.target.value))} />
          </div>

          {/* Total da linha */}
          <span className="w-20 sm:w-24 text-right text-sm font-semibold text-gray-800 shrink-0">{fmtBRL(total)}</span>

          {/* Remover */}
          <button onClick={onRemove} className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Collapsible({ title, badge, expanded, onToggle, children }) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">{title}</span>
          {badge && <span className="text-xs text-gray-500">{badge}</span>}
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {expanded && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function InfoField({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value || <span className="text-gray-300">—</span>}</p>
    </div>
  );
}

function PaymentOption({ title, active, onToggle, color, children }) {
  const colorMap = {
    green: { bg: 'bg-green-50', border: 'border-green-200', label: 'text-green-800' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', label: 'text-blue-800' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', label: 'text-purple-800' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`border rounded-xl p-4 transition-all ${active ? `${c.bg} ${c.border}` : 'border-gray-200 bg-gray-50 opacity-60'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-semibold ${active ? c.label : 'text-gray-500'}`}>{title}</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={active} onChange={e => onToggle(e.target.checked)} />
          <div className="w-9 h-5 bg-gray-200 peer-checked:bg-orange-500 rounded-full relative after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>
      {children}
    </div>
  );
}
