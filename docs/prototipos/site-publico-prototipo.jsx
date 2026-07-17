import React, { useState } from "react";
import {
  Camera, Instagram, MessageCircle, Menu, X, ArrowRight, MapPin, Mail, Phone,
  ChevronLeft, ChevronRight, Star, Quote
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Site Público (Rodada 1: home, portfólio, sobre, contato)
// Consome as categorias do portfólio (admin) e os depoimentos (feedback).
// CTA "pedir orçamento" liga no fluxo de orçamento existente.
// Blog fica para a Rodada 2. Fotos são placeholders.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const G = [
  "linear-gradient(135deg,#a8c0ff,#3f2b96)", "linear-gradient(135deg,#f6d365,#fda085)",
  "linear-gradient(135deg,#84fab0,#8fd3f4)", "linear-gradient(135deg,#fccb90,#d57eeb)",
  "linear-gradient(135deg,#e0c3fc,#8ec5fc)", "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#5ee7df,#b490ca)", "linear-gradient(135deg,#c79081,#dfa579)",
  "linear-gradient(135deg,#fa709a,#fee140)", "linear-gradient(135deg,#30cfd0,#330867)",
];

const CATEGORIAS = [
  { id: "casamento", nome: "Casamento", texto: "Momentos únicos do dia mais especial.", capa: G[0], n: 12 },
  { id: "aniversario", nome: "Aniversário", texto: "Festas cheias de alegria, do primeiro aninho aos 15 anos.", capa: G[1], n: 8 },
  { id: "ensaios", nome: "Ensaios", texto: "Externos e em estúdio — individuais, casais e família.", capa: G[2], n: 15 },
  { id: "gestante", nome: "Gestante", texto: "A espera mais doce registrada com carinho.", capa: G[3], n: 6 },
  { id: "batizado", nome: "Batizado", texto: "A celebração da fé e da família.", capa: G[4], n: 9 },
  { id: "eventos", nome: "Eventos", texto: "Corporativos e comemorações especiais.", capa: G[5], n: 10 },
];

const DEPOIMENTOS = [
  { nome: "Ana e Pedro", evento: "Casamento", estrelas: 5, texto: "Simplesmente perfeito. Cada detalhe do nosso dia ficou eternizado." },
  { nome: "Roberto Costa", evento: "Ensaio Família", estrelas: 5, texto: "Fotos maravilhosas, superou nossas expectativas! Super atencioso." },
  { nome: "Júlia M.", evento: "15 anos", estrelas: 5, texto: "Amei cada foto! O Marcelo capturou toda a emoção da festa." },
];

const NAV = [["home", "Home"], ["portfolio", "Portfólio"], ["sobre", "A Empresa"], ["contato", "Fale Conosco"]];

export default function SitePublico() {
  const [pag, setPag] = useState("home");
  const [menuAberto, setMenuAberto] = useState(false);
  const [categoria, setCategoria] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  const ir = (p) => { setPag(p); setCategoria(null); setMenuAberto(false); window.scrollTo?.(0, 0); };

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-950 text-white">
      {/* header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-stone-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <button onClick={() => ir("home")} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><Camera className="h-4 w-4 text-white" /></div>
            <span className="text-sm font-bold tracking-widest">MARCELO BLOISE</span>
          </button>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(([k, r]) => (
              <button key={k} onClick={() => ir(k)} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${pag === k ? "" : "text-white/60 hover:text-white"}`} style={pag === k ? { color: ACCENT } : {}}>{r}</button>
            ))}
            <button onClick={() => ir("contato")} className="ml-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90" style={{ background: ACCENT }}>Pedir orçamento</button>
          </nav>
          <button className="md:hidden" onClick={() => setMenuAberto(!menuAberto)}>{menuAberto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
        </div>
        {menuAberto && (
          <nav className="border-t border-white/10 px-5 py-3 md:hidden">
            {NAV.map(([k, r]) => <button key={k} onClick={() => ir(k)} className="block w-full py-2.5 text-left text-sm font-medium text-white/80">{r}</button>)}
            <button onClick={() => ir("contato")} className="mt-2 w-full rounded-full py-2.5 text-sm font-semibold text-white" style={{ background: ACCENT }}>Pedir orçamento</button>
          </nav>
        )}
      </header>

      {pag === "home" && <Home ir={ir} setCategoria={(c) => { setPag("portfolio"); setCategoria(c); }} />}
      {pag === "portfolio" && <Portfolio categoria={categoria} setCategoria={setCategoria} onLightbox={setLightbox} />}
      {pag === "sobre" && <Sobre ir={ir} />}
      {pag === "contato" && <Contato />}

      {/* footer */}
      <footer className="border-t border-white/10 bg-stone-950 px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2"><Camera className="h-5 w-5" style={{ color: ACCENT }} /><span className="text-sm font-bold tracking-widest">MARCELO BLOISE FOTOGRAFIA</span></div>
          <div className="flex gap-4">
            <MessageCircle className="h-5 w-5 text-white/50 hover:text-white" />
            <Instagram className="h-5 w-5 text-white/50 hover:text-white" />
          </div>
          <p className="text-xs text-white/30">© 2015 - 2026 Marcelo Bloise Fotografia · CNPJ 37.476.502/0001-01</p>
        </div>
      </footer>

      {lightbox !== null && categoria && (
        <Lightbox categoria={categoria} idx={lightbox} setIdx={setLightbox} />
      )}
    </div>
  );
}

// ── Home ─────────────────────────────────────────────────────

function Home({ ir, setCategoria }) {
  return (
    <>
      {/* hero */}
      <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)" }} />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 px-6 text-center">
          <div className="mb-3 text-sm font-medium uppercase tracking-[0.3em]" style={{ color: ACCENT }}>Fotógrafo em São Paulo</div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Eternizando<br />seus momentos</h1>
          <p className="mx-auto mt-4 max-w-lg text-white/70">Casamentos, aniversários, ensaios e eventos registrados com sensibilidade e cuidado.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={() => ir("portfolio")} className="rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90" style={{ background: ACCENT }}>Ver portfólio</button>
            <button onClick={() => ir("contato")} className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">Pedir orçamento</button>
          </div>
        </div>
      </section>

      {/* categorias em destaque */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-2xl font-bold tracking-tight">O que fotografo</h2>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
          {CATEGORIAS.slice(0, 6).map((c) => (
            <button key={c.id} onClick={() => setCategoria(c)} className="group relative h-44 overflow-hidden rounded-xl text-left" style={{ background: c.capa }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent transition group-hover:from-black/80" />
              <div className="absolute bottom-0 p-4"><div className="text-lg font-bold">{c.nome}</div><div className="text-xs text-white/70">{c.n} fotos</div></div>
            </button>
          ))}
        </div>
      </section>

      {/* depoimentos (do módulo Feedback) */}
      <section className="bg-white/5 px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold tracking-tight">O que dizem os clientes</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {DEPOIMENTOS.map((d, i) => (
              <div key={i} className="rounded-2xl bg-white/5 p-6">
                <Quote className="h-6 w-6" style={{ color: ACCENT }} />
                <p className="mt-3 text-sm text-white/80">{d.texto}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div><div className="text-sm font-semibold">{d.nome}</div><div className="text-xs text-white/50">{d.evento}</div></div>
                  <div className="flex gap-0.5">{Array.from({ length: d.estrelas }).map((_, s) => <Star key={s} className="h-3.5 w-3.5" style={{ color: ACCENT, fill: ACCENT }} />)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-5 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Vamos registrar seu momento?</h2>
        <p className="mx-auto mt-2 max-w-md text-white/60">Conte sobre seu evento e monte um orçamento sem compromisso.</p>
        <button onClick={() => ir("contato")} className="mt-6 inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90" style={{ background: ACCENT }}>
          Pedir orçamento <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </>
  );
}

// ── Portfólio ────────────────────────────────────────────────

function Portfolio({ categoria, setCategoria, onLightbox }) {
  if (categoria) {
    const fotos = Array.from({ length: categoria.n }, (_, i) => ({ id: i, grad: G[i % G.length] }));
    return (
      <main className="mx-auto max-w-6xl px-5 py-12">
        <button onClick={() => setCategoria(null)} className="mb-4 flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white"><ChevronLeft className="h-4 w-4" /> Portfólio</button>
        <h1 className="text-3xl font-bold tracking-tight">{categoria.nome}</h1>
        <p className="mt-2 max-w-xl text-white/60">{categoria.texto}</p>
        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {fotos.map((f, i) => (
            <button key={f.id} onClick={() => onLightbox(i)} className="group relative aspect-square overflow-hidden rounded-lg" style={{ background: f.grad }}>
              <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
            </button>
          ))}
        </div>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Portfólio</h1>
      <p className="mt-2 text-white/60">Escolha uma categoria para ver os trabalhos.</p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIAS.map((c) => (
          <button key={c.id} onClick={() => setCategoria(c)} className="group relative h-56 overflow-hidden rounded-2xl text-left" style={{ background: c.capa }}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent transition group-hover:from-black/85" />
            <div className="absolute bottom-0 p-5">
              <div className="text-xl font-bold">{c.nome}</div>
              <div className="mt-1 text-sm text-white/70">{c.texto}</div>
              <div className="mt-2 text-xs text-white/50">{c.n} fotos →</div>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}

// ── Sobre ────────────────────────────────────────────────────

function Sobre({ ir }) {
  return (
    <main className="mx-auto max-w-4xl px-5 py-16">
      <div className="grid items-center gap-8 md:grid-cols-2">
        <div className="h-72 rounded-2xl" style={{ background: G[7] }} />
        <div>
          <div className="text-sm font-medium uppercase tracking-[0.2em]" style={{ color: ACCENT }}>A Empresa</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Sobre o Marcelo</h1>
          <p className="mt-4 text-white/70">Há mais de 10 anos registrando momentos especiais em São Paulo. Nosso trabalho vai além da fotografia — é sobre eternizar emoções e contar histórias através das imagens.</p>
          <p className="mt-3 text-white/70">Cada evento é único, e é assim que tratamos cada cliente: com atenção aos detalhes, sensibilidade e um olhar cuidadoso para os momentos que não voltam.</p>
          <button onClick={() => ir("contato")} className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow hover:opacity-90" style={{ background: ACCENT }}>Vamos conversar <ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>
    </main>
  );
}

// ── Contato ──────────────────────────────────────────────────

function Contato() {
  const inp = "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-orange-400";
  return (
    <main className="mx-auto max-w-4xl px-5 py-16">
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <div className="text-sm font-medium uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Fale Conosco</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Pedir orçamento</h1>
          <p className="mt-3 text-white/60">Conte sobre seu evento. Retornamos rápido com as opções.</p>
          <div className="mt-6 space-y-3 text-sm text-white/70">
            <div className="flex items-center gap-3"><Phone className="h-4 w-4" style={{ color: ACCENT }} /> (11) 99471-5161</div>
            <div className="flex items-center gap-3"><Mail className="h-4 w-4" style={{ color: ACCENT }} /> contato@marcelobloise.com.br</div>
            <div className="flex items-center gap-3"><MapPin className="h-4 w-4" style={{ color: ACCENT }} /> São Paulo, SP</div>
          </div>
          <div className="mt-5 rounded-lg bg-white/5 p-3 text-xs text-white/50">
            Ao pedir orçamento, você cria uma conta e é levado ao fluxo de solicitação (o mesmo que já construímos). O botão conecta o site ao sistema.
          </div>
        </div>
        <div className="rounded-2xl bg-white/5 p-6">
          <div className="space-y-3">
            <input className={inp} placeholder="Seu nome" />
            <input className={inp} placeholder="E-mail" />
            <input className={inp} placeholder="WhatsApp" />
            <select className={inp}><option className="bg-stone-900">Tipo de evento…</option>{CATEGORIAS.map((c) => <option key={c.id} className="bg-stone-900">{c.nome}</option>)}</select>
            <textarea className={inp} rows={3} placeholder="Conte sobre seu evento (data, local, ideia)…" />
            <button className="w-full rounded-full py-3 text-sm font-semibold text-white shadow hover:opacity-90" style={{ background: ACCENT }}>Enviar e criar orçamento</button>
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Lightbox ─────────────────────────────────────────────────

function Lightbox({ categoria, idx, setIdx }) {
  const total = categoria.n;
  const grad = G[idx % G.length];
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex justify-end p-5"><button onClick={() => setIdx(null)} className="rounded-full p-1.5 text-white/70 hover:bg-white/10"><X className="h-6 w-6" /></button></div>
      <div className="relative flex flex-1 items-center justify-center px-4 pb-8">
        <button onClick={() => setIdx((idx - 1 + total) % total)} className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ChevronLeft className="h-6 w-6" /></button>
        <div className="h-full max-h-[75vh] w-full max-w-3xl rounded-xl" style={{ background: grad }} />
        <button onClick={() => setIdx((idx + 1) % total)} className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ChevronRight className="h-6 w-6" /></button>
      </div>
    </div>
  );
}
