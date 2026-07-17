import React, { useState, useMemo } from "react";
import {
  Plus, Pencil, Trash2, Copy, Eye, EyeOff, X, Package,
  CheckCircle2, Circle, Camera, Box, Sparkles, ArrowRight, Info, Tag,
  FileText, ChevronLeft, Printer
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Módulo Catálogo (MVP-1) · fiel à spec v2
// Telas: A) Lista de Itens  B) Modal de cadastro  C) Pacotes (receita)
// Dados em memória (useState). Nada persistido — é protótipo visual.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C"; // laranja da marca (do protótipo do usuário)

const TIPOS = ["Serviço Principal", "Produto", "Adicional"];

const tipoStyle = {
  "Serviço Principal": { bg: "#FEF3EC", fg: "#C2410C", dot: "#EA580C" },
  Produto: { bg: "#EEF2FF", fg: "#4338CA", dot: "#6366F1" },
  Adicional: { bg: "#ECFDF5", fg: "#047857", dot: "#10B981" },
};

const brl = (n) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CATEGORIAS_SEED = [
  { id: 1, nome: "Eventos", ativo: true },
  { id: 2, nome: "Álbuns", ativo: true },
  { id: 3, nome: "Vídeo", ativo: true },
  { id: 4, nome: "Diversão", ativo: true },
  { id: 5, nome: "Pós-produção", ativo: true },
];

const ITENS_SEED = [
  { id: 1, nome: "Casamento", tipo: "Serviço Principal", categoriaId: 1, valorBase: 5000, descricao: "Cobertura completa de cerimônia e festa.", ativo: true, exibirCliente: true, duracaoBase: 8, valorHora: 400 },
  { id: 2, nome: "Aniversário", tipo: "Serviço Principal", categoriaId: 1, valorBase: 400, descricao: "Cobertura de festa de aniversário.", ativo: true, exibirCliente: true, duracaoBase: 4, valorHora: 100 },
  { id: 3, nome: "Batizado", tipo: "Serviço Principal", categoriaId: 1, valorBase: 800, descricao: "Cobertura de cerimônia religiosa.", ativo: true, exibirCliente: true, duracaoBase: 3, valorHora: 150 },
  { id: 4, nome: "Álbum Premium", tipo: "Produto", categoriaId: 2, valorBase: 900, descricao: "Capa em couro, 40 páginas, papel fine art.", ativo: true, exibirCliente: true, duracaoBase: null, valorHora: null },
  { id: 5, nome: "Álbum Simples", tipo: "Produto", categoriaId: 2, valorBase: 400, descricao: "Capa rígida, 20 páginas.", ativo: true, exibirCliente: true, duracaoBase: null, valorHora: null },
  { id: 6, nome: "Filmagem com Drone", tipo: "Adicional", categoriaId: 3, valorBase: 600, descricao: "Tomadas aéreas em 4K.", ativo: true, exibirCliente: true, duracaoBase: null, valorHora: null },
  { id: 7, nome: "Cabine Fotográfica", tipo: "Adicional", categoriaId: 4, valorBase: 500, descricao: "Cabine com props e impressão na hora.", ativo: false, exibirCliente: true, duracaoBase: null, valorHora: null },
  { id: 8, nome: "Edição Extra de Fotos", tipo: "Adicional", categoriaId: 5, valorBase: 500, descricao: "Tratamento avançado, uso interno.", ativo: true, exibirCliente: false, duracaoBase: null, valorHora: null },
];

const PACOTES_SEED = [
  { id: 1, nome: "Casamento Completo", descricao: "Tudo que um grande dia pede.", itemIds: [1, 4, 6], descontoTipo: "percentual", descontoValor: 15, ativo: true, exibirCliente: true },
  { id: 2, nome: "Aniversário Essencial", descricao: "O básico bem feito.", itemIds: [2, 5], descontoTipo: "fixo", descontoValor: 100, ativo: true, exibirCliente: true },
];

// ─────────────────────────────────────────────────────────────

export default function CatalogoPrototipo() {
  const [aba, setAba] = useState("itens");
  const [itens, setItens] = useState(ITENS_SEED);
  const [pacotes, setPacotes] = useState(PACOTES_SEED);
  const [categorias, setCategorias] = useState(CATEGORIAS_SEED);
  const [modalItem, setModalItem] = useState(null); // item em edição ou objeto novo
  const [modalPacote, setModalPacote] = useState(null);
  const [filtro, setFiltro] = useState("Todos");

  const itensFiltrados = useMemo(
    () => (filtro === "Todos" ? itens : itens.filter((i) => i.tipo === filtro)),
    [itens, filtro]
  );

  const salvarItem = (item) => {
    setItens((prev) =>
      item.id ? prev.map((i) => (i.id === item.id ? item : i)) : [...prev, { ...item, id: Date.now() }]
    );
    setModalItem(null);
  };

  const salvarPacote = (p) => {
    setPacotes((prev) =>
      p.id ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, { ...p, id: Date.now() }]
    );
    setModalPacote(null);
  };

  const addCategoria = (nome) => {
    if (!nome.trim()) return;
    setCategorias((prev) => [...prev, { id: Date.now(), nome: nome.trim(), ativo: true }]);
  };

  const toggleCategoriaAtivo = (id) =>
    setCategorias((prev) => prev.map((c) => (c.id === id ? { ...c, ativo: !c.ativo } : c)));

  const togglePacoteAtivo = (p) =>
    setPacotes((prev) => prev.map((x) => (x.id === p.id ? { ...x, ativo: !x.ativo } : x)));

  const [mostrarLista, setMostrarLista] = useState(false);

  if (mostrarLista) {
    return (
      <TelaListaPrecos
        itens={itens}
        pacotes={pacotes}
        categorias={categorias}
        onVoltar={() => setMostrarLista(false)}
      />
    );
  }

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
         className="min-h-screen bg-stone-50 text-stone-900">
      {/* Top bar */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
            <Camera className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Painel do Estúdio</div>
            <div className="text-xs text-stone-400">Catálogo</div>
          </div>
          <span className="ml-auto rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-500">
            ADM
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Cabeçalho da seção */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Catálogo</h1>
            <p className="mt-1 text-sm text-stone-500">
              Os blocos de preço que o sistema usa para sugerir o valor de um orçamento.
            </p>
          </div>
          <button onClick={() => setMostrarLista(true)}
            className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 shadow-sm transition hover:bg-stone-50">
            <FileText className="h-4 w-4" /> Gerar lista de preços
          </button>
        </div>

        {/* Abas Itens / Pacotes */}
        <div className="mb-6 flex gap-1 rounded-xl border border-stone-200 bg-white p-1 w-fit">
          <TabBtn active={aba === "itens"} onClick={() => setAba("itens")} icon={<Box className="h-4 w-4" />}>
            Itens
          </TabBtn>
          <TabBtn active={aba === "pacotes"} onClick={() => setAba("pacotes")} icon={<Package className="h-4 w-4" />}>
            Pacotes
          </TabBtn>
          <TabBtn active={aba === "categorias"} onClick={() => setAba("categorias")} icon={<Tag className="h-4 w-4" />}>
            Categorias
          </TabBtn>
        </div>

        {aba === "itens" ? (
          <TelaItens
            itens={itensFiltrados}
            categorias={categorias}
            filtro={filtro}
            setFiltro={setFiltro}
            onNovo={() =>
              setModalItem({ nome: "", tipo: "Serviço Principal", categoriaId: "", valorBase: "", descricao: "", ativo: true, exibirCliente: true, duracaoBase: "", valorHora: "" })
            }
            onEditar={(i) => setModalItem({ ...i })}
            onToggleAtivo={(i) =>
              setItens((prev) => prev.map((x) => (x.id === i.id ? { ...x, ativo: !x.ativo } : x)))
            }
          />
        ) : aba === "pacotes" ? (
          <TelaPacotes
            pacotes={pacotes}
            itens={itens}
            onNovo={() =>
              setModalPacote({ nome: "", descricao: "", itemIds: [], descontoTipo: "percentual", descontoValor: "", ativo: true, exibirCliente: true })
            }
            onEditar={(p) => setModalPacote({ ...p })}
            onToggleAtivo={togglePacoteAtivo}
          />
        ) : (
          <TelaCategorias
            categorias={categorias}
            itens={itens}
            onAdicionar={addCategoria}
            onToggleAtivo={toggleCategoriaAtivo}
          />
        )}
      </main>

      {modalItem && (
        <ModalItem item={modalItem} categorias={categorias} onClose={() => setModalItem(null)} onSalvar={salvarItem} />
      )}
      {modalPacote && (
        <ModalPacote pacote={modalPacote} itens={itens} onClose={() => setModalPacote(null)} onSalvar={salvarPacote} />
      )}
    </div>
  );
}

// ── D) Categorias (parametrizável) ───────────────────────────

function TelaCategorias({ categorias, itens, onAdicionar, onToggleAtivo }) {
  const [novo, setNovo] = useState("");
  const contagem = (id) => itens.filter((i) => i.categoriaId === id).length;

  const submeter = () => {
    onAdicionar(novo);
    setNovo("");
  };

  return (
    <section className="max-w-xl">
      <p className="mb-4 text-sm text-stone-500">
        Categorias agrupam itens na listagem e nos filtros. São só organizacionais — não afetam preço ou cálculo.
      </p>

      <div className="mb-4 flex gap-2">
        <input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submeter()}
          placeholder="Nome da nova categoria…"
          className={inputCls}
        />
        <button onClick={submeter}
          className="flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          style={{ background: ACCENT }}>
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        {categorias.map((c, idx) => (
          <div key={c.id}
            className={`flex items-center justify-between px-5 py-3.5 ${idx !== categorias.length - 1 ? "border-b border-stone-100" : ""}`}>
            <div className="flex items-center gap-2.5">
              <Tag className="h-4 w-4 text-stone-300" />
              <span className="font-medium">{c.nome}</span>
              <span className="text-xs text-stone-400">
                {contagem(c.id)} {contagem(c.id) === 1 ? "item" : "itens"}
              </span>
            </div>
            <button
              onClick={() => onToggleAtivo(c.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                c.ativo ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-stone-100 text-stone-400 hover:bg-stone-200"
              }`}
            >
              {c.ativo ? "Ativa" : "Inativa"}
            </button>
          </div>
        ))}
        {categorias.length === 0 && (
          <div className="px-5 py-10 text-center text-stone-400">Nenhuma categoria ainda.</div>
        )}
      </div>
    </section>
  );
}

// ── E) Lista de Preços (documento para o cliente) ────────────
// Inclui itens ativos com "exibir ao cliente" = sim, e pacotes ativos
// com "exibir na lista de preços" = sim.

function TelaListaPrecos({ itens, pacotes, categorias, onVoltar }) {
  const itensVisiveis = itens.filter((i) => i.ativo && i.exibirCliente);
  const pacotesVisiveis = pacotes.filter((p) => p.ativo && p.exibirCliente);

  const grupos = categorias
    .map((c) => ({ categoria: c, itens: itensVisiveis.filter((i) => i.categoriaId === c.id) }))
    .filter((g) => g.itens.length > 0);
  const semCategoria = itensVisiveis.filter((i) => !categorias.some((c) => c.id === i.categoriaId));
  if (semCategoria.length > 0) grupos.push({ categoria: { id: "outros", nome: "Outros" }, itens: semCategoria });

  return (
    <div className="min-h-screen bg-stone-100">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-page { box-shadow: none !important; margin: 0 !important; max-width: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800">
          <ChevronLeft className="h-4 w-4" /> Voltar ao catálogo
        </button>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          style={{ background: ACCENT }}>
          <Printer className="h-4 w-4" /> Exportar PDF
        </button>
      </div>

      <div className="print-page mx-auto max-w-3xl rounded-2xl bg-white p-10 shadow-sm">
        <div className="mb-8 flex items-center gap-3 border-b border-stone-100 pb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
            <Camera className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight">Tabela de Preços</div>
            <div className="text-xs text-stone-400">Válida a partir de {new Date().toLocaleDateString("pt-BR")}</div>
          </div>
        </div>

        {grupos.map((g) => (
          <div key={g.categoria.id} className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>
              {g.categoria.nome}
            </h2>
            <div className="space-y-4">
              {g.itens.map((i) => (
                <div key={i.id} className="flex items-start justify-between gap-4 border-b border-stone-50 pb-3">
                  <div>
                    <div className="font-medium text-stone-800">{i.nome}</div>
                    {i.descricao && <div className="mt-0.5 text-sm text-stone-500">{i.descricao}</div>}
                    {i.tipo === "Serviço Principal" && (
                      <div className="mt-0.5 text-xs text-stone-400">
                        {i.duracaoBase}h inclusas · hora adicional {brl(i.valorHora)}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 font-semibold tabular-nums text-stone-800">{brl(i.valorBase)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {pacotesVisiveis.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>
              Pacotes
            </h2>
            <div className="space-y-5">
              {pacotesVisiveis.map((p) => {
                const calc = calcularPacote(p, itens);
                return (
                  <div key={p.id} className="rounded-xl border border-stone-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-stone-800">{p.nome}</div>
                        {p.descricao && <div className="mt-0.5 text-sm text-stone-500">{p.descricao}</div>}
                        <div className="mt-2 text-sm text-stone-500">
                          Inclui: {calc.linhas.map((l) => l.nome).join(" · ")}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs text-stone-400 line-through">{brl(calc.subtotal)}</div>
                        <div className="text-lg font-bold tabular-nums" style={{ color: ACCENT }}>{brl(calc.total)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {grupos.length === 0 && pacotesVisiveis.length === 0 && (
          <p className="py-12 text-center text-stone-400">
            Nenhum item ou pacote está marcado como visível ao cliente ainda.
          </p>
        )}

        <p className="mt-10 border-t border-stone-100 pt-4 text-xs text-stone-400">
          Valores sujeitos a horas extras e condições do orçamento final. Pacotes mostram o valor a partir do
          cálculo com desconto.
        </p>
      </div>
    </div>
  );
}

// ── Componentes auxiliares ───────────────────────────────────

function TabBtn({ active, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
        active ? "text-white shadow-sm" : "text-stone-500 hover:text-stone-800"
      }`}
      style={active ? { background: ACCENT } : {}}
    >
      {icon}
      {children}
    </button>
  );
}

function Pill({ tipo }) {
  const s = tipoStyle[tipo];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ background: s.bg, color: s.fg }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {tipo}
    </span>
  );
}

// ── A) Lista de Itens ────────────────────────────────────────

function TelaItens({ itens, categorias, filtro, setFiltro, onNovo, onEditar, onToggleAtivo }) {
  const nomeCategoria = (id) => categorias.find((c) => c.id === id)?.nome;
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {["Todos", ...TIPOS].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                filtro === f ? "text-white" : "bg-white text-stone-500 ring-1 ring-stone-200 hover:text-stone-800"
              }`}
              style={filtro === f ? { background: ACCENT } : {}}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={onNovo}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          style={{ background: ACCENT }}
        >
          <Plus className="h-4 w-4" /> Novo item
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Categoria</th>
              <th className="px-5 py-3 text-right">Valor base</th>
              <th className="px-5 py-3 text-center">Visível ao cliente</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="sticky right-0 bg-white px-5 py-3 text-right shadow-[-8px_0_8px_-6px_rgba(0,0,0,0.07)]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.id}
                  onClick={() => onEditar(i)}
                  className="cursor-pointer border-b border-stone-100 last:border-0 hover:bg-orange-50/40">
                <td className="px-5 py-4">
                  <div className="font-medium">{i.nome}</div>
                  {i.tipo === "Serviço Principal" && (
                    <div className="mt-0.5 text-xs text-stone-400">
                      {i.duracaoBase}h inclusas · +{brl(i.valorHora)}/h extra
                    </div>
                  )}
                </td>
                <td className="px-5 py-4"><Pill tipo={i.tipo} /></td>
                <td className="px-5 py-4 text-stone-500">
                  {nomeCategoria(i.categoriaId) || <span className="italic text-stone-300">Sem categoria</span>}
                </td>
                <td className="px-5 py-4 text-right font-medium tabular-nums">{brl(i.valorBase)}</td>
                <td className="px-5 py-4 text-center">
                  {i.exibirCliente
                    ? <Eye className="mx-auto h-4 w-4 text-emerald-500" />
                    : <EyeOff className="mx-auto h-4 w-4 text-stone-300" />}
                </td>
                <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onToggleAtivo(i)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      i.ativo ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                    }`}
                  >
                    {i.ativo ? "Ativo" : "Inativo"}
                  </button>
                </td>
                <td className="sticky right-0 bg-white px-5 py-4 shadow-[-8px_0_8px_-6px_rgba(0,0,0,0.07)]" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <button title="Editar" onClick={() => onEditar(i)}
                      className="rounded-md p-2 transition"
                      style={{ background: "#FEF3EC", color: "#C2410C" }}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <IconBtn title="Duplicar"><Copy className="h-4 w-4" /></IconBtn>
                    <IconBtn title="Excluir"><Trash2 className="h-4 w-4" /></IconBtn>
                  </div>
                </td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-stone-400">
                Nenhum item neste filtro. Crie um com “Novo item”.
              </td></tr>
            )}
          </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function IconBtn({ children, title, onClick }) {
  return (
    <button title={title} onClick={onClick}
      className="rounded-md p-2 transition hover:bg-stone-100 hover:text-stone-700">
      {children}
    </button>
  );
}

// ── B) Modal de cadastro/edição de Item ──────────────────────

function ModalItem({ item, categorias, onClose, onSalvar }) {
  const [f, setF] = useState(item);
  const isServico = f.tipo === "Serviço Principal";
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const categoriasAtivas = categorias.filter((c) => c.ativo);

  return (
    <Overlay onClose={onClose}>
      <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{item.id ? "Editar item" : "Novo item"}</h2>
          <p className="mt-0.5 text-sm text-stone-500">Os campos mudam conforme o tipo escolhido.</p>
        </div>
        <button onClick={onClose} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <Field label="Nome do item" required>
          <input value={f.nome} onChange={(e) => set("nome", e.target.value)}
            placeholder="Ex.: Casamento, Álbum Premium…" className={inputCls} autoFocus />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo" required>
            <select value={f.tipo} onChange={(e) => set("tipo", e.target.value)} className={inputCls}>
              {TIPOS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Categoria">
            <select value={f.categoriaId ?? ""} onChange={(e) => set("categoriaId", e.target.value ? Number(e.target.value) : "")} className={inputCls}>
              <option value="">Sem categoria</option>
              {categoriasAtivas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Valor base (R$)" required>
          <input type="number" value={f.valorBase} onChange={(e) => set("valorBase", e.target.value)}
            placeholder="0,00" className={inputCls} />
        </Field>

        <Field label="Descrição">
          <textarea value={f.descricao} onChange={(e) => set("descricao", e.target.value)} rows={2}
            placeholder="Como esse item aparece para o cliente." className={inputCls} />
        </Field>

        {/* Campos condicionais — só Serviço Principal */}
        {isServico && (
          <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#C2410C" }}>
              <Sparkles className="h-3.5 w-3.5" /> Detalhes do serviço principal
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Horas inclusas no valor base">
                <input type="number" value={f.duracaoBase ?? ""} onChange={(e) => set("duracaoBase", e.target.value)}
                  placeholder="Ex.: 4" className={inputCls} />
              </Field>
              <Field label="Valor da hora adicional (R$)">
                <input type="number" value={f.valorHora ?? ""} onChange={(e) => set("valorHora", e.target.value)}
                  placeholder="Ex.: 100" className={inputCls} />
              </Field>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-stone-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Acima das horas inclusas, cada hora extra é somada ao orçamento por este valor.
            </p>
          </div>
        )}

        <div className="space-y-3 border-t border-stone-100 pt-4">
          <Toggle checked={f.ativo} onChange={(v) => set("ativo", v)}
            label="Item ativo" hint="Aparece como opção em novos orçamentos." />
          <Toggle checked={f.exibirCliente} onChange={(v) => set("exibirCliente", v)}
            label="Exibir no orçamento do cliente" hint="Se desligado, existe só para cálculo/uso interno." />
        </div>
      </div>

      <div className="flex shrink-0 justify-end gap-3 border-t border-stone-100 px-6 py-4">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100">
          Cancelar
        </button>
        <button onClick={() => onSalvar(f)}
          className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          style={{ background: ACCENT }}>
          {item.id ? "Salvar alterações" : "Criar item"}
        </button>
      </div>
    </Overlay>
  );
}

// ── C) Pacotes (receita que se desmonta) ─────────────────────

function TelaPacotes({ pacotes, itens, onNovo, onEditar, onToggleAtivo }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-stone-500">
          Um pacote é um <strong className="text-stone-700">atalho</strong>: junta itens e aplica um desconto.
          No orçamento ele se desmonta nos itens — cada um calculado normalmente.
        </p>
        <button onClick={onNovo}
          className="flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          style={{ background: ACCENT }}>
          <Plus className="h-4 w-4" /> Novo pacote
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">
                <th className="px-5 py-3">Pacote</th>
                <th className="px-5 py-3">Itens inclusos</th>
                <th className="px-5 py-3">Desconto</th>
                <th className="px-5 py-3 text-right">A partir de</th>
                <th className="px-5 py-3 text-center">Visível ao cliente</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="sticky right-0 bg-white px-5 py-3 text-right shadow-[-8px_0_8px_-6px_rgba(0,0,0,0.07)]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pacotes.map((p) => {
                const calc = calcularPacote(p, itens);
                return (
                  <tr key={p.id}
                      onClick={() => onEditar(p)}
                      className="cursor-pointer border-b border-stone-100 last:border-0 hover:bg-orange-50/40">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 font-medium">
                        <Package className="h-3.5 w-3.5" style={{ color: ACCENT }} />
                        {p.nome}
                      </div>
                      <div className="mt-0.5 text-xs text-stone-400">{p.descricao}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {calc.linhas.map((l) => (
                          <span key={l.id} className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: tipoStyle[l.tipo].dot }} />
                            {l.nome}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-stone-500">
                      {p.descontoTipo === "percentual" ? `${p.descontoValor}%` : brl(Number(p.descontoValor || 0))}
                    </td>
                    <td className="px-5 py-4 text-right font-medium tabular-nums">{brl(calc.total)}</td>
                    <td className="px-5 py-4 text-center">
                      {p.exibirCliente
                        ? <Eye className="mx-auto h-4 w-4 text-emerald-500" />
                        : <EyeOff className="mx-auto h-4 w-4 text-stone-300" />}
                    </td>
                    <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleAtivo(p)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          p.ativo ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                        }`}
                      >
                        {p.ativo ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="sticky right-0 bg-white px-5 py-4 shadow-[-8px_0_8px_-6px_rgba(0,0,0,0.07)]" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button title="Editar" onClick={() => onEditar(p)}
                          className="rounded-md p-2 transition"
                          style={{ background: "#FEF3EC", color: "#C2410C" }}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <IconBtn title="Duplicar"><Copy className="h-4 w-4" /></IconBtn>
                        <IconBtn title="Excluir"><Trash2 className="h-4 w-4" /></IconBtn>
                      </div>
                  </td>
                </tr>
              );
            })}
            {pacotes.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-stone-400">
                Nenhum pacote ainda. Crie um com “Novo pacote”.
              </td></tr>
            )}
          </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function calcularPacote(p, itens) {
  const linhas = p.itemIds
    .map((id) => itens.find((i) => i.id === id))
    .filter(Boolean)
    .map((i) => ({ id: i.id, nome: i.nome, tipo: i.tipo, valor: Number(i.valorBase) }));
  const subtotal = linhas.reduce((s, l) => s + l.valor, 0);
  const desconto = p.descontoTipo === "percentual"
    ? subtotal * (Number(p.descontoValor || 0) / 100)
    : Number(p.descontoValor || 0);
  return { linhas, subtotal, desconto, total: Math.max(0, subtotal - desconto) };
}

function Row({ label, value, muted, accent, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-stone-400" : accent ? "" : bold ? "font-semibold" : "text-stone-600"}
            style={accent ? { color: ACCENT } : {}}>{label}</span>
      <span className={`tabular-nums ${bold ? "text-base font-bold" : ""} ${muted ? "text-stone-400" : ""}`}
            style={accent ? { color: ACCENT } : {}}>{value}</span>
    </div>
  );
}

function ModalPacote({ pacote, itens, onClose, onSalvar }) {
  const [f, setF] = useState(pacote);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleItem = (id) =>
    setF((p) => ({ ...p, itemIds: p.itemIds.includes(id) ? p.itemIds.filter((x) => x !== id) : [...p.itemIds, id] }));
  const calc = calcularPacote(f, itens);

  return (
    <Overlay onClose={onClose} wide>
      <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{pacote.id ? "Editar pacote" : "Novo pacote"}</h2>
          <p className="mt-0.5 text-sm text-stone-500">Escolha os itens e o desconto. O total é uma prévia ao vivo.</p>
        </div>
        <button onClick={onClose} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
      </div>

      <div className="grid flex-1 gap-6 overflow-y-auto px-6 py-5 md:grid-cols-2">
        {/* esquerda: config */}
        <div className="space-y-5">
          <Field label="Nome do pacote" required>
            <input value={f.nome} onChange={(e) => set("nome", e.target.value)} className={inputCls} autoFocus
              placeholder="Ex.: Casamento Completo" />
          </Field>
          <Field label="Descrição">
            <input value={f.descricao} onChange={(e) => set("descricao", e.target.value)} className={inputCls}
              placeholder="Frase curta para o cliente." />
          </Field>

          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">Itens do pacote</label>
            <div className="space-y-1.5 rounded-xl border border-stone-200 p-2">
              {itens.filter((i) => i.ativo).map((i) => {
                const on = f.itemIds.includes(i.id);
                return (
                  <button key={i.id} onClick={() => toggleItem(i.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                      on ? "bg-orange-50 ring-1 ring-orange-200" : "hover:bg-stone-50"
                    }`}>
                    <span className="flex items-center gap-2">
                      {on ? <CheckCircle2 className="h-4 w-4" style={{ color: ACCENT }} />
                          : <Circle className="h-4 w-4 text-stone-300" />}
                      <span className={on ? "font-medium" : "text-stone-600"}>{i.nome}</span>
                      <span className="text-xs" style={{ color: tipoStyle[i.tipo].fg }}>{i.tipo}</span>
                    </span>
                    <span className="tabular-nums text-stone-400">{brl(i.valorBase)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo de desconto">
              <select value={f.descontoTipo} onChange={(e) => set("descontoTipo", e.target.value)} className={inputCls}>
                <option value="percentual">Percentual (%)</option>
                <option value="fixo">Valor fixo (R$)</option>
              </select>
            </Field>
            <Field label={f.descontoTipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"}>
              <input type="number" value={f.descontoValor} onChange={(e) => set("descontoValor", e.target.value)}
                className={inputCls} placeholder="0" />
            </Field>
          </div>
        </div>

        {/* direita: preview do desmonte */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
            <ArrowRight className="h-3.5 w-3.5" /> Como entra no orçamento
          </div>
          {calc.linhas.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-400">Selecione itens para ver a prévia.</p>
          ) : (
            <>
              <div className="space-y-1.5">
                {calc.linhas.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-stone-600">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tipoStyle[l.tipo].dot }} />
                      {l.nome}
                    </span>
                    <span className="tabular-nums text-stone-500">{brl(l.valor)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1 border-t border-stone-200 pt-3 text-sm">
                <Row label="Subtotal" value={brl(calc.subtotal)} muted />
                <Row label="Desconto" value={"– " + brl(calc.desconto)} accent />
                <Row label="A partir de" value={brl(calc.total)} bold />
              </div>
            </>
          )}
          <p className="mt-3 text-xs text-stone-400">
            O desconto incide sobre o total, inclusive horas extras que aparecerem no orçamento real.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-stone-100 px-6 py-4">
        <div className="max-w-xs">
          <Toggle checked={f.exibirCliente} onChange={(v) => set("exibirCliente", v)}
            label="Exibir na lista de preços" hint="Se desligado, o pacote fica só para uso interno." />
        </div>
        <div className="flex shrink-0 gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100">
            Cancelar
          </button>
          <button onClick={() => onSalvar(f)}
            className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ background: ACCENT }}>
            {pacote.id ? "Salvar alterações" : "Criar pacote"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Primitivos ───────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-stone-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

function Field({ label, required, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-stone-700">
        {label} {required && <span style={{ color: ACCENT }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex w-full items-start gap-3 text-left">
      <span className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${checked ? "" : "bg-stone-200"}`}
            style={checked ? { background: ACCENT } : {}}>
        <span className={`h-4 w-4 rounded-full bg-white shadow transition ${checked ? "translate-x-4" : ""}`} />
      </span>
      <span>
        <span className="block text-sm font-medium text-stone-700">{label}</span>
        <span className="block text-xs text-stone-400">{hint}</span>
      </span>
    </button>
  );
}

function Overlay({ children, onClose, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        {children}
      </div>
    </div>
  );
}
