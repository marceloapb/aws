import React, { useState } from "react";
import {
  ArrowLeft, Instagram, Calendar, Send, Images, AlertCircle, CheckCircle2
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Publicar no Instagram (a partir do álbum)
// SÓ a composição: fotos do álbum (1 = post, 2-10 = carrossel) →
// legenda → publicar agora ou agendar. O acompanhamento fica na
// CENTRAL DE PUBLICAÇÕES (menu Instagram do admin — protótipo
// próprio: instagram-central-prototipo). Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const G = [
  "linear-gradient(135deg,#a8c0ff,#3f2b96)", "linear-gradient(135deg,#f6d365,#fda085)",
  "linear-gradient(135deg,#84fab0,#8fd3f4)", "linear-gradient(135deg,#fccb90,#d57eeb)",
  "linear-gradient(135deg,#e0c3fc,#8ec5fc)", "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#5ee7df,#b490ca)", "linear-gradient(135deg,#c79081,#dfa579)",
  "linear-gradient(135deg,#fa709a,#fee140)", "linear-gradient(135deg,#30cfd0,#330867)",
  "linear-gradient(135deg,#667eea,#764ba2)", "linear-gradient(135deg,#f77062,#fe5196)",
];

const ALBUM = { titulo: "Casamento Marina & Rafael", fotos: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, grad: G[i % G.length] })) };

export default function PublicarInstagram() {
  const [selecao, setSelecao] = useState([]);
  const [legenda, setLegenda] = useState("");
  const [modo, setModo] = useState("agora");
  const [dataAg, setDataAg] = useState("");
  const [horaAg, setHoraAg] = useState("");
  const [feito, setFeito] = useState(null);

  const toggle = (id) => setSelecao((l) => l.includes(id) ? l.filter((x) => x !== id) : l.length < 10 ? [...l, id] : l);
  const podePublicar = selecao.length >= 1 && legenda.trim() && (modo === "agora" || (dataAg && horaAg));

  const publicar = () => {
    setFeito(modo);
    setSelecao([]); setLegenda(""); setDataAg(""); setHoraAg("");
    setTimeout(() => setFeito(null), 4000);
  };

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
          <button className="flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4" /> Álbum</button>
          <span className="flex items-center gap-1.5 text-sm font-semibold tracking-tight"><Instagram className="h-4 w-4" style={{ color: ACCENT }} /> Publicar no Instagram</span>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Nova publicação</h1>
        <p className="mt-1 text-sm text-stone-500">Fotos do álbum <strong>{ALBUM.titulo}</strong>. Selecione 1 foto (post) ou até 10 (carrossel).</p>

        {/* seleção de fotos */}
        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-stone-700">Fotos <span className="text-stone-400">({selecao.length}/10)</span></span>
            {selecao.length >= 2 && <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white" style={{ background: ACCENT }}><Images className="h-3 w-3" /> Carrossel</span>}
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {ALBUM.fotos.map((f) => {
              const idx = selecao.indexOf(f.id);
              const on = idx >= 0;
              return (
                <button key={f.id} onClick={() => toggle(f.id)} className={`relative aspect-square overflow-hidden rounded-lg transition ${on ? "ring-2 ring-offset-2" : "hover:opacity-80"}`}
                  style={{ background: f.grad, ...(on ? { "--tw-ring-color": ACCENT } : {}) }}>
                  {on && <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: ACCENT }}>{idx + 1}</span>}
                </button>
              );
            })}
          </div>
          {selecao.length === 10 && <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600"><AlertCircle className="h-3 w-3" /> Máximo de 10 fotos por carrossel (limite do Instagram).</p>}
        </section>

        {/* legenda */}
        <section className="mt-6">
          <label className="mb-1.5 block text-sm font-medium text-stone-700">Legenda</label>
          <textarea value={legenda} onChange={(e) => setLegenda(e.target.value)} rows={4}
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            placeholder="Escreva a legenda… use #hashtags e @menções normalmente." />
          <div className="mt-1 text-right text-xs text-stone-400">{legenda.length}/2200</div>
        </section>

        {/* quando publicar */}
        <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
          <span className="text-sm font-medium text-stone-700">Quando publicar?</span>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            {[["agora", "Publicar agora", Send], ["agendar", "Agendar", Calendar]].map(([k, r, Icon]) => (
              <button key={k} onClick={() => setModo(k)} className={`flex flex-1 items-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition ${modo === k ? "" : "border-stone-200 text-stone-500 hover:bg-stone-50"}`}
                style={modo === k ? { borderColor: ACCENT, color: ACCENT } : {}}>
                <Icon className="h-4 w-4" /> {r}
              </button>
            ))}
          </div>
          {modo === "agendar" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-medium text-stone-500">Data</label>
                <input type="date" value={dataAg} onChange={(e) => setDataAg(e.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-400" /></div>
              <div><label className="mb-1 block text-xs font-medium text-stone-500">Hora</label>
                <input type="time" value={horaAg} onChange={(e) => setHoraAg(e.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-400" /></div>
            </div>
          )}
        </section>

        {feito ? (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-5 w-5" /> {feito === "agora" ? "Publicado no Instagram! Acompanhe na Central de publicações (menu Instagram)." : "Publicação agendada! Ela aparece na Central de publicações (menu Instagram) e será publicada automaticamente."}
          </div>
        ) : (
          <button onClick={publicar} disabled={!podePublicar}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition disabled:opacity-40 hover:opacity-90" style={{ background: ACCENT }}>
            {modo === "agora" ? <><Send className="h-4 w-4" /> Publicar agora</> : <><Calendar className="h-4 w-4" /> Agendar publicação</>}
          </button>
        )}

        <p className="mt-3 text-center text-xs text-stone-400">A publicação real usa a API oficial do Instagram (conta business) — simulada no protótipo. O acompanhamento fica na Central de publicações.</p>
      </main>
    </div>
  );
}
