import React, { useState } from "react";
import { Gift, Copy, Check, Share2, ShieldAlert, Info, CheckCircle2, Clock, XCircle, TrendingUp } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Minhas indicações (Central do Cliente / §31)
// Cliente acompanha suas indicações, vê seu % de desconto pessoal,
// copia o link e lê o aviso de intransferibilidade. Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

// config que viria do ADM (§31) — aqui fixa pro mock
const CFG = { base: 5, incremento: 4, teto: 20 };

const INDICACOES = [
  { id: 1, nome: "Marina Alves", status: "confirmada", cadastro: "02/06", fechou: "18/06" },
  { id: 2, nome: "Rafael Costa", status: "confirmada", cadastro: "05/06", fechou: "20/06" },
  { id: 3, nome: "Juliana Prado", status: "confirmada", cadastro: "11/06", fechou: "29/06" },
  { id: 4, nome: "Bruno Martins", status: "confirmada", cadastro: "01/07", fechou: "09/07" },
  { id: 5, nome: "Camila Souza", status: "pendente", cadastro: "10/07", fechou: null },
  { id: 6, nome: "Diego Ramos", status: "pendente", cadastro: "14/07", fechou: null },
  { id: 7, nome: "Ana Beatriz", status: "invalidada", cadastro: "20/06", fechou: null },
];

const ST = {
  confirmada: { label: "Fechou", cls: "bg-emerald-50 text-emerald-600", Icon: CheckCircle2 },
  pendente: { label: "Aguardando fechar", cls: "bg-amber-50 text-amber-600", Icon: Clock },
  invalidada: { label: "Invalidada", cls: "bg-red-50 text-red-600", Icon: XCircle },
};

export default function MinhasIndicacoes() {
  const [filtro, setFiltro] = useState("todas");
  const [copiado, setCopiado] = useState(false);

  const confirmadas = INDICACOES.filter((i) => i.status === "confirmada").length;
  const desconto = Math.min(confirmadas * CFG.incremento, CFG.teto);
  const noTeto = desconto >= CFG.teto;
  const pctBarra = Math.min((desconto / CFG.teto) * 100, 100);

  const link = "marcelobloisefotografia.com.br/orcamento?ref=MARINA7K2";
  const copiar = () => { setCopiado(true); setTimeout(() => setCopiado(false), 1800); };

  const cont = {
    todas: INDICACOES.length,
    confirmada: INDICACOES.filter((i) => i.status === "confirmada").length,
    pendente: INDICACOES.filter((i) => i.status === "pendente").length,
    invalidada: INDICACOES.filter((i) => i.status === "invalidada").length,
  };
  const lista = filtro === "todas" ? INDICACOES : INDICACOES.filter((i) => i.status === filtro);
  const pills = [
    ["todas", "Todas", cont.todas],
    ["confirmada", "Fecharam", cont.confirmada],
    ["pendente", "Aguardando", cont.pendente],
    ["invalidada", "Invalidadas", cont.invalidada],
  ];

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
      className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
            <Gift className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Central do Cliente · Minhas indicações</span>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Minhas indicações</h1>
        <p className="mt-1 text-sm text-stone-500">Indique amigos e acumule desconto pessoal no seu próximo orçamento.</p>

        {/* card destaque — desconto atual */}
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-stone-400">Seu desconto pessoal</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-bold tabular-nums" style={{ color: ACCENT }}>{desconto}%</span>
                {noTeto && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">no máximo</span>}
              </div>
            </div>
            <div className="text-right text-sm text-stone-500">
              <div className="flex items-center justify-end gap-1"><TrendingUp className="h-4 w-4" style={{ color: ACCENT }} /><span className="font-semibold tabular-nums text-stone-900">{confirmadas}</span></div>
              <div className="text-xs">amigos que fecharam</div>
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-stone-100">
            <div className="h-full rounded-full" style={{ width: `${pctBarra}%`, background: ACCENT }} />
          </div>
          <p className="mt-2 text-xs text-stone-400">
            {noTeto ? `Você atingiu o desconto máximo de ${CFG.teto}%.` : `Cada amigo que fechar soma +${CFG.incremento}%, até o limite de ${CFG.teto}%.`}
          </p>
        </div>

        {/* link pessoal */}
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
          <div className="text-sm font-semibold">Seu link de indicação</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 truncate rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600 ring-1 ring-stone-200">{link}</div>
            <button onClick={copiar}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
              style={{ background: ACCENT }}>
              {copiado ? <><Check className="h-3.5 w-3.5" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copiar</>}
            </button>
          </div>
          <button className="mt-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
            <Share2 className="h-3.5 w-3.5" /> Compartilhar no WhatsApp
          </button>
        </div>

        {/* aviso obrigatório */}
        <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <div className="font-semibold">Seu desconto é pessoal e intransferível.</div>
            <p className="mt-0.5 text-xs text-amber-700">Ele vale só para você e não pode ser repassado a terceiros. Indicações irregulares (como cadastros do mesmo contato) podem levar à perda dos seus descontos futuros.</p>
          </div>
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
          ) : lista.map((i) => {
            const s = ST[i.status];
            return (
              <div key={i.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4">
                <div>
                  <div className="text-sm font-semibold">{i.nome}</div>
                  <div className="text-xs text-stone-400">Indicado em {i.cadastro}{i.fechou ? ` · fechou em ${i.fechou}` : ""}</div>
                </div>
                <div className="flex items-center gap-2">
                  {i.status === "confirmada" && <span className="text-xs font-semibold tabular-nums" style={{ color: ACCENT }}>+{CFG.incremento}%</span>}
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>
                    <s.Icon className="h-3 w-3" /> {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Seu desconto entra automaticamente no seu próximo orçamento, somado a outras condições e limitado ao desconto máximo da proposta.
        </p>
      </main>
    </div>
  );
}
