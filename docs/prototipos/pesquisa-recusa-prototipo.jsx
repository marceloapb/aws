import React, { useState } from "react";
import {
  Camera, X, Check, MessageSquare, Settings, Plus, Tag, Info, ChevronRight, BarChart3
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Pesquisa de Motivo de Recusa (PRÓXIMO)
// Telas: 1) Cliente recusa (motivo + texto opcional, pode pular)
//        2) ADM registra/complementa num orçamento recusado
//        3) Cadastro de motivos (parametrizável)
// (O follow-up automático a cada 3 dias é módulo separado, no backlog.)
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

const MOTIVOS_SEED = [
  { id: 1, nome: "Achei o preço alto", ativo: true },
  { id: 2, nome: "Fechei com outro fotógrafo", ativo: true },
  { id: 3, nome: "Mudei os planos do evento", ativo: true },
  { id: 4, nome: "A data não ficou disponível", ativo: true },
  { id: 5, nome: "Ainda estou decidindo", ativo: true },
  { id: 6, nome: "Outro motivo", ativo: true },
];

const TELAS = [
  { id: "cliente", nome: "1. Cliente recusa", icon: MessageSquare },
  { id: "adm", nome: "2. Registro do ADM", icon: BarChart3 },
  { id: "config", nome: "3. Motivos", icon: Settings },
];

export default function PesquisaRecusa() {
  const [tela, setTela] = useState("cliente");
  const [motivos, setMotivos] = useState(MOTIVOS_SEED);

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
         className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
            <Camera className="h-4 w-4 text-white" />
          </div>
          <span className="mr-2 text-sm font-semibold tracking-tight">Pesquisa de recusa</span>
          {TELAS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTela(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${tela === t.id ? "text-white" : "text-stone-500 hover:text-stone-800"}`}
                style={tela === t.id ? { background: ACCENT } : {}}>
                <Icon className="h-3.5 w-3.5" /> {t.nome}
              </button>
            );
          })}
        </div>
      </div>

      {tela === "cliente" && <TelaCliente motivos={motivos} />}
      {tela === "adm" && <TelaADM motivos={motivos} />}
      {tela === "config" && <TelaConfig motivos={motivos} setMotivos={setMotivos} />}
    </div>
  );
}

// ── Tela 1: Cliente recusa ───────────────────────────────────

function TelaCliente({ motivos }) {
  const [sel, setSel] = useState(null);
  const [obs, setObs] = useState("");
  const [fim, setFim] = useState(null); // 'enviado' | 'pulou'

  if (fim) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
          <Check className="h-6 w-6 text-stone-500" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Orçamento recusado</h1>
        <p className="mt-2 text-sm text-stone-500">
          {fim === "enviado" ? "Obrigado pelo retorno — isso ajuda a melhorar." : "Tudo bem. Se mudar de ideia, é só voltar."}
        </p>
        <button onClick={() => { setFim(null); setSel(null); setObs(""); }} className="mt-6 text-sm font-medium text-orange-600 hover:text-orange-700">← Rever (demo)</button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-xl font-bold tracking-tight">Que pena que não rolou desta vez</h1>
      <p className="mt-1 text-sm text-stone-500">Se quiser, conta rapidinho o motivo. É opcional e ajuda muito.</p>

      <div className="mt-5 space-y-2">
        {motivos.filter((m) => m.ativo).map((m) => {
          const on = sel === m.id;
          return (
            <button key={m.id} onClick={() => setSel(m.id)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition ${on ? "" : "border-stone-200 hover:bg-stone-50"}`}
              style={on ? { borderColor: ACCENT } : {}}>
              <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition ${on ? "border-transparent" : "border-stone-300"}`} style={on ? { background: ACCENT } : {}}>
                {on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              {m.nome}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-sm font-medium text-stone-700">Quer complementar? (opcional)</label>
        <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none placeholder:text-stone-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          placeholder="Ex.: o valor ficou um pouco acima do meu orçamento." />
      </div>

      <div className="mt-5 flex gap-2">
        <button onClick={() => setFim("pulou")} className="flex-1 rounded-lg py-2.5 text-sm font-medium text-stone-500 ring-1 ring-stone-300 hover:bg-stone-50">
          Pular
        </button>
        <button onClick={() => setFim("enviado")} disabled={!sel}
          className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-90" style={{ background: ACCENT }}>
          Enviar
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-stone-400">Recusar não exige responder — você pode pular.</p>
    </main>
  );
}

// ── Tela 2: ADM registra / vê o motivo ───────────────────────

function TelaADM({ motivos }) {
  const [registros] = useState([
    { cliente: "Pedro e Ana", evento: "Casamento", motivoId: 1, obs: "Disse que o concorrente fez por 800 a menos.", origem: "cliente" },
    { cliente: "Família Souza", evento: "Batizado", motivoId: 4, obs: "", origem: "cliente" },
    { cliente: "Juliana", evento: "Aniversário", motivoId: null, obs: "", origem: null }, // sem resposta
  ]);
  const [editando, setEditando] = useState(null);
  const nomeMotivo = (id) => motivos.find((m) => m.id === id)?.nome;

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Orçamentos recusados</h1>
      <p className="mt-1 text-sm text-stone-500">O cliente responde primeiro. Quando ele não responde, você pode registrar o motivo que descobriu.</p>

      <div className="mt-6 space-y-3">
        {registros.map((r, i) => (
          <div key={i} className="flex items-start justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4">
            <div className="min-w-0">
              <div className="font-medium">{r.cliente} <span className="text-sm font-normal text-stone-400">· {r.evento}</span></div>
              {r.motivoId ? (
                <div className="mt-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium" style={{ color: "#C2410C" }}>
                    <Tag className="h-3 w-3" /> {nomeMotivo(r.motivoId)}
                  </span>
                  <span className="ml-2 text-xs text-stone-400">{r.origem === "cliente" ? "respondido pelo cliente" : "registrado por você"}</span>
                  {r.obs && <p className="mt-1.5 text-sm text-stone-500">"{r.obs}"</p>}
                </div>
              ) : (
                <div className="mt-1.5 flex items-center gap-1.5 text-sm text-stone-400">
                  <Info className="h-3.5 w-3.5" /> Cliente não respondeu.
                </div>
              )}
            </div>
            <button onClick={() => setEditando(i)} className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition" style={{ background: "#FEF3EC", color: "#C2410C" }}>
              {r.motivoId ? "Editar" : "Registrar motivo"}
            </button>
          </div>
        ))}
      </div>

      {editando !== null && (
        <ModalRegistro motivos={motivos} onClose={() => setEditando(null)} />
      )}
    </main>
  );
}

function ModalRegistro({ motivos, onClose }) {
  const [sel, setSel] = useState(null);
  const [obs, setObs] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Registrar motivo</h2>
            <p className="mt-0.5 text-sm text-stone-500">O que você descobriu na conversa com o cliente.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-2 px-6 py-5">
          {motivos.filter((m) => m.ativo).map((m) => {
            const on = sel === m.id;
            return (
              <button key={m.id} onClick={() => setSel(m.id)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${on ? "ring-2" : "border-stone-200 hover:bg-stone-50"}`}
                style={on ? { borderColor: ACCENT, "--tw-ring-color": "#FED7AA" } : {}}>
                <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${on ? "border-transparent" : "border-stone-300"}`} style={on ? { background: ACCENT } : {}}>
                  {on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                {m.nome}
              </button>
            );
          })}
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none placeholder:text-stone-300 focus:border-orange-400" placeholder="Observação (opcional)" />
        </div>
        <div className="flex justify-end gap-3 border-t border-stone-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100">Cancelar</button>
          <button onClick={onClose} disabled={!sel} className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-40 hover:opacity-90" style={{ background: ACCENT }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ── Tela 3: Cadastro de motivos (parametrizável) ─────────────

function TelaConfig({ motivos, setMotivos }) {
  const [novo, setNovo] = useState("");
  const add = () => { if (novo.trim()) { setMotivos((l) => [...l, { id: Date.now(), nome: novo.trim(), ativo: true }]); setNovo(""); } };
  const toggle = (id) => setMotivos((l) => l.map((m) => m.id === id ? { ...m, ativo: !m.ativo } : m));

  return (
    <main className="mx-auto max-w-xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Motivos de recusa</h1>
      <p className="mt-1 text-sm text-stone-500">As opções que o cliente vê ao recusar. Você controla a lista — nada fixo no sistema.</p>

      <div className="mt-5 flex gap-2">
        <input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Novo motivo…" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none placeholder:text-stone-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
        <button onClick={add} className="flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-white">
        {motivos.map((m, idx) => (
          <div key={m.id} className={`flex items-center justify-between px-5 py-3.5 ${idx !== motivos.length - 1 ? "border-b border-stone-100" : ""}`}>
            <span className="flex items-center gap-2.5"><Tag className="h-4 w-4 text-stone-300" /><span className={m.ativo ? "font-medium" : "text-stone-400 line-through"}>{m.nome}</span></span>
            <button onClick={() => toggle(m.id)} className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${m.ativo ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-stone-100 text-stone-400 hover:bg-stone-200"}`}>
              {m.ativo ? "Ativo" : "Inativo"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
