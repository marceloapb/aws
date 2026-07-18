import React, { useState } from "react";
import { Users, CheckCircle2, Clock, XCircle, ShieldAlert, Ban, Info, Check } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Indicações (menu ADM / §31)
// ADM vê todas as indicações dos clientes, filtra por status,
// enxerga suspeitas sinalizadas e revoga na mão. Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

const SEED = [
  { id: 1, indicador: "Marina Alves", pct: 16, indicado: "Bruno Martins", cadastro: "01/07", fechou: "09/07", status: "confirmada", suspeita: null },
  { id: 2, indicador: "Marina Alves", pct: 16, indicado: "Camila Souza", cadastro: "10/07", fechou: null, status: "pendente", suspeita: null },
  { id: 3, indicador: "Rafael Costa", pct: 8, indicado: "Diego Ramos", cadastro: "14/07", fechou: null, status: "pendente", suspeita: "Mesmo WhatsApp do indicador" },
  { id: 4, indicador: "Juliana Prado", pct: 4, indicado: "Ana Beatriz", cadastro: "20/06", fechou: "28/06", status: "confirmada", suspeita: null },
  { id: 5, indicador: "Rafael Costa", pct: 8, indicado: "Rafael C. Souza", cadastro: "22/06", fechou: null, status: "pendente", suspeita: "Conta possivelmente duplicada" },
  { id: 6, indicador: "Pedro Lima", pct: 0, indicado: "Larissa Melo", cadastro: "12/06", fechou: null, status: "invalidada", suspeita: null },
];

const ST = {
  confirmada: { label: "Fechou", cls: "bg-emerald-50 text-emerald-600", Icon: CheckCircle2 },
  pendente: { label: "Aguardando", cls: "bg-amber-50 text-amber-600", Icon: Clock },
  invalidada: { label: "Invalidada", cls: "bg-red-50 text-red-600", Icon: XCircle },
};

export default function IndicacoesAdmin() {
  const [dados] = useState(SEED);
  const [filtro, setFiltro] = useState("todas");
  const [revogar, setRevogar] = useState(null);   // indicador em confirmação
  const [revogados, setRevogados] = useState([]);

  const cont = {
    todas: dados.length,
    confirmada: dados.filter((d) => d.status === "confirmada").length,
    pendente: dados.filter((d) => d.status === "pendente").length,
    suspeita: dados.filter((d) => d.suspeita).length,
    invalidada: dados.filter((d) => d.status === "invalidada").length,
  };

  const lista = dados.filter((d) => {
    if (filtro === "todas") return true;
    if (filtro === "suspeita") return !!d.suspeita;
    return d.status === filtro;
  });

  const confirmarRevogacao = (nome) => { setRevogados((r) => [...r, nome]); setRevogar(null); };

  const metricas = [
    ["Total", cont.todas, "text-stone-900"],
    ["Confirmadas", cont.confirmada, "text-emerald-600"],
    ["Aguardando", cont.pendente, "text-amber-600"],
    ["Suspeitas", cont.suspeita, "text-red-600"],
  ];
  const pills = [
    ["todas", "Todas", cont.todas],
    ["confirmada", "Fecharam", cont.confirmada],
    ["pendente", "Aguardando", cont.pendente],
    ["suspeita", "Suspeitas", cont.suspeita],
    ["invalidada", "Invalidadas", cont.invalidada],
  ];

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
      className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
            <Users className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Programa de indicações · Painel</span>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Indicações dos clientes</h1>
        <p className="mt-1 text-sm text-stone-500">Todas as indicações, com destaque para as sinalizadas como suspeitas.</p>

        {/* métricas */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metricas.map(([r, n, cls]) => (
            <div key={r} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="text-xs font-medium text-stone-400">{r}</div>
              <div className={`mt-1 text-2xl font-bold tabular-nums ${cls}`}>{n}</div>
            </div>
          ))}
        </div>

        {/* filtros */}
        <div className="mt-6 flex flex-wrap gap-2">
          {pills.map(([k, r, n]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filtro === k ? "text-white" : "bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50"}`}
              style={filtro === k ? { background: ACCENT } : {}}>
              {r} ({n})
            </button>
          ))}
        </div>

        {/* lista */}
        <div className="mt-3 space-y-2">
          {lista.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-stone-200 px-5 py-10 text-center text-sm text-stone-400">Nenhuma indicação neste filtro.</div>
          ) : lista.map((d) => {
            const s = ST[d.status];
            const revogado = revogados.includes(d.indicador);
            return (
              <div key={d.id} className={`rounded-xl border bg-white p-4 ${d.suspeita ? "border-amber-300" : "border-stone-200"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold">{d.indicador}</span>
                      <span className="text-stone-400">indicou</span>
                      <span className="font-semibold">{d.indicado}</span>
                      {revogado && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">indicador revogado</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-stone-400">
                      Cadastro {d.cadastro}{d.fechou ? ` · assinou em ${d.fechou}` : ""} · desconto do indicador: <span className="tabular-nums">{d.pct}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>
                      <s.Icon className="h-3 w-3" /> {s.label}
                    </span>
                    {!revogado && (
                      <button onClick={() => setRevogar(d.indicador)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 ring-1 ring-red-200 hover:bg-red-50">
                        <Ban className="h-3.5 w-3.5" /> Revogar
                      </button>
                    )}
                  </div>
                </div>

                {d.suspeita && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <ShieldAlert className="h-4 w-4 shrink-0" /> Suspeita: {d.suspeita}
                  </div>
                )}

                {revogar === d.indicador && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-xs text-red-700">Revogar o desconto futuro de <b>{d.indicador}</b>? O desconto acumulado dele deixa de valer em novos orçamentos. Contratos já assinados não mudam.</p>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => confirmarRevogacao(d.indicador)}
                        className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                        <Check className="h-3.5 w-3.5" /> Confirmar revogação
                      </button>
                      <button onClick={() => setRevogar(null)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Revogar afeta apenas orçamentos futuros do indicador. Contratos já assinados são imutáveis (§26) e não são alterados.
        </p>
      </main>
    </div>
  );
}
