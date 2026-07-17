import React, { useState, useEffect } from "react";
import {
  ArrowRight, ArrowUpRight, Camera, Quote, Clock, Menu, X,
  MessageCircle, Phone, Mail, MapPin, Calculator, Instagram, ChevronRight, Music,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Site Institucional CINEMATOGRÁFICO · navegável por páginas
// Menu real: cada tópico é uma PÁGINA separada (Início · Portfólio · Novidades
// · Sobre · Contato), não seções de uma home rolável. Header fixo + menu mobile.
// Identidade: dark #0b0a09 + laranja #EA580C da marca como assinatura (fio que
// liga o site à área do cliente). Serif display + sans do sistema. Botão
// flutuante de orçamento em todas as páginas. Dados em memória.
// Contato → WhatsApp pessoal (fora do sistema). Orçamento → cadastro/login §4 → §6.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const SANS = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const WHATSAPP_PESSOAL = "5511999998888";

const ORCA = () => alert("→ cadastro/login (Identidade §4) → orçamento (§6).\nO lead nasce estruturado no sistema.");

// ─────────────────────────────────────────────────────────────
// CONFIG DO TENANT — na vida real vem das Configurações (§9 · Dados da empresa),
// não é fixo no código. É o que torna o site multi-tenant: cada fotógrafo tem
// seu logo, nome e redes. Aqui está mockado.
//   logo: URL da imagem do logo cadastrado. Se existir, SUBSTITUI o bloco
//         ícone+nome (o nome já vive dentro do logo). Se null, cai no fallback
//         ícone-de-câmera + nome em texto.
//   redes: só aparecem as que o admin cadastrou (Instagram, WhatsApp, TikTok…).
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  nome: "Marcelo Bloise",
  logoUrl: null, // ex.: "https://.../logo-mbf.png" — quando houver, substitui ícone+nome
  redes: [
    { tipo: "instagram", url: "https://instagram.com/marcelobloise" },
    { tipo: "whatsapp", url: "https://wa.me/5511999998888" },
    { tipo: "tiktok", url: "https://tiktok.com/@marcelobloise" },
  ],
};

// marca reutilizável: usa o logo do tenant se existir, senão o fallback ícone+nome
function Marca({ onClick, size = "sm" }) {
  const h = size === "sm" ? "h-8 w-8" : "h-6 w-6";
  const icon = size === "sm" ? "h-4 w-4" : "h-3 w-3";
  const txt = size === "sm" ? "text-sm" : "text-xs";
  if (CONFIG.logoUrl) {
    return (
      <button onClick={onClick} className="flex items-center">
        <img src={CONFIG.logoUrl} alt={CONFIG.nome} className={size === "sm" ? "h-8" : "h-6"} />
      </button>
    );
  }
  return (
    <button onClick={onClick} className="flex items-center gap-2.5">
      <div className={`flex ${h} items-center justify-center rounded-lg`} style={{ background: ACCENT }}><Camera className={`${icon} text-white`} /></div>
      <span className={`${txt} font-semibold tracking-[0.15em]`}>{CONFIG.nome.toUpperCase()}</span>
    </button>
  );
}

// ícone da rede social por tipo (lucide não tem tiktok; usa Music como stand-in)
function RedeIcon({ tipo }) {
  const cls = "h-4 w-4";
  if (tipo === "instagram") return <Instagram className={cls} />;
  if (tipo === "whatsapp") return <MessageCircle className={cls} />;
  return <Music className={cls} />; // tiktok e outros
}

const G = [
  "linear-gradient(135deg,rgba(234,88,12,0.55),#1a1210)",
  "linear-gradient(135deg,rgba(234,88,12,0.35),#141018)",
  "linear-gradient(135deg,rgba(234,88,12,0.7),#1c1512)",
  "linear-gradient(135deg,rgba(234,88,12,0.25),#12100f)",
  "linear-gradient(135deg,rgba(234,88,12,0.5),#181210)",
  "linear-gradient(135deg,rgba(234,88,12,0.4),#161013)",
];

const CATEGORIAS = ["Casamento", "Gestante", "15 anos", "Ensaios", "Corporativo", "Batizado"];
const NAV = [["inicio", "Início"], ["portfolio", "Portfólio"], ["novidades", "Novidades"], ["sobre", "Sobre"], ["contato", "Contato"]];

export default function SiteCinematografico() {
  const [pagina, setPagina] = useState("inicio");
  const [menuAberto, setMenuAberto] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);

  // rola pro topo ao trocar de página
  useEffect(() => { window.scrollTo(0, 0); }, [pagina]);

  const ir = (p) => { setPagina(p); setMenuAberto(false); };

  return (
    <div style={{ fontFamily: SANS, background: "#0b0a09" }} className="min-h-screen text-neutral-100">
      {/* HEADER + MENU */}
      <header className={`fixed inset-x-0 top-0 z-40 transition-all ${scrolled || pagina !== "inicio" ? "border-b border-white/10 bg-[#0b0a09]/85 backdrop-blur" : ""}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
          <Marca onClick={() => ir("inicio")} size="sm" />
          <nav className="hidden items-center gap-8 md:flex">
            {NAV.map(([k, r]) => (
              <button key={k} onClick={() => ir(k)}
                className={`text-xs font-medium tracking-widest transition ${pagina === k ? "" : "text-white/60 hover:text-white"}`}
                style={pagina === k ? { color: ACCENT } : {}}>{r.toUpperCase()}</button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={ORCA} className="hidden rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide text-white transition hover:opacity-90 sm:block" style={{ background: ACCENT }}>ORÇAMENTO</button>
            <button onClick={() => setMenuAberto((v) => !v)} className="md:hidden">{menuAberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
      </header>

      {pagina === "inicio" && <Inicio ir={ir} />}
      {pagina === "portfolio" && <Portfolio />}
      {pagina === "novidades" && <Novidades />}
      {pagina === "sobre" && <Sobre />}
      {pagina === "contato" && <Contato />}

      {/* RODAPÉ */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-8 sm:flex-row">
          <Marca onClick={() => ir("inicio")} size="xs" />
          <nav className="flex gap-5">
            {NAV.map(([k, r]) => <button key={k} onClick={() => ir(k)} className="text-xs text-white/40 hover:text-white/80">{r}</button>)}
          </nav>
          <div className="flex items-center gap-4 text-white/40">
            {CONFIG.redes.map((rede) => (
              <a key={rede.tipo} href={rede.url} target="_blank" rel="noreferrer" className="transition hover:text-white"><RedeIcon tipo={rede.tipo} /></a>
            ))}
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-white/25">© 2026 · São Paulo · SP</p>
      </footer>

      {/* MENU MOBILE — drawer no nível raiz (cobre qualquer página, z acima de tudo) */}
      {menuAberto && (
        <div className="fixed inset-0 md:hidden" style={{ zIndex: 70 }}>
          <div className="absolute inset-0 bg-black/70" onClick={() => setMenuAberto(false)} />
          <div className="absolute right-0 top-0 flex h-full w-1/2 min-w-[240px] flex-col border-l border-white/10 shadow-2xl" style={{ background: "#0b0a09" }}>
            <div className="flex items-center justify-end border-b border-white/10 px-6 py-5">
              <button onClick={() => setMenuAberto(false)}><X className="h-5 w-5 text-white/70" /></button>
            </div>
            <nav className="flex flex-col py-2">
              {NAV.map(([k, r]) => (
                <button key={k} onClick={() => ir(k)} className="px-6 py-4 text-right text-sm font-medium tracking-wide text-white/70 hover:bg-white/5"
                  style={pagina === k ? { color: ACCENT } : {}}>{r}</button>
              ))}
            </nav>
            <button onClick={() => { ORCA(); setMenuAberto(false); }} className="mx-6 mt-4 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white" style={{ background: ACCENT }}>
              <Camera className="h-4 w-4" /> Orçamento
            </button>
          </div>
        </div>
      )}

      {/* BOTÃO FLUTUANTE — global (oculto quando o menu está aberto) */}
      {!menuAberto && (
        <button onClick={ORCA} className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-2xl transition hover:scale-105" style={{ background: ACCENT }}>
          <Camera className="h-4 w-4" /> Orçamento
        </button>
      )}
    </div>
  );
}

// ═══════════════ INÍCIO ═══════════════
function Inicio({ ir }) {
  return (
    <>
      <section className="relative flex min-h-screen items-center overflow-hidden">
        <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 75% 30%, rgba(234,88,12,0.35) 0%, rgba(234,88,12,0.08) 35%, #0b0a09 68%)` }} />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-8">
          <div className="flex items-center gap-3">
            <span className="h-[1px] w-12" style={{ background: ACCENT }} />
            <p className="text-xs font-medium tracking-[0.35em] text-white/70">FOTOGRAFIA AUTORAL · SÃO PAULO</p>
          </div>
          <h1 style={{ fontFamily: SERIF }} className="mt-6 max-w-4xl text-6xl font-medium leading-[1.02] tracking-tight sm:text-7xl md:text-8xl">
            A luz certa<br />no instante <span style={{ color: ACCENT }} className="italic">exato.</span>
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-white/70">Casamentos e ensaios registrados como cinema — cada quadro pensado, cada emoção preservada.</p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button onClick={ORCA} className="group flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition hover:gap-3.5" style={{ background: ACCENT }}>Iniciar um projeto <ArrowRight className="h-4 w-4" /></button>
            <button onClick={() => ir("portfolio")} className="rounded-full border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition hover:border-white/60">Ver portfólio</button>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 h-12 w-[1px] -translate-x-1/2 overflow-hidden bg-white/15">
          <div className="h-1/2 w-full animate-pulse" style={{ background: ACCENT }} />
        </div>
      </section>

      {/* manifesto */}
      <section className="border-t border-white/10 py-28">
        <div className="mx-auto max-w-4xl px-8">
          <p style={{ fontFamily: SERIF }} className="text-3xl font-medium leading-[1.4] tracking-tight text-white/90 sm:text-4xl">
            Não fotografo poses. Fotografo <span style={{ color: ACCENT }}>o que é real</span> — o olhar que escapa, o riso que ninguém pediu, o segundo antes do abraço.
          </p>
          <button onClick={() => ir("sobre")} className="mt-8 flex items-center gap-2 text-sm font-medium tracking-wide text-white/60 transition hover:text-white">Conheça meu trabalho <ArrowUpRight className="h-4 w-4" style={{ color: ACCENT }} /></button>
        </div>
      </section>

      {/* depoimento */}
      <section className="border-t border-white/10 py-28">
        <div className="mx-auto max-w-4xl px-8 text-center">
          <Quote className="mx-auto h-10 w-10" style={{ color: ACCENT }} />
          <p style={{ fontFamily: SERIF }} className="mx-auto mt-6 max-w-3xl text-3xl font-medium leading-snug tracking-tight sm:text-4xl">"Ele não fotografou o nosso casamento. Ele o transformou em memória viva."</p>
          <p className="mt-8 text-xs font-medium tracking-[0.3em] text-white/50">MARINA & THIAGO · CASAMENTO</p>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-white/10 py-32 text-center">
        <div className="absolute inset-0" style={{ background: `radial-gradient(80% 120% at 50% 100%, rgba(234,88,12,0.25), transparent 60%)` }} />
        <div className="relative z-10 mx-auto max-w-3xl px-8">
          <h2 style={{ fontFamily: SERIF }} className="text-4xl font-medium tracking-tight sm:text-5xl">Sua história merece<br />esse olhar.</h2>
          <button onClick={ORCA} className="mx-auto mt-9 flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-white transition hover:gap-3.5" style={{ background: ACCENT }}>Pedir orçamento <ArrowRight className="h-4 w-4" /></button>
        </div>
      </section>
    </>
  );
}

// ═══════════════ PORTFÓLIO ═══════════════
function Portfolio() {
  const [cat, setCat] = useState("Todos");
  const cats = ["Todos", ...CATEGORIAS];
  return (
    <main className="mx-auto max-w-6xl px-8 pb-24 pt-32">
      <PageHead titulo="Portfólio" sub="Uma seleção de trabalhos recentes. Conteúdo vindo do cadastro do admin (§15)." />
      <div className="mt-8 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition ${cat === c ? "text-white" : "text-white/50 ring-1 ring-white/15 hover:text-white"}`}
            style={cat === c ? { background: ACCENT } : {}}>{c}</button>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[...G, ...G].slice(0, 9).map((g, i) => (
          <div key={i} className="group relative aspect-[4/5] overflow-hidden rounded-xl" style={{ background: g }}>
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 transition group-hover:opacity-100">
              <span className="text-xs font-semibold tracking-widest text-white">{CATEGORIAS[i % CATEGORIAS.length].toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

// ═══════════════ NOVIDADES ═══════════════
function Novidades() {
  const posts = [
    ["5 dicas para o pré-wedding perfeito", "28 jun 2026", "Como aproveitar a luz dourada e relaxar diante das câmeras."],
    ["Bastidores: casamento na Serra da Cantareira", "15 jun 2026", "Um dia inteiro documentado em meio à natureza."],
    ["Novo pacote de ensaio corporativo", "02 jun 2026", "Retratos profissionais para equipes e executivos."],
  ];
  return (
    <main className="mx-auto max-w-4xl px-8 pb-24 pt-32">
      <PageHead titulo="Novidades" sub="Publicações vindas da funcionalidade de Novidades do admin — fonte única." />
      <div className="mt-8 space-y-5">
        {posts.map(([t, d, r], i) => (
          <article key={i} className="group flex cursor-pointer gap-5 rounded-2xl border border-white/10 p-4 transition hover:border-white/25">
            <div className="h-28 w-40 shrink-0 rounded-xl" style={{ background: G[i % G.length] }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-white/40"><Clock className="h-3 w-3" /> {d}</div>
              <h2 className="mt-1.5 text-xl font-semibold leading-snug" style={{ fontFamily: SERIF }}>{t}</h2>
              <p className="mt-1 text-sm text-white/50">{r}</p>
              <span className="mt-2 flex items-center gap-1 text-xs font-medium" style={{ color: ACCENT }}>ler mais <ChevronRight className="h-3 w-3" /></span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

// ═══════════════ SOBRE ═══════════════
function Sobre() {
  return (
    <main className="mx-auto max-w-3xl px-8 pb-24 pt-32">
      <PageHead titulo="Sobre" sub="Mais de 10 anos transformando momentos em memórias." />
      <div className="mt-8 aspect-[16/9] w-full rounded-2xl" style={{ background: G[2] }} />
      <div className="mt-8 space-y-5 text-white/70">
        <p className="text-xl font-medium text-white" style={{ fontFamily: SERIF }}>Sou Marcelo Bloise, fotógrafo em São Paulo.</p>
        <p>Meu trabalho nasce da vontade de contar histórias reais — sem poses forçadas, sem cenas montadas. O que me move é capturar a emoção verdadeira de cada instante: o olhar que escapa, o riso espontâneo, o segundo antes do abraço.</p>
        <p>Cada casal, cada família tem uma história única. Meu papel é estar presente no momento certo, com sensibilidade e técnica, para que você reviva essas emoções sempre que olhar suas fotos.</p>
        <p>Trabalho com um número limitado de eventos por mês, garantindo atenção dedicada e um resultado à altura da confiança que você deposita no meu olhar.</p>
      </div>
      <div className="mt-10 grid grid-cols-3 gap-4">
        {[["500+", "eventos"], ["10+", "anos"], ["4.9", "avaliação"]].map(([n, l]) => (
          <div key={l} className="rounded-2xl border border-white/10 p-5 text-center">
            <div className="text-3xl font-bold tabular-nums" style={{ color: ACCENT }}>{n}</div>
            <div className="mt-1 text-xs tracking-widest text-white/40">{l.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </main>
  );
}

// ═══════════════ CONTATO ═══════════════
function Contato() {
  const [copiado, setCopiado] = useState(false);
  return (
    <main className="mx-auto max-w-4xl px-8 pb-24 pt-32">
      <PageHead titulo="Contato" sub="Prefere conversar? Chame no WhatsApp. Já sabe o que quer? Peça um orçamento." />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15"><MessageCircle className="h-5 w-5 text-emerald-400" /></div>
          <h2 className="mt-4 text-lg font-semibold" style={{ fontFamily: SERIF }}>Conversar no WhatsApp</h2>
          <p className="mt-1 text-sm text-white/50">Para dúvidas rápidas e disponibilidade de datas. Resposta direta comigo.</p>
          <a href={`https://wa.me/${WHATSAPP_PESSOAL}`} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: "#25D366" }}>
            <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
          </a>
          <button onClick={() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500); }} className="mt-2 w-full text-center text-xs text-white/40 hover:text-white/70">{copiado ? "número copiado!" : "ou copiar: (11) 99999-8888"}</button>
        </div>
        <div className="rounded-2xl border-2 p-6" style={{ borderColor: ACCENT }}>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: ACCENT }}><Calculator className="h-5 w-5 text-white" /></div>
          <h2 className="mt-4 text-lg font-semibold" style={{ fontFamily: SERIF }}>Pedir orçamento</h2>
          <p className="mt-1 text-sm text-white/50">Já decidiu? Crie sua conta e monte um orçamento personalizado — assim capto tudo que preciso pra te atender bem.</p>
          <button onClick={ORCA} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: ACCENT }}>
            <Calculator className="h-4 w-4" /> Começar orçamento
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 p-5 sm:grid-cols-3">
        <div className="flex items-center gap-2 text-sm text-white/60"><Phone className="h-4 w-4 text-white/30" /> (11) 99999-8888</div>
        <div className="flex items-center gap-2 text-sm text-white/60"><Mail className="h-4 w-4 text-white/30" /> contato@mbf.com.br</div>
        <div className="flex items-center gap-2 text-sm text-white/60"><MapPin className="h-4 w-4 text-white/30" /> São Paulo · SP</div>
      </div>
    </main>
  );
}

function PageHead({ titulo, sub }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="h-[1px] w-10" style={{ background: ACCENT }} />
        <span className="text-xs font-medium tracking-[0.3em] text-white/50">{sub && "MARCELO BLOISE"}</span>
      </div>
      <h1 style={{ fontFamily: SERIF }} className="mt-4 text-5xl font-medium tracking-tight sm:text-6xl">{titulo}</h1>
      <p className="mt-3 max-w-xl text-sm text-white/50">{sub}</p>
    </div>
  );
}
