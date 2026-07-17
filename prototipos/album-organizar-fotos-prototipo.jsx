import React, { useState } from "react";
import {
  Camera, Search, Upload, Check, X, Star, Trash2, FolderInput, Image as ImageIcon,
  CheckSquare, Square, ArrowUpDown, Info, ChevronLeft
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Organização de fotos da galeria (visão ADM)
// Inspirado no fluxo do Wix: grade numerada, selecionar, mover,
// remover, definir capa, editar título/descrição por foto, upload.
// Fotos são placeholders (upload/processamento real = serviço de mídia S3).
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

// placeholders de foto (gradientes simulando imagens)
const GRADIENTES = [
  "linear-gradient(135deg,#a8c0ff,#3f2b96)", "linear-gradient(135deg,#f6d365,#fda085)",
  "linear-gradient(135deg,#84fab0,#8fd3f4)", "linear-gradient(135deg,#fccb90,#d57eeb)",
  "linear-gradient(135deg,#e0c3fc,#8ec5fc)", "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#5ee7df,#b490ca)", "linear-gradient(135deg,#c79081,#dfa579)",
  "linear-gradient(135deg,#fa709a,#fee140)", "linear-gradient(135deg,#30cfd0,#330867)",
  "linear-gradient(135deg,#a1c4fd,#c2e9fb)", "linear-gradient(135deg,#ff9a9e,#fecfef)",
];
const GALERIAS = ["Cerimônia", "Festa", "Cabine"];

const fotosIniciais = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  nome: `DSC_${3140 + i}`,
  titulo: `DSC_${3140 + i}`,
  descricao: "",
  grad: GRADIENTES[i % GRADIENTES.length],
}));

export default function OrganizarFotos() {
  const [fotos, setFotos] = useState(fotosIniciais);
  const [sel, setSel] = useState(new Set());
  const [ativa, setAtiva] = useState(null);   // foto aberta no painel lateral
  const [capaId, setCapaId] = useState(1);
  const [busca, setBusca] = useState("");
  const [movendo, setMovendo] = useState(false);
  const [ordem, setOrdem] = useState("recente");

  const ordenar = (lista) => {
    const l = [...lista];
    if (ordem === "recente") return l.sort((a, b) => b.id - a.id);
    if (ordem === "antiga") return l.sort((a, b) => a.id - b.id);
    if (ordem === "nome_az") return l.sort((a, b) => a.titulo.localeCompare(b.titulo));
    if (ordem === "nome_za") return l.sort((a, b) => b.titulo.localeCompare(a.titulo));
    return l;
  };
  const filtradas = ordenar(fotos.filter((f) => f.titulo.toLowerCase().includes(busca.toLowerCase())));

  // upload real é o serviço de mídia (S3 + 3 versões). Aqui simulamos para ver o fluxo.
  const simularUpload = () => {
    const base = fotos.length ? Math.max(...fotos.map((f) => f.id)) : 0;
    const novas = Array.from({ length: 3 }, (_, i) => ({
      id: base + i + 1, nome: `DSC_${3200 + base + i}`, titulo: `DSC_${3200 + base + i}`,
      descricao: "", grad: GRADIENTES[(base + i) % GRADIENTES.length],
    }));
    setFotos((l) => [...l, ...novas]);
  };

  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selecionarTudo = () => setSel(new Set(filtradas.map((f) => f.id)));
  const desmarcar = () => setSel(new Set());
  const removerSelecionadas = () => { setFotos((l) => l.filter((f) => !sel.has(f.id))); setSel(new Set()); setAtiva(null); };
  const moverPara = (galeria) => { setFotos((l) => l.filter((f) => !sel.has(f.id))); setSel(new Set()); setMovendo(false); };
  const updFoto = (id, patch) => { setFotos((l) => l.map((f) => f.id === id ? { ...f, ...patch } : f)); setAtiva((a) => a && a.id === id ? { ...a, ...patch } : a); };

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
         className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      {/* topo */}
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3">
          <button className="flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
              <Camera className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Organizar fotos · Cerimônia</span>
          </div>
          <button onClick={simularUpload} className="ml-auto flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: ACCENT }}>
            <Upload className="h-4 w-4" /> Upload de mídia
          </button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-5 px-6 py-6">
        {/* coluna principal */}
        <div className="min-w-0 flex-1">
          {/* busca */}
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3">
            <Search className="h-4 w-4 text-stone-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar foto…" className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-stone-300" />
          </div>

          {/* barra de ações */}
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="font-medium text-stone-600">{sel.size} selecionada{sel.size !== 1 ? "s" : ""}</span>
            <button onClick={selecionarTudo} className="flex items-center gap-1.5 text-stone-500 hover:text-orange-600"><CheckSquare className="h-4 w-4" /> Selecionar tudo</button>
            <button onClick={desmarcar} disabled={sel.size === 0} className="flex items-center gap-1.5 text-stone-500 hover:text-orange-600 disabled:opacity-40"><Square className="h-4 w-4" /> Desmarcar</button>
            <button onClick={() => sel.size && setMovendo(true)} disabled={sel.size === 0} className="flex items-center gap-1.5 text-stone-500 hover:text-orange-600 disabled:opacity-40"><FolderInput className="h-4 w-4" /> Mover para</button>
            <button onClick={removerSelecionadas} disabled={sel.size === 0} className="flex items-center gap-1.5 text-stone-500 hover:text-red-600 disabled:opacity-40"><Trash2 className="h-4 w-4" /> Remover</button>
            <span className="ml-auto flex items-center gap-1.5 text-stone-400">
              <ArrowUpDown className="h-3.5 w-3.5" /> Organizar por:
              <select value={ordem} onChange={(e) => setOrdem(e.target.value)}
                className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-600 outline-none focus:border-orange-400">
                <option value="recente">Mais recente</option>
                <option value="antiga">Mais antiga</option>
                <option value="nome_az">Nome (A-Z)</option>
                <option value="nome_za">Nome (Z-A)</option>
              </select>
            </span>
          </div>

          {/* dica de uso */}
          <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-2 text-xs" style={{ color: "#C2410C" }}>
            <Star className="h-3.5 w-3.5" /> Passe o mouse numa foto e clique na estrela para definir a capa. Clique na foto para editar título e descrição.
          </div>

          {/* grade */}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {filtradas.map((f, idx) => {
              const on = sel.has(f.id);
              const isCapa = capaId === f.id;
              const isAtiva = ativa?.id === f.id;
              return (
                <div key={f.id} onClick={() => setAtiva(f)}
                  className={`group relative aspect-square cursor-pointer overflow-hidden rounded-xl ring-2 transition ${isAtiva ? "" : on ? "" : "ring-transparent"}`}
                  style={{ background: f.grad, boxShadow: isAtiva ? `0 0 0 2px ${ACCENT}` : on ? `0 0 0 2px ${ACCENT}99` : "none" }}>
                  {/* número */}
                  <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/40 text-[10px] font-semibold text-white">{idx + 1}</span>
                  {/* checkbox de seleção */}
                  <button onClick={(e) => { e.stopPropagation(); toggle(f.id); }}
                    className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md border-2 transition ${on ? "border-transparent" : "border-white/80 bg-black/20 opacity-0 group-hover:opacity-100"}`}
                    style={on ? { background: ACCENT } : {}}>
                    {on && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                  {/* definir capa direto na foto */}
                  <button onClick={(e) => { e.stopPropagation(); setCapaId(f.id); }} title="Definir como capa"
                    className={`absolute right-1.5 bottom-1.5 flex h-6 w-6 items-center justify-center rounded-full transition ${isCapa ? "" : "bg-black/30 opacity-0 group-hover:opacity-100"}`}
                    style={isCapa ? { background: ACCENT } : {}}>
                    <Star className={`h-3.5 w-3.5 text-white ${isCapa ? "fill-white" : ""}`} />
                  </button>
                  {/* marca de capa */}
                  {isCapa && (
                    <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
                      <Star className="h-3 w-3 fill-white" /> Capa
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-xs text-stone-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Cada foto enviada gera 3 versões (miniatura para esta grade, média para ampliar, original para download). Upload e processamento são feitos pelo serviço de mídia.
          </p>
        </div>

        {/* painel lateral: detalhe da foto ativa */}
        <aside className="hidden w-72 shrink-0 lg:block">
          {ativa ? (
            <div className="sticky top-6 rounded-2xl border border-stone-200 bg-white p-4">
              <div className="aspect-square w-full overflow-hidden rounded-xl" style={{ background: ativa.grad }} />
              <div className="mt-3 text-center text-sm font-medium text-stone-500">{ativa.nome}.jpg</div>

              <button onClick={() => setCapaId(ativa.id)}
                className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${capaId === ativa.id ? "text-white" : "ring-1 ring-stone-300 text-stone-600 hover:bg-stone-50"}`}
                style={capaId === ativa.id ? { background: ACCENT } : {}}>
                <Star className={`h-4 w-4 ${capaId === ativa.id ? "fill-white" : ""}`} /> {capaId === ativa.id ? "É a capa do álbum" : "Definir como capa"}
              </button>

              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-stone-500">Título</label>
                <input value={ativa.titulo} onChange={(e) => updFoto(ativa.id, { titulo: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-stone-500">Descrição</label>
                <textarea value={ativa.descricao} onChange={(e) => updFoto(ativa.id, { descricao: e.target.value })} rows={3}
                  placeholder="Escreva sobre esta foto…"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none placeholder:text-stone-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
              </div>

              <button onClick={() => { setFotos((l) => l.filter((f) => f.id !== ativa.id)); setAtiva(null); }}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-red-500 ring-1 ring-red-200 transition hover:bg-red-50">
                <Trash2 className="h-4 w-4" /> Remover esta foto
              </button>
            </div>
          ) : (
            <div className="sticky top-6 rounded-2xl border-2 border-dashed border-stone-200 p-8 text-center text-sm text-stone-400">
              <ImageIcon className="mx-auto mb-2 h-8 w-8 text-stone-300" />
              Clique numa foto para editar título, descrição ou definir como capa.
            </div>
          )}
        </aside>
      </div>

      {/* modal mover para */}
      {movendo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={() => setMovendo(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Mover {sel.size} foto{sel.size !== 1 ? "s" : ""}</h2>
                <p className="mt-0.5 text-sm text-stone-500">Para qual galeria?</p>
              </div>
              <button onClick={() => setMovendo(false)} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2 px-6 py-5">
              {GALERIAS.filter((g) => g !== "Cerimônia").map((g) => (
                <button key={g} onClick={() => moverPara(g)} className="flex w-full items-center gap-3 rounded-lg border border-stone-200 px-4 py-3 text-left text-sm transition hover:bg-stone-50">
                  <FolderInput className="h-4 w-4 text-stone-400" /> {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
