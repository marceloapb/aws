import React, { useState } from "react";
import {
  MessageCircle, Send, Info, AlertTriangle, Clock, Check, CheckCheck,
  XCircle, FileText, Bell, User, Mic, Video, Image as ImageIcon, Paperclip,
  Archive, Trash2, RefreshCw, MoreVertical,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — WhatsApp · Frentes 2 (Outbound/Log) + 3 (Inbound/Conversa)
// Duas abas:
//   (C) CONVERSAS — caixa de entrada bidirecional. Cliente responde/inicia;
//                   histórico por cliente; JANELA DE 24h sempre visível.
//                   Dentro da janela: texto livre. Fora: só template aprovado.
//                   Todo inbound emite evento "cliente_respondeu" → Notificações
//                   (§23) avisa o admin por in-app + e-mail + WhatsApp pessoal.
//   (D) LOG       — todo outbound disparado (por Follow-up/Notificações ou manual):
//                   destinatário, template, categoria, dentro/fora da janela,
//                   custo, status (enviado/entregue/lido/falho).
// Nº do SISTEMA (fala com cliente) ≠ nº PESSOAL do admin (recebe avisos).
// Aviso: 1 por mensagem (sem agrupar — decisão do usuário). Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const fmtBRL = (n) => n === 0 ? "grátis" : "R$ " + n.toFixed(3).replace(".", ",");

// ─── mock de conversas (inbound/outbound) ───
const CONVERSAS_SEED = [
  {
    id: "cv1", cliente: "Marina Souza", evento: "Casamento 15/08",
    janelaAberta: true, minutosRestantes: 1380, naoLida: 2, arquivada: false,
    msgs: [
      { dir: "out", corpo: "Olá Marina! Confirmamos o pagamento de R$ 1.500 referente ao Casamento. Obrigado! 💛", quando: "09:12", status: "lido", template: "recibo_pagamento" },
      { dir: "in", corpo: "Oiii! Recebido 🙌 obrigada!", quando: "10:03", status: "recebido" },
      { dir: "in", tipo: "audio", corpo: "Áudio (0:34)", quando: "10:04", status: "recebido" },
      { dir: "in", corpo: "Uma dúvida: o pacote inclui o ensaio pré-wedding né?", quando: "10:04", status: "recebido" },
    ],
  },
  {
    id: "cv2", cliente: "Família Costa", evento: "15 anos Beatriz",
    janelaAberta: false, minutosRestantes: 0, naoLida: 0, arquivada: false,
    msgs: [
      { dir: "out", corpo: "Oi! Seu álbum dos 15 anos está pronto 🎉 Acesse: mbf.com/a/bea", quando: "ontem", status: "entregue", template: "album_pronto" },
    ],
  },
  {
    id: "cv3", cliente: "Estúdio X", evento: "Corporativo",
    janelaAberta: true, minutosRestantes: 220, naoLida: 1, arquivada: false,
    msgs: [
      { dir: "in", tipo: "video", corpo: "Vídeo (0:12)", quando: "14:19", status: "recebido" },
      { dir: "in", corpo: "Podemos remarcar a sessão de quinta?", quando: "14:20", status: "recebido" },
    ],
  },
];

// ícone por tipo de mídia
const MIDIA_ICON = { audio: Mic, video: Video, imagem: ImageIcon };

// ─── mock de log de envios (outbound) ───
const LOG_SEED = [
  { id: "l1", para: "Marina Souza", template: "recibo_pagamento", categoria: "utility", janela: "dentro", custo: 0, status: "lido", quando: "Hoje 09:12", origem: "Notificações" },
  { id: "l2", para: "Família Costa", template: "album_pronto", categoria: "utility", janela: "fora", custo: 0.008, status: "entregue", quando: "Ontem 16:40", origem: "Notificações" },
  { id: "l3", para: "Você (WhatsApp pessoal)", template: "cliente_respondeu", categoria: "utility", janela: "fora", custo: 0.008, status: "lido", quando: "Hoje 10:04", origem: "Notificações · cliente_respondeu" },
  { id: "l4", para: "Marina Souza", template: "—", categoria: "livre", janela: "dentro", custo: 0, status: "lido", quando: "Hoje 10:31", origem: "Resposta manual" },
  { id: "l5", para: "João Santos", template: "lembrete_pagamento", categoria: "utility", janela: "fora", custo: 0.008, status: "reenviando", tentativa: 2, quando: "Ontem 11:00", origem: "Follow-up", falhaTipo: "tecnica" },
  { id: "l6", para: "Ana Lima", template: "promo_indicacao", categoria: "marketing", janela: "fora", custo: 0.062, status: "entregue", quando: "2 dias 10:00", origem: "Follow-up" },
  { id: "l7", para: "Pedro (número inválido)", template: "album_pronto", categoria: "utility", janela: "fora", custo: 0.008, status: "falho", quando: "3 dias 09:00", origem: "Notificações", falhaTipo: "definitiva" },
];

const CAT = {
  utility: { label: "Utility", cls: "bg-emerald-50 text-emerald-600" },
  marketing: { label: "Marketing", cls: "bg-amber-50 text-amber-700" },
  authentication: { label: "Auth", cls: "bg-blue-50 text-blue-600" },
  livre: { label: "Texto livre", cls: "bg-stone-100 text-stone-500" },
};
const STLOG = {
  enviado: { label: "Enviado", cls: "text-stone-400", icon: Check },
  entregue: { label: "Entregue", cls: "text-stone-500", icon: CheckCheck },
  lido: { label: "Lido", cls: "text-blue-500", icon: CheckCheck },
  reenviando: { label: "Reenviando", cls: "text-amber-500", icon: RefreshCw },
  falho: { label: "Falhou", cls: "text-red-500", icon: XCircle },
};

export default function WhatsAppFrente23() {
  const [aba, setAba] = useState("conversas");
  const [conversas, setConversas] = useState(CONVERSAS_SEED);
  const totalNaoLidas = conversas.reduce((s, c) => s + c.naoLida, 0);

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><MessageCircle className="h-4 w-4 text-white" /></div>
          <span className="text-sm font-semibold tracking-tight">WhatsApp · Conversas e envios</span>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Conversas & Log</h1>
        <p className="mt-1 text-sm text-stone-500">O cliente fala com o número do sistema; você responde aqui. Cada resposta do cliente também te avisa no seu WhatsApp pessoal.</p>

        <div className="mt-5 flex gap-1 border-b border-stone-200">
          {[["conversas", "Conversas"], ["log", "Log de envios"]].map(([k, r]) => (
            <button key={k} onClick={() => setAba(k)}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition ${aba === k ? "" : "border-transparent text-stone-400 hover:text-stone-600"}`}
              style={aba === k ? { borderColor: ACCENT, color: ACCENT } : {}}>
              {r}{k === "conversas" && totalNaoLidas > 0 && <span className="ml-1.5 tabular-nums">({totalNaoLidas})</span>}
            </button>
          ))}
        </div>

        {aba === "conversas"
          ? <AbaConversas conversas={conversas} setConversas={setConversas} />
          : <AbaLog />}
      </main>
    </div>
  );
}

// ───────────────────────── CONVERSAS ─────────────────────────
function AbaConversas({ conversas, setConversas }) {
  const [ativaId, setAtivaId] = useState(conversas[0]?.id);
  const [texto, setTexto] = useState("");
  const [verArquivadas, setVerArquivadas] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const ativa = conversas.find((c) => c.id === ativaId);

  const enviar = (tipo) => {
    if (!ativa?.janelaAberta) return;
    if (!tipo && !texto.trim()) return;
    const nova = tipo
      ? { dir: "out", tipo, corpo: tipo === "audio" ? "Áudio (0:08)" : tipo === "video" ? "Vídeo enviado" : "Imagem enviada", quando: "agora", status: "enviado" }
      : { dir: "out", corpo: texto, quando: "agora", status: "enviado" };
    setConversas((l) => l.map((c) => c.id === ativaId ? { ...c, msgs: [...c.msgs, nova] } : c));
    setTexto("");
  };

  const abrirConversa = (id) => {
    setAtivaId(id);
    setConversas((l) => l.map((c) => c.id === id ? { ...c, naoLida: 0 } : c));
  };

  const arquivar = (id) => { setConversas((l) => l.map((c) => c.id === id ? { ...c, arquivada: !c.arquivada } : c)); setMenuId(null); };
  const apagar = (id) => {
    if (window.confirm("Apagar definitivamente do seu sistema? A conversa continua no WhatsApp do cliente — só sua cópia é removida. Ação irreversível.")) {
      setConversas((l) => l.filter((c) => c.id !== id));
      setMenuId(null);
      if (ativaId === id) setAtivaId(null);
    }
  };

  const visiveis = conversas.filter((c) => verArquivadas ? c.arquivada : !c.arquivada);
  const numArquivadas = conversas.filter((c) => c.arquivada).length;

  return (
    <div className="mt-5 grid gap-4 md:grid-cols-[280px_1fr]">
      {/* lista de conversas */}
      <div>
        {/* alternador ativas/arquivadas */}
        <div className="mb-2 flex gap-1 text-xs font-semibold">
          <button onClick={() => setVerArquivadas(false)} className={`rounded-full px-3 py-1 transition ${!verArquivadas ? "text-white" : "text-stone-500 ring-1 ring-stone-200"}`} style={!verArquivadas ? { background: ACCENT } : {}}>Ativas</button>
          <button onClick={() => setVerArquivadas(true)} className={`flex items-center gap-1 rounded-full px-3 py-1 transition ${verArquivadas ? "text-white" : "text-stone-500 ring-1 ring-stone-200"}`} style={verArquivadas ? { background: ACCENT } : {}}>
            <Archive className="h-3 w-3" /> Arquivadas ({numArquivadas})
          </button>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white">
          {visiveis.map((c) => {
            const ultima = c.msgs[c.msgs.length - 1];
            const UltIcon = ultima?.tipo ? MIDIA_ICON[ultima.tipo] : null;
            return (
              <div key={c.id} className={`relative flex items-start gap-3 border-b border-stone-100 p-3 transition ${ativaId === c.id ? "bg-orange-50/50" : "hover:bg-stone-50"}`}>
                <button onClick={() => abrirConversa(c.id)} className="flex flex-1 items-start gap-3 text-left">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100"><User className="h-4 w-4 text-stone-500" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{c.cliente}</span>
                      {c.naoLida > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: ACCENT }}>{c.naoLida}</span>}
                    </div>
                    <div className="flex items-center gap-1 truncate text-xs text-stone-400">
                      {UltIcon && <UltIcon className="h-3 w-3 shrink-0" />}{ultima?.corpo}
                    </div>
                    <JanelaBadge aberta={c.janelaAberta} min={c.minutosRestantes} compact />
                  </div>
                </button>
                <button onClick={() => setMenuId(menuId === c.id ? null : c.id)} className="rounded p-1 text-stone-300 hover:bg-stone-100 hover:text-stone-500"><MoreVertical className="h-4 w-4" /></button>
                {menuId === c.id && (
                  <div className="absolute right-2 top-10 z-10 w-40 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg">
                    <button onClick={() => arquivar(c.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-600 hover:bg-stone-50">
                      <Archive className="h-3.5 w-3.5" /> {c.arquivada ? "Desarquivar" : "Arquivar"}
                    </button>
                    <button onClick={() => apagar(c.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" /> Apagar do sistema
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {visiveis.length === 0 && <div className="px-4 py-8 text-center text-sm text-stone-400">{verArquivadas ? "Nenhuma conversa arquivada." : "Nenhuma conversa ativa."}</div>}
        </div>
      </div>

      {/* conversa ativa */}
      {ativa ? (
        <div className="flex flex-col rounded-xl border border-stone-200 bg-white" style={{ minHeight: 420 }}>
          <div className="flex items-center justify-between border-b border-stone-100 p-3">
            <div>
              <div className="text-sm font-semibold">{ativa.cliente}</div>
              <div className="text-xs text-stone-400">{ativa.evento}</div>
            </div>
            <div className="flex items-center gap-2">
              <JanelaBadge aberta={ativa.janelaAberta} min={ativa.minutosRestantes} />
              <button onClick={() => arquivar(ativa.id)} title="Arquivar" className="rounded-lg p-1.5 text-stone-400 ring-1 ring-stone-200 hover:bg-stone-50"><Archive className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* mensagens */}
          <div className="flex-1 space-y-2 overflow-y-auto p-4" style={{ maxHeight: 320 }}>
            {ativa.msgs.map((m, i) => {
              const MidiaIcon = m.tipo ? MIDIA_ICON[m.tipo] : null;
              return (
                <div key={i} className={`flex ${m.dir === "out" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.dir === "out" ? "text-white" : "bg-stone-100 text-stone-700"}`}
                    style={m.dir === "out" ? { background: ACCENT } : {}}>
                    {MidiaIcon ? (
                      <div className="flex items-center gap-2">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.dir === "out" ? "bg-white/20" : "bg-white"}`}><MidiaIcon className="h-4 w-4" /></span>
                        <span>{m.corpo}</span>
                      </div>
                    ) : <div>{m.corpo}</div>}
                    <div className={`mt-0.5 flex items-center gap-1 text-[10px] ${m.dir === "out" ? "text-white/70" : "text-stone-400"}`}>
                      {m.quando}
                      {m.template && <span className="rounded bg-black/10 px-1">{m.template}</span>}
                      {m.dir === "out" && m.status === "lido" && <CheckCheck className="h-3 w-3" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* composer */}
          <div className="border-t border-stone-100 p-3">
            {ativa.janelaAberta ? (
              <>
                <div className="flex items-center gap-2">
                  <input value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviar()}
                    placeholder="Escreva uma resposta…" className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none" />
                  <button onClick={() => enviar()} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                {/* anexos de mídia (dentro da janela) */}
                <div className="mt-2 flex items-center gap-1.5 text-xs text-stone-400">
                  <span>Anexar:</span>
                  <button onClick={() => enviar("audio")} className="flex items-center gap-1 rounded-full px-2 py-1 ring-1 ring-stone-200 hover:bg-stone-50"><Mic className="h-3 w-3" /> áudio</button>
                  <button onClick={() => enviar("video")} className="flex items-center gap-1 rounded-full px-2 py-1 ring-1 ring-stone-200 hover:bg-stone-50"><Video className="h-3 w-3" /> vídeo</button>
                  <button onClick={() => enviar("imagem")} className="flex items-center gap-1 rounded-full px-2 py-1 ring-1 ring-stone-200 hover:bg-stone-50"><ImageIcon className="h-3 w-3" /> imagem</button>
                </div>
              </>
            ) : (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 ring-1 ring-amber-200">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Janela de 24h fechada — nem texto livre nem mídia são permitidos pela Meta. Só dá pra enviar um <strong>template aprovado</strong>.</span>
                </div>
                <button className="mt-2 flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50">
                  <FileText className="h-3.5 w-3.5" /> Escolher template
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-stone-200 text-sm text-stone-400" style={{ minHeight: 420 }}>
          Selecione uma conversa.
        </div>
      )}

      {/* nota do evento cliente_respondeu */}
      <div className="md:col-span-2 space-y-1.5">
        <p className="flex items-start gap-1.5 text-xs text-stone-400">
          <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} /> Toda mensagem recebida (texto, áudio, vídeo, imagem) emite o evento <strong className="mx-1">cliente_respondeu</strong> → você é avisado por in-app + e-mail + WhatsApp pessoal (via Notificações §23). Um aviso por mensagem. O nº do sistema (fala com o cliente) é diferente do seu nº pessoal (recebe o aviso).
        </p>
        <p className="flex items-start gap-1.5 text-xs text-stone-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <strong>Arquivar</strong> tira da caixa mas guarda o histórico (reversível). <strong>Apagar</strong> remove só a sua cópia — a conversa continua no aparelho do cliente. Mídia recebida depende do serviço de armazenamento (mesma infra do Álbum).
        </p>
      </div>
    </div>
  );
}

function JanelaBadge({ aberta, min, compact }) {
  const horas = Math.floor(min / 60);
  const label = aberta ? `Janela aberta · ${horas}h restantes` : "Janela fechada";
  if (compact) {
    return (
      <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${aberta ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-400"}`}>
        <Clock className="h-2.5 w-2.5" /> {aberta ? `${horas}h` : "fechada"}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${aberta ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`}>
      <Clock className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

// ───────────────────────── LOG ─────────────────────────
function AbaLog() {
  const [filtro, setFiltro] = useState("todos");

  const filtrados = LOG_SEED.filter((l) =>
    filtro === "todos" ? true :
    filtro === "falhas" ? l.status === "falho" :
    filtro === "cobrados" ? l.custo > 0 :
    filtro === "pessoal" ? l.para.includes("pessoal") : true
  );

  const custoTotal = LOG_SEED.reduce((s, l) => s + l.custo, 0);

  return (
    <>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-medium text-stone-500">Envios (7 dias)</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{LOG_SEED.length}</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-medium text-stone-500">Falhas</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-red-600">{LOG_SEED.filter((l) => l.status === "falho").length}</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-medium text-stone-500">Custo estimado</div>
          <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color: ACCENT }}>R$ {custoTotal.toFixed(2).replace(".", ",")}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[["todos", "Todos"], ["falhas", "Falhas"], ["cobrados", "Cobrados"], ["pessoal", "Meu WhatsApp"]].map(([k, r]) => {
          const n = k === "todos" ? LOG_SEED.length : k === "falhas" ? LOG_SEED.filter((l) => l.status === "falho").length : k === "cobrados" ? LOG_SEED.filter((l) => l.custo > 0).length : LOG_SEED.filter((l) => l.para.includes("pessoal")).length;
          return (
            <button key={k} onClick={() => setFiltro(k)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filtro === k ? "text-white" : "bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50"}`}
              style={filtro === k ? { background: ACCENT } : {}}>{r} ({n})</button>
          );
        })}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
              <th className="px-4 py-3 font-semibold">Para</th>
              <th className="px-4 py-3 font-semibold">Template</th>
              <th className="px-4 py-3 font-semibold">Janela</th>
              <th className="px-4 py-3 text-right font-semibold">Custo</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Origem</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((l) => {
              const cat = CAT[l.categoria];
              const st = STLOG[l.status];
              const StIcon = st.icon;
              return (
                <tr key={l.id} className="border-b border-stone-100">
                  <td className="px-4 py-3">
                    <div className={`font-medium ${l.para.includes("pessoal") ? "text-purple-700" : "text-stone-700"}`}>{l.para}</div>
                    <div className="text-xs text-stone-400">{l.quando}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-stone-600">{l.template}</div>
                    <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cat.cls}`}>{cat.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${l.janela === "dentro" ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`}>{l.janela === "dentro" ? "dentro 24h" : "fora 24h"}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: l.custo > 0 ? ACCENT : "#059669" }}>{fmtBRL(l.custo)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${st.cls}`}>
                      <StIcon className={`h-3.5 w-3.5 ${l.status === "reenviando" ? "animate-spin" : ""}`} /> {st.label}
                      {l.status === "reenviando" && l.tentativa && <span className="tabular-nums">{l.tentativa}/3</span>}
                    </span>
                    {l.falhaTipo === "definitiva" && <div className="mt-0.5 text-[10px] text-red-400">definitiva · sem retry</div>}
                    {l.falhaTipo === "tecnica" && <div className="mt-0.5 text-[10px] text-amber-400">falha técnica · retry auto</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">{l.origem}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Custo por mensagem segue a categoria da Meta: utility é barato (grátis dentro da janela de 24h), marketing é sempre cobrado. O aviso ao seu WhatsApp pessoal (cliente_respondeu) também é um envio cobrado — aparece no filtro "Meu WhatsApp".
      </p>
      <p className="mt-1.5 flex items-start gap-1.5 text-xs text-stone-400">
        <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <strong>Retry:</strong> falha <em>técnica transitória</em> (API instável, timeout) é reenviada automaticamente até 3× com espera crescente. Falha <em>definitiva</em> (número inválido, bloqueio) não é retentada — se precisar insistir com o cliente, isso é papel do Follow-up (§20), não da entrega.
      </p>
    </>
  );
}
