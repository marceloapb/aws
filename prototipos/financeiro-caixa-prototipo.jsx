import React, { useState } from "react";
import {
  Wallet, Plus, Tag, Repeat, ArrowDownCircle, ArrowUpCircle, Info,
  ChevronLeft, ChevronRight, Save, CircleDollarSign, BarChart3,
  Camera, ChevronDown,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Financeiro (menu ADM) · fatias 1 + 2
// Quatro abas:
//   (A) CAIXA       — entradas (Pagamentos + manuais) − saídas (despesas) = saldo do mês.
//   (B) DESPESAS    — lançamento avulso, despesas fixas (auto, editáveis), categorias.
//                     Despesa e entrada manual podem ser vinculadas a um EVENTO (opcional).
//   (C) RENTABILIDADE — por evento: receita − custo DIRETO = margem (R$ e %).
//                     Custo fixo/geral (sem evento) NÃO entra aqui — só no caixa.
//   (D) EVOLUÇÃO    — comparação de meses: entradas, saídas e saldo ao longo do ano.
// Entradas automáticas vêm do domínio Pagamentos (fonte única). Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const fmt = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (n) => (n * 100).toFixed(0) + "%";

const EVENTOS = [
  { id: "ev1", nome: "Casamento Marina & Thiago" },
  { id: "ev2", nome: "15 anos Beatriz" },
  { id: "ev3", nome: "Ensaio corporativo Estúdio X" },
];
const evNome = (id) => EVENTOS.find((e) => e.id === id)?.nome || null;

const CATEGORIAS_SEED = [
  { id: "c1", nome: "Equipamento", ativa: true },
  { id: "c2", nome: "Deslocamento", ativa: true },
  { id: "c3", nome: "Software", ativa: true },
  { id: "c4", nome: "Marketing", ativa: true },
  { id: "c5", nome: "Impostos", ativa: true },
  { id: "c6", nome: "Edição / terceirização", ativa: true },
];

const ENTRADAS_PAGAMENTOS = [
  { id: "e1", data: "2026-07-02", valor: 1500, descricao: "Sinal — Casamento Marina & Thiago", origem: "pagamentos", evento_id: "ev1" },
  { id: "e2", data: "2026-07-05", valor: 2000, descricao: "Parcela 2/3 — 15 anos Beatriz", origem: "pagamentos", evento_id: "ev2" },
  { id: "e3", data: "2026-07-08", valor: 1200, descricao: "Ensaio corporativo — Estúdio X", origem: "pagamentos", evento_id: "ev3" },
];

const ENTRADAS_MANUAIS_SEED = [
  { id: "em1", data: "2026-07-06", valor: 400, descricao: "Extra álbum impresso pago em dinheiro", origem: "manual", evento_id: "ev1" },
];

const DESPESAS_SEED = [
  { id: "d1", data: "2026-07-01", valor: 89.9, categoria_id: "c3", descricao: "Adobe Lightroom (assinatura)", tipo: "fixa", origem: "gerada", evento_id: null },
  { id: "d2", data: "2026-07-05", valor: 71.0, categoria_id: "c5", descricao: "DAS MEI", tipo: "fixa", origem: "gerada", evento_id: null },
  { id: "d3", data: "2026-07-03", valor: 120.0, categoria_id: "c2", descricao: "Uber ida/volta ensaio", tipo: "avulsa", origem: "manual", evento_id: "ev3" },
  { id: "d4", data: "2026-07-07", valor: 350.0, categoria_id: "c1", descricao: "Locação lente 70-200", tipo: "avulsa", origem: "manual", evento_id: "ev1" },
  { id: "d5", data: "2026-07-09", valor: 500.0, categoria_id: "c6", descricao: "Edição terceirizada do casamento", tipo: "avulsa", origem: "manual", evento_id: "ev1" },
];

const FIXAS_SEED = [
  { id: "f1", nome: "Adobe Lightroom", valor: 89.9, categoria_id: "c3", dia: 1, ativa: true },
  { id: "f2", nome: "DAS MEI", valor: 71.0, categoria_id: "c5", dia: 5, ativa: true },
];

const HISTORICO = [
  { mes: "Fev", entradas: 3200, saidas: 900 },
  { mes: "Mar", entradas: 4100, saidas: 1300 },
  { mes: "Abr", entradas: 2800, saidas: 1100 },
  { mes: "Mai", entradas: 5200, saidas: 1600 },
  { mes: "Jun", entradas: 4600, saidas: 1400 },
  { mes: "Jul", entradas: 5100, saidas: 1130.9 },
];

export default function Financeiro() {
  const [aba, setAba] = useState("caixa");
  const [categorias, setCategorias] = useState(CATEGORIAS_SEED);
  const [despesas, setDespesas] = useState(DESPESAS_SEED);
  const [entradasManuais, setEntradasManuais] = useState(ENTRADAS_MANUAIS_SEED);
  const [fixas, setFixas] = useState(FIXAS_SEED);

  const catNome = (id) => categorias.find((c) => c.id === id)?.nome || "—";
  const totalEntradas = ENTRADAS_PAGAMENTOS.reduce((s, e) => s + e.valor, 0) + entradasManuais.reduce((s, e) => s + e.valor, 0);
  const totalSaidas = despesas.reduce((s, d) => s + d.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  const ABAS = [["caixa", "Fluxo de caixa"], ["despesas", "Despesas"], ["rentab", "Rentabilidade"], ["evolucao", "Evolução"]];

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><Wallet className="h-4 w-4 text-white" /></div>
          <span className="text-sm font-semibold tracking-tight">Financeiro · Caixa, despesas e rentabilidade</span>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <p className="mt-1 text-sm text-stone-500">Quanto sobra no mês, para onde vai o dinheiro, e se cada evento dá lucro.</p>

        <div className="mt-5 flex gap-1 overflow-x-auto border-b border-stone-200">
          {ABAS.map(([k, r]) => (
            <button key={k} onClick={() => setAba(k)}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition ${aba === k ? "" : "border-transparent text-stone-400 hover:text-stone-600"}`}
              style={aba === k ? { borderColor: ACCENT, color: ACCENT } : {}}>{r}</button>
          ))}
        </div>

        {aba === "caixa" && <AbaCaixa entradasPag={ENTRADAS_PAGAMENTOS} entradasManuais={entradasManuais} setEntradasManuais={setEntradasManuais} despesas={despesas} catNome={catNome} totalEntradas={totalEntradas} totalSaidas={totalSaidas} saldo={saldo} />}
        {aba === "despesas" && <AbaDespesas categorias={categorias} setCategorias={setCategorias} despesas={despesas} setDespesas={setDespesas} fixas={fixas} setFixas={setFixas} catNome={catNome} />}
        {aba === "rentab" && <AbaRentabilidade entradasPag={ENTRADAS_PAGAMENTOS} entradasManuais={entradasManuais} despesas={despesas} catNome={catNome} />}
        {aba === "evolucao" && <AbaEvolucao />}
      </main>
    </div>
  );
}

function AbaCaixa({ entradasPag, entradasManuais, setEntradasManuais, despesas, catNome, totalEntradas, totalSaidas, saldo }) {
  const [modalEntrada, setModalEntrada] = useState(false);
  const movimentos = [
    ...entradasPag.map((e) => ({ ...e, kind: "entrada" })),
    ...entradasManuais.map((e) => ({ ...e, kind: "entrada" })),
    ...despesas.map((d) => ({ ...d, kind: "saida", descricao: `${d.descricao} · ${catNome(d.categoria_id)}` })),
  ].sort((a, b) => a.data.localeCompare(b.data));
  const addEntrada = (nova) => { setEntradasManuais((l) => [...l, { ...nova, id: "em" + Date.now(), origem: "manual" }]); setModalEntrada(false); };

  return (
    <>
      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <button className="rounded-lg p-1 text-stone-400 hover:bg-stone-100"><ChevronLeft className="h-4 w-4" /></button>
          <span>Julho / 2026</span>
          <button className="rounded-lg p-1 text-stone-400 hover:bg-stone-100"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <button onClick={() => setModalEntrada(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
          <Plus className="h-3.5 w-3.5" /> Entrada manual
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <ResumoCard icon={<ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500" />} label="Entradas" valor={totalEntradas} cor="text-emerald-600" />
        <ResumoCard icon={<ArrowDownCircle className="h-3.5 w-3.5 text-red-500" />} label="Saídas" valor={totalSaidas} cor="text-red-600" />
        <div className="rounded-2xl border-2 bg-white p-4" style={{ borderColor: saldo >= 0 ? ACCENT : "#ef4444" }}>
          <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500"><CircleDollarSign className="h-3.5 w-3.5" style={{ color: ACCENT }} /> Sobra no mês</div>
          <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color: saldo >= 0 ? ACCENT : "#ef4444" }}>{fmt(saldo)}</div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-stone-200 bg-white">
        <div className="border-b border-stone-100 px-4 py-3 text-sm font-semibold">Movimentos do mês</div>
        <div className="divide-y divide-stone-100">
          {movimentos.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.kind === "entrada" ? "bg-emerald-50" : "bg-red-50"}`}>
                {m.kind === "entrada" ? <ArrowUpCircle className="h-4 w-4 text-emerald-500" /> : <ArrowDownCircle className="h-4 w-4 text-red-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-stone-700">{m.descricao}</div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-400">
                  <span>{new Date(m.data + "T12:00").toLocaleDateString("pt-BR")}</span>
                  {m.origem === "pagamentos" && <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-stone-500">de Pagamentos</span>}
                  {m.origem === "gerada" && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-blue-600">fixa auto</span>}
                  {m.evento_id && <span className="rounded-full bg-purple-50 px-1.5 py-0.5 text-purple-700">{evNome(m.evento_id)}</span>}
                </div>
              </div>
              <div className={`text-sm font-semibold tabular-nums ${m.kind === "entrada" ? "text-emerald-600" : "text-red-600"}`}>{m.kind === "entrada" ? "+" : "−"}{fmt(m.valor)}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Entradas "de Pagamentos" vêm automaticamente da cobrança — não são digitadas aqui. Entrada manual é só para o recebido por fora. O saldo é entradas − saídas do mês.
      </p>

      {modalEntrada && <ModalEntradaManual onFechar={() => setModalEntrada(false)} onSalvar={addEntrada} />}
    </>
  );
}

function ResumoCard({ icon, label, valor, cor }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500">{icon} {label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${cor}`}>{fmt(valor)}</div>
    </div>
  );
}

function AbaDespesas({ categorias, setCategorias, despesas, setDespesas, fixas, setFixas, catNome }) {
  const [modalDespesa, setModalDespesa] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);
  const [modalFixa, setModalFixa] = useState(false);

  const addDespesa = (nova) => { setDespesas((l) => [...l, { ...nova, id: "d" + Date.now(), tipo: "avulsa", origem: "manual" }]); setModalDespesa(false); };
  const addCategoria = (nome) => { setCategorias((l) => [...l, { id: "c" + Date.now(), nome, ativa: true }]); setModalCategoria(false); };
  const toggleCategoria = (id) => setCategorias((l) => l.map((c) => c.id === id ? { ...c, ativa: !c.ativa } : c));
  const addFixa = (nova) => { setFixas((l) => [...l, { ...nova, id: "f" + Date.now(), ativa: true }]); setModalFixa(false); };
  const toggleFixa = (id) => setFixas((l) => l.map((f) => f.id === id ? { ...f, ativa: !f.ativa } : f));

  return (
    <>
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={() => setModalDespesa(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
          <Plus className="h-3.5 w-3.5" /> Nova despesa
        </button>
        <button onClick={() => setModalFixa(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
          <Repeat className="h-3.5 w-3.5" /> Nova despesa fixa
        </button>
        <button onClick={() => setModalCategoria(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
          <Tag className="h-3.5 w-3.5" /> Categorias
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><Repeat className="h-4 w-4 text-stone-400" /> Despesas fixas <span className="text-xs font-normal text-stone-400">(lançadas sozinhas todo mês)</span></div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
            <Repeat className="h-3 w-3" /> Automação ativa · última execução 01/07 08:00
          </span>
        </div>
        <div className="divide-y divide-stone-100">
          {fixas.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-stone-700">{f.nome}</div>
                <div className="text-xs text-stone-400">{catNome(f.categoria_id)} · todo dia {f.dia}</div>
              </div>
              <div className="text-sm font-semibold tabular-nums text-stone-700">{fmt(f.valor)}</div>
              <Toggle ativo={f.ativa} onClick={() => toggleFixa(f.id)} />
            </div>
          ))}
        </div>
        <p className="flex items-start gap-1.5 border-t border-stone-100 px-4 py-2.5 text-xs text-stone-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Se a automação falhar num mês, o lançamento não se perde — use "Nova despesa" pra lançar manualmente como fallback. Rodar duas vezes no mesmo mês nunca duplica.
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-stone-200 bg-white">
        <div className="border-b border-stone-100 px-4 py-3 text-sm font-semibold">Despesas de julho</div>
        <div className="divide-y divide-stone-100">
          {despesas.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50"><ArrowDownCircle className="h-4 w-4 text-red-500" /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-stone-700">{d.descricao}</div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-400">
                  <span>{new Date(d.data + "T12:00").toLocaleDateString("pt-BR")} · {catNome(d.categoria_id)}</span>
                  {d.origem === "gerada" && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-blue-600">fixa auto · editável</span>}
                  {d.evento_id
                    ? <span className="rounded-full bg-purple-50 px-1.5 py-0.5 text-purple-700">{evNome(d.evento_id)}</span>
                    : <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-stone-400">sem evento</span>}
                </div>
              </div>
              <div className="text-sm font-semibold tabular-nums text-red-600">−{fmt(d.valor)}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Vincular uma despesa a um evento é o que alimenta a aba Rentabilidade. Despesa "sem evento" (Lightroom, MEI) é custo geral — afeta o caixa, mas não entra na margem de nenhum evento.
      </p>

      {modalDespesa && <ModalDespesa categorias={categorias.filter((c) => c.ativa)} onFechar={() => setModalDespesa(false)} onSalvar={addDespesa} />}
      {modalFixa && <ModalFixa categorias={categorias.filter((c) => c.ativa)} onFechar={() => setModalFixa(false)} onSalvar={addFixa} />}
      {modalCategoria && <ModalCategorias categorias={categorias} onAdd={addCategoria} onToggle={toggleCategoria} onFechar={() => setModalCategoria(false)} />}
    </>
  );
}

function AbaRentabilidade({ entradasPag, entradasManuais, despesas, catNome }) {
  const [aberto, setAberto] = useState(null);

  const porEvento = EVENTOS.map((ev) => {
    const receitas = [...entradasPag, ...entradasManuais].filter((e) => e.evento_id === ev.id);
    const custos = despesas.filter((d) => d.evento_id === ev.id);
    const receita = receitas.reduce((s, r) => s + r.valor, 0);
    const custo = custos.reduce((s, c) => s + c.valor, 0);
    const margem = receita - custo;
    const margemPct = receita > 0 ? margem / receita : 0;
    return { ev, receitas, custos, receita, custo, margem, margemPct };
  });

  return (
    <>
      <div className="mt-5 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 ring-1 ring-amber-200">
        <strong>Margem de contribuição por evento</strong> — receita menos os custos <em>diretos</em> lançados para o evento. Não desconta custo fixo/geral (Lightroom, imposto), então não é "lucro líquido". Vale "com base no que foi lançado".
      </div>

      <div className="mt-4 space-y-3">
        {porEvento.map(({ ev, receitas, custos, receita, custo, margem, margemPct }) => (
          <div key={ev.id} className="rounded-xl border border-stone-200 bg-white">
            <button onClick={() => setAberto(aberto === ev.id ? null : ev.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100"><Camera className="h-4 w-4 text-stone-500" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{ev.nome}</div>
                <div className="flex flex-wrap gap-x-3 text-xs text-stone-400">
                  <span>receita <span className="tabular-nums text-emerald-600">{fmt(receita)}</span></span>
                  <span>custo direto <span className="tabular-nums text-red-500">{fmt(custo)}</span></span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold tabular-nums" style={{ color: margem >= 0 ? ACCENT : "#ef4444" }}>{fmt(margem)}</div>
                <div className="text-xs text-stone-400 tabular-nums">{receita > 0 ? fmtPct(margemPct) : "—"} margem</div>
              </div>
              <ChevronDown className={`h-4 w-4 text-stone-300 transition-transform ${aberto === ev.id ? "rotate-180" : ""}`} />
            </button>

            {aberto === ev.id && (
              <div className="border-t border-stone-100 px-4 py-3">
                <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full bg-emerald-400" style={{ width: `${receita > 0 ? (receita / (receita + custo)) * 100 : 0}%` }} />
                  <div className="h-full bg-red-400" style={{ width: `${receita > 0 ? (custo / (receita + custo)) * 100 : 0}%` }} />
                </div>
                <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">Receitas</div>
                {receitas.map((r) => (
                  <div key={r.id} className="flex justify-between py-1 text-sm">
                    <span className="text-stone-600">{r.descricao}</span>
                    <span className="tabular-nums text-emerald-600">+{fmt(r.valor)}</span>
                  </div>
                ))}
                {receitas.length === 0 && <div className="py-1 text-sm text-stone-400">Nenhuma receita lançada ainda.</div>}
                <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Custos diretos</div>
                {custos.map((c) => (
                  <div key={c.id} className="flex justify-between py-1 text-sm">
                    <span className="text-stone-600">{c.descricao} · {catNome(c.categoria_id)}</span>
                    <span className="tabular-nums text-red-500">−{fmt(c.valor)}</span>
                  </div>
                ))}
                {custos.length === 0 && <div className="py-1 text-sm text-stone-400">Nenhum custo direto lançado. A margem soma 100% da receita — talvez faltem custos a registrar.</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Para um custo entrar aqui, vincule a despesa ao evento na aba Despesas. Um evento com margem 100% provavelmente só está com custos não lançados ainda — o número é tão bom quanto a disciplina de lançamento.
      </p>
    </>
  );
}

function AbaEvolucao() {
  const dados = HISTORICO.map((m) => ({ ...m, saldo: m.entradas - m.saidas }));
  const maxVal = Math.max(...dados.map((d) => Math.max(d.entradas, d.saidas)));

  return (
    <>
      <div className="mt-5 rounded-xl border border-stone-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4 text-stone-400" /> Entradas × saídas por mês</div>
        <div className="flex items-end justify-between gap-3" style={{ height: 180 }}>
          {dados.map((d) => (
            <div key={d.mes} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-end justify-center gap-1" style={{ height: 150 }}>
                <div className="w-1/2 rounded-t bg-emerald-400" style={{ height: `${(d.entradas / maxVal) * 100}%` }} title={`Entradas ${fmt(d.entradas)}`} />
                <div className="w-1/2 rounded-t bg-red-300" style={{ height: `${(d.saidas / maxVal) * 100}%` }} title={`Saídas ${fmt(d.saidas)}`} />
              </div>
              <span className="text-xs font-medium text-stone-500">{d.mes}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-stone-500">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Entradas</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-300" /> Saídas</span>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
              <th className="px-4 py-3 font-semibold">Mês</th>
              <th className="px-4 py-3 text-right font-semibold">Entradas</th>
              <th className="px-4 py-3 text-right font-semibold">Saídas</th>
              <th className="px-4 py-3 text-right font-semibold">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.mes} className="border-b border-stone-100">
                <td className="px-4 py-2.5 font-medium">{d.mes}/2026</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">{fmt(d.entradas)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-red-500">{fmt(d.saidas)}</td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums" style={{ color: d.saldo >= 0 ? ACCENT : "#ef4444" }}>{fmt(d.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Mesmo cálculo do Fluxo de caixa (entradas − saídas), agregado por mês para ver a evolução. Ganha valor quanto mais meses de uso acumulam.
      </p>
    </>
  );
}

function Toggle({ ativo, onClick }) {
  return (
    <button onClick={onClick} className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${ativo ? "" : "bg-stone-300"}`} style={ativo ? { background: ACCENT } : {}}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${ativo ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

function ModalBase({ titulo, children, onFechar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onFechar}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold tracking-tight">{titulo}</h3>
        {children}
      </div>
    </div>
  );
}

const inputCls = "mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none";
const EVENTO_OPCOES = [{ id: "", nome: "— Sem evento (custo geral) —" }, ...EVENTOS];

function ModalDespesa({ categorias, onFechar, onSalvar }) {
  const [f, setF] = useState({ data: "2026-07-15", valor: "", categoria_id: categorias[0]?.id || "", descricao: "", evento_id: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const ok = f.valor && f.descricao.trim() && f.categoria_id;
  return (
    <ModalBase titulo="Nova despesa" onFechar={onFechar}>
      <label className="mt-4 block text-xs font-semibold text-stone-600">Descrição</label>
      <input value={f.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="ex.: Locação de lente" className={inputCls} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div><label className="block text-xs font-semibold text-stone-600">Valor</label>
          <input type="number" value={f.valor} onChange={(e) => set("valor", e.target.value)} placeholder="0,00" className={inputCls + " tabular-nums"} /></div>
        <div><label className="block text-xs font-semibold text-stone-600">Data</label>
          <input type="date" value={f.data} onChange={(e) => set("data", e.target.value)} className={inputCls} /></div>
      </div>
      <label className="mt-3 block text-xs font-semibold text-stone-600">Categoria</label>
      <select value={f.categoria_id} onChange={(e) => set("categoria_id", e.target.value)} className={inputCls}>
        {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      <label className="mt-3 block text-xs font-semibold text-stone-600">Evento <span className="font-normal text-stone-400">(opcional — vincula à rentabilidade)</span></label>
      <select value={f.evento_id} onChange={(e) => set("evento_id", e.target.value)} className={inputCls}>
        {EVENTO_OPCOES.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
      </select>
      <ModalAcoes onFechar={onFechar} ok={ok} onSalvar={() => onSalvar({ ...f, valor: +f.valor, evento_id: f.evento_id || null })} />
    </ModalBase>
  );
}

function ModalFixa({ categorias, onFechar, onSalvar }) {
  const [f, setF] = useState({ nome: "", valor: "", categoria_id: categorias[0]?.id || "", dia: 1 });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const ok = f.nome.trim() && f.valor && f.categoria_id;
  return (
    <ModalBase titulo="Nova despesa fixa" onFechar={onFechar}>
      <p className="mt-0.5 text-sm text-stone-500">Lançada sozinha todo mês, no dia escolhido. Editável se o valor variar.</p>
      <label className="mt-4 block text-xs font-semibold text-stone-600">Nome</label>
      <input value={f.nome} onChange={(e) => set("nome", e.target.value)} placeholder="ex.: DAS MEI, Adobe Lightroom" className={inputCls} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div><label className="block text-xs font-semibold text-stone-600">Valor padrão</label>
          <input type="number" value={f.valor} onChange={(e) => set("valor", e.target.value)} placeholder="0,00" className={inputCls + " tabular-nums"} /></div>
        <div><label className="block text-xs font-semibold text-stone-600">Dia do mês</label>
          <input type="number" min={1} max={28} value={f.dia} onChange={(e) => set("dia", +e.target.value)} className={inputCls + " tabular-nums"} /></div>
      </div>
      <label className="mt-3 block text-xs font-semibold text-stone-600">Categoria</label>
      <select value={f.categoria_id} onChange={(e) => set("categoria_id", e.target.value)} className={inputCls}>
        {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      <p className="mt-2 text-xs text-stone-400">Despesa fixa é custo geral do negócio — não se vincula a evento.</p>
      <ModalAcoes onFechar={onFechar} ok={ok} onSalvar={() => onSalvar({ ...f, valor: +f.valor })} />
    </ModalBase>
  );
}

function ModalEntradaManual({ onFechar, onSalvar }) {
  const [f, setF] = useState({ data: "2026-07-15", valor: "", descricao: "", evento_id: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const ok = f.valor && f.descricao.trim();
  return (
    <ModalBase titulo="Entrada manual" onFechar={onFechar}>
      <p className="mt-0.5 text-sm text-stone-500">Só para receita recebida por fora do sistema (dinheiro, Pix direto).</p>
      <label className="mt-4 block text-xs font-semibold text-stone-600">Descrição</label>
      <input value={f.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="ex.: Extra pago em dinheiro" className={inputCls} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div><label className="block text-xs font-semibold text-stone-600">Valor</label>
          <input type="number" value={f.valor} onChange={(e) => set("valor", e.target.value)} placeholder="0,00" className={inputCls + " tabular-nums"} /></div>
        <div><label className="block text-xs font-semibold text-stone-600">Data</label>
          <input type="date" value={f.data} onChange={(e) => set("data", e.target.value)} className={inputCls} /></div>
      </div>
      <label className="mt-3 block text-xs font-semibold text-stone-600">Evento <span className="font-normal text-stone-400">(opcional — conta na rentabilidade)</span></label>
      <select value={f.evento_id} onChange={(e) => set("evento_id", e.target.value)} className={inputCls}>
        {EVENTO_OPCOES.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
      </select>
      <ModalAcoes onFechar={onFechar} ok={ok} onSalvar={() => onSalvar({ ...f, valor: +f.valor, evento_id: f.evento_id || null })} />
    </ModalBase>
  );
}

function ModalCategorias({ categorias, onAdd, onToggle, onFechar }) {
  const [nova, setNova] = useState("");
  return (
    <ModalBase titulo="Categorias de despesa" onFechar={onFechar}>
      <div className="mt-4 flex gap-2">
        <input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nova categoria" className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none" />
        <button onClick={() => nova.trim() && onAdd(nova.trim())} disabled={!nova.trim()} className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ background: ACCENT }}>
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      <div className="mt-3 divide-y divide-stone-100">
        {categorias.map((c) => (
          <div key={c.id} className="flex items-center justify-between py-2.5">
            <span className={`text-sm ${c.ativa ? "text-stone-700" : "text-stone-400 line-through"}`}>{c.nome}</span>
            <Toggle ativo={c.ativa} onClick={() => onToggle(c.id)} />
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Fechar</button>
      </div>
    </ModalBase>
  );
}

function ModalAcoes({ onFechar, ok, onSalvar }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Cancelar</button>
      <button onClick={onSalvar} disabled={!ok} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ background: ACCENT }}>
        <Save className="h-4 w-4" /> Salvar
      </button>
    </div>
  );
}
