import React, { useState } from "react";
import {
  Camera, AlertTriangle, Calendar, Clock, MapPin, Check, X, RefreshCw,
  CheckCircle2, XCircle, Clock3, ChevronRight, Info, Navigation
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo enxuto — Módulo Agenda (MVP-1)
// Só as partes que aparecem para alguém: (A) alerta de conflito na
// revisão do orçamento e (B) tela de log de sincronização com o Google.
// O resto da Agenda é lógica de bastidor (reserva, expiração, etc.).
//
// Distância/tempo (arquitetura-sistema-fotografia.md §6, Google Maps):
// Geocoding + Distance Matrix real, com CACHE por local (evita chamada
// paga repetida — mesmo endereço não muda de distância). Aqui simulado
// com hash determinístico; a chamada real troca por fetch às APIs do
// Google. Link "abrir no Maps" usa URL real (funciona clicando de
// verdade). Mapa embutido interativo é FORA DO ESCOPO (decisão já
// tomada) — só link + km/min.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const ORIGEM_ESTUDIO = "Rua José Margarido, 185, São Paulo - SP"; // vem de Configurações §9

// cache por local — simula a economia de chamada paga da API real
const CACHE_DISTANCIA = {};
function calcularDistancia(local) {
  if (CACHE_DISTANCIA[local]) return CACHE_DISTANCIA[local];
  // hash determinístico só pra variar o mock de forma estável por local
  let h = 0;
  for (let i = 0; i < local.length; i++) h = (h * 31 + local.charCodeAt(i)) % 997;
  const km = 3 + (h % 220) / 10; // 3.0 a ~25.0 km
  const minutos = Math.round(km * 2.3 + (h % 7)); // trânsito de cidade, aprox.
  const resultado = {
    km: km.toFixed(1), minutos,
    mapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(ORIGEM_ESTUDIO)}&destination=${encodeURIComponent(local)}`,
    embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(local)}&output=embed`,
  };
  CACHE_DISTANCIA[local] = resultado;
  return resultado;
}

// ── Dados de exemplo ──────────────────────────────────────────
// Datas de um orçamento em revisão, cruzadas com a agenda existente.
const DATAS_ORCAMENTO = [
  {
    id: 1, label: "Casamento (Opção Completa)", data: "12/12/2026", inicio: "16:00", fim: "23:30",
    local: "Buffet Villa, Itaim Bibi",
    conflitos: [],
  },
  {
    id: 2, label: "Batizado (Opção Família)", data: "21/08/2026", inicio: "13:00", fim: "18:00",
    local: "Igreja N. Sra., Pinheiros",
    conflitos: [
      { titulo: "Batizado — Família Souza", inicio: "10:00", fim: "12:00", local: "Capela Santa Rita, Vila Madalena" },
    ],
  },
];

const LOG_SEED = [
  { id: 1, quando: "30/06 14:22", acao: "criar", evento: "Casamento 12/12 · Buffet Villa", status: "sucesso" },
  { id: 2, quando: "30/06 14:22", acao: "criar", evento: "Batizado 21/08 · Igreja N. Sra.", status: "sucesso" },
  { id: 3, quando: "30/06 13:05", acao: "remover", evento: "Aniversário 03/09 (reserva expirada)", status: "sucesso" },
  { id: 4, quando: "30/06 11:48", acao: "criar", evento: "Ensaio 15/07 · Parque Ibirapuera", status: "erro", detalhe: "Token do Google expirado. Reconecte a conta." },
  { id: 5, quando: "30/06 09:30", acao: "criar", evento: "Casamento 28/11 · Espaço Jardim", status: "pendente", detalhe: "Google indisponível no momento. Será reenviado." },
];

export default function AgendaPrototipo() {
  const [aba, setAba] = useState("conflito");
  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
         className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
            <Camera className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Agenda</span>
          <div className="ml-auto flex gap-1 rounded-lg border border-stone-200 p-1 text-sm">
            <button onClick={() => setAba("conflito")}
              className={`rounded-md px-3 py-1 font-medium transition ${aba === "conflito" ? "text-white" : "text-stone-500"}`}
              style={aba === "conflito" ? { background: ACCENT } : {}}>Alerta de conflito</button>
            <button onClick={() => setAba("log")}
              className={`rounded-md px-3 py-1 font-medium transition ${aba === "log" ? "text-white" : "text-stone-500"}`}
              style={aba === "log" ? { background: ACCENT } : {}}>Log de sincronização</button>
          </div>
        </div>
      </div>

      {aba === "conflito" ? <AlertaConflito /> : <LogSync />}
    </div>
  );
}

// ── A) Alerta de conflito na revisão do orçamento ────────────

function AlertaConflito() {
  const temConflito = DATAS_ORCAMENTO.some((d) => d.conflitos.length > 0);
  const [mapaAberto, setMapaAberto] = useState(null); // id do card com mapa expandido
  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Revisão de disponibilidade</h1>
      <p className="mt-1 text-sm text-stone-500">
        Ao revisar o orçamento, o sistema cruza as datas com sua agenda. Ele <strong>avisa</strong>, mas
        quem decide é você — distância e tempo de deslocamento só você sabe avaliar.
      </p>

      <div className="mt-6 space-y-3">
        {DATAS_ORCAMENTO.map((d) => {
          const ok = d.conflitos.length === 0;
          const dist = calcularDistancia(d.local);
          return (
            <div key={d.id} className={`overflow-hidden rounded-xl border bg-white ${ok ? "border-stone-200" : "border-amber-300"}`}>
              <div className="flex items-start gap-3 px-5 py-4">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ok ? "bg-emerald-50" : "bg-amber-50"}`}>
                  {ok ? <Check className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{d.label}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{d.data}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{d.inicio}–{d.fim}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{d.local}</span>
                    <a href={dist.mapsUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 font-medium hover:underline" style={{ color: ACCENT }}>
                      <Navigation className="h-3 w-3" />{dist.km} km · ~{dist.minutos} min de carro
                    </a>
                    <button onClick={() => setMapaAberto(mapaAberto === d.id ? null : d.id)}
                      className="rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-600 hover:bg-stone-200">
                      {mapaAberto === d.id ? "Ocultar mapa" : "Ver mapa"}
                    </button>
                  </div>
                  {ok && <div className="mt-2 text-sm text-emerald-700">Dia livre. Sem conflitos.</div>}

                  {mapaAberto === d.id && (
                    <div className="mt-3 overflow-hidden rounded-lg border border-stone-200">
                      <iframe
                        title={`Mapa — ${d.local}`}
                        src={dist.embedUrl}
                        width="100%" height="240" style={{ border: 0 }}
                        loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                    </div>
                  )}
                </div>
              </div>

              {!ok && (
                <div className="border-t border-amber-200 bg-amber-50/50 px-5 py-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Você já tem algo neste dia
                  </div>
                  {d.conflitos.map((c, i) => { const dist = calcularDistancia(c.local); return (
                    <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="font-medium text-stone-800">{c.titulo}</span>
                      <span className="flex items-center gap-1 text-stone-500"><Clock className="h-3 w-3" />{c.inicio}–{c.fim}</span>
                      <span className="flex items-center gap-1 text-stone-500"><MapPin className="h-3 w-3" />{c.local}</span>
                      <a href={dist.mapsUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-200">
                        <Navigation className="h-3 w-3" />{dist.km} km do estúdio até lá
                      </a>
                    </div>
                  ); })}
                  <p className="mt-2 text-xs text-stone-500">
                    Não há sobreposição de horário, mas avalie o deslocamento entre os locais antes de aceitar.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* a decisão é do ADM — sem bloqueio automático */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4">
        <span className="flex items-center gap-2 text-sm text-stone-500">
          <Info className="h-4 w-4" />
          {temConflito ? "Há um conflito para você avaliar. Você decide se segue." : "Tudo livre."}
        </span>
        <div className="flex gap-2">
          <button className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 ring-1 ring-stone-300 hover:bg-stone-50">
            Ajustar datas
          </button>
          <button className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: ACCENT }}>
            Precificar e continuar
          </button>
        </div>
      </div>

      <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Distância e tempo calculados do endereço do estúdio (Configurações) até o evento, com cache por local. "Ver mapa" embute a visualização sem sair da tela — sem custo de API (formato embed clássico do Google Maps).
      </p>
    </main>
  );
}

// ── B) Log de sincronização com o Google ─────────────────────

function LogSync() {
  const [log, setLog] = useState(LOG_SEED);
  const reenviar = (id) =>
    setLog((l) => l.map((it) => (it.id === id ? { ...it, status: "sucesso", detalhe: undefined } : it)));

  const estilo = {
    sucesso: { icon: CheckCircle2, cor: "text-emerald-600", bg: "bg-emerald-50", rotulo: "Sincronizado" },
    erro: { icon: XCircle, cor: "text-red-600", bg: "bg-red-50", rotulo: "Falhou" },
    pendente: { icon: Clock3, cor: "text-amber-600", bg: "bg-amber-50", rotulo: "Pendente" },
  };

  const pendentesOuErro = log.filter((l) => l.status !== "sucesso").length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Sincronização com o Google Calendar</h1>
      <p className="mt-1 text-sm text-stone-500">
        O sistema confirma a reserva primeiro e depois envia ao Google. Aqui você vê o resultado de cada
        envio — e reenvia o que falhou.
      </p>

      {pendentesOuErro > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {pendentesOuErro} {pendentesOuErro === 1 ? "envio precisa" : "envios precisam"} da sua atenção.
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-white">
        {log.map((l, idx) => {
          const e = estilo[l.status];
          const Icon = e.icon;
          return (
            <div key={l.id} className={`flex items-start gap-3 px-5 py-3.5 ${idx !== log.length - 1 ? "border-b border-stone-100" : ""}`}>
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${e.bg}`}>
                <Icon className={`h-4 w-4 ${e.cor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    {l.acao === "criar" ? "Criar evento" : "Remover evento"}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.bg} ${e.cor}`}>{e.rotulo}</span>
                  <span className="text-xs text-stone-400">{l.quando}</span>
                </div>
                <div className="mt-0.5 text-sm text-stone-700">{l.evento}</div>
                {l.detalhe && <div className="mt-1 text-xs text-stone-500">{l.detalhe}</div>}
              </div>
              {l.status !== "sucesso" && (
                <button onClick={() => reenviar(l.id)}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition hover:opacity-90"
                  style={{ background: "#FEF3EC", color: "#C2410C" }}>
                  <RefreshCw className="h-3.5 w-3.5" /> Reenviar
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 flex items-start gap-1.5 rounded-lg bg-stone-100 p-3 text-xs text-stone-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        A reserva já está garantida no sistema mesmo quando o envio ao Google falha — o log existe para você
        manter o calendário do celular em dia.
      </p>
    </main>
  );
}
