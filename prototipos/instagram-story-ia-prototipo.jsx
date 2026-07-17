import React, { useState } from "react";
import {
  ArrowLeft, Instagram, Sparkles, Layout, Check, Calendar, Send,
  RefreshCw, Pencil, Loader2, Info, AlertCircle, DollarSign, CheckCircle2
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Publicar STORY no Instagram (com IA)
// Modo dual: Template (default) + IA livre. Fluxo: seleciona foto
// do álbum → dados do evento (pré-preenchidos) → escolhe modo →
// gera → preview → editar texto/regenerar → publicar/agendar.
// Modo NÃO persiste entre Stories (volta ao template default).
// Templates são MOCKS GENÉRICOS pra validar mecânica — arte real
// é design externo à spec. IA real fica no backend.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const G = [
  "linear-gradient(135deg,#a8c0ff,#3f2b96)", "linear-gradient(135deg,#f6d365,#fda085)",
  "linear-gradient(135deg,#84fab0,#8fd3f4)", "linear-gradient(135deg,#fccb90,#d57eeb)",
  "linear-gradient(135deg,#e0c3fc,#8ec5fc)", "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#5ee7df,#b490ca)", "linear-gradient(135deg,#c79081,#dfa579)",
];

const ALBUM = {
  titulo: "Casamento Marina & Rafael",
  tipoEvento: "Casamento",
  cliente: "Marina & Rafael",
  data: "12/12/2026",
  local: "Villa Garden",
  fotos: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, grad: G[i % G.length] })),
};

// mocks de template — 3 identidades visuais distintas SÓ para validar mecânica.
const TEMPLATES = [
  { id: "t1", nome: "Clássico", padrao: true,
    estilo: { fundo: "#1a1a1a", tituloFonte: "serif", tituloCor: "#f5f5f4", acento: "#d4a574", posicao: "rodape" } },
  { id: "t2", nome: "Minimalista", padrao: false,
    estilo: { fundo: "#f5f5f4", tituloFonte: "sans-serif", tituloCor: "#1a1a1a", acento: "#78716c", posicao: "topo" } },
  { id: "t3", nome: "Colorido", padrao: false,
    estilo: { fundo: "linear-gradient(135deg,#EA580C,#DC2626)", tituloFonte: "sans-serif", tituloCor: "#ffffff", acento: "#fef3c7", posicao: "diagonal" } },
];

const CUSTO = { llm: 0.08, arte_ia: 0.75, template: 0 };

export default function PublicarStoryIA() {
  const [foto, setFoto] = useState(null);
  const [dados, setDados] = useState({
    tipoEvento: ALBUM.tipoEvento, cliente: ALBUM.cliente, data: ALBUM.data, local: ALBUM.local,
  });
  const templateDefault = TEMPLATES.find((t) => t.padrao)?.id || TEMPLATES[0].id;
  const [modo, setModo] = useState(templateDefault);
  const [gerando, setGerando] = useState(false);
  const [preview, setPreview] = useState(null);
  const [editandoTexto, setEditandoTexto] = useState(false);
  const [regens, setRegens] = useState(0);
  const [custoTotal, setCustoTotal] = useState(0);
  const [publicarQuando, setPublicarQuando] = useState("agora");
  const [dataAg, setDataAg] = useState("");
  const [horaAg, setHoraAg] = useState("");
  const [feito, setFeito] = useState(null);

  const modoAtual = TEMPLATES.find((t) => t.id === modo) || null;
  const isIALivre = modo === "ia_livre";

  const gerar = () => {
    if (!foto) return;
    setGerando(true);
    const latencia = isIALivre ? 2200 : 600;
    setTimeout(() => {
      const custoGeracao = isIALivre ? CUSTO.llm + CUSTO.arte_ia : CUSTO.llm + CUSTO.template;
      setPreview({
        texto: sugerirOverlay(dados),
        legenda: sugerirLegenda(dados),
        custo: custoGeracao,
        regenId: Date.now(),
      });
      setCustoTotal((c) => c + custoGeracao);
      setGerando(false);
    }, latencia);
  };

  const regenerar = () => { setRegens((r) => r + 1); setPreview(null); gerar(); };
  const trocarModo = (novo) => { setModo(novo); setPreview(null); setEditandoTexto(false); };

  const publicar = () => {
    setFeito(publicarQuando);
    setTimeout(() => setFeito(null), 4500);
  };

  const podePublicar = preview && (publicarQuando === "agora" || (dataAg && horaAg));

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
          <button className="flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4" /> Álbum</button>
          <span className="flex items-center gap-1.5 text-sm font-semibold tracking-tight"><Instagram className="h-4 w-4" style={{ color: ACCENT }} /> Publicar Story no Instagram</span>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Novo Story com IA</h1>
        <p className="mt-1 text-sm text-stone-500">Álbum <strong>{ALBUM.titulo}</strong>. Selecione 1 foto, escolha o modo e gere.</p>

        {/* 1. Foto */}
        <section className="mt-6">
          <label className="mb-2 block text-sm font-medium text-stone-700">1. Foto do álbum</label>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {ALBUM.fotos.map((f) => {
              const on = foto?.id === f.id;
              return (
                <button key={f.id} onClick={() => { setFoto(f); setPreview(null); }}
                  className={`relative aspect-square overflow-hidden rounded-lg transition ${on ? "ring-2 ring-offset-2" : "hover:opacity-80"}`}
                  style={{ background: f.grad, ...(on ? { "--tw-ring-color": ACCENT } : {}) }}>
                  {on && <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: ACCENT }}><Check className="h-3 w-3" /></span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Dados do evento */}
        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
          <label className="mb-2 block text-sm font-medium text-stone-700">2. Dados do evento (a IA vai usar exatamente estes)</label>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <CampoInline label="Tipo" valor={dados.tipoEvento} onChange={(v) => setDados({ ...dados, tipoEvento: v })} />
            <CampoInline label="Cliente" valor={dados.cliente} onChange={(v) => setDados({ ...dados, cliente: v })} />
            <CampoInline label="Data" valor={dados.data} onChange={(v) => setDados({ ...dados, data: v })} />
            <CampoInline label="Local" valor={dados.local} onChange={(v) => setDados({ ...dados, local: v })} />
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-stone-400"><Info className="h-3 w-3" /> A IA usa somente estes campos. Deixe em branco o que não quiser que apareça.</p>
        </section>

        {/* 3. Modo */}
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium text-stone-700">3. Modo</label>
            <span className="text-xs text-stone-400">Volta ao template padrão a cada novo Story</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TEMPLATES.map((t) => (
              <BotaoModo key={t.id} on={modo === t.id} onClick={() => trocarModo(t.id)}
                icone={<Layout className="h-4 w-4" />}
                titulo={t.nome} sub={t.padrao ? "Padrão" : "Template"}
                estilo={t.estilo} custo="R$ 0,08" />
            ))}
            <BotaoModo on={isIALivre} onClick={() => trocarModo("ia_livre")}
              icone={<Sparkles className="h-4 w-4" />}
              titulo="IA livre" sub="Arte generativa" custo="R$ 0,83" premium />
          </div>
        </section>

        {/* 4. Gerar */}
        {!preview && !gerando && (
          <button onClick={gerar} disabled={!foto}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition disabled:opacity-40 hover:opacity-90" style={{ background: ACCENT }}>
            <Sparkles className="h-4 w-4" /> Gerar Story {isIALivre ? "com IA livre" : `com template "${modoAtual?.nome}"`}
          </button>
        )}

        {gerando && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-stone-200 bg-white py-10 text-sm text-stone-500">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: ACCENT }} />
            {isIALivre ? "IA compondo arte e texto… (~5-30s no real)" : "Aplicando template e gerando texto…"}
          </div>
        )}

        {/* 5. Preview */}
        {preview && !gerando && (
          <>
            <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-stone-700">Preview do Story</span>
                <span className="flex items-center gap-1 text-xs text-stone-400"><DollarSign className="h-3 w-3" /> esta geração: R$ {preview.custo.toFixed(2)} · total: R$ {custoTotal.toFixed(2)}{regens > 0 && ` · ${regens} regen.`}</span>
              </div>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <StoryPreview foto={foto} template={modoAtual} isIALivre={isIALivre} textoOverlay={preview.texto} />
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wide text-stone-400">Legenda</span>
                      <button onClick={() => setEditandoTexto(!editandoTexto)} className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700"><Pencil className="h-3 w-3" /> {editandoTexto ? "Concluir" : "Editar"}</button>
                    </div>
                    {editandoTexto ? (
                      <textarea value={preview.legenda} onChange={(e) => setPreview({ ...preview, legenda: e.target.value })} rows={4}
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                    ) : (
                      <p className="mt-1 rounded-lg bg-stone-50 px-3 py-2 text-sm whitespace-pre-line">{preview.legenda}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-stone-400">Overlay no Story</span>
                    <p className="mt-1 rounded-lg bg-stone-50 px-3 py-2 text-sm font-medium">{preview.texto}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
                <button onClick={regenerar} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerar {isIALivre ? "(+ R$ 0,83)" : "(+ R$ 0,08)"}
                </button>
              </div>
            </section>

            {/* 6. Quando publicar */}
            <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
              <span className="text-sm font-medium text-stone-700">Quando publicar?</span>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {[["agora", "Publicar agora", Send], ["agendar", "Agendar", Calendar]].map(([k, r, Icon]) => (
                  <button key={k} onClick={() => setPublicarQuando(k)}
                    className={`flex flex-1 items-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition ${publicarQuando === k ? "" : "border-stone-200 text-stone-500 hover:bg-stone-50"}`}
                    style={publicarQuando === k ? { borderColor: ACCENT, color: ACCENT } : {}}>
                    <Icon className="h-4 w-4" /> {r}
                  </button>
                ))}
              </div>
              {publicarQuando === "agendar" && (
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
                <CheckCircle2 className="h-5 w-5" /> {feito === "agora" ? "Story publicado! Acompanhe na Central de publicações (menu Instagram)." : "Story agendado! Aparece na Central e será publicado no horário."}
              </div>
            ) : (
              <button onClick={publicar} disabled={!podePublicar}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition disabled:opacity-40 hover:opacity-90" style={{ background: ACCENT }}>
                {publicarQuando === "agora" ? <><Send className="h-4 w-4" /> Publicar Story agora</> : <><Calendar className="h-4 w-4" /> Agendar Story</>}
              </button>
            )}

            {isIALivre && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-600">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> IA livre: arte pode variar bastante entre gerações — decisão consciente do PO.
              </p>
            )}
          </>
        )}

        <p className="mt-5 text-center text-xs text-stone-400">
          Mocks de template genéricos para validar o fluxo. Design real dos templates é trabalho externo à spec.
        </p>
      </main>
    </div>
  );
}

// ── Componentes ──────────────────────────────────────────────

function CampoInline({ label, valor, onChange }) {
  return (
    <div>
      <span className="text-xs uppercase tracking-wide text-stone-400">{label}</span>
      <input value={valor} onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded border-none bg-transparent px-0 py-1 text-sm outline-none focus:bg-stone-50 focus:px-2" />
    </div>
  );
}

function BotaoModo({ on, onClick, icone, titulo, sub, estilo, custo, premium }) {
  return (
    <button onClick={onClick}
      className={`relative flex flex-col items-start gap-1.5 rounded-xl border-2 p-3 text-left transition ${on ? "" : "border-stone-200 hover:bg-stone-50"}`}
      style={on ? { borderColor: ACCENT } : {}}>
      <div className="h-16 w-full overflow-hidden rounded-md" style={{ background: estilo?.fundo || "linear-gradient(135deg,#EA580C,#f093fb)" }}>
        {estilo ? (
          <div className="flex h-full p-1.5" style={{
            alignItems: estilo.posicao === "topo" ? "flex-start" : estilo.posicao === "diagonal" ? "center" : "flex-end",
            justifyContent: estilo.posicao === "diagonal" ? "center" : "flex-start"
          }}>
            <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: estilo.tituloCor, fontFamily: estilo.tituloFonte }}>Título</span>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center"><Sparkles className="h-6 w-6 text-white/70" /></div>
        )}
      </div>
      <div className="flex w-full items-center gap-1.5">
        {icone}
        <span className="text-sm font-semibold">{titulo}</span>
        {premium && <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">premium</span>}
      </div>
      <div className="flex w-full items-center justify-between text-[10px] text-stone-400">
        <span>{sub}</span>
        <span>{custo}</span>
      </div>
      {on && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: ACCENT }}><Check className="h-3 w-3" /></span>}
    </button>
  );
}

function StoryPreview({ foto, template, isIALivre, textoOverlay }) {
  const altura = 320;
  const largura = altura * 9 / 16;

  if (isIALivre) {
    return (
      <div className="relative overflow-hidden rounded-2xl shadow-lg" style={{ width: largura, height: altura, background: foto?.grad || "#1a1a1a" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 30% 20%, rgba(234,88,12,0.4), transparent 40%), radial-gradient(circle at 70% 80%, rgba(147,51,234,0.5), transparent 40%)" }} />
        <div className="absolute inset-x-3 top-4 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-white/80" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-white/80">Gerado por IA</span>
        </div>
        <div className="absolute inset-x-3 bottom-6 text-center">
          <span className="rounded-full bg-black/40 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white backdrop-blur">{textoOverlay}</span>
        </div>
      </div>
    );
  }

  if (!template) return null;
  const est = template.estilo;
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-lg" style={{ width: largura, height: altura, background: est.fundo }}>
      <div className="absolute inset-x-4 top-8 bottom-16 rounded-lg" style={{ background: foto?.grad || "#333" }} />
      {est.posicao === "rodape" && (
        <div className="absolute inset-x-0 bottom-3 px-4 text-center">
          <div className="text-[10px] uppercase tracking-widest" style={{ color: est.acento, fontFamily: est.tituloFonte }}>— {template.nome} —</div>
          <div className="mt-0.5 text-sm font-bold" style={{ color: est.tituloCor, fontFamily: est.tituloFonte }}>{textoOverlay}</div>
        </div>
      )}
      {est.posicao === "topo" && (
        <div className="absolute inset-x-0 top-2 px-4">
          <div className="text-[10px] uppercase tracking-widest" style={{ color: est.acento, fontFamily: est.tituloFonte }}>{template.nome}</div>
          <div className="mt-0.5 text-xs font-bold" style={{ color: est.tituloCor, fontFamily: est.tituloFonte }}>{textoOverlay}</div>
        </div>
      )}
      {est.posicao === "diagonal" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rotate-[-8deg] rounded bg-white/95 px-3 py-1.5 text-center shadow-lg">
            <div className="text-[8px] font-bold uppercase tracking-widest" style={{ color: "#DC2626" }}>{template.nome}</div>
            <div className="text-xs font-black" style={{ color: est.tituloCor }}>{textoOverlay}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sugestões de conteúdo (mock — a IA real usa LLM) ─────────

function sugerirOverlay(d) {
  const partes = [];
  if (d.cliente) partes.push(d.cliente);
  if (d.local) partes.push(d.local);
  return partes.length ? partes.join(" · ") : "Novo trabalho";
}
function sugerirLegenda(d) {
  const evento = d.tipoEvento?.toLowerCase() || "trabalho";
  const cliente = d.cliente ? ` ${d.cliente}` : "";
  const local = d.local ? ` no ${d.local}` : "";
  const data = d.data ? ` (${d.data})` : "";
  return `Um ${evento} inesquecível${cliente}${local}${data}. Cada detalhe registrado com carinho. ✨\n\n#${(d.tipoEvento || "fotografia").toLowerCase().replace(/\s/g, "")} #fotografiaprofissional`;
}
