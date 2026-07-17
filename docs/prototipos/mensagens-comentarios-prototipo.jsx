import React, { useState } from "react";
import {
  MessageCircle, Instagram, AtSign, Clock, Send, X, Undo2, EyeOff,
  Sparkles, ShieldAlert, Zap, Check, RefreshCw, Info, Camera, ChevronDown,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Mensagens & Comentários do Instagram (módulo do menu ADM)
// Fila unificada: comentários (posts/Reels, Comments API) + mensagens
// diretas (incl. respostas a Story, Messaging API). Triagem por IA em
// duas faces do mesmo fluxo: Lead e Moderação.
//   · Lead      → IA sugere resposta pronta; você aprova/edita e envia (via API).
//   · Moderação → casos óbvios (spam/ofensa) ocultados automaticamente;
//                 ambíguos caem na fila manual. Ação automática reversível por 1 semana.
// Checagem em batch 1x/dia (configurável). Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const G = [
  "linear-gradient(135deg,#a8c0ff,#3f2b96)", "linear-gradient(135deg,#f6d365,#fda085)",
  "linear-gradient(135deg,#84fab0,#8fd3f4)", "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#fccb90,#d57eeb)", "linear-gradient(135deg,#fa709a,#fee140)",
];

const SEED = [
  {
    id: 1, tipo: "comentario", origem: "Post", foto: G[0],
    midia: "Ensaio Casal — Vila Madalena", autor: "@marina.rsouza",
    texto: "Que trabalho lindo! Vocês fazem ensaio pré-wedding? Quanto fica em média?",
    quando: "há 3h", categoria: "lead", confianca: 0.91, status: "pendente_aprovacao",
    resposta: "Oi, Marina! Que bom que gostou 💛 Sim, fazemos pré-wedding! Os valores variam por pacote — me chama no direct que te mando os detalhes certinho.",
  },
  {
    id: 2, tipo: "mensagem", origem: "Direct", foto: G[1],
    midia: "—", autor: "@carla.eventos",
    texto: "Bom dia! Vi o trabalho de vocês numa formatura, teria disponibilidade em novembro?",
    quando: "há 22h", categoria: "lead", confianca: 0.88, status: "aprovado_enviado",
    resposta: "Bom dia, Carla! Obrigado pelo contato 😊 Novembro ainda temos datas — me conta mais sobre o evento que eu já verifico disponibilidade!",
  },
  {
    id: 3, tipo: "mensagem", origem: "Reply de Story", foto: G[2],
    midia: "Story — bastidores estúdio", autor: "@joao.fotoclub",
    texto: "cara que setup é esse, qual lente vc usou aqui?",
    quando: "há 5h", categoria: "moderacao", confianca: 0.42, status: "aguardando_revisao",
    resposta: "Opa! Usei a 50mm f/1.4 nesse. Valeu pela força 🙌",
  },
  {
    id: 4, tipo: "comentario", origem: "Post", foto: G[3],
    midia: "Ensaio Externo — Ibirapuera", autor: "@rafa_castro_",
    texto: "Isso não é foto isso é obra de arte 👏👏👏",
    quando: "há 1h", categoria: "lead", confianca: 0.28, status: "aguardando_revisao",
    resposta: "Muito obrigado, Rafa! Fico feliz que tenha gostado 🙏",
  },
  {
    id: 5, tipo: "comentario", origem: "Reel", foto: G[4],
    midia: "Reel — making of 15 anos", autor: "@promocoes.baratas.sp",
    texto: "GANHE SEGUIDORES GRÁTIS clique no link da bio 🔥🔥🔥 vagas limitadas!!",
    quando: "há 20h", categoria: "moderacao", confianca: 0.97, status: "acao_automatica",
    acao: "Comentário ocultado automaticamente — spam", revertivelAte: "09/07",
  },
  {
    id: 6, tipo: "comentario", origem: "Post", foto: G[5],
    midia: "Ensaio Casal — Vila Madalena", autor: "@usuario_toxico22",
    texto: "isso ta horrivel para de fingir que sabe fotografar",
    quando: "há 10h", categoria: "moderacao", confianca: 0.95, status: "acao_automatica",
    acao: "Comentário ocultado automaticamente — linguagem ofensiva", revertivelAte: "09/07",
  },
];

const ORIGEM_ICON = { Post: Instagram, Reel: Instagram, "Reply de Story": MessageCircle, Direct: AtSign };

export default function MensagensComentarios() {
  const [itens, setItens] = useState(SEED);
  const [fTipo, setFTipo] = useState("todos");
  const [fCategoria, setFCategoria] = useState("todos");
  const [checando, setChecando] = useState(false);

  const aprovar = (id, texto) => setItens((l) => l.map((i) => i.id === id ? { ...i, status: "aprovado_enviado", resposta: texto } : i));
  const ignorar = (id) => setItens((l) => l.map((i) => i.id === id ? { ...i, status: "ignorado" } : i));
  const ocultar = (id) => setItens((l) => l.map((i) => i.id === id ? { ...i, status: "ocultado_manual" } : i));
  const reverter = (id) => setItens((l) => l.map((i) => i.id === id ? { ...i, status: "revertido" } : i));

  const checar = () => { setChecando(true); setTimeout(() => setChecando(false), 1200); };

  const visiveis = itens
    .filter((i) => fTipo === "todos" || i.tipo === fTipo)
    .filter((i) => fCategoria === "todos" || i.categoria === fCategoria);

  const pendentes = itens.filter((i) => i.status === "pendente_aprovacao" || i.status === "aguardando_revisao").length;
  const automaticas = itens.filter((i) => i.status === "acao_automatica").length;

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><MessageCircle className="h-4 w-4 text-white" /></div>
          <span className="text-sm font-semibold tracking-tight">Instagram · Mensagens & Comentários</span>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Mensagens & Comentários</h1>
        <p className="mt-1 text-sm text-stone-500">Comentários (posts, Reels) e mensagens diretas — incluindo respostas a Stories. Triagem por IA: não perder lead e conter o que precisa de moderação.</p>

        {/* barra de estado + checagem */}
        <section className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-sm text-stone-600"><span className="font-bold tabular-nums">{pendentes}</span> pendentes</div>
          <span className="h-4 w-px bg-stone-200" />
          <div className="text-sm text-stone-600"><span className="font-bold tabular-nums">{automaticas}</span> ações automáticas ativas</div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-stone-400">Checagem 1x/dia · configurável</span>
            <button onClick={checar} disabled={checando} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50 disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${checando ? "animate-spin" : ""}`} /> {checando ? "verificando..." : "verificar agora"}
            </button>
          </div>
        </section>

        {/* filtros */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {[["todos", "Todos"], ["comentario", "Comentários"], ["mensagem", "Mensagens"]].map(([k, r]) => {
            const n = k === "todos" ? itens.length : itens.filter((i) => i.tipo === k).length;
            return <button key={k} onClick={() => setFTipo(k)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${fTipo === k ? "text-white" : "bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50"}`} style={fTipo === k ? { background: ACCENT } : {}}>{r} ({n})</button>;
          })}
          <span className="mx-1 h-5 w-px bg-stone-200" />
          {[["todos", "Todas"], ["lead", "Lead"], ["moderacao", "Moderação"]].map(([k, r]) => {
            const n = k === "todos" ? itens.length : itens.filter((i) => i.categoria === k).length;
            return <button key={k} onClick={() => setFCategoria(k)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${fCategoria === k ? "text-white" : "bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50"}`} style={fCategoria === k ? { background: ACCENT } : {}}>{r} ({n})</button>;
          })}
        </div>

        <div className="mt-4 space-y-3">
          {visiveis.map((item) => <Card key={item.id} item={item} onAprovar={aprovar} onIgnorar={ignorar} onOcultar={ocultar} onReverter={reverter} />)}
          {visiveis.length === 0 && <div className="rounded-xl border-2 border-dashed border-stone-200 px-5 py-10 text-center text-sm text-stone-400">Nenhuma interação neste filtro.</div>}
        </div>

        <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> A IA classifica e sugere; você decide. Respostas de lead nunca saem sem sua aprovação. Ações automáticas de moderação são reservadas a casos óbvios (spam/ofensa) e ficam reversíveis por 1 semana. Prompts e limiar de confiança são configuráveis no admin.
        </p>
      </main>
    </div>
  );
}

function Card({ item, onAprovar, onIgnorar, onOcultar, onReverter }) {
  const [texto, setTexto] = useState(item.resposta || "");
  const [aberto, setAberto] = useState(false);
  const OrigemIcon = ORIGEM_ICON[item.origem] || Instagram;
  const alta = item.confianca >= 0.75;
  const pct = Math.round(item.confianca * 100);

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="h-12 w-12 shrink-0 rounded-lg" style={{ background: item.foto }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500"><OrigemIcon className="h-3 w-3" /> {item.origem}</span>
            {item.categoria === "lead"
              ? <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium" style={{ color: ACCENT }}><Sparkles className="h-3 w-3" /> Lead</span>
              : <span className="flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600"><ShieldAlert className="h-3 w-3" /> Moderação</span>}
            <span className="flex items-center gap-1.5 text-xs text-stone-400">
              <span className="h-1.5 w-14 overflow-hidden rounded-full bg-stone-200"><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: alta ? ACCENT : "#a8a29e" }} /></span>
              {pct}%
            </span>
            <span className="ml-auto flex items-center gap-1 text-xs text-stone-400"><Clock className="h-3 w-3" /> {item.quando}</span>
          </div>
          <div className="mt-1.5 text-sm font-medium">{item.autor}</div>
          <p className="text-sm text-stone-600">{item.texto}</p>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-stone-400"><Camera className="h-3 w-3" /> {item.midia}</div>
        </div>
      </div>

      {/* LEAD pendente */}
      {item.status === "pendente_aprovacao" && (
        <div className="mt-3 rounded-lg border border-orange-100 bg-orange-50/60 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: ACCENT }}><Sparkles className="h-3 w-3" /> Resposta sugerida pela IA</div>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} className="w-full resize-none rounded-md border border-orange-200 bg-white p-2 text-sm text-stone-700 focus:outline-none focus:ring-1" style={{ outlineColor: ACCENT }} />
          <div className="mt-2 flex gap-2">
            <button onClick={() => onAprovar(item.id, texto)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}><Send className="h-3.5 w-3.5" /> Aprovar e enviar</button>
            <button onClick={() => onIgnorar(item.id)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-500 ring-1 ring-stone-300 hover:bg-stone-50"><X className="h-3.5 w-3.5" /> Ignorar</button>
          </div>
        </div>
      )}

      {/* baixa confiança → revisão manual */}
      {item.status === "aguardando_revisao" && (
        <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
          <div className="mb-2 text-xs text-stone-500">Confiança baixa — a IA não tem certeza da classificação. Revisão manual.</div>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} className="w-full resize-none rounded-md border border-stone-300 bg-white p-2 text-sm text-stone-700 focus:outline-none" />
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => onAprovar(item.id, texto)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}><Send className="h-3.5 w-3.5" /> Tratar como lead e enviar</button>
            <button onClick={() => onOcultar(item.id)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-100"><EyeOff className="h-3.5 w-3.5" /> Ocultar</button>
            <button onClick={() => onIgnorar(item.id)} className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-400 hover:bg-stone-50"><X className="h-3.5 w-3.5" /> Ignorar</button>
          </div>
        </div>
      )}

      {/* moderação automática */}
      {item.status === "acao_automatica" && (
        <div className="mt-3 rounded-lg border border-stone-300 bg-stone-100 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700"><Zap className="h-3 w-3" /> {item.acao}</div>
          <div className="mt-1 mb-2 text-xs text-stone-500">Ação automática — confiança alta. Revertível até {item.revertivelAte}.</div>
          <button onClick={() => onReverter(item.id)} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50"><Undo2 className="h-3.5 w-3.5" /> Reverter ação</button>
        </div>
      )}

      {/* estados finais */}
      {["aprovado_enviado", "ignorado", "ocultado_manual", "revertido"].includes(item.status) && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50/60 px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs text-stone-500">
            {item.status === "aprovado_enviado" && <><Check className="h-3.5 w-3.5 text-emerald-600" /> Resposta enviada</>}
            {item.status === "ignorado" && <><X className="h-3.5 w-3.5" /> Marcado como ignorado</>}
            {item.status === "ocultado_manual" && <><EyeOff className="h-3.5 w-3.5" /> Ocultado manualmente</>}
            {item.status === "revertido" && <><Undo2 className="h-3.5 w-3.5" /> Ação revertida</>}
          </span>
          {item.status === "aprovado_enviado" && <button onClick={() => setAberto((v) => !v)} className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600">ver resposta <ChevronDown className={`h-3 w-3 transition-transform ${aberto ? "rotate-180" : ""}`} /></button>}
        </div>
      )}
      {item.status === "aprovado_enviado" && aberto && <p className="mt-2 rounded-md bg-white p-2 text-xs text-stone-600 ring-1 ring-stone-100">{item.resposta}</p>}
    </div>
  );
}
