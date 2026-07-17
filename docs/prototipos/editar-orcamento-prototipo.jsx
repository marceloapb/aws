import React, { useState } from "react";
import {
  Camera, ArrowLeft, Pencil, Trash2, Plus, Send, Clock, Calendar, MapPin,
  AlertTriangle, Check, X, RotateCcw, Info, DollarSign
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Edição de Orçamento Enviado (em NEGOCIAÇÃO)
// Só para orçamento ENVIADO e ainda NÃO aceito. Ajusta opções,
// valores, itens e data; reenvia reiniciando o prazo. Se a data
// mudar, a reserva de agenda é refeita. Não cobre pós-aceite
// (renegociação/aditivo é item separado). Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// catálogo cadastrado (fonte dos itens — nada de texto livre)
const CATALOGO = [
  { id: "s1", nome: "Cobertura 4h", tipo: "Serviço", valor: 1200 },
  { id: "s2", nome: "Cobertura 6h", tipo: "Serviço", valor: 1800 },
  { id: "s3", nome: "Hora extra", tipo: "Adicional", valor: 250 },
  { id: "p1", nome: "150 fotos tratadas", tipo: "Produto", valor: 400 },
  { id: "p2", nome: "Fotos ilimitadas tratadas", tipo: "Produto", valor: 800 },
  { id: "p3", nome: "Álbum impresso 30x30", tipo: "Produto", valor: 600 },
  { id: "p4", nome: "Galeria online", tipo: "Produto", valor: 200 },
  { id: "pk1", nome: "Pacote Festa (6h + ilimitadas + galeria)", tipo: "Pacote", valor: 2600 },
];

const ORCAMENTO_INICIAL = {
  cliente: "Fernanda Lima",
  evento: "Aniversário de 15 anos",
  data: "2026-11-20",
  hora: "20:00",
  local: "Buffet Estrela",
  status: "enviado",
  enviadoEm: "2026-06-28",
  prazoDias: 7,
  revisao: 1,
  opcoes: [
    { id: 1, nome: "Pacote Essencial", itensIds: ["s1", "p1", "p4"], desconto: 0 },
    { id: 2, nome: "Pacote Completo", itensIds: ["s2", "p2", "p3", "p4"], desconto: 100 },
  ],
};

// soma dos itens de uma opção a partir do catálogo
const somaItens = (ids) => ids.reduce((s, id) => s + (CATALOGO.find((c) => c.id === id)?.valor || 0), 0);

export default function EditarOrcamento() {
  const [orc, setOrc] = useState(ORCAMENTO_INICIAL);
  const [dataOriginal] = useState(ORCAMENTO_INICIAL.data);
  const [editandoOpcao, setEditandoOpcao] = useState(null);
  const [reenviado, setReenviado] = useState(false);

  const set = (patch) => { setOrc((o) => ({ ...o, ...patch })); setReenviado(false); };
  const dataMudou = orc.data !== dataOriginal;

  const salvarOpcao = (op) => {
    if (op.id) setOrc((o) => ({ ...o, opcoes: o.opcoes.map((x) => x.id === op.id ? op : x) }));
    else setOrc((o) => ({ ...o, opcoes: [...o.opcoes, { ...op, id: Date.now() }] }));
    setEditandoOpcao(null); setReenviado(false);
  };
  const removerOpcao = (id) => { setOrc((o) => ({ ...o, opcoes: o.opcoes.filter((x) => x.id !== id) })); setReenviado(false); };

  const reenviar = () => {
    setOrc((o) => ({ ...o, revisao: o.revisao + 1, enviadoEm: "hoje" }));
    setReenviado(true);
  };

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
          <button className="flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4" /> Orçamentos</button>
          <span className="text-sm font-semibold tracking-tight">· Editar orçamento</span>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* cabeçalho do orçamento */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{orc.evento}</h1>
            <div className="mt-1 text-sm text-stone-500">{orc.cliente}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Enviado · em negociação</span>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-500">Revisão {orc.revisao}</span>
          </div>
        </div>

        {/* aviso de escopo */}
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
          <span>Edição disponível porque o orçamento <strong>ainda não foi aceito</strong>. Após o aceite, valores e condições congelam — mudanças passam a ser renegociação.</span>
        </div>

        {/* dados do evento (editáveis) */}
        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-4 font-semibold tracking-tight" style={{ color: ACCENT }}>Dados do evento</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Data do evento" icon={Calendar}>
              <input type="date" value={orc.data} onChange={(e) => set({ data: e.target.value })} className={inp} />
            </Campo>
            <Campo label="Horário" icon={Clock}>
              <input type="time" value={orc.hora} onChange={(e) => set({ hora: e.target.value })} className={inp} />
            </Campo>
            <div className="sm:col-span-2">
              <Campo label="Local" icon={MapPin}>
                <input value={orc.local} onChange={(e) => set({ local: e.target.value })} className={inp} />
              </Campo>
            </div>
          </div>
          {dataMudou && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              A data mudou. Ao reenviar, a reserva na agenda será refeita: a data antiga é liberada e a nova reservada (o sistema checa conflito).
            </div>
          )}
        </section>

        {/* opções (editáveis) */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold tracking-tight" style={{ color: ACCENT }}>Opções enviadas</h2>
            <button onClick={() => setEditandoOpcao({ novo: true })} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
              <Plus className="h-3.5 w-3.5" /> Nova opção
            </button>
          </div>
          <div className="space-y-3">
            {orc.opcoes.map((op) => {
              const subtotal = somaItens(op.itensIds);
              const final = subtotal - (op.desconto || 0);
              return (
                <div key={op.id} className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{op.nome}</div>
                      <ul className="mt-1 space-y-0.5 text-sm text-stone-500">
                        {op.itensIds.map((id) => {
                          const it = CATALOGO.find((c) => c.id === id);
                          return it ? <li key={id} className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5"><Check className="h-3 w-3" style={{ color: ACCENT }} /> {it.nome}</span>
                            <span className="text-xs text-stone-400">{brl(it.valor)}</span>
                          </li> : null;
                        })}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm">
                    <div className="flex justify-between text-stone-500"><span>Subtotal (catálogo)</span><span className="tabular-nums">{brl(subtotal)}</span></div>
                    {op.desconto > 0 && <div className="flex justify-between text-emerald-600"><span>Desconto</span><span className="tabular-nums">− {brl(op.desconto)}</span></div>}
                    <div className="flex justify-between font-bold"><span>Valor final</span><span className="tabular-nums" style={{ color: ACCENT }}>{brl(final)}</span></div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setEditandoOpcao(op)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50"><Pencil className="h-3.5 w-3.5" /> Editar</button>
                    <button onClick={() => removerOpcao(op.id)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Remover</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* reenvio */}
        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-start gap-2 text-sm text-stone-600">
            <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
            <span>Ao reenviar, o cliente recebe a versão revisada e o <strong>prazo de {orc.prazoDias} dias reinicia</strong> (ele ganha o prazo cheio para avaliar a nova proposta).</span>
          </div>
          {reenviado ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <Check className="h-4 w-4" /> Orçamento revisado e reenviado! Prazo reiniciado{dataMudou ? " e reserva de agenda atualizada." : "."}
            </div>
          ) : (
            <button onClick={reenviar} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>
              <Send className="h-4 w-4" /> Reenviar orçamento revisado
            </button>
          )}
        </section>
      </main>

      {editandoOpcao && <ModalOpcao opcao={editandoOpcao.novo ? null : editandoOpcao} onClose={() => setEditandoOpcao(null)} onSalvar={salvarOpcao} />}
    </div>
  );
}

function Campo({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-stone-700"><Icon className="h-3.5 w-3.5 text-stone-400" /> {label}</label>
      {children}
    </div>
  );
}

function ModalOpcao({ opcao, onClose, onSalvar }) {
  const [nome, setNome] = useState(opcao?.nome || "");
  const [itensIds, setItensIds] = useState(opcao?.itensIds || []);
  const [desconto, setDesconto] = useState(opcao?.desconto || 0);

  const subtotal = somaItens(itensIds);
  const final = subtotal - desconto;
  const descontoInvalido = desconto > subtotal;

  const toggle = (id) => setItensIds((l) => l.includes(id) ? l.filter((x) => x !== id) : [...l, id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-100 px-6 py-4">
          <h2 className="text-lg font-bold tracking-tight">{opcao ? "Editar opção" : "Nova opção"}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Nome da opção</label>
            <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} className={inp} placeholder="Ex.: Pacote Completo" /></div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">Itens do catálogo</label>
            <p className="mb-2 text-xs text-stone-400">Selecione os itens que compõem esta opção. O valor soma automático.</p>
            <div className="space-y-1.5">
              {CATALOGO.map((it) => {
                const on = itensIds.includes(it.id);
                return (
                  <button key={it.id} onClick={() => toggle(it.id)} className={`flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2 text-left transition ${on ? "" : "border-stone-200 hover:bg-stone-50"}`} style={on ? { borderColor: ACCENT } : {}}>
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${on ? "border-transparent" : "border-stone-300"}`} style={on ? { background: ACCENT } : {}}>
                      {on && <Check className="h-3.5 w-3.5 text-white" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{it.nome}</span>
                      <span className="text-xs text-stone-400">{it.tipo}</span>
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-stone-600">{brl(it.valor)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* resumo de valores */}
          <div className="rounded-lg bg-stone-50 p-3 text-sm">
            <div className="flex justify-between text-stone-500"><span>Subtotal</span><span className="tabular-nums">{brl(subtotal)}</span></div>
            <div className="mt-2">
              <label className="mb-1 block text-xs font-medium text-stone-600">Desconto (R$)</label>
              <input type="number" min="0" max={subtotal} value={desconto} onChange={(e) => setDesconto(Math.max(0, Number(e.target.value)))}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 ${descontoInvalido ? "border-red-400 focus:ring-red-100" : "border-stone-300 focus:border-orange-400 focus:ring-orange-100"}`} />
              {descontoInvalido && <p className="mt-1 flex items-center gap-1 text-xs text-red-500"><AlertTriangle className="h-3 w-3" /> O desconto não pode passar do subtotal. O valor final não pode ficar acima do catálogo.</p>}
            </div>
            <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 font-bold"><span>Valor final</span><span className="tabular-nums" style={{ color: ACCENT }}>{brl(Math.max(0, final))}</span></div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-stone-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100">Cancelar</button>
          <button onClick={() => nome.trim() && itensIds.length && !descontoInvalido && onSalvar({ id: opcao?.id, nome: nome.trim(), itensIds, desconto })}
            disabled={!nome.trim() || !itensIds.length || descontoInvalido} className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-40 hover:opacity-90" style={{ background: ACCENT }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
