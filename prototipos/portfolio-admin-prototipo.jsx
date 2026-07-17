import React, { useState } from "react";
import {
  Camera, Plus, FolderPlus, Trash2, Pencil, Upload, Image as ImageIcon,
  Eye, EyeOff, X, GripVertical, Info, ArrowLeft, Check
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Admin do Portfólio (visão ADM)
// Cadastro de CATEGORIAS (Aniversário, Ensaio, Casamento...) com
// texto e fotos. Diferença do álbum: fotos em QUALIDADE WEB (sem
// alta/download) — é vitrine, não entrega. Sem cliente, sem expiração.
// Fotos são placeholders. Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

const GRADIENTES = [
  "linear-gradient(135deg,#a8c0ff,#3f2b96)", "linear-gradient(135deg,#f6d365,#fda085)",
  "linear-gradient(135deg,#84fab0,#8fd3f4)", "linear-gradient(135deg,#fccb90,#d57eeb)",
  "linear-gradient(135deg,#e0c3fc,#8ec5fc)", "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#5ee7df,#b490ca)", "linear-gradient(135deg,#c79081,#dfa579)",
];

const CATS_SEED = [
  { id: 1, nome: "Casamento", texto: "Momentos únicos do dia mais especial. Registros que eternizam cada emoção.", visivel: true, fotos: 12 },
  { id: 2, nome: "Aniversário", texto: "Festas cheias de alegria, do primeiro aninho aos 15 anos.", visivel: true, fotos: 8 },
  { id: 3, nome: "Ensaios", texto: "Ensaios externos e em estúdio, individuais, casais e família.", visivel: true, fotos: 15 },
  { id: 4, nome: "Gestante / Chá de Bebê", texto: "A espera mais doce registrada com carinho.", visivel: false, fotos: 0 },
];

export default function AdminPortfolio() {
  const [cats, setCats] = useState(CATS_SEED);
  const [editando, setEditando] = useState(null);  // categoria aberta p/ gerenciar fotos
  const [modalCat, setModalCat] = useState(null);   // {novo:true} ou categoria p/ editar dados
  const [apagando, setApagando] = useState(null);

  const cat = cats.find((c) => c.id === editando);
  const upd = (id, patch) => setCats((l) => l.map((c) => c.id === id ? { ...c, ...patch } : c));

  const salvarCat = (dados) => {
    if (dados.id) upd(dados.id, dados);
    else setCats((l) => [...l, { ...dados, id: Date.now(), fotos: 0, visivel: true }]);
    setModalCat(null);
  };

  if (cat) return <GerenciarFotos cat={cat} onVoltar={() => setEditando(null)} onUpd={(p) => upd(cat.id, p)} />;

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><Camera className="h-4 w-4 text-white" /></div>
          <span className="text-sm font-semibold tracking-tight">Portfólio</span>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Categorias do portfólio</h1>
            <p className="mt-1 text-sm text-stone-500">Organize seu trabalho por categoria. Cada uma vira uma seção no site.</p>
          </div>
          <button onClick={() => setModalCat({ novo: true })} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>
            <Plus className="h-4 w-4" /> Nova categoria
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {cats.map((c) => (
            <div key={c.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg" style={{ background: ACCENT + "12" }}>
                  <ImageIcon className="h-6 w-6" style={{ color: ACCENT }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{c.nome}</span>
                    {c.visivel
                      ? <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600"><Eye className="h-3 w-3" /> Visível</span>
                      : <span className="flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500"><EyeOff className="h-3 w-3" /> Oculta</span>}
                    <span className="text-xs text-stone-400">{c.fotos} fotos</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-stone-500">{c.texto}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                <button onClick={() => setEditando(c.id)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
                  <Upload className="h-3.5 w-3.5" /> Gerenciar fotos
                </button>
                <button onClick={() => setModalCat(c)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
                  <Pencil className="h-3.5 w-3.5" /> Editar dados
                </button>
                <button onClick={() => upd(c.id, { visivel: !c.visivel })} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
                  {c.visivel ? <><EyeOff className="h-3.5 w-3.5" /> Ocultar</> : <><Eye className="h-3.5 w-3.5" /> Mostrar</>}
                </button>
                <button onClick={() => setApagando(c)} className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" /> Apagar
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 flex items-start gap-1.5 text-xs text-stone-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> As fotos do portfólio são exibidas em qualidade web (não em alta resolução) — é vitrine, não entrega. Isso economiza espaço e protege seu trabalho.
        </p>
      </main>

      {modalCat && <ModalCategoria cat={modalCat.novo ? null : modalCat} onClose={() => setModalCat(null)} onSalvar={salvarCat} />}
      {apagando && <ModalApagar cat={apagando} onClose={() => setApagando(null)} onConfirmar={() => { setCats((l) => l.filter((c) => c.id !== apagando.id)); setApagando(null); }} />}
    </div>
  );
}

// ── Gerenciar fotos da categoria ─────────────────────────────

function GerenciarFotos({ cat, onVoltar, onUpd }) {
  const [fotos, setFotos] = useState(Array.from({ length: cat.fotos }, (_, i) => ({ id: i + 1, grad: GRADIENTES[i % GRADIENTES.length] })));

  const addFotos = () => {
    const base = fotos.length ? Math.max(...fotos.map((f) => f.id)) : 0;
    const novas = Array.from({ length: 3 }, (_, i) => ({ id: base + i + 1, grad: GRADIENTES[(base + i) % GRADIENTES.length] }));
    const novaLista = [...fotos, ...novas];
    setFotos(novaLista); onUpd({ fotos: novaLista.length });
  };
  const remover = (id) => { const nl = fotos.filter((f) => f.id !== id); setFotos(nl); onUpd({ fotos: nl.length }); };

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-3">
          <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4" /> Categorias</button>
          <span className="text-sm font-semibold tracking-tight">· {cat.nome}</span>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fotos · {cat.nome}</h1>
            <p className="mt-1 text-sm text-stone-500">{fotos.length} fotos nesta categoria.</p>
          </div>
          <button onClick={addFotos} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>
            <Upload className="h-4 w-4" /> Upload de fotos
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {fotos.map((f) => (
            <div key={f.id} className="group relative aspect-square overflow-hidden rounded-xl" style={{ background: f.grad }}>
              <button onClick={() => remover(f.id)} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {fotos.length === 0 && (
            <div className="col-span-full rounded-xl border-2 border-dashed border-stone-200 px-5 py-12 text-center text-sm text-stone-400">
              Nenhuma foto ainda. Clique em "Upload de fotos" para começar.
            </div>
          )}
        </div>

        <p className="mt-4 flex items-start gap-1.5 text-xs text-stone-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Upload real é feito pelo serviço de mídia (gera versão web + miniatura, sem original em alta). Aqui é simulado.
        </p>
      </main>
    </div>
  );
}

// ── Modais ───────────────────────────────────────────────────

function ModalCategoria({ cat, onClose, onSalvar }) {
  const [nome, setNome] = useState(cat?.nome || "");
  const [texto, setTexto] = useState(cat?.texto || "");
  const inp = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
          <h2 className="text-lg font-bold tracking-tight">{cat ? "Editar categoria" : "Nova categoria"}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Nome da categoria</label>
            <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} className={inp} placeholder="Ex.: Casamento, Ensaio, Batizado" /></div>
          <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Texto de apresentação</label>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} className={inp} placeholder="Uma frase que apresenta esta categoria no site…" /></div>
        </div>
        <div className="flex justify-end gap-3 border-t border-stone-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100">Cancelar</button>
          <button onClick={() => nome.trim() && onSalvar({ id: cat?.id, nome: nome.trim(), texto: texto.trim() })} disabled={!nome.trim()}
            className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-40 hover:opacity-90" style={{ background: ACCENT }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

function ModalApagar({ cat, onClose, onConfirmar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="px-6 py-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50"><Trash2 className="h-6 w-6 text-red-500" /></div>
          <h2 className="text-lg font-bold tracking-tight">Apagar "{cat.nome}"?</h2>
          <p className="mt-2 text-sm text-stone-500">{cat.fotos > 0 ? <>Esta categoria tem <strong>{cat.fotos} fotos</strong>. Apagá-la remove a categoria e as fotos do site.</> : "Esta categoria está vazia."} Esta ação não pode ser desfeita.</p>
          <div className="mt-5 flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-lg py-2.5 text-sm font-medium text-stone-500 ring-1 ring-stone-300 hover:bg-stone-50">Cancelar</button>
            <button onClick={onConfirmar} className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: "#DC2626" }}>Apagar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
