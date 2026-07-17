import React, { useState, useRef } from "react";
import {
  Camera, Plus, Pencil, Trash2, Eye, EyeOff, ArrowLeft, Bold, Italic, Underline,
  Image as ImageIcon, Type, Palette, X, Check, Calendar, Send, FileText
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Admin de Novidades (posts com editor de texto rico)
// Editor: negrito, itálico, sublinhado, cor, tamanho, inserir fotos.
// Post = título + capa + corpo formatado + data + status.
// NOTA: editor rico de PRODUÇÃO usa biblioteca dedicada; aqui é uma
// demonstração funcional via contentEditable. Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const G = [
  "linear-gradient(135deg,#a8c0ff,#3f2b96)", "linear-gradient(135deg,#f6d365,#fda085)",
  "linear-gradient(135deg,#84fab0,#8fd3f4)", "linear-gradient(135deg,#f093fb,#f5576c)",
];

const POSTS_SEED = [
  { id: 1, titulo: "Casamento Ana & Pedro no Villa Garden", capa: G[0], data: "2026-06-25", status: "publicado",
    corpo: "<p>Um dia <b>inesquecível</b> no Villa Garden. A emoção da cerimônia ao ar livre e a festa que varou a noite renderam registros lindos.</p>" },
  { id: 2, titulo: "Dicas para o ensaio gestante perfeito", capa: G[1], data: "2026-06-18", status: "publicado",
    corpo: "<p>Preparamos algumas <b>dicas</b> para o seu ensaio ficar ainda mais especial.</p>" },
  { id: 3, titulo: "Novidades no estúdio", capa: G[2], data: "2026-06-30", status: "nao_publicado",
    corpo: "<p>Em breve novidades por aqui...</p>" },
];

export default function AdminNovidades() {
  const [posts, setPosts] = useState(POSTS_SEED);
  const [editando, setEditando] = useState(null); // post ou {novo:true}
  const [apagando, setApagando] = useState(null);

  const salvar = (post) => {
    if (post.id) setPosts((l) => l.map((p) => p.id === post.id ? post : p));
    else setPosts((l) => [{ ...post, id: Date.now() }, ...l]);
    setEditando(null);
  };

  if (editando) return <EditorPost post={editando.novo ? null : editando} onVoltar={() => setEditando(null)} onSalvar={salvar} onApagar={(p) => { setEditando(null); setApagando(p); }} />;

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><Camera className="h-4 w-4 text-white" /></div>
          <span className="text-sm font-semibold tracking-tight">Novidades</span>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novidades</h1>
            <p className="mt-1 text-sm text-stone-500">Publique trabalhos recentes, dicas e avisos no seu site.</p>
          </div>
          <button onClick={() => setEditando({ novo: true })} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>
            <Plus className="h-4 w-4" /> Novo post
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4">
              <div className="hidden h-16 w-24 shrink-0 rounded-lg sm:block" style={{ background: p.capa }} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{p.titulo}</span>
                  {p.status === "publicado"
                    ? <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600"><Eye className="h-3 w-3" /> Publicado</span>
                    : <span className="flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500"><EyeOff className="h-3 w-3" /> Não publicado</span>}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-stone-400"><Calendar className="h-3 w-3" /> {p.data.split("-").reverse().join("/")}</div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => setEditando(p)} className="rounded-lg p-2 text-stone-500 ring-1 ring-stone-300 hover:bg-stone-50"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => setApagando(p)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {apagando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={() => setApagando(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50"><Trash2 className="h-6 w-6 text-red-500" /></div>
            <h2 className="text-lg font-bold tracking-tight">Apagar post?</h2>
            <p className="mt-2 text-sm text-stone-500">"{apagando.titulo}" será removido. Esta ação não pode ser desfeita.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setApagando(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium text-stone-500 ring-1 ring-stone-300 hover:bg-stone-50">Cancelar</button>
              <button onClick={() => { setPosts((l) => l.filter((p) => p.id !== apagando.id)); setApagando(null); }} className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm" style={{ background: "#DC2626" }}>Apagar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Color picker visual (matiz + saturação/brilho) ───────────

function hsvToHex(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (n) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function ColorPicker({ onEscolher }) {
  const [h, setH] = useState(20);   // matiz 0-360
  const [s, setS] = useState(0.8);  // saturação 0-1
  const [v, setV] = useState(0.9);  // brilho 0-1
  const cor = hsvToHex(h, s, v);
  const areaRef = useRef(null);

  const pegarSV = (e) => {
    const r = areaRef.current.getBoundingClientRect();
    const x = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width;
    const y = ((e.touches ? e.touches[0].clientY : e.clientY) - r.top) / r.height;
    setS(Math.min(1, Math.max(0, x)));
    setV(Math.min(1, Math.max(0, 1 - y)));
  };

  return (
    <div>
      <span className="mb-2 block text-xs font-medium text-stone-500">Cor personalizada</span>
      {/* área saturação x brilho */}
      <div ref={areaRef} onMouseDown={(e) => { e.preventDefault(); pegarSV(e); }} onTouchStart={pegarSV} onTouchMove={pegarSV}
        className="relative h-28 w-full cursor-crosshair rounded-lg"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex(h, 1, 1)})` }}>
        <span className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: cor }} />
      </div>
      {/* barra de matiz */}
      <input type="range" min="0" max="360" value={h} onChange={(e) => setH(Number(e.target.value))}
        className="mt-2 h-3 w-full cursor-pointer appearance-none rounded-full"
        style={{ background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }} />
      {/* preview + hex + aplicar */}
      <div className="mt-2 flex items-center gap-2">
        <span className="h-7 w-7 shrink-0 rounded-md ring-1 ring-stone-200" style={{ background: cor }} />
        <span className="flex-1 text-xs font-mono text-stone-500">{cor.toUpperCase()}</span>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => onEscolher(cor)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>Aplicar</button>
      </div>
    </div>
  );
}

// ── Editor de post (texto rico) ──────────────────────────────

function EditorPost({ post, onVoltar, onSalvar, onApagar }) {
  const [titulo, setTitulo] = useState(post?.titulo || "");
  const [status, setStatus] = useState(post?.status || "nao_publicado");
  const [capa, setCapa] = useState(post?.capa || null);
  const [paletaAberta, setPaletaAberta] = useState(false);
  const editorRef = useRef(null);
  const selecaoRef = useRef(null);

  // guarda a seleção atual (antes de clicar num botão que rouba o foco)
  const guardarSelecao = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) selecaoRef.current = sel.getRangeAt(0).cloneRange();
  };
  const restaurarSelecao = () => {
    const sel = window.getSelection();
    if (selecaoRef.current && sel) { sel.removeAllRanges(); sel.addRange(selecaoRef.current); }
  };
  const aplicar = (comando, valor) => {
    editorRef.current?.focus();
    restaurarSelecao();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(comando, false, valor);
    guardarSelecao();
  };

  const PALETA = [
    "#000000", "#57534e", "#78716c", "#a8a29e", "#EA580C", "#DC2626", "#EA1E63",
    "#9333EA", "#2563EB", "#0891B2", "#059669", "#65A30D", "#CA8A04", "#FFFFFF",
  ];
  const TAMANHOS = [["2", "Pequeno"], ["3", "Normal"], ["5", "Grande"], ["7", "Título"]];

  const inserirFoto = () => {
    editorRef.current?.focus(); restaurarSelecao();
    const grad = G[Math.floor(Math.random() * G.length)];
    document.execCommand("insertHTML", false, `<div style="width:100%;height:180px;border-radius:12px;background:${grad};margin:12px 0;"></div><p><br></p>`);
    guardarSelecao();
  };

  const salvar = () => {
    const corpo = editorRef.current?.innerHTML || "";
    onSalvar({ id: post?.id, titulo: titulo.trim() || "Sem título", capa: capa || G[0], corpo, status, data: post?.data || "2026-07-01" });
  };

  const btn = "flex h-9 w-9 items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 active:bg-stone-200";

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="sticky top-0 z-20 border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-3">
          <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4" /> Novidades</button>
          <div className="ml-auto flex items-center gap-2">
            {post && <button onClick={() => onApagar(post)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Apagar</button>}
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="nao_publicado">Não publicado</option>
              <option value="publicado">Publicado</option>
            </select>
            <button onClick={salvar} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>
              {status === "publicado" ? <><Send className="h-4 w-4" /> Publicar</> : <><Check className="h-4 w-4" /> Salvar</>}
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <button onClick={() => setCapa(G[Math.floor(Math.random() * G.length)])} className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-stone-300 text-stone-400 transition hover:border-orange-300" style={capa ? { background: capa, border: "none" } : {}}>
          {!capa && <span className="flex flex-col items-center gap-1 text-sm"><ImageIcon className="h-6 w-6" /> Adicionar foto de capa</span>}
          {capa && <span className="rounded-lg bg-black/40 px-3 py-1.5 text-xs font-medium text-white">Trocar capa</span>}
        </button>

        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do post"
          className="mt-6 w-full border-none bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-stone-300" />

        {/* barra de formatação */}
        <div className="sticky top-16 z-10 mt-4 flex flex-wrap items-center gap-1 rounded-xl border border-stone-200 bg-white p-1.5 shadow-sm">
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => aplicar("bold")} className={btn} title="Negrito"><Bold className="h-4 w-4" /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => aplicar("italic")} className={btn} title="Itálico"><Italic className="h-4 w-4" /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => aplicar("underline")} className={btn} title="Sublinhado"><Underline className="h-4 w-4" /></button>
          <div className="mx-1 h-5 w-px bg-stone-200" />
          <select onMouseDown={guardarSelecao} onChange={(e) => aplicar("fontSize", e.target.value)} defaultValue="3" className="h-9 rounded-md border-none bg-transparent px-2 text-sm text-stone-600 outline-none hover:bg-stone-100" title="Tamanho">
            {TAMANHOS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
          <div className="mx-1 h-5 w-px bg-stone-200" />
          <div className="relative">
            <button onMouseDown={(e) => { e.preventDefault(); guardarSelecao(); }} onClick={() => setPaletaAberta(!paletaAberta)} className="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-stone-600 hover:bg-stone-100" title="Cor do texto">
              <Palette className="h-4 w-4" /> Cor
            </button>
            {paletaAberta && (
              <div className="absolute left-0 top-11 z-20 w-64 rounded-xl border border-stone-200 bg-white p-3 shadow-xl">
                <div className="grid grid-cols-7 gap-1.5">
                  {PALETA.map((c) => (
                    <button key={c} onMouseDown={(e) => e.preventDefault()} onClick={() => { aplicar("foreColor", c); setPaletaAberta(false); }}
                      className="h-6 w-6 rounded-md ring-1 ring-stone-200 transition hover:scale-110" style={{ background: c }} title={c} />
                  ))}
                </div>
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <ColorPicker onEscolher={(c) => { aplicar("foreColor", c); }} />
                </div>
              </div>
            )}
          </div>
          <div className="mx-1 h-5 w-px bg-stone-200" />
          <button onMouseDown={(e) => e.preventDefault()} onClick={inserirFoto} className="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-stone-600 hover:bg-stone-100" title="Inserir foto">
            <ImageIcon className="h-4 w-4" /> Foto
          </button>
        </div>

        <div ref={editorRef} contentEditable suppressContentEditableWarning onKeyUp={guardarSelecao} onMouseUp={guardarSelecao}
          dangerouslySetInnerHTML={{ __html: post?.corpo || "<p>Escreva sua novidade aqui...</p>" }}
          className="mt-4 min-h-[300px] w-full rounded-xl border border-stone-200 bg-white p-5 text-stone-700 outline-none focus:border-orange-300"
          style={{ lineHeight: 1.7 }} />

        <p className="mt-3 flex items-start gap-1.5 text-xs text-stone-400">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Selecione o texto e clique na formatação (negrito, cor, tamanho). Em telas de toque, mantenha o texto selecionado ao tocar no botão. Upload real é feito pelo serviço de mídia.
        </p>
      </main>
    </div>
  );
}
