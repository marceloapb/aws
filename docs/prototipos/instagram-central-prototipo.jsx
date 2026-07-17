import React, { useState } from "react";
import {
  Instagram, Clock, Images, RotateCcw, Trash2, Pencil, Info, Camera,
  Heart, MessageCircle, Eye, Bookmark, TrendingUp, Users, Share2
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Central de Publicações do Instagram (módulo do menu ADM)
// A visão de LOG: todas as publicações, de todos os álbuns, num
// lugar só. Filtros por status, álbum de origem, retry e edição.
// Novas publicações NASCEM no álbum (botão "Publicar no Instagram");
// aqui é a governança. Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const G = [
  "linear-gradient(135deg,#a8c0ff,#3f2b96)", "linear-gradient(135deg,#f6d365,#fda085)",
  "linear-gradient(135deg,#84fab0,#8fd3f4)", "linear-gradient(135deg,#fccb90,#d57eeb)",
  "linear-gradient(135deg,#f093fb,#f5576c)", "linear-gradient(135deg,#5ee7df,#b490ca)",
  "linear-gradient(135deg,#c79081,#dfa579)", "linear-gradient(135deg,#fa709a,#fee140)",
];

const FILA_SEED = [
  { id: 1, tipo: "carrossel", album: "Casamento Marina & Rafael", fotos: [G[0], G[3]], legenda: "Um dia inesquecível no Villa Garden 💍✨ #casamento", quando: "Publicado em 28/06 às 18:00", status: "publicado", metricas: { curtidas: 847, comentarios: 42, alcance: 5230, saves: 68 } },
  { id: 6, tipo: "story", modoIA: "template", templateNome: "Clássico", custo: 0.08, album: "Casamento Marina & Rafael", fotos: [G[2]], legenda: "Marina & Rafael · Villa Garden", quando: "Publicado em 29/06 às 09:00", status: "publicado", metricasStory: { visualizacoes: 1240, respostas: 18, saidas: 62 } },
  { id: 2, tipo: "post", album: "Ensaio Família Costa", fotos: [G[5]], legenda: "Detalhes que contam histórias…", quando: "Agendado para 04/07 às 19:30", status: "agendado" },
  { id: 7, tipo: "story", modoIA: "ia_livre", custo: 0.83, album: "15 anos — Júlia", fotos: [G[7]], legenda: "Júlia · 15 anos", quando: "Agendado para 03/07 às 20:00", status: "agendado" },
  { id: 3, tipo: "carrossel", album: "15 anos — Júlia", fotos: [G[6], G[7], G[4]], legenda: "A festa que varou a noite 🎉", quando: "Falhou em 30/06 (token expirado)", status: "falhou" },
  { id: 4, tipo: "post", album: "Casamento Marina & Rafael", fotos: [G[2]], legenda: "O sim mais esperado do ano 🤍", quando: "Agendado para 08/07 às 12:00", status: "agendado" },
  { id: 5, tipo: "carrossel", album: "Batizado — Família Souza", fotos: [G[1], G[4]], legenda: "Um dia de fé e família 🙏", quando: "Publicado em 20/06 às 10:00", status: "publicado", metricas: { curtidas: 312, comentarios: 18, alcance: 2140, saves: 22 } },
];

// métricas da conta (últimos 7 dias) — vindas da Graph API (User Insights)
const CONTA = { seguidores: 4287, seguidoresDelta: 34, alcance7d: 12480, visitasPerfil: 186, cliquesSite: 43 };

const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(1).replace(".", ",") + "k" : String(n);

export default function InstagramCentral() {
  const [fila, setFila] = useState(FILA_SEED);
  const [filtro, setFiltro] = useState("todos");

  const visiveis = fila.filter((p) => filtro === "todos" || p.status === filtro);

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><Instagram className="h-4 w-4 text-white" /></div>
          <span className="text-sm font-semibold tracking-tight">Instagram · Central de publicações</span>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Central de publicações</h1>
        <p className="mt-1 text-sm text-stone-500">Todas as publicações do Instagram, de todos os álbuns — o log e o desempenho.</p>

        {/* métricas da conta (últimos 7 dias) — Insights API */}
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight"><TrendingUp className="h-4 w-4" style={{ color: ACCENT }} /> Sua conta nos últimos 7 dias</h2>
            <span className="text-xs text-stone-400">via Instagram Insights</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricaConta icon={Users} label="Seguidores" valor={fmt(CONTA.seguidores)} delta={`+${CONTA.seguidoresDelta}`} />
            <MetricaConta icon={Eye} label="Alcance" valor={fmt(CONTA.alcance7d)} />
            <MetricaConta icon={Instagram} label="Visitas ao perfil" valor={fmt(CONTA.visitasPerfil)} />
            <MetricaConta icon={Share2} label="Cliques no site" valor={fmt(CONTA.cliquesSite)} />
          </div>
        </section>

        {/* filtros por status */}
        <div className="mt-5 flex flex-wrap gap-2">
          {[["todos", "Todas"], ["agendado", "Agendadas"], ["publicado", "Publicadas"], ["falhou", "Falhas"]].map(([k, r]) => {
            const n = k === "todos" ? fila.length : fila.filter((p) => p.status === k).length;
            return (
              <button key={k} onClick={() => setFiltro(k)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filtro === k ? "text-white" : "bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50"}`}
                style={filtro === k ? { background: ACCENT } : {}}>{r} ({n})</button>
            );
          })}
        </div>

        <div className="mt-4 space-y-3">
          {visiveis.map((p) => (
            <div key={p.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex shrink-0 -space-x-3">
                  {p.fotos.slice(0, 3).map((g, i) => <span key={i} className="h-12 w-12 rounded-lg border-2 border-white" style={{ background: g, zIndex: 3 - i }} />)}
                  {p.fotos.length > 3 && <span className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-white bg-stone-100 text-xs font-semibold text-stone-500">+{p.fotos.length - 3}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-xs font-medium" style={{ color: ACCENT }}><Camera className="h-3 w-3" /> {p.album}</div>
                  <p className="line-clamp-1 text-sm">{p.legenda}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {p.status === "publicado" && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">Publicado</span>}
                    {p.status === "agendado" && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">Agendado</span>}
                    {p.status === "falhou" && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">Falhou</span>}
                    {p.tipo === "story" && <span className="flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">Story · {p.modoIA === "template" ? `Tpl. ${p.templateNome}` : "IA livre"}</span>}
                    <span className="flex items-center gap-1 text-xs text-stone-400"><Clock className="h-3 w-3" /> {p.quando}</span>
                    {p.tipo === "carrossel" && p.fotos.length > 1 && <span className="flex items-center gap-1 text-xs text-stone-400"><Images className="h-3 w-3" /> carrossel ({p.fotos.length})</span>}
                    {p.custo != null && <span className="flex items-center gap-1 text-xs text-stone-400">R$ {p.custo.toFixed(2)}</span>}
                  </div>
                </div>
              </div>
              {p.status === "publicado" && p.metricas && (
                <div className="mt-3 grid grid-cols-4 gap-2 border-t border-stone-100 pt-3">
                  <MetricaPost icon={Heart} label="Curtidas" valor={fmt(p.metricas.curtidas)} />
                  <MetricaPost icon={MessageCircle} label="Comentários" valor={fmt(p.metricas.comentarios)} />
                  <MetricaPost icon={Eye} label="Alcance" valor={fmt(p.metricas.alcance)} />
                  <MetricaPost icon={Bookmark} label="Saves" valor={fmt(p.metricas.saves)} />
                </div>
              )}
              {p.status === "publicado" && p.metricasStory && (
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-stone-100 pt-3">
                  <MetricaPost icon={Eye} label="Visualizações" valor={fmt(p.metricasStory.visualizacoes)} />
                  <MetricaPost icon={MessageCircle} label="Respostas" valor={fmt(p.metricasStory.respostas)} />
                  <MetricaPost icon={Share2} label="Saídas" valor={fmt(p.metricasStory.saidas)} />
                </div>
              )}
              {p.status !== "publicado" && (
                <div className="mt-3 flex gap-2 border-t border-stone-100 pt-3">
                  {p.status === "falhou" && (
                    <button onClick={() => setFila((l) => l.map((x) => x.id === p.id ? { ...x, status: "agendado", quando: "Reagendado — próxima tentativa em instantes" } : x))}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
                      <RotateCcw className="h-3.5 w-3.5" /> Tentar de novo
                    </button>
                  )}
                  <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50"><Pencil className="h-3.5 w-3.5" /> Editar</button>
                  <button onClick={() => setFila((l) => l.filter((x) => x.id !== p.id))} className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Remover</button>
                </div>
              )}
            </div>
          ))}
          {visiveis.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-stone-200 px-5 py-10 text-center text-sm text-stone-400">Nenhuma publicação neste filtro.</div>
          )}
        </div>

        <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Novas publicações nascem no álbum: abra um álbum e use o botão "Publicar no Instagram". Aqui é a governança — acompanhar desempenho, reagendar, corrigir falhas. Métricas atualizadas periodicamente via Instagram Insights.
        </p>
      </main>
    </div>
  );
}

function MetricaConta({ icon: Icon, label, valor, delta }) {
  return (
    <div className="rounded-lg bg-stone-50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-stone-500"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-xl font-bold tabular-nums">{valor}</span>
        {delta && <span className="text-xs font-medium text-emerald-600">{delta}</span>}
      </div>
    </div>
  );
}

function MetricaPost({ icon: Icon, label, valor }) {
  return (
    <div className="text-center">
      <Icon className="mx-auto h-3.5 w-3.5 text-stone-400" />
      <div className="mt-0.5 text-sm font-bold tabular-nums">{valor}</div>
      <div className="text-[10px] uppercase tracking-wide text-stone-400">{label}</div>
    </div>
  );
}
