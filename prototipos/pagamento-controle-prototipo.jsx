import React, { useState, useMemo } from "react";
import {
  Camera, DollarSign, Wallet, AlertCircle, TrendingUp, Check, X,
  LayoutDashboard, ArrowDownCircle, CheckCircle2, ListChecks, Calendar, Info
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Controle de Pagamento (DEPOIS, camada de gestão)
// Telas: Visão Geral · Contas a Receber · Recebidos · Cobranças
// Marcação manual de recebimento. Sem gateway (pluga depois).
// "Previsto" = cobranças de contratos assinados que vencem no período.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (iso) => { const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; };
const hoje = "2026-06-30";

const PERIODOS = [["sem", "Sem filtro"], ["1", "Último mês"], ["3", "3 meses"], ["6", "6 meses"], ["12", "Anual"]];
// filtra cobranças cujo vencimento cai nos últimos N meses a partir de hoje
function filtrarPeriodo(cobrancas, periodo) {
  if (periodo === "sem") return cobrancas;
  const meses = Number(periodo);
  const ref = new Date(hoje);
  const limite = new Date(ref); limite.setMonth(ref.getMonth() - meses);
  const limiteSup = new Date(ref); limiteSup.setMonth(ref.getMonth() + meses);
  return cobrancas.filter((c) => {
    const d = new Date(c.vencimento);
    return d >= limite && d <= limiteSup;
  });
}

// Cobranças geradas a partir de orçamentos aceitos (dados em memória)
const COBRANCAS_SEED = [
  { id: 1, cliente: "Marina e Rafael", orcamento: "Casamento", tipo: "sinal", numero: "Sinal", valor: 1657, meio: "pix", vencimento: "2026-05-10", status: "paga", pago_em: "2026-05-09", valor_pago: 1657 },
  { id: 2, cliente: "Marina e Rafael", orcamento: "Casamento", tipo: "parcela", numero: "1/3", valor: 1290, meio: "pix", vencimento: "2026-07-10", status: "em_aberto" },
  { id: 3, cliente: "Marina e Rafael", orcamento: "Casamento", tipo: "parcela", numero: "2/3", valor: 1290, meio: "pix", vencimento: "2026-08-10", status: "em_aberto" },
  { id: 4, cliente: "Família Souza", orcamento: "Batizado", tipo: "avista", numero: "À vista", valor: 760, meio: "pix", vencimento: "2026-06-15", status: "atrasada" },
  { id: 5, cliente: "Júlia 15 anos", orcamento: "Aniversário", tipo: "parcela", numero: "1/2", valor: 900, meio: "boleto", vencimento: "2026-06-20", status: "paga", pago_em: "2026-06-19", valor_pago: 900 },
  { id: 6, cliente: "Júlia 15 anos", orcamento: "Aniversário", tipo: "parcela", numero: "2/2", valor: 900, meio: "boleto", vencimento: "2026-07-20", status: "em_aberto" },
  { id: 7, cliente: "Ensaio Costa", orcamento: "Ensaio", tipo: "avista", numero: "À vista", valor: 500, meio: "dinheiro", vencimento: "2026-06-28", status: "paga", pago_em: "2026-06-28", valor_pago: 500 },
];

const MEIOS = { pix: "Pix", cartao: "Cartão", transf: "Transferência", boleto: "Boleto", dinheiro: "Dinheiro" };
const STATUS = {
  em_aberto: { rotulo: "Em aberto", cor: "#A16207", bg: "#FEF9C3" },
  paga: { rotulo: "Paga", cor: "#047857", bg: "#ECFDF5" },
  atrasada: { rotulo: "Atrasada", cor: "#B91C1C", bg: "#FEF2F2" },
};

const ABAS = [
  { id: "visao", nome: "Visão Geral", icon: LayoutDashboard },
  { id: "receber", nome: "Contas a Receber", icon: ArrowDownCircle },
  { id: "recebidos", nome: "Recebidos", icon: CheckCircle2 },
  { id: "cobrancas", nome: "Cobranças", icon: ListChecks },
];

export default function ControlePagamento() {
  const [aba, setAba] = useState("visao");
  const [periodo, setPeriodo] = useState("sem"); // sem | 1 | 3 | 6 | 12
  const [cobrancas, setCobrancas] = useState(COBRANCAS_SEED);

  const marcarPaga = (id) =>
    setCobrancas((l) => l.map((c) => c.id === id ? { ...c, status: "paga", pago_em: hoje, valor_pago: c.valor } : c));

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
         className="min-h-screen bg-stone-50 text-stone-900">
      <div className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 overflow-x-auto px-4 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
            <Camera className="h-4 w-4 text-white" />
          </div>
          <span className="mr-2 shrink-0 text-sm font-semibold tracking-tight">Financeiro</span>
          {ABAS.map((a) => {
            const Icon = a.icon;
            return (
              <button key={a.id} onClick={() => setAba(a.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${aba === a.id ? "text-white" : "text-stone-500 hover:text-stone-800"}`}
                style={aba === a.id ? { background: ACCENT } : {}}>
                <Icon className="h-3.5 w-3.5" /> {a.nome}
              </button>
            );
          })}
        </div>
      </div>

      {aba === "visao" && <VisaoGeral cobrancas={cobrancas} periodo={periodo} setPeriodo={setPeriodo} irPara={setAba} />}
      {aba === "receber" && <ListaCobrancas cobrancas={cobrancas.filter((c) => c.status !== "paga")} titulo="Contas a Receber" onMarcar={marcarPaga} />}
      {aba === "recebidos" && <ListaCobrancas cobrancas={cobrancas.filter((c) => c.status === "paga")} titulo="Recebidos" />}
      {aba === "cobrancas" && <ListaCobrancas cobrancas={cobrancas} titulo="Todas as Cobranças" onMarcar={marcarPaga} comFiltro />}
    </div>
  );
}

// ── Visão Geral ───────────────────────────────────────────────

function VisaoGeral({ cobrancas, periodo, setPeriodo, irPara }) {
  const filtradas = useMemo(() => filtrarPeriodo(cobrancas, periodo), [cobrancas, periodo]);

  const totais = useMemo(() => {
    const aReceber = filtradas.filter((c) => c.status !== "paga").reduce((s, c) => s + c.valor, 0);
    const recebido = filtradas.filter((c) => c.status === "paga").reduce((s, c) => s + (c.valor_pago || 0), 0);
    const vencido = filtradas.filter((c) => c.status === "atrasada").reduce((s, c) => s + c.valor, 0);
    const previsto = filtradas.reduce((s, c) => s + c.valor, 0); // contratos assinados
    return { aReceber, recebido, vencido, previsto };
  }, [filtradas]);

  const cards = [
    { label: "Total a Receber", sub: "No período", valor: totais.aReceber, icon: DollarSign, cor: ACCENT },
    { label: "Total Recebido", sub: "No período", valor: totais.recebido, icon: Wallet, cor: "#047857" },
    { label: "Total Vencido", sub: "Atrasados", valor: totais.vencido, icon: AlertCircle, cor: "#B91C1C" },
    { label: "Previsto", sub: "Contratos assinados", valor: totais.previsto, icon: TrendingUp, cor: "#1D4ED8" },
  ];

  const proximos = [...filtradas].filter((c) => c.status !== "paga").sort((a, b) => a.vencimento.localeCompare(b.vencimento)).slice(0, 4);
  const ultimas = [...filtradas].sort((a, b) => b.vencimento.localeCompare(a.vencimento)).slice(0, 4);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visão geral financeira</h1>
          <p className="mt-1 text-sm text-stone-500">Acompanhe o faturamento e os recebimentos do estúdio.</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-stone-400" />
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-600 outline-none focus:border-orange-400">
            {PERIODOS.map(([k, r]) => <option key={k} value={k}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <span className="text-sm text-stone-500">{c.label}</span>
                <Icon className="h-4 w-4" style={{ color: c.cor }} />
              </div>
              <div className="mt-2 text-2xl font-bold" style={{ color: c.cor }}>{brl(c.valor)}</div>
              <div className="mt-1 text-xs text-stone-400">{c.sub}</div>
            </div>
          );
        })}
      </div>

      <GraficoReceita cobrancas={filtradas} />

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <MiniLista titulo="Últimas cobranças" itens={ultimas} campos={["status", "vencimento"]} onVerTodas={() => irPara("cobrancas")} />
        <MiniLista titulo="Próximos vencimentos" itens={proximos} campos={["valor", "vencimento"]} onVerTodas={() => irPara("receber")} />
      </div>
    </main>
  );
}

function GraficoReceita({ cobrancas }) {
  // agrupa recebido por mês (simples)
  const porMes = {};
  cobrancas.filter((c) => c.status === "paga").forEach((c) => {
    const m = (c.pago_em || c.vencimento).slice(0, 7);
    porMes[m] = (porMes[m] || 0) + (c.valor_pago || 0);
  });
  const meses = ["2026-04", "2026-05", "2026-06", "2026-07"];
  const max = Math.max(1, ...meses.map((m) => porMes[m] || 0));
  const nomeMes = (m) => ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][Number(m.slice(5)) - 1];

  return (
    <div className="mt-5 rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="mb-4 font-semibold tracking-tight" style={{ color: ACCENT }}>Receitas no período</h2>
      <div className="flex items-end justify-around gap-4" style={{ height: 160 }}>
        {meses.map((m) => {
          const v = porMes[m] || 0;
          return (
            <div key={m} className="flex flex-1 flex-col items-center gap-2">
              <div className="text-xs font-medium text-stone-600">{v > 0 ? brl(v) : ""}</div>
              <div className="w-full max-w-[64px] rounded-t-lg transition-all" style={{ height: `${(v / max) * 120}px`, minHeight: v > 0 ? 6 : 0, background: ACCENT }} />
              <div className="text-xs text-stone-400">{nomeMes(m)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniLista({ titulo, itens, campos, onVerTodas }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
        <h2 className="font-semibold tracking-tight" style={{ color: ACCENT }}>{titulo}</h2>
        <button onClick={onVerTodas} className="text-xs font-medium text-orange-600 hover:text-orange-700">Ver todas →</button>
      </div>
      <div className="divide-y divide-stone-100">
        {itens.map((c) => {
          const s = STATUS[c.status];
          return (
            <div key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{c.cliente}</div>
                <div className="text-xs text-stone-400">{c.orcamento} · {c.numero}</div>
              </div>
              <div className="flex items-center gap-3 text-right">
                {campos.includes("valor") && <span className="tabular-nums text-stone-600">{brl(c.valor)}</span>}
                {campos.includes("status") && <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: s.bg, color: s.cor }}>{s.rotulo}</span>}
                {campos.includes("vencimento") && <span className="text-xs text-stone-400">{fmt(c.vencimento)}</span>}
              </div>
            </div>
          );
        })}
        {itens.length === 0 && <div className="px-5 py-8 text-center text-sm text-stone-400">Nada por aqui.</div>}
      </div>
    </div>
  );
}

// ── Lista de cobranças (Receber / Recebidos / Todas) ─────────

function ListaCobrancas({ cobrancas, titulo, onMarcar, comFiltro }) {
  const [filtro, setFiltro] = useState("todos");
  const lista = comFiltro && filtro !== "todos" ? cobrancas.filter((c) => c.status === filtro) : cobrancas;
  const ordenada = [...lista].sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
      <p className="mt-1 text-sm text-stone-500">
        {titulo === "Recebidos" ? "Pagamentos já confirmados." : "Marque como recebida quando o pagamento entrar (pix, dinheiro, etc.)."}
      </p>

      {comFiltro && (
        <div className="mt-4 flex flex-wrap gap-2">
          {[["todos", "Todas"], ["em_aberto", "Em aberto"], ["atrasada", "Atrasadas"], ["paga", "Pagas"]].map(([k, r]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${filtro === k ? "text-white" : "bg-white text-stone-500 ring-1 ring-stone-200 hover:text-stone-800"}`}
              style={filtro === k ? { background: ACCENT } : {}}>{r}</button>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {ordenada.map((c) => {
          const s = STATUS[c.status];
          return (
            <div key={c.id} className="rounded-xl border border-stone-200 bg-white p-4">
              {/* topo: cliente + status */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{c.cliente}</div>
                  <div className="text-xs text-stone-400">{c.orcamento} · {c.numero}</div>
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: s.bg, color: s.cor }}>{s.rotulo}</span>
              </div>

              {/* meio: valor + detalhes em linha */}
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <Campo rotulo="Valor"><span className="font-semibold tabular-nums">{brl(c.valor)}</span></Campo>
                  <Campo rotulo="Meio">{MEIOS[c.meio]}</Campo>
                  <Campo rotulo="Vencimento">{fmt(c.vencimento)}</Campo>
                </div>

                {/* ação */}
                {c.status !== "paga" && onMarcar
                  ? <button onClick={() => onMarcar(c.id)} className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}><Check className="h-3.5 w-3.5" /> Marcar recebida</button>
                  : c.status === "paga" && <span className="text-xs text-stone-400">recebido em {c.pago_em ? fmt(c.pago_em) : "—"}</span>}
              </div>
            </div>
          );
        })}
        {ordenada.length === 0 && (
          <div className="rounded-xl border border-stone-200 bg-white px-5 py-10 text-center text-sm text-stone-400">Nenhuma cobrança.</div>
        )}
      </div>

      <p className="mt-4 flex items-start gap-1.5 text-xs text-stone-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Aqui você marca os recebimentos manualmente. Quando o gateway for integrado, ele preencherá isso automaticamente.
      </p>
    </main>
  );
}

function Campo({ rotulo, children }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-stone-400">{rotulo}</div>
      <div className="text-stone-700">{children}</div>
    </div>
  );
}
