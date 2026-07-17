import React, { useState } from "react";
import {
  Camera, Star, Check, X, Quote, MessageSquare, BarChart3, Info, Heart
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Feedback (DEPOIS, fecha o ciclo)
// Telas: 1) Cliente avalia (estrelas + comentário + autorização pública)
//        2) ADM vê avaliações, média, e marca depoimentos
// Exibição no site fica pro futuro (depende do site). Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

const FEEDBACKS_SEED = [
  { id: 1, cliente: "Roberto Costa", evento: "Ensaio Família", estrelas: 5, comentario: "Fotos maravilhosas, superou nossas expectativas! O Marcelo é super atencioso.", autoriza: true, depoimento: true, data: "2026-06-20" },
  { id: 2, cliente: "Ana e Pedro", evento: "Casamento", estrelas: 5, comentario: "Simplesmente perfeito. Cada detalhe do nosso dia ficou eternizado.", autoriza: true, depoimento: false, data: "2026-06-15" },
  { id: 3, cliente: "Família Souza", evento: "Batizado", estrelas: 4, comentario: "Ótimo trabalho, só demorou um pouquinho na entrega.", autoriza: false, depoimento: false, data: "2026-06-10" },
];

const TELAS = [
  { id: "cliente", nome: "Cliente avalia", icon: Star },
  { id: "adm", nome: "Avaliações (ADM)", icon: BarChart3 },
];

export default function FeedbackPrototipo() {
  const [tela, setTela] = useState("cliente");
  const [feedbacks, setFeedbacks] = useState(FEEDBACKS_SEED);

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
            <Camera className="h-4 w-4 text-white" />
          </div>
          <span className="mr-2 text-sm font-semibold tracking-tight">Feedback</span>
          {TELAS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTela(t.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${tela === t.id ? "text-white" : "text-stone-500 hover:text-stone-800"}`}
                style={tela === t.id ? { background: ACCENT } : {}}>
                <Icon className="h-3.5 w-3.5" /> {t.nome}
              </button>
            );
          })}
        </div>
      </div>

      {tela === "cliente" ? <TelaCliente /> : <TelaADM feedbacks={feedbacks} setFeedbacks={setFeedbacks} />}
    </div>
  );
}

// ── Estrelas reutilizável ────────────────────────────────────

function Estrelas({ valor, onSet, tamanho = "h-8 w-8", leitura }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const ativa = (hover || valor) >= n;
        return (
          <button key={n} disabled={leitura}
            onMouseEnter={() => !leitura && setHover(n)} onMouseLeave={() => !leitura && setHover(0)}
            onClick={() => !leitura && onSet(n)}
            className={leitura ? "cursor-default" : "cursor-pointer transition hover:scale-110"}>
            <Star className={tamanho} style={{ color: ativa ? ACCENT : "#d6d3d1", fill: ativa ? ACCENT : "transparent" }} />
          </button>
        );
      })}
    </div>
  );
}

// ── Tela 1: Cliente avalia ───────────────────────────────────

function TelaCliente() {
  const [estrelas, setEstrelas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [autoriza, setAutoriza] = useState(false);
  const [fim, setFim] = useState(null); // 'enviado' | 'pulou'

  if (fim) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "#FEF3EC" }}>
          <Heart className="h-7 w-7" style={{ color: ACCENT }} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{fim === "enviado" ? "Obrigado pelo carinho!" : "Tudo bem!"}</h1>
        <p className="mt-2 text-stone-500">
          {fim === "enviado"
            ? "Sua avaliação ajuda muito o trabalho do estúdio." + (autoriza ? " E obrigado por autorizar o uso do seu depoimento!" : "")
            : "Se quiser avaliar depois, é só voltar aqui."}
        </p>
        <button onClick={() => { setFim(null); setEstrelas(0); setComentario(""); setAutoriza(false); }} className="mt-6 text-sm font-medium text-orange-600 hover:text-orange-700">← Rever (demo)</button>
      </main>
    );
  }

  const positivo = estrelas >= 4;

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <div className="text-center">
        <h1 className="text-xl font-bold tracking-tight">Como foi sua experiência?</h1>
        <p className="mt-1 text-sm text-stone-500">Sua opinião sobre o ensaio "Família Costa" ajuda muito.</p>
      </div>

      <div className="mt-6 flex flex-col items-center rounded-2xl border border-stone-200 bg-white p-6">
        <Estrelas valor={estrelas} onSet={setEstrelas} />
        <div className="mt-2 text-sm text-stone-400">
          {estrelas === 0 ? "Toque nas estrelas" : ["", "Que pena", "Podia ser melhor", "Bom", "Muito bom", "Perfeito!"][estrelas]}
        </div>

        <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3}
          className="mt-5 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none placeholder:text-stone-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          placeholder="Conte como foi (opcional)…" />

        {/* autorização pública só faz sentido em avaliação positiva */}
        {positivo && (
          <button onClick={() => setAutoriza(!autoriza)} className="mt-4 flex w-full items-start gap-3 rounded-lg bg-orange-50/50 p-3 text-left">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${autoriza ? "border-transparent" : "border-stone-300 bg-white"}`} style={autoriza ? { background: ACCENT } : {}}>
              {autoriza && <Check className="h-3.5 w-3.5 text-white" />}
            </span>
            <span className="text-sm text-stone-600">Autorizo o estúdio a usar meu comentário como depoimento (site, redes). Você pode revogar quando quiser.</span>
          </button>
        )}

        <button disabled={estrelas === 0} onClick={() => setFim("enviado")}
          className="mt-5 w-full rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-90" style={{ background: ACCENT }}>
          Enviar avaliação
        </button>
        <button onClick={() => setFim("pulou")} className="mt-2 text-sm font-medium text-stone-400 hover:text-stone-600">Agora não</button>
      </div>
    </main>
  );
}

// ── Tela 2: ADM vê avaliações ────────────────────────────────

function TelaADM({ feedbacks, setFeedbacks }) {
  const media = feedbacks.length ? (feedbacks.reduce((s, f) => s + f.estrelas, 0) / feedbacks.length).toFixed(1) : "0";
  const totalDepoimentos = feedbacks.filter((f) => f.depoimento).length;

  const toggleDepoimento = (id) => setFeedbacks((l) => l.map((f) => f.id === id ? { ...f, depoimento: !f.depoimento } : f));

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Avaliações</h1>
      <p className="mt-1 text-sm text-stone-500">O que seus clientes acharam. Marque as autorizadas que quiser destacar como depoimento.</p>

      {/* resumo */}
      <div className="mt-5 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 text-center">
          <div className="text-3xl font-bold" style={{ color: ACCENT }}>{media}</div>
          <div className="mt-1 flex justify-center"><Estrelas valor={Math.round(media)} leitura tamanho="h-4 w-4" /></div>
          <div className="mt-1 text-xs text-stone-400">média geral</div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 text-center">
          <div className="text-3xl font-bold">{feedbacks.length}</div>
          <div className="mt-1 text-xs text-stone-400">avaliações</div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 text-center">
          <div className="text-3xl font-bold">{totalDepoimentos}</div>
          <div className="mt-1 text-xs text-stone-400">depoimentos</div>
        </div>
      </div>

      {/* lista */}
      <div className="mt-5 space-y-3">
        {feedbacks.map((f) => (
          <div key={f.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{f.cliente} <span className="text-sm font-normal text-stone-400">· {f.evento}</span></div>
                <div className="mt-1"><Estrelas valor={f.estrelas} leitura tamanho="h-4 w-4" /></div>
              </div>
              <span className="text-xs text-stone-400">{f.data.split("-").reverse().join("/")}</span>
            </div>

            {f.comentario && (
              <div className="mt-2 flex gap-2 rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
                <Quote className="h-4 w-4 shrink-0 text-stone-300" /> {f.comentario}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              {f.autoriza ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600"><Check className="h-3.5 w-3.5" /> Cliente autorizou uso público</span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-stone-400"><X className="h-3.5 w-3.5" /> Sem autorização pública</span>
              )}

              <button onClick={() => f.autoriza && toggleDepoimento(f.id)} disabled={!f.autoriza}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${f.depoimento ? "text-white" : "ring-1 ring-stone-300 text-stone-600 hover:bg-stone-50"}`}
                style={f.depoimento ? { background: ACCENT } : {}}>
                <Star className={`h-3.5 w-3.5 ${f.depoimento ? "fill-white" : ""}`} /> {f.depoimento ? "É depoimento" : "Marcar como depoimento"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 flex items-start gap-1.5 rounded-lg bg-stone-100 p-3 text-xs text-stone-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Só avaliações com autorização do cliente podem virar depoimento. A exibição no site acontece quando o site estiver no ar — aqui você faz a curadoria.
      </p>
    </main>
  );
}
