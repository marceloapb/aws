import React, { useState, useMemo } from "react";
import {
  Camera, List, CalendarDays, Plus, X, Check, MapPin, Clock, ChevronLeft, ChevronRight,
  CircleDot, Info
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Tela de Agenda (MVP-1)
// Visão única com tudo: confirmados + reservas temporárias + bloqueios
// manuais, classificados por cor/status. Alterna Lista | Calendário.
// + Novo bloqueio manual (com replicar-no-Google opcional).
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

// classificação visual
const TIPOS = {
  confirmado: { rotulo: "Confirmado", cor: "#059669", bg: "#ECFDF5", fg: "#047857" },
  reserva: { rotulo: "Reserva temporária", cor: "#EA580C", bg: "#FEF3EC", fg: "#C2410C" },
  manual: { rotulo: "Bloqueio manual", cor: "#57534e", bg: "#F5F5F4", fg: "#57534e" },
};

const AGENDA_SEED = [
  { id: 1, nome: "Casamento Marina e Rafael", tipo: "confirmado", data: "2026-12-12", inicio: "16:00", fim: "23:30", local: "Buffet Villa, Itaim Bibi" },
  { id: 2, nome: "Batizado da Sofia", tipo: "reserva", data: "2026-08-21", inicio: "13:00", fim: "18:00", local: "Igreja N. Sra., Pinheiros", expiraEm: 5 },
  { id: 3, nome: "Aniversário 15 anos — Júlia", tipo: "reserva", data: "2026-09-03", inicio: "20:00", fim: "23:00", local: "Espaço Jardim", expiraEm: 2 },
  { id: 4, nome: "Consulta médica", tipo: "manual", data: "2026-08-21", inicio: "09:00", fim: "10:30", local: "—", noGoogle: true },
  { id: 5, nome: "Ensaio Família Costa", tipo: "confirmado", data: "2026-08-28", inicio: "15:00", fim: "17:00", local: "Parque Ibirapuera" },
  { id: 6, nome: "Folga — viagem", tipo: "manual", data: "2026-09-10", inicio: "00:00", fim: "23:59", local: "—", noGoogle: false },
];

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS_SEM = ["D", "S", "T", "Q", "Q", "S", "S"];
const fmtData = (iso) => { const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; };

export default function AgendaTela() {
  const [modo, setModo] = useState("lista");
  const [filtro, setFiltro] = useState("todos");
  const [itens, setItens] = useState(AGENDA_SEED);
  const [modalNovo, setModalNovo] = useState(false);

  const filtrados = useMemo(
    () => (filtro === "todos" ? itens : itens.filter((i) => i.tipo === filtro)),
    [itens, filtro]
  );

  const addManual = (item) => { setItens((l) => [...l, { ...item, id: Date.now(), tipo: "manual" }]); setModalNovo(false); };

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
         className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
            <Camera className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Agenda</span>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Minha agenda</h1>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-lg border border-stone-200 p-1">
              <button onClick={() => setModo("lista")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${modo === "lista" ? "text-white" : "text-stone-500"}`} style={modo === "lista" ? { background: ACCENT } : {}}>
                <List className="h-4 w-4" /> Lista
              </button>
              <button onClick={() => setModo("calendario")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${modo === "calendario" ? "text-white" : "text-stone-500"}`} style={modo === "calendario" ? { background: ACCENT } : {}}>
                <CalendarDays className="h-4 w-4" /> Calendário
              </button>
            </div>
            <button onClick={() => setModalNovo(true)} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: ACCENT }}>
              <Plus className="h-4 w-4" /> Novo bloqueio
            </button>
          </div>
        </div>

        {/* legenda + filtro */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <FiltroBtn ativo={filtro === "todos"} onClick={() => setFiltro("todos")}>Todos</FiltroBtn>
          {Object.entries(TIPOS).map(([k, t]) => (
            <FiltroBtn key={k} ativo={filtro === k} onClick={() => setFiltro(k)} cor={t.cor}>{t.rotulo}</FiltroBtn>
          ))}
        </div>

        {modo === "lista" ? <Lista itens={filtrados} /> : <Calendario itens={filtrados} />}
      </main>

      {modalNovo && <ModalBloqueio onClose={() => setModalNovo(false)} onSalvar={addManual} />}
    </div>
  );
}

function FiltroBtn({ ativo, onClick, cor, children }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${ativo ? "text-white" : "bg-white text-stone-500 ring-1 ring-stone-200 hover:text-stone-800"}`}
      style={ativo ? { background: ACCENT } : {}}>
      {cor && <span className="h-2 w-2 rounded-full" style={{ background: ativo ? "white" : cor }} />}
      {children}
    </button>
  );
}

// ── Lista ─────────────────────────────────────────────────────

function Lista({ itens }) {
  const ordenados = [...itens].sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio));
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      {ordenados.map((it, idx) => {
        const t = TIPOS[it.tipo];
        return (
          <div key={it.id} className={`flex items-start gap-3 px-5 py-4 ${idx !== ordenados.length - 1 ? "border-b border-stone-100" : ""}`}>
            <div className="flex w-14 shrink-0 flex-col items-center rounded-lg py-1.5" style={{ background: t.bg }}>
              <span className="text-lg font-bold leading-none" style={{ color: t.fg }}>{it.data.split("-")[2]}</span>
              <span className="text-xs" style={{ color: t.fg }}>{MESES[Number(it.data.split("-")[1]) - 1].slice(0, 3)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{it.nome}</span>
                <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: t.bg, color: t.fg }}>{t.rotulo}</span>
                {it.tipo === "reserva" && <span className="text-xs text-amber-600">expira em {it.expiraEm}d</span>}
                {it.tipo === "manual" && <span className="text-xs text-stone-400">{it.noGoogle ? "no Google" : "só no sistema"}</span>}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{it.inicio}–{it.fim}</span>
                {it.local !== "—" && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{it.local}</span>}
              </div>
            </div>
          </div>
        );
      })}
      {ordenados.length === 0 && <div className="px-5 py-12 text-center text-stone-400">Nada neste filtro.</div>}
    </div>
  );
}

// ── Calendário ────────────────────────────────────────────────

function Calendario({ itens }) {
  const [refMes, setRefMes] = useState({ ano: 2026, mes: 7 }); // agosto (0-index)
  const primeiroDiaSemana = new Date(refMes.ano, refMes.mes, 1).getDay();
  const diasNoMes = new Date(refMes.ano, refMes.mes + 1, 0).getDate();

  const porDia = useMemo(() => {
    const map = {};
    itens.forEach((it) => {
      const [a, m, d] = it.data.split("-").map(Number);
      if (a === refMes.ano && m - 1 === refMes.mes) { (map[d] = map[d] || []).push(it); }
    });
    return map;
  }, [itens, refMes]);

  const navega = (delta) => setRefMes((r) => {
    let m = r.mes + delta, a = r.ano;
    if (m < 0) { m = 11; a--; } if (m > 11) { m = 0; a++; }
    return { ano: a, mes: m };
  });

  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => navega(-1)} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100"><ChevronLeft className="h-5 w-5" /></button>
        <span className="font-semibold">{MESES[refMes.mes]} {refMes.ano}</span>
        <button onClick={() => navega(1)} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-stone-400">
        {DIAS_SEM.map((d, i) => <div key={i} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celulas.map((d, i) => (
          <div key={i} className={`min-h-[68px] rounded-lg p-1.5 ${d ? "bg-stone-50" : ""}`}>
            {d && (
              <>
                <div className="text-xs font-medium text-stone-500">{d}</div>
                <div className="mt-1 space-y-1">
                  {(porDia[d] || []).map((it) => {
                    const t = TIPOS[it.tipo];
                    return (
                      <div key={it.id} className="truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight" style={{ background: t.bg, color: t.fg }} title={`${it.nome} · ${it.inicio}`}>
                        {it.nome}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
        {Object.values(TIPOS).map((t) => (
          <span key={t.rotulo} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: t.cor }} />{t.rotulo}</span>
        ))}
      </div>
    </div>
  );
}

// ── Modal novo bloqueio manual ────────────────────────────────

function ModalBloqueio({ onClose, onSalvar }) {
  const [f, setF] = useState({ nome: "", data: "", inicio: "", fim: "", local: "—", noGoogle: true });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const inp = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Novo bloqueio manual</h2>
            <p className="mt-0.5 text-sm text-stone-500">Um compromisso pessoal ou uma data indisponível.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Título</label>
            <input value={f.nome} onChange={(e) => set("nome", e.target.value)} className={inp} placeholder="Ex.: Consulta médica, Folga" /></div>
          <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Data</label>
            <input type="date" value={f.data} onChange={(e) => set("data", e.target.value)} className={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Início</label>
              <input type="time" value={f.inicio} onChange={(e) => set("inicio", e.target.value)} className={inp} /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Término</label>
              <input type="time" value={f.fim} onChange={(e) => set("fim", e.target.value)} className={inp} /></div>
          </div>
          <button onClick={() => set("noGoogle", !f.noGoogle)} className="flex items-start gap-3 text-left">
            <span className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${f.noGoogle ? "" : "bg-stone-200"}`} style={f.noGoogle ? { background: ACCENT } : {}}>
              <span className={`h-4 w-4 rounded-full bg-white shadow transition ${f.noGoogle ? "translate-x-4" : ""}`} />
            </span>
            <span>
              <span className="block text-sm font-medium text-stone-700">Replicar no Google Calendar</span>
              <span className="block text-xs text-stone-400">Se desligado, fica só no sistema.</span>
            </span>
          </button>
        </div>
        <div className="flex justify-end gap-3 border-t border-stone-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100">Cancelar</button>
          <button onClick={() => onSalvar(f)} className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Criar bloqueio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
