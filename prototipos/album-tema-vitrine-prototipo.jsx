import React, { useState } from "react";
import {
  Camera, Palette, LayoutGrid, Type, Sparkles, Image as ImageIcon, Check,
  Eye, ChevronRight, Monitor, RotateCcw
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Editor de Tema da Vitrine (visão ADM)
// Personalização por álbum: capa, cores, layout da galeria, fontes,
// animações. Prévia ao vivo refletindo cada escolha.
// Inspirado no editor do Wix. Fotos são placeholders.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

const GRADIENTES = [
  "linear-gradient(135deg,#a8c0ff,#3f2b96)", "linear-gradient(135deg,#f6d365,#fda085)",
  "linear-gradient(135deg,#84fab0,#8fd3f4)", "linear-gradient(135deg,#fccb90,#d57eeb)",
  "linear-gradient(135deg,#e0c3fc,#8ec5fc)", "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#5ee7df,#b490ca)", "linear-gradient(135deg,#c79081,#dfa579)",
  "linear-gradient(135deg,#fa709a,#fee140)",
];
const FOTOS = GRADIENTES.map((g, i) => ({ id: i, grad: g }));

const LAYOUTS = [
  { id: "grade", nome: "Grade" }, { id: "mosaico", nome: "Mosaico" },
  { id: "colagem", nome: "Colagem" }, { id: "slider", nome: "Slider" },
  { id: "coluna", nome: "Coluna" }, { id: "ladrilhos", nome: "Ladrilhos" },
  { id: "miniaturas", nome: "Miniaturas" }, { id: "faixa", nome: "Faixa" },
  { id: "alternar", nome: "Alternar" }, { id: "misto", nome: "Misto" },
];
const CAPAS = [
  { id: "ousado", nome: "Ousado", desc: "Foto cheia, título grande sobreposto" },
  { id: "jovial", nome: "Jovial", desc: "Foto ao lado, texto à esquerda" },
  { id: "classico", nome: "Clássico", desc: "Título centralizado sobre a foto" },
  { id: "minimalista", nome: "Minimalista", desc: "Foco na foto, texto discreto" },
];
const FONTES = [
  { id: "moderna", nome: "Moderna", cssTitulo: "ui-sans-serif, system-ui", cssCorpo: "ui-sans-serif, system-ui" },
  { id: "elegante", nome: "Elegante", cssTitulo: "Georgia, serif", cssCorpo: "Georgia, serif" },
  { id: "classica", nome: "Clássica", cssTitulo: "'Times New Roman', serif", cssCorpo: "ui-sans-serif, system-ui" },
  { id: "display", nome: "Display", cssTitulo: "Impact, sans-serif", cssCorpo: "ui-sans-serif, system-ui" },
];
const ANIM_HOVER = [
  { id: "nenhum", nome: "Nenhum" }, { id: "zoom", nome: "Aproximar" },
  { id: "claro", nome: "Clarear" }, { id: "escuro", nome: "Escurecer" },
];
const ANIM_ENTRADA = [
  { id: "nenhum", nome: "Nenhuma" }, { id: "fade", nome: "Surgir" }, { id: "subir", nome: "Subir" },
];

const SECOES = [
  { id: "capa", nome: "Capa", icon: ImageIcon },
  { id: "cores", nome: "Cores", icon: Palette },
  { id: "layout", nome: "Layout", icon: LayoutGrid },
  { id: "fontes", nome: "Fontes", icon: Type },
  { id: "animacoes", nome: "Animações", icon: Sparkles },
];

const TEMA_PADRAO = {
  capaEstilo: "ousado", capaBotao: "Ver fotos", capaMostrarData: true, logoPosicao: "topo",
  corFundo: "#0c0a09", corTexto: "#ffffff", corAcento: "#EA580C", corBorda: "#292524",
  opacidadeSobre: 30, larguraBorda: 0, raioCanto: 12,
  layout: "grade", orientacao: "vertical", espacamento: 8, densidade: 40,
  fonte: "moderna", animHover: "zoom", animEntrada: "fade",
};

export default function EditorTemaVitrine() {
  const [secao, setSecao] = useState("capa");
  const [t, setT] = useState(TEMA_PADRAO);
  const set = (k, v) => setT((p) => ({ ...p, [k]: v }));

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      {/* topo */}
      <div className="flex items-center gap-3 border-b border-stone-200 bg-white px-6 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
          <Camera className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Personalizar vitrine · Marina & Rafael</span>
        <button onClick={() => setT(TEMA_PADRAO)} className="ml-auto flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-stone-700">
          <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
        </button>
        <button className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>
          <Check className="h-4 w-4" /> Salvar tema
        </button>
      </div>

      <div className="flex flex-1">
        {/* navegação de seções */}
        <nav className="w-16 shrink-0 border-r border-stone-200 bg-white py-3 sm:w-20">
          {SECOES.map((s) => {
            const Icon = s.icon; const on = secao === s.id;
            return (
              <button key={s.id} onClick={() => setSecao(s.id)}
                className={`flex w-full flex-col items-center gap-1 py-3 text-[10px] font-medium transition ${on ? "" : "text-stone-400 hover:text-stone-700"}`}
                style={on ? { color: ACCENT } : {}}>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${on ? "" : "bg-stone-100"}`} style={on ? { background: "#FEF3EC" } : {}}>
                  <Icon className="h-4 w-4" />
                </span>
                {s.nome}
              </button>
            );
          })}
        </nav>

        {/* painel de controles */}
        <div className="w-72 shrink-0 overflow-y-auto border-r border-stone-200 bg-white p-5" style={{ maxHeight: "calc(100vh - 57px)" }}>
          {secao === "capa" && <PainelCapa t={t} set={set} />}
          {secao === "cores" && <PainelCores t={t} set={set} />}
          {secao === "layout" && <PainelLayout t={t} set={set} />}
          {secao === "fontes" && <PainelFontes t={t} set={set} />}
          {secao === "animacoes" && <PainelAnimacoes t={t} set={set} />}
        </div>

        {/* prévia ao vivo */}
        <div className="flex-1 overflow-y-auto bg-stone-100 p-6" style={{ maxHeight: "calc(100vh - 57px)" }}>
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-stone-400">
            <Monitor className="h-4 w-4" /> Prévia ao vivo — é assim que o cliente vê
          </div>
          <Previa t={t} />
        </div>
      </div>
    </div>
  );
}

// ── Painéis de controle ──────────────────────────────────────

function PainelCapa({ t, set }) {
  return (
    <Secao titulo="Capa do álbum">
      <Campo label="Estilo da capa">
        <div className="space-y-2">
          {CAPAS.map((c) => (
            <button key={c.id} onClick={() => set("capaEstilo", c.id)}
              className={`w-full rounded-lg border-2 p-3 text-left transition ${t.capaEstilo === c.id ? "" : "border-stone-200 hover:bg-stone-50"}`}
              style={t.capaEstilo === c.id ? { borderColor: ACCENT } : {}}>
              <div className="text-sm font-medium">{c.nome}</div>
              <div className="text-xs text-stone-400">{c.desc}</div>
            </button>
          ))}
        </div>
      </Campo>
      <Campo label="Texto do botão"><input value={t.capaBotao} onChange={(e) => set("capaBotao", e.target.value)} className={inp} /></Campo>
      <Check2 label="Mostrar data na capa" on={t.capaMostrarData} onToggle={() => set("capaMostrarData", !t.capaMostrarData)} />
      <Campo label="Posição do logo (sempre visível)">
        <div className="grid grid-cols-3 gap-2">
          {[["topo", "Topo"], ["capa", "Sobre a capa"], ["rodape", "Rodapé"]].map(([k, r]) => (
            <button key={k} onClick={() => set("logoPosicao", k)}
              className={`rounded-lg border-2 py-2 text-xs font-medium transition ${t.logoPosicao === k ? "" : "border-stone-200 text-stone-500 hover:bg-stone-50"}`}
              style={t.logoPosicao === k ? { borderColor: ACCENT, color: "#C2410C" } : {}}>{r}</button>
          ))}
        </div>
      </Campo>
    </Secao>
  );
}

function PainelCores({ t, set }) {
  return (
    <Secao titulo="Cores">
      <Cor label="Fundo da página" valor={t.corFundo} onChange={(v) => set("corFundo", v)} />
      <Cor label="Texto e títulos" valor={t.corTexto} onChange={(v) => set("corTexto", v)} />
      <Cor label="Acento (botões, destaques)" valor={t.corAcento} onChange={(v) => set("corAcento", v)} />
      <Cor label="Borda das fotos" valor={t.corBorda} onChange={(v) => set("corBorda", v)} />
      <Slider label="Opacidade da sobreposição" valor={t.opacidadeSobre} onChange={(v) => set("opacidadeSobre", v)} min={0} max={100} suf="%" />
      <Slider label="Largura da borda" valor={t.larguraBorda} onChange={(v) => set("larguraBorda", v)} min={0} max={10} suf="px" />
      <Slider label="Raio do canto" valor={t.raioCanto} onChange={(v) => set("raioCanto", v)} min={0} max={28} suf="px" />
    </Secao>
  );
}

function PainelLayout({ t, set }) {
  return (
    <Secao titulo="Layout da galeria">
      <Campo label="Estilo">
        <div className="grid grid-cols-3 gap-2">
          {LAYOUTS.map((l) => (
            <button key={l.id} onClick={() => set("layout", l.id)}
              className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 text-[10px] font-medium transition ${t.layout === l.id ? "" : "border-stone-200 text-stone-500 hover:bg-stone-50"}`}
              style={t.layout === l.id ? { borderColor: ACCENT, color: "#C2410C" } : {}}>
              <MiniLayout tipo={l.id} ativo={t.layout === l.id} />
              {l.nome}
            </button>
          ))}
        </div>
      </Campo>
      <Campo label="Orientação">
        <div className="flex gap-2">
          {["vertical", "horizontal"].map((o) => (
            <button key={o} onClick={() => set("orientacao", o)}
              className={`flex-1 rounded-lg border-2 py-2 text-xs font-medium capitalize transition ${t.orientacao === o ? "" : "border-stone-200 text-stone-500"}`}
              style={t.orientacao === o ? { borderColor: ACCENT, color: "#C2410C" } : {}}>{o}</button>
          ))}
        </div>
      </Campo>
      <Slider label="Espaçamento entre fotos" valor={t.espacamento} onChange={(v) => set("espacamento", v)} min={0} max={24} suf="px" />
      <Slider label="Densidade / tamanho base" valor={t.densidade} onChange={(v) => set("densidade", v)} min={20} max={80} suf="" />
    </Secao>
  );
}

function PainelFontes({ t, set }) {
  return (
    <Secao titulo="Fontes">
      <div className="space-y-2">
        {FONTES.map((f) => (
          <button key={f.id} onClick={() => set("fonte", f.id)}
            className={`w-full rounded-lg border-2 p-3 text-left transition ${t.fonte === f.id ? "" : "border-stone-200 hover:bg-stone-50"}`}
            style={t.fonte === f.id ? { borderColor: ACCENT } : {}}>
            <div className="text-lg font-bold" style={{ fontFamily: f.cssTitulo }}>{f.nome}</div>
            <div className="text-xs text-stone-400" style={{ fontFamily: f.cssCorpo }}>Marina & Rafael · 12 de dezembro</div>
          </button>
        ))}
      </div>
    </Secao>
  );
}

function PainelAnimacoes({ t, set }) {
  return (
    <Secao titulo="Animações">
      <Campo label="Ao passar o mouse na foto">
        <div className="grid grid-cols-2 gap-2">
          {ANIM_HOVER.map((a) => (
            <button key={a.id} onClick={() => set("animHover", a.id)}
              className={`rounded-lg border-2 py-2 text-xs font-medium transition ${t.animHover === a.id ? "" : "border-stone-200 text-stone-500 hover:bg-stone-50"}`}
              style={t.animHover === a.id ? { borderColor: ACCENT, color: "#C2410C" } : {}}>{a.nome}</button>
          ))}
        </div>
      </Campo>
      <Campo label="Entrada das fotos">
        <div className="grid grid-cols-3 gap-2">
          {ANIM_ENTRADA.map((a) => (
            <button key={a.id} onClick={() => set("animEntrada", a.id)}
              className={`rounded-lg border-2 py-2 text-xs font-medium transition ${t.animEntrada === a.id ? "" : "border-stone-200 text-stone-500 hover:bg-stone-50"}`}
              style={t.animEntrada === a.id ? { borderColor: ACCENT, color: "#C2410C" } : {}}>{a.nome}</button>
          ))}
        </div>
      </Campo>
      <p className="text-xs text-stone-400">Passe o mouse nas fotos da prévia para ver o efeito.</p>
    </Secao>
  );
}

// ── Prévia ao vivo ───────────────────────────────────────────

function Previa({ t }) {
  const fonte = FONTES.find((f) => f.id === t.fonte);
  return (
    <div className="overflow-hidden rounded-2xl shadow-xl" style={{ background: t.corFundo, color: t.corTexto, fontFamily: fonte.cssCorpo }}>
      <PreviaCapa t={t} fonte={fonte} />
      <div className="p-4" style={{ padding: t.espacamento + 8 }}>
        <h3 className="mb-3 text-sm font-semibold" style={{ fontFamily: fonte.cssTitulo }}>Cerimônia</h3>
        <PreviaGaleria t={t} />
      </div>
    </div>
  );
}

function PreviaCapa({ t, fonte }) {
  const capa = FOTOS[0].grad;
  const titulo = "Marina & Rafael";
  const Logo = ({ classe }) => (
    <div className={`flex items-center gap-1.5 ${classe}`} style={{ color: t.corAcento }}>
      <Camera className="h-4 w-4" /> <span className="text-xs font-bold uppercase tracking-widest">Marcelo Bloise</span>
    </div>
  );

  if (t.capaEstilo === "jovial") {
    return (
      <div>
        {t.logoPosicao === "topo" && <div className="px-6 pt-4"><Logo /></div>}
        <div className="grid grid-cols-2">
          <div className="flex flex-col justify-center p-6">
            {t.logoPosicao === "capa" && <Logo classe="mb-2" />}
            <div className="text-2xl font-bold" style={{ fontFamily: fonte.cssTitulo }}>{titulo}</div>
            {t.capaMostrarData && <div className="mt-1 text-sm opacity-60">12 de dezembro de 2026</div>}
            <button className="mt-4 w-fit rounded-full px-4 py-2 text-xs font-semibold text-white" style={{ background: t.corAcento }}>{t.capaBotao}</button>
          </div>
          <div className="h-48" style={{ background: capa }} />
        </div>
        {t.logoPosicao === "rodape" && <div className="flex justify-center border-t border-white/10 px-6 py-3"><Logo /></div>}
      </div>
    );
  }

  const alinhamento = t.capaEstilo === "classico" ? "items-center text-center" : t.capaEstilo === "minimalista" ? "items-center text-center justify-end" : "items-start justify-end";
  return (
    <div>
      {t.logoPosicao === "topo" && <div className="px-6 pt-4 pb-2" style={{ background: t.corFundo }}><Logo /></div>}
      <div className="relative flex h-56 flex-col p-6" style={{ background: capa }}>
        <div className="absolute inset-0" style={{ background: t.corFundo, opacity: (t.capaEstilo === "minimalista" ? 15 : 45) / 100 }} />
        <div className={`relative z-10 flex h-full w-full flex-col ${alinhamento}`}>
          {t.logoPosicao === "capa" && <Logo classe="mb-1" />}
          <div className={`font-bold ${t.capaEstilo === "ousado" ? "text-4xl" : "text-2xl"}`} style={{ fontFamily: fonte.cssTitulo }}>{titulo}</div>
          {t.capaMostrarData && <div className="mt-1 text-sm opacity-70">12 de dezembro de 2026</div>}
          <button className="mt-3 w-fit rounded-full px-4 py-2 text-xs font-semibold text-white" style={{ background: t.corAcento }}>{t.capaBotao}</button>
        </div>
      </div>
      {t.logoPosicao === "rodape" && <div className="flex justify-center border-t border-white/10 px-6 py-3"><Logo /></div>}
    </div>
  );
}

function PreviaGaleria({ t }) {
  const estiloFoto = {
    borderRadius: t.raioCanto, border: t.larguraBorda ? `${t.larguraBorda}px solid ${t.corBorda}` : "none",
  };
  const gap = t.espacamento;
  const base = Math.round(t.densidade);

  // classes de animação via style inline + hover simulado com group
  const animClass = `previa-foto anim-${t.animHover}`;

  const Foto = ({ f, h }) => (
    <div className={animClass} style={{ ...estiloFoto, background: f.grad, height: h, overflow: "hidden", position: "relative" }}>
      <div className="anim-overlay" style={{ position: "absolute", inset: 0, background: t.corFundo, opacity: 0, transition: "opacity .25s" }} />
    </div>
  );

  let conteudo;
  if (t.layout === "slider") {
    conteudo = (
      <div style={{ display: "flex", gap, overflowX: "auto", paddingBottom: 4 }}>
        {FOTOS.map((f) => <div key={f.id} style={{ flex: "0 0 70%" }}><Foto f={f} h={140} /></div>)}
      </div>
    );
  } else if (t.layout === "coluna") {
    conteudo = <div style={{ display: "flex", flexDirection: "column", gap }}>{FOTOS.slice(0, 4).map((f) => <Foto key={f.id} f={f} h={120} />)}</div>;
  } else if (t.layout === "faixa") {
    conteudo = <div style={{ display: "flex", gap }}>{FOTOS.slice(0, 5).map((f) => <div key={f.id} style={{ flex: 1 }}><Foto f={f} h={90} /></div>)}</div>;
  } else if (t.layout === "mosaico" || t.layout === "colagem" || t.layout === "misto") {
    // mosaico: tamanhos variados via grid com spans
    conteudo = (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap, gridAutoRows: `${base}px` }}>
        {FOTOS.map((f, i) => {
          const big = t.layout !== "faixa" && (i % 5 === 0);
          return <div key={f.id} style={{ gridColumn: big ? "span 2" : "span 1", gridRow: big ? "span 2" : "span 1" }}><Foto f={f} h="100%" /></div>;
        })}
      </div>
    );
  } else if (t.layout === "ladrilhos" || t.layout === "miniaturas") {
    const cols = t.layout === "miniaturas" ? 6 : 3;
    conteudo = <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap }}>{FOTOS.map((f) => <Foto key={f.id} f={f} h={t.layout === "miniaturas" ? 50 : 90} />)}</div>;
  } else if (t.layout === "alternar") {
    conteudo = (
      <div style={{ display: "flex", flexDirection: "column", gap }}>
        {[0, 1, 2].map((row) => (
          <div key={row} style={{ display: "flex", gap }}>
            <div style={{ flex: row % 2 === 0 ? 2 : 1 }}><Foto f={FOTOS[row * 2]} h={90} /></div>
            <div style={{ flex: row % 2 === 0 ? 1 : 2 }}><Foto f={FOTOS[row * 2 + 1]} h={90} /></div>
          </div>
        ))}
      </div>
    );
  } else {
    // grade padrão
    conteudo = <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap }}>{FOTOS.map((f) => <Foto key={f.id} f={f} h={base + 50} />)}</div>;
  }

  return (
    <>
      <style>{`
        .previa-foto { cursor: pointer; transition: transform .3s, filter .3s; }
        .anim-zoom:hover { transform: scale(1.06); }
        .anim-claro:hover { filter: brightness(1.2); }
        .anim-escuro:hover .anim-overlay { opacity: ${t.opacidadeSobre / 100}; }
      `}</style>
      {conteudo}
    </>
  );
}

// ── UI helpers ───────────────────────────────────────────────

function Secao({ titulo, children }) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-stone-400">{titulo}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
function Campo({ label, children }) {
  return <div><label className="mb-1.5 block text-sm font-medium text-stone-700">{label}</label>{children}</div>;
}
function Cor({ label, valor, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-stone-700">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={valor} onChange={(e) => onChange(e.target.value)} className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-stone-300" />
        <input value={valor} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-mono outline-none focus:border-orange-400" />
      </div>
    </div>
  );
}
function Slider({ label, valor, onChange, min, max, suf }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <label className="font-medium text-stone-700">{label}</label>
        <span className="text-xs font-medium" style={{ color: ACCENT }}>{valor}{suf}</span>
      </div>
      <input type="range" min={min} max={max} value={valor} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-orange-600" />
    </div>
  );
}
function Check2({ label, on, onToggle }) {
  return (
    <button onClick={onToggle} className="flex w-full items-center justify-between text-left text-sm">
      <span className="text-stone-600">{label}</span>
      <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${on ? "" : "bg-stone-200"}`} style={on ? { background: ACCENT } : {}}>
        <span className={`h-4 w-4 rounded-full bg-white shadow transition ${on ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}
function MiniLayout({ tipo, ativo }) {
  const c = ativo ? ACCENT : "#a8a29e";
  const cell = (x, y, w, h) => <rect x={x} y={y} width={w} height={h} rx="1" fill={c} />;
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      {tipo === "grade" && [cell(2,2,6,6), cell(9,2,6,6), cell(16,2,6,6), cell(2,9,6,6), cell(9,9,6,6), cell(16,9,6,6)]}
      {tipo === "mosaico" && [cell(2,2,9,9), cell(12,2,10,4), cell(12,7,10,4), cell(2,12,6,4), cell(9,12,13,4)]}
      {tipo === "colagem" && [cell(2,2,7,10), cell(10,2,12,5), cell(10,8,5,4), cell(16,8,6,4)]}
      {tipo === "slider" && [cell(3,5,18,12), <rect key="d1" x="9" y="20" width="2" height="2" rx="1" fill={c}/>, <rect key="d2" x="13" y="20" width="2" height="2" rx="1" fill={c}/>]}
      {tipo === "coluna" && [cell(5,2,14,4), cell(5,7,14,4), cell(5,12,14,4)]}
      {tipo === "ladrilhos" && [cell(2,2,9,9), cell(13,2,9,9), cell(2,13,9,9), cell(13,13,9,9)]}
      {tipo === "miniaturas" && Array.from({length:9},(_,i)=>cell(2+(i%3)*7,2+Math.floor(i/3)*7,5,5))}
      {tipo === "faixa" && [cell(2,8,3,8), cell(6,8,3,8), cell(10,8,3,8), cell(14,8,3,8), cell(18,8,3,8)]}
      {tipo === "alternar" && [cell(2,3,12,8), cell(15,3,7,8), cell(2,13,7,8), cell(10,13,12,8)]}
      {tipo === "misto" && [cell(2,2,12,12), cell(15,2,7,5), cell(15,9,7,5), cell(2,15,20,7)]}
    </svg>
  );
}
const inp = "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
