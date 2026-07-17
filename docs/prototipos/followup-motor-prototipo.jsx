import React, { useState } from "react";
import {
  BellRing, Clock, Mail, MessageSquare, Check, X, Ban, Plus, Pencil,
  Info, Trash2, TrendingUp, FileSignature, CreditCard, ImageIcon, Zap, Save,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Motor de Follow-up Automático (módulo do menu ADM)
// Duas superfícies: (1) Painel de governança — ciclos ativos, tentativa
// atual, próximo disparo, cancelar; (2) Configuração de réguas — criar/
// editar régua (intervalo, N máx., canal, template).
// Motor central agnóstico: domínios declaram gatilhos de inércia; o motor
// só observa, conta e dispara. Para quando resolve OU após N tentativas.
// Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

// ícone por tipo de origem do gatilho
const ORIGEM = {
  parcela: { icon: CreditCard, label: "Parcela vencendo", prioridade: 1 },
  contrato: { icon: FileSignature, label: "Contrato não assinado", prioridade: 2 },
  orcamento: { icon: TrendingUp, label: "Orçamento parado", prioridade: 3 },
  album: { icon: ImageIcon, label: "Álbum a expirar", prioridade: 4 },
};

const CANAL = {
  email: { icon: Mail, label: "E-mail" },
  whatsapp: { icon: MessageSquare, label: "WhatsApp" },
};

// réguas configuradas (seed)
const REGUAS_SEED = [
  { id: "r1", nome: "Lead frio", natureza: "comercial", intervaloDias: 3, tentativasMax: 3, canalInicial: "email", canalEscalonado: null, tentativaEscalonamento: null, template: "Oi {nome}! Vi que você pediu um orçamento e não retornou — posso ajudar com alguma dúvida?", aoEsgotar: true },
  { id: "r2", nome: "Contrato pendente", natureza: "operacional", intervaloDias: 2, tentativasMax: 4, canalInicial: "email", canalEscalonado: "whatsapp", tentativaEscalonamento: 3, template: "{nome}, seu contrato do evento {evento} ainda aguarda assinatura. Qualquer dúvida, estou à disposição!", aoEsgotar: true },
  { id: "r3", nome: "Cobrança de parcela", natureza: "operacional", intervaloDias: 5, tentativasMax: 5, canalInicial: "email", canalEscalonado: "whatsapp", tentativaEscalonamento: 3, template: "Olá {nome}, a parcela de {valor} vence em breve. Segue o link para pagamento.", aoEsgotar: true },
  { id: "r4", nome: "Álbum expirando", natureza: "operacional", intervaloDias: 7, tentativasMax: 2, canalInicial: "email", canalEscalonado: null, tentativaEscalonamento: null, template: "{nome}, seu álbum fica disponível até {data}. Baixe suas fotos antes que expire!", aoEsgotar: false },
];

// canal EFETIVO de uma tentativa, dado a régua e o número da tentativa atual
const canalEfetivo = (regua, tentativa) =>
  regua.canalEscalonado && tentativa >= regua.tentativaEscalonamento ? regua.canalEscalonado : regua.canalInicial;

// ciclos de follow-up em andamento (seed) — canal é derivado da régua + tentativa, não fixo aqui
const CICLOS_SEED = [
  { id: "c1", origem: "orcamento", regua: "Lead frio", destinatario: "Marina Souza", ref: "Orç. #1042 · pré-wedding", tentativa: 2, max: 3, proximoDisparo: "amanhã, 09:00", status: "ativo" },
  { id: "c2", origem: "contrato", regua: "Contrato pendente", destinatario: "Família Costa", ref: "Contrato · 15 anos Beatriz", tentativa: 1, max: 4, proximoDisparo: "em 2 dias", status: "ativo" },
  { id: "c3", origem: "parcela", regua: "Cobrança de parcela", destinatario: "Estúdio X Ltda", ref: "Parcela 2/3 · R$ 1.200", tentativa: 3, max: 5, proximoDisparo: "em 4 dias", status: "ativo" },
  { id: "c4", origem: "album", regua: "Álbum expirando", destinatario: "João & Ana", ref: "Álbum · Casamento", tentativa: 2, max: 2, proximoDisparo: "—", status: "esgotado" },
  { id: "c5", origem: "orcamento", regua: "Lead frio", destinatario: "Carla Eventos", ref: "Orç. #1039 · corporativo", tentativa: 1, max: 3, proximoDisparo: "—", status: "resolvido" },
];

const STATUS_BADGE = {
  ativo: "bg-blue-50 text-blue-600",
  resolvido: "bg-emerald-50 text-emerald-600",
  esgotado: "bg-amber-50 text-amber-600",
  cancelado: "bg-stone-100 text-stone-500",
};
const STATUS_LABEL = { ativo: "Ativo", resolvido: "Resolvido", esgotado: "Esgotado", cancelado: "Cancelado" };
const NATUREZA_BADGE = {
  comercial: "bg-purple-50 text-purple-700",
  operacional: "bg-stone-100 text-stone-600",
};

export default function MotorFollowup() {
  const [aba, setAba] = useState("painel");
  const [ciclos, setCiclos] = useState(CICLOS_SEED);
  const [reguas, setReguas] = useState(REGUAS_SEED);
  const [filtro, setFiltro] = useState("todos");
  const [editando, setEditando] = useState(null); // régua sendo editada/criada

  const cancelar = (id) => setCiclos((l) => l.map((c) => c.id === id ? { ...c, status: "cancelado", proximoDisparo: "—" } : c));

  const visiveis = ciclos.filter((c) => filtro === "todos" || c.status === filtro);
  const ativos = ciclos.filter((c) => c.status === "ativo").length;

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      {/* header */}
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><BellRing className="h-4 w-4 text-white" /></div>
          <span className="text-sm font-semibold tracking-tight">Automação · Follow-up</span>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Motor de Follow-up</h1>
        <p className="mt-1 text-sm text-stone-500">Lembretes automáticos por inércia — recupera lead frio e cobra pendência, e para sozinho quando resolve ou esgota.</p>

        {/* abas de superfície */}
        <div className="mt-5 flex gap-2 border-b border-stone-200">
          {[["painel", "Painel", ativos], ["reguas", "Réguas", reguas.length]].map(([k, r, n]) => (
            <button key={k} onClick={() => setAba(k)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${aba === k ? "" : "border-transparent text-stone-400 hover:text-stone-600"}`}
              style={aba === k ? { borderColor: ACCENT, color: ACCENT } : {}}>
              {r} <span className="tabular-nums">({n})</span>
            </button>
          ))}
        </div>

        {aba === "painel" ? (
          <>
            <p className="mt-4 flex items-start gap-1.5 rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Teto de 1 mensagem de Follow-up por cliente/dia. Com pendências concorrentes, vence a de maior prioridade — as demais esperam o próximo ciclo.
            </p>

            {/* filtros por status */}
            <div className="mt-5 flex flex-wrap gap-2">
              {[["todos", "Todos"], ["ativo", "Ativos"], ["resolvido", "Resolvidos"], ["esgotado", "Esgotados"], ["cancelado", "Cancelados"]].map(([k, r]) => {
                const n = k === "todos" ? ciclos.length : ciclos.filter((c) => c.status === k).length;
                return (
                  <button key={k} onClick={() => setFiltro(k)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filtro === k ? "text-white" : "bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50"}`}
                    style={filtro === k ? { background: ACCENT } : {}}>{r} ({n})</button>
                );
              })}
            </div>

            <div className="mt-4 space-y-3">
              {visiveis.map((c) => {
                const O = ORIGEM[c.origem]; const OIcon = O.icon;
                const reguaDoCiclo = reguas.find((r) => r.nome === c.regua);
                const canalAtual = reguaDoCiclo ? canalEfetivo(reguaDoCiclo, c.tentativa) : "email";
                const Canal = CANAL[canalAtual]; const CIcon = Canal.icon;
                const vaiEscalar = reguaDoCiclo?.canalEscalonado && c.tentativa + 1 >= reguaDoCiclo.tentativaEscalonamento && canalAtual !== reguaDoCiclo.canalEscalonado;
                return (
                  <div key={c.id} className="rounded-xl border border-stone-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100"><OIcon className="h-4 w-4 text-stone-500" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{c.destinatario}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">{c.regua}</span>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">prioridade {O.prioridade}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-stone-500">{O.label} · {c.ref}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400">
                          <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> tentativa <span className="font-semibold tabular-nums text-stone-600">{c.tentativa}/{c.max}</span></span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> próximo: <span className="tabular-nums">{c.proximoDisparo}</span></span>
                          <span className="flex items-center gap-1"><CIcon className="h-3 w-3" /> {Canal.label}</span>
                          {vaiEscalar && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600">escala pro WhatsApp na próxima tentativa</span>}
                        </div>
                        {/* barra de progresso das tentativas */}
                        <div className="mt-2 flex gap-1">
                          {Array.from({ length: c.max }).map((_, i) => (
                            <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < c.tentativa ? ACCENT : "#e7e5e4" }} />
                          ))}
                        </div>
                      </div>
                      {c.status === "ativo" && (
                        <button onClick={() => cancelar(c.id)} className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
                          <Ban className="h-3.5 w-3.5" /> Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {visiveis.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-stone-200 px-5 py-10 text-center text-sm text-stone-400">Nenhum ciclo neste filtro.</div>
              )}
            </div>

            <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Os ciclos nascem quando um domínio declara inércia (orçamento parado, contrato não assinado, parcela vencendo, álbum a expirar). O motor observa, conta as tentativas e dispara pela régua. Encerra sozinho ao resolver ou ao atingir o limite — ou quando você cancela.
            </p>
          </>
        ) : (
          <>
            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm text-stone-500">Cada régua define ritmo e limite de insistência por tipo de pendência.</p>
              <button onClick={() => setEditando({ id: null, nome: "", natureza: "operacional", intervaloDias: 3, tentativasMax: 3, canalInicial: "email", canalEscalonado: null, tentativaEscalonamento: null, template: "", aoEsgotar: true })}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
                <Plus className="h-3.5 w-3.5" /> Nova régua
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {reguas.map((r) => {
                const CanalInicial = CANAL[r.canalInicial]; const CIcon = CanalInicial.icon;
                const CanalDestino = r.canalEscalonado ? CANAL[r.canalEscalonado] : null;
                return (
                  <div key={r.id} className="rounded-xl border border-stone-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{r.nome}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${NATUREZA_BADGE[r.natureza]}`}>{r.natureza}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                          <span>a cada <span className="font-semibold tabular-nums text-stone-700">{r.intervaloDias}</span> dias</span>
                          <span>até <span className="font-semibold tabular-nums text-stone-700">{r.tentativasMax}</span> tentativas</span>
                          <span className="flex items-center gap-1"><CIcon className="h-3 w-3" /> {CanalInicial.label}
                            {CanalDestino && <> → <CanalDestino.icon className="h-3 w-3" /> {CanalDestino.label} (da tentativa {r.tentativaEscalonamento})</>}
                          </span>
                          <span className="text-stone-400">ao esgotar: {r.aoEsgotar ? "gera pendência" : "só encerra"}</span>
                        </div>
                        <p className="mt-2 rounded-lg bg-stone-50 p-2 text-xs italic text-stone-500">"{r.template}"</p>
                      </div>
                      <button onClick={() => setEditando(r)} className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> As variáveis entre chaves (ex.: {"{nome}"}, {"{valor}"}, {"{data}"}) são preenchidas no disparo com os dados do gatilho. O canal WhatsApp fica disponível quando a integração da Meta for plugada — o motor já é agnóstico de canal.
            </p>
          </>
        )}
      </main>

      {editando && (
        <ModalRegua
          regua={editando}
          onFechar={() => setEditando(null)}
          onSalvar={(nova) => {
            setReguas((l) => nova.id ? l.map((x) => x.id === nova.id ? nova : x) : [...l, { ...nova, id: `r${Date.now()}` }]);
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

function ModalRegua({ regua, onFechar, onSalvar }) {
  const [f, setF] = useState(regua);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const novo = !regua.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onFechar}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold tracking-tight">{novo ? "Nova régua" : "Editar régua"}</h3>
        <p className="mt-0.5 text-sm text-stone-500">Ritmo e limite de insistência.</p>

        <label className="mt-4 block text-xs font-semibold text-stone-600">Nome</label>
        <input value={f.nome} onChange={(e) => set("nome", e.target.value)} placeholder="ex.: Lead frio"
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-1" style={{ outlineColor: ACCENT }} />

        <label className="mt-3 block text-xs font-semibold text-stone-600">Natureza</label>
        <div className="mt-1 flex gap-2">
          {[["comercial", "Comercial (lead frio)"], ["operacional", "Operacional (pendência)"]].map(([k, r]) => (
            <button key={k} onClick={() => set("natureza", k)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${f.natureza === k ? "text-white" : "text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50"}`}
              style={f.natureza === k ? { background: ACCENT } : {}}>{r}</button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-600">Intervalo (dias)</label>
            <input type="number" min={1} value={f.intervaloDias} onChange={(e) => set("intervaloDias", +e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm tabular-nums focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600">Tentativas máx. (N)</label>
            <input type="number" min={1} value={f.tentativasMax} onChange={(e) => set("tentativasMax", +e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm tabular-nums focus:outline-none" />
          </div>
        </div>

        <label className="mt-3 block text-xs font-semibold text-stone-600">Canal inicial</label>
        <div className="mt-1 flex gap-2">
          {Object.entries(CANAL).map(([k, v]) => (
            <button key={k} onClick={() => set("canalInicial", k)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${f.canalInicial === k ? "text-white" : "text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50"}`}
              style={f.canalInicial === k ? { background: ACCENT } : {}}>
              <v.icon className="h-3.5 w-3.5" /> {v.label}
            </button>
          ))}
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={!!f.canalEscalonado} onChange={(e) => set("canalEscalonado", e.target.checked ? Object.keys(CANAL).find((k) => k !== f.canalInicial) : null)}
            className="h-4 w-4 rounded" style={{ accentColor: ACCENT }} />
          Escalar pra outro canal se não resolver
        </label>
        {f.canalEscalonado && (
          <div className="mt-2 flex items-center gap-3 rounded-lg bg-stone-50 p-3">
            <span className="text-xs text-stone-500">A partir da tentativa</span>
            <input type="number" min={2} max={f.tentativasMax} value={f.tentativaEscalonamento ?? 2}
              onChange={(e) => set("tentativaEscalonamento", +e.target.value)}
              className="w-16 rounded-lg border border-stone-200 px-2 py-1 text-center text-sm tabular-nums focus:outline-none" />
            <span className="text-xs text-stone-500">passa a usar</span>
            <select value={f.canalEscalonado} onChange={(e) => set("canalEscalonado", e.target.value)} className="rounded-lg border border-stone-200 px-2 py-1 text-xs focus:outline-none">
              {Object.entries(CANAL).filter(([k]) => k !== f.canalInicial).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        )}

        <label className="mt-3 block text-xs font-semibold text-stone-600">Template da mensagem</label>
        <textarea value={f.template} onChange={(e) => set("template", e.target.value)} rows={3} placeholder="Use {nome}, {valor}, {data}, {evento}…"
          className="mt-1 w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none" />

        <label className="mt-3 flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={f.aoEsgotar} onChange={(e) => set("aoEsgotar", e.target.checked)} className="h-4 w-4 rounded" style={{ accentColor: ACCENT }} />
          Ao esgotar as tentativas, gerar pendência pra eu agir manualmente
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Cancelar</button>
          <button onClick={() => onSalvar(f)} disabled={!f.nome.trim()}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ background: ACCENT }}>
            <Save className="h-4 w-4" /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
