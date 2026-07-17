import React, { useState } from "react";
import { Camera, Calendar, ArrowLeft, ArrowRight, Instagram, MessageCircle } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Novidades no Site Público (lista + leitura)
// Exibe os posts publicados no admin de Novidades, com o corpo
// formatado (negrito, cor, tamanho, fotos). Fotos são placeholders.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const G = [
  "linear-gradient(135deg,#a8c0ff,#3f2b96)", "linear-gradient(135deg,#f6d365,#fda085)",
  "linear-gradient(135deg,#84fab0,#8fd3f4)", "linear-gradient(135deg,#f093fb,#f5576c)",
];

const POSTS = [
  { id: 1, titulo: "Casamento Ana & Pedro no Villa Garden", capa: G[0], data: "2026-06-25", resumo: "Um dia inesquecível ao ar livre.",
    corpo: `<p>Um dia <b>inesquecível</b> no Villa Garden. A emoção da cerimônia ao ar livre e a festa que varou a noite renderam registros lindos.</p>
    <div style="width:100%;height:220px;border-radius:12px;background:${G[0]};margin:16px 0;"></div>
    <p>Cada detalhe foi pensado com carinho, e poder registrar tudo isso foi um <span style="color:#EA580C"><b>privilégio</b></span>.</p>` },
  { id: 2, titulo: "Dicas para o ensaio gestante perfeito", capa: G[1], data: "2026-06-18", resumo: "Prepare-se para o seu ensaio.",
    corpo: `<p>Preparamos algumas <b>dicas</b> para o seu ensaio gestante ficar ainda mais especial:</p>
    <p>Escolha roupas confortáveis, prefira o fim da tarde pela luz suave, e traga objetos que tenham significado para vocês.</p>
    <div style="width:100%;height:220px;border-radius:12px;background:${G[1]};margin:16px 0;"></div>` },
  { id: 3, titulo: "15 anos da Júlia — uma festa de cinema", capa: G[3], data: "2026-06-10", resumo: "Cores, luzes e muita emoção.",
    corpo: `<p>A festa de 15 anos da Júlia foi um verdadeiro <span style="color:#EA580C"><b>espetáculo</b></span>.</p>
    <div style="width:100%;height:220px;border-radius:12px;background:${G[3]};margin:16px 0;"></div>` },
];

export default function NovidadesPublico() {
  const [post, setPost] = useState(null);

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-950 text-white">
      {/* header simplificado */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-stone-950/85 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><Camera className="h-4 w-4 text-white" /></div>
          <span className="text-sm font-bold tracking-widest">MARCELO BLOISE</span>
        </div>
      </header>

      {post ? <LeituraPost post={post} onVoltar={() => setPost(null)} /> : <ListaPosts onAbrir={setPost} />}

      <footer className="border-t border-white/10 px-5 py-8 text-center">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3">
          <div className="flex gap-4"><MessageCircle className="h-5 w-5 text-white/50" /><Instagram className="h-5 w-5 text-white/50" /></div>
          <p className="text-xs text-white/30">© 2015 - 2026 Marcelo Bloise Fotografia</p>
        </div>
      </footer>
    </div>
  );
}

function ListaPosts({ onAbrir }) {
  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <div className="text-sm font-medium uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Novidades</div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Últimos trabalhos e dicas</h1>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {POSTS.map((p) => (
          <button key={p.id} onClick={() => onAbrir(p)} className="group text-left">
            <div className="h-52 overflow-hidden rounded-2xl" style={{ background: p.capa }} />
            <div className="mt-3 flex items-center gap-1 text-xs text-white/40"><Calendar className="h-3 w-3" /> {p.data.split("-").reverse().join("/")}</div>
            <h2 className="mt-1 text-lg font-bold tracking-tight transition group-hover:text-orange-400">{p.titulo}</h2>
            <p className="mt-1 text-sm text-white/60">{p.resumo}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium" style={{ color: ACCENT }}>Ler mais <ArrowRight className="h-3.5 w-3.5" /></span>
          </button>
        ))}
      </div>
    </main>
  );
}

function LeituraPost({ post, onVoltar }) {
  return (
    <article className="mx-auto max-w-2xl px-5 py-10">
      <button onClick={onVoltar} className="mb-6 flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" /> Novidades</button>
      <div className="h-64 w-full overflow-hidden rounded-2xl" style={{ background: post.capa }} />
      <div className="mt-5 flex items-center gap-1 text-xs text-white/40"><Calendar className="h-3 w-3" /> {post.data.split("-").reverse().join("/")}</div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{post.titulo}</h1>
      <div className="mt-6 text-white/80" style={{ lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: post.corpo }} />
    </article>
  );
}
