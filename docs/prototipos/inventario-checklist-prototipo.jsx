import React, { useState } from "react";
import {
  Package, Plus, Pencil, Trash2, Check, X, Info, Search, ListChecks,
  ArrowLeft, CheckCircle2, Circle, Save, Boxes, Star, Tag,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Inventário de Equipamentos + Checklist por tipo de evento
// Incorpora o inventário que o usuário desenhou (Horizons), SEM manutenção
// (removida por decisão). Duas telas:
//   (A) INVENTÁRIO — tabela de domínio do equipamento: nome, categoria, marca,
//       modelo, nº série, status (disponível/inativo), localização, obs,
//       flags "padrão" e "ativo". Painel + busca + filtros.
//   (B) CHECKLIST  — por TIPO DE EVENTO (referencia TIPO_EVENTO existente).
//       Seleciona equipamentos DO INVENTÁRIO; itens "padrão" entram automático.
//       Conferência efêmera (lembrete, não persiste por evento).
// Tudo é tabela de domínio (equipamento e tipo de evento referenciados, não
// texto livre). Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

// categorias de equipamento (tabela de domínio própria — cadastrável, não fixa no código)
const CATEGORIAS_SEED = [
  { id: 1, nome: "Câmera", ativo: true },
  { id: 2, nome: "Lente", ativo: true },
  { id: 3, nome: "Flash", ativo: true },
  { id: 4, nome: "Cartão de memória", ativo: true },
  { id: 5, nome: "Bateria", ativo: true },
  { id: 6, nome: "Tripé", ativo: true },
  { id: 7, nome: "Acessório", ativo: true },
];

// tipos de evento — mesma tabela de domínio que o Catálogo (§5) chama de "Serviço
// Principal". Os 3 primeiros espelham valores já cadastrados lá; os 2 últimos
// nasceram incompletos aqui (valor/duração ficam null até serem preenchidos na
// tela) — decisão do usuário em 05/07/2026: cadastrar de verdade, sem eu inventar
// número. Nota de integração: neste estágio de protótipo, cada arquivo .jsx tem
// seu próprio estado em memória — a sincronização real com catalogo-prototipo.jsx
// só existe quando os dois lerem da mesma tabela via backend.
const TIPOS_EVENTO_SEED = [
  { id: 1, nome: "Casamento", valorBase: 5000, duracaoBase: 8, ativo: true },
  { id: 2, nome: "Aniversário", valorBase: 400, duracaoBase: 4, ativo: true },
  { id: 3, nome: "Batizado", valorBase: 800, duracaoBase: 3, ativo: true },
  { id: 4, nome: "Ensaio externo", valorBase: null, duracaoBase: null, ativo: true },
  { id: 5, nome: "Corporativo", valorBase: null, duracaoBase: null, ativo: true },
];

// inventário (sem campos de manutenção)
const EQUIP_SEED = [
  { id: "e1", nome: "Câmera Principal", categoriaId: 1, marca: "Canon", modelo: "EOS R6", serie: "CN-88213", status: "disponivel", local: "Mochila A", padrao: true, ativo: true },
  { id: "e2", nome: "Câmera Reserva", categoriaId: 1, marca: "Canon", modelo: "EOS R", serie: "CN-77410", status: "disponivel", local: "Mochila A", padrao: true, ativo: true },
  { id: "e3", nome: "Lente 24-70mm", categoriaId: 2, marca: "Canon", modelo: "RF 24-70 f/2.8", serie: "LN-2470", status: "disponivel", local: "Mochila A", padrao: true, ativo: true },
  { id: "e4", nome: "Lente 70-200mm", categoriaId: 2, marca: "Canon", modelo: "RF 70-200 f/2.8", serie: "LN-70200", status: "disponivel", local: "Mochila B", padrao: false, ativo: true },
  { id: "e5", nome: "Lente 50mm", categoriaId: 2, marca: "Canon", modelo: "RF 50 f/1.2", serie: "LN-50", status: "disponivel", local: "Mochila B", padrao: false, ativo: true },
  { id: "e6", nome: "Flash Godox V1", categoriaId: 3, marca: "Godox", modelo: "V1", serie: "GD-V1", status: "disponivel", local: "Mochila A", padrao: false, ativo: true },
  { id: "e7", nome: "Cartão SD 128GB", categoriaId: 4, marca: "SanDisk", modelo: "Extreme Pro", serie: "-", status: "disponivel", local: "Case cartões", padrao: true, ativo: true },
  { id: "e8", nome: "Tripé Manfrotto", categoriaId: 6, marca: "Manfrotto", modelo: "MT055", serie: "MF-055", status: "disponivel", local: "Estúdio", padrao: false, ativo: true },
  { id: "e9", nome: "Refletor dobrável", categoriaId: 7, marca: "Neewer", modelo: "5-em-1", serie: "-", status: "disponivel", local: "Estúdio", padrao: false, ativo: true },
  { id: "e10", nome: "GoPro Hero", categoriaId: 1, marca: "GoPro", modelo: "Hero 12", serie: "GP-12", status: "inativo", local: "Gaveta", padrao: false, ativo: false },
];

// checklists por tipo (guardam equipamento_id — referência, não texto)
const CHECKLIST_SEED = {
  "Casamento": ["e4", "e5", "e6", "e8"], // além dos padrão (que entram sozinhos)
  "Ensaio externo": ["e5", "e9"],
  "Corporativo": ["e6", "e8"],
};

export default function InventarioChecklist() {
  const [tela, setTela] = useState("inventario");
  const [categorias, setCategorias] = useState(CATEGORIAS_SEED);
  const [tiposEvento, setTiposEvento] = useState(TIPOS_EVENTO_SEED);
  const [equipamentos, setEquipamentos] = useState(EQUIP_SEED);
  const [checklists, setChecklists] = useState(CHECKLIST_SEED);
  const [conferindo, setConferindo] = useState(null); // tipo em conferência

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><Package className="h-4 w-4 text-white" /></div>
            <span className="text-sm font-semibold tracking-tight">Equipamentos · Inventário e checklist</span>
          </div>
          {!conferindo && (
            <div className="flex rounded-lg bg-stone-100 p-0.5 text-xs font-semibold">
              {[["inventario", "Inventário"], ["checklist", "Checklists"]].map(([k, r]) => (
                <button key={k} onClick={() => setTela(k)} className={`rounded-md px-3 py-1.5 transition ${tela === k ? "bg-white shadow-sm" : "text-stone-500"}`} style={tela === k ? { color: ACCENT } : {}}>{r}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {conferindo
        ? <Conferencia tipo={conferindo} equipamentos={equipamentos} checklists={checklists} voltar={() => setConferindo(null)} />
        : tela === "inventario"
          ? <Inventario equipamentos={equipamentos} setEquipamentos={setEquipamentos} categorias={categorias} setCategorias={setCategorias} />
          : <Checklists checklists={checklists} setChecklists={setChecklists} equipamentos={equipamentos} categorias={categorias}
              tiposEvento={tiposEvento} setTiposEvento={setTiposEvento} conferir={setConferindo} />}
    </div>
  );
}

// ───────────────────────── INVENTÁRIO ─────────────────────────
function Inventario({ equipamentos, setEquipamentos, categorias, setCategorias }) {
  const [busca, setBusca] = useState("");
  const [fCat, setFCat] = useState("Todas");
  const [fStatus, setFStatus] = useState("Todos");
  const [modal, setModal] = useState(null);
  const [modalCat, setModalCat] = useState(false);

  const nomeCategoria = (id) => categorias.find((c) => c.id === id)?.nome;
  const categoriasAtivas = categorias.filter((c) => c.ativo);

  const salvar = (eq) => {
    setEquipamentos((l) => eq.id ? l.map((x) => x.id === eq.id ? eq : x) : [...l, { ...eq, id: "e" + Date.now() }]);
    setModal(null);
  };
  const excluir = (id) => setEquipamentos((l) => l.filter((x) => x.id !== id));

  const filtrados = equipamentos.filter((e) =>
    (busca === "" || `${e.nome} ${e.marca} ${e.modelo} ${e.serie}`.toLowerCase().includes(busca.toLowerCase())) &&
    (fCat === "Todas" || e.categoriaId === fCat) &&
    (fStatus === "Todos" || (fStatus === "Disponível" ? e.status === "disponivel" : e.status === "inativo"))
  );
  const total = equipamentos.length;
  const disp = equipamentos.filter((e) => e.status === "disponivel").length;
  const padroes = equipamentos.filter((e) => e.padrao).length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventário de equipamentos</h1>
          <p className="mt-1 text-sm text-stone-500">Seu patrimônio de equipamento — a fonte que alimenta os checklists.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalCat(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
            <Tag className="h-4 w-4" /> Categorias
          </button>
          <button onClick={() => setModal({ categoriaId: categoriasAtivas[0]?.id ?? "", status: "disponivel", ativo: true, padrao: false })} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
            <Plus className="h-4 w-4" /> Novo equipamento
          </button>
        </div>
      </div>

      {/* painel (sem manutenção) */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <PainelCard icon={<Boxes className="h-4 w-4 text-stone-400" />} label="Total registrado" valor={total} />
        <PainelCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label="Disponíveis" valor={disp} cor="text-emerald-600" />
        <PainelCard icon={<Star className="h-4 w-4" style={{ color: ACCENT }} />} label="Padrão (entram em todo checklist)" valor={padroes} />
      </div>

      {/* busca + filtros */}
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3">
          <Search className="h-4 w-4 text-stone-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, marca, modelo, série…" className="w-full bg-transparent py-2 text-sm focus:outline-none" />
        </div>
        <select value={fCat} onChange={(e) => setFCat(e.target.value === "Todas" ? "Todas" : Number(e.target.value))} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none">
          <option value="Todas">Todas</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}{!c.ativo ? " (inativa)" : ""}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none">
          <option>Todos</option><option>Disponível</option><option>Inativo</option>
        </select>
      </div>

      {/* tabela */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
              <th className="px-4 py-3 font-semibold">Equipamento</th>
              <th className="px-4 py-3 font-semibold">Categoria</th>
              <th className="px-4 py-3 font-semibold">Marca / Modelo</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((e) => (
              <tr key={e.id} className="border-b border-stone-100">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-700">{e.nome}</span>
                    {e.padrao && <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold" style={{ color: ACCENT }}>padrão</span>}
                  </div>
                  <div className="text-xs text-stone-400">{e.local}</div>
                </td>
                <td className="px-4 py-3"><span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">{nomeCategoria(e.categoriaId) || <span className="italic text-stone-300">Sem categoria</span>}</span></td>
                <td className="px-4 py-3 text-stone-600">{e.marca} <span className="text-stone-400">{e.modelo}</span></td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.status === "disponivel" ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-400"}`}>{e.status === "disponivel" ? "Disponível" : "Inativo"}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setModal(e)} className="rounded-lg p-1.5 text-stone-400 ring-1 ring-stone-200 hover:bg-stone-50"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => excluir(e.id)} className="rounded-lg p-1.5 text-red-400 ring-1 ring-stone-200 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && <div className="px-4 py-8 text-center text-sm text-stone-400">Nada encontrado.</div>}
      </div>

      {modal !== null && (
        <ModalEquip equip={modal} categorias={categorias} onFechar={() => setModal(null)} onSalvar={salvar}
          onNovaCategoria={() => setModalCat(true)} />
      )}
      {modalCat && <ModalCategorias categorias={categorias} setCategorias={setCategorias} onFechar={() => setModalCat(false)} />}
    </main>
  );
}

function PainelCard({ icon, label, valor, cor }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500">{icon} {label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${cor || ""}`}>{valor}</div>
    </div>
  );
}

function ModalCategorias({ categorias, setCategorias, onFechar }) {
  const [novo, setNovo] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [rascunho, setRascunho] = useState("");

  const adicionar = () => {
    const nome = novo.trim();
    if (!nome) return;
    setCategorias((l) => [...l, { id: Math.max(0, ...l.map((c) => c.id)) + 1, nome, ativo: true }]);
    setNovo("");
  };
  const salvarEdicao = (id) => {
    const nome = rascunho.trim();
    if (nome) setCategorias((l) => l.map((c) => c.id === id ? { ...c, nome } : c));
    setEditandoId(null);
  };
  const toggleAtivo = (id) => setCategorias((l) => l.map((c) => c.id === id ? { ...c, ativo: !c.ativo } : c));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4" onClick={onFechar}>
      <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold tracking-tight">Categorias de equipamento</h3>
        <p className="mt-1 text-xs text-stone-500">Tabela de domínio própria — nada aqui é texto livre no cadastro de equipamento.</p>

        <div className="mt-4 space-y-1.5">
          {categorias.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg border border-stone-200 p-2">
              {editandoId === c.id ? (
                <input autoFocus value={rascunho} onChange={(e) => setRascunho(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && salvarEdicao(c.id)}
                  className="flex-1 rounded-md border border-stone-200 px-2 py-1 text-sm focus:outline-none" />
              ) : (
                <span className={`flex-1 text-sm ${c.ativo ? "text-stone-700" : "text-stone-400 line-through"}`}>{c.nome}</span>
              )}
              {editandoId === c.id ? (
                <button onClick={() => salvarEdicao(c.id)} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50"><Check className="h-3.5 w-3.5" /></button>
              ) : (
                <button onClick={() => { setEditandoId(c.id); setRascunho(c.nome); }} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-50"><Pencil className="h-3.5 w-3.5" /></button>
              )}
              <button onClick={() => toggleAtivo(c.id)} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.ativo ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-400"}`}>
                {c.ativo ? "Ativa" : "Inativa"}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && adicionar()}
            placeholder="Nova categoria…" className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none" />
          <button onClick={adicionar} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 flex items-start gap-1.5 text-xs text-stone-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Desativar não apaga: equipamentos já cadastrados mantêm a categoria, mas ela some das opções de novo cadastro.
        </p>

        <div className="mt-4 flex justify-end">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Fechar</button>
        </div>
      </div>
    </div>
  );
}

function ModalEquip({ equip, categorias, onFechar, onSalvar, onNovaCategoria }) {
  const [f, setF] = useState({
    id: equip.id, nome: equip.nome || "", categoriaId: equip.categoriaId ?? "", marca: equip.marca || "",
    modelo: equip.modelo || "", serie: equip.serie || "", status: equip.status || "disponivel",
    local: equip.local || "", obs: equip.obs || "", padrao: equip.padrao || false, ativo: equip.ativo !== false,
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const ok = f.nome.trim() && f.categoriaId;
  const inp = "mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none";
  const categoriasAtivas = categorias.filter((c) => c.ativo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onFechar}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold tracking-tight">{equip.id ? "Editar equipamento" : "Novo equipamento"}</h3>

        <label className="mt-4 block text-xs font-semibold text-stone-600">Nome *</label>
        <input value={f.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex: Câmera Principal" className={inp} />

        <div className="mt-3 flex items-center justify-between">
          <label className="block text-xs font-semibold text-stone-600">Categoria *</label>
          <button type="button" onClick={onNovaCategoria} className="text-xs font-medium hover:underline" style={{ color: ACCENT }}>+ Nova categoria</button>
        </div>
        <select value={f.categoriaId} onChange={(e) => set("categoriaId", Number(e.target.value))} className={inp}>
          <option value="" disabled>Selecione…</option>
          {categoriasAtivas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-semibold text-stone-600">Marca</label><input value={f.marca} onChange={(e) => set("marca", e.target.value)} placeholder="Canon…" className={inp} /></div>
          <div><label className="block text-xs font-semibold text-stone-600">Modelo</label><input value={f.modelo} onChange={(e) => set("modelo", e.target.value)} placeholder="EOS R6" className={inp} /></div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-semibold text-stone-600">Nº de série</label><input value={f.serie} onChange={(e) => set("serie", e.target.value)} placeholder="S/N" className={inp} /></div>
          <div><label className="block text-xs font-semibold text-stone-600">Status</label>
            <select value={f.status} onChange={(e) => set("status", e.target.value)} className={inp}><option value="disponivel">Disponível</option><option value="inativo">Inativo</option></select>
          </div>
        </div>

        <label className="mt-3 block text-xs font-semibold text-stone-600">Localização</label>
        <input value={f.local} onChange={(e) => set("local", e.target.value)} placeholder="Ex: Estúdio, Mochila A…" className={inp} />

        <label className="mt-3 block text-xs font-semibold text-stone-600">Observações</label>
        <textarea value={f.obs} onChange={(e) => set("obs", e.target.value)} rows={2} placeholder="Detalhes adicionais…" className={inp + " resize-none"} />

        {/* flags */}
        <div className="mt-4 space-y-2">
          <button onClick={() => set("padrao", !f.padrao)} className="flex w-full items-start gap-2 rounded-lg border border-stone-200 p-3 text-left hover:bg-stone-50">
            {f.padrao ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-stone-300" />}
            <span><span className="text-sm font-semibold">Equipamento padrão</span><span className="block text-xs text-stone-500">Entra automaticamente em todos os checklists, poupando tempo na separação.</span></span>
          </button>
          <button onClick={() => set("ativo", !f.ativo)} className="flex w-full items-center gap-2 rounded-lg border border-stone-200 p-3 text-left hover:bg-stone-50">
            {f.ativo ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <Circle className="h-4 w-4 shrink-0 text-stone-300" />}
            <span className="text-sm font-semibold">Ativo no sistema</span>
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Cancelar</button>
          <button onClick={() => onSalvar(f)} disabled={!ok} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ background: ACCENT }}>
            <Save className="h-4 w-4" /> {equip.id ? "Salvar" : "Cadastrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── CHECKLISTS (por tipo) ─────────────────────────
function Checklists({ checklists, setChecklists, equipamentos, categorias, tiposEvento, setTiposEvento, conferir }) {
  const [editando, setEditando] = useState(null);
  const [modalTipos, setModalTipos] = useState(false);

  const padroes = equipamentos.filter((e) => e.padrao && e.ativo);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Checklists por tipo de evento</h1>
          <p className="mt-1 text-sm text-stone-500">Cada tipo puxa os equipamentos selecionados + os marcados "padrão" no inventário.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalTipos(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
            <ListChecks className="h-4 w-4" /> Tipos de evento
          </button>
          <button onClick={() => setEditando({ tipo: "", itens: [] })} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
            <Plus className="h-4 w-4" /> Novo checklist
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {Object.entries(checklists).map(([tipo, ids]) => {
          const selecionados = ids.length;
          const total = selecionados + padroes.length;
          return (
            <div key={tipo} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-stone-400" />
                <span className="text-sm font-semibold">{tipo}</span>
                <span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500 tabular-nums">{total} itens</span>
              </div>
              <p className="mt-2 text-xs text-stone-400">{selecionados} selecionados + {padroes.length} padrão (automáticos)</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => conferir(tipo)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
                  <ListChecks className="h-3.5 w-3.5" /> Conferir
                </button>
                <button onClick={() => setEditando({ tipo, itens: ids })} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Os equipamentos vêm do inventário (tabela de domínio) — não se digita item aqui. Marcar "padrão" no inventário faz o item entrar em todo checklist automaticamente.
      </p>

      {editando !== null && <ModalChecklist checklist={editando} equipamentos={equipamentos} categorias={categorias} tiposEvento={tiposEvento} onNovoTipo={() => setModalTipos(true)} onFechar={() => setEditando(null)}
        onSalvar={(tipo, itens) => { setChecklists((c) => ({ ...c, [tipo]: itens })); setEditando(null); }} />}
      {modalTipos && <ModalTiposEvento tiposEvento={tiposEvento} setTiposEvento={setTiposEvento} onFechar={() => setModalTipos(false)} />}
    </main>
  );
}

function ModalTiposEvento({ tiposEvento, setTiposEvento, onFechar }) {
  const [editandoId, setEditandoId] = useState(null);
  const [rascunho, setRascunho] = useState({ nome: "", valorBase: "", duracaoBase: "" });
  const [novo, setNovo] = useState(false);
  const [f, setF] = useState({ nome: "", valorBase: "", duracaoBase: "" });

  const iniciarEdicao = (t) => { setEditandoId(t.id); setRascunho({ nome: t.nome, valorBase: t.valorBase ?? "", duracaoBase: t.duracaoBase ?? "" }); };
  const salvarEdicao = (id) => {
    if (!rascunho.nome.trim()) return;
    setTiposEvento((l) => l.map((t) => t.id === id ? { ...t, nome: rascunho.nome.trim(), valorBase: rascunho.valorBase === "" ? null : Number(rascunho.valorBase), duracaoBase: rascunho.duracaoBase === "" ? null : Number(rascunho.duracaoBase) } : t));
    setEditandoId(null);
  };
  const toggleAtivo = (id) => setTiposEvento((l) => l.map((t) => t.id === id ? { ...t, ativo: !t.ativo } : t));
  const adicionar = () => {
    if (!f.nome.trim()) return;
    setTiposEvento((l) => [...l, { id: Math.max(0, ...l.map((t) => t.id)) + 1, nome: f.nome.trim(), valorBase: f.valorBase === "" ? null : Number(f.valorBase), duracaoBase: f.duracaoBase === "" ? null : Number(f.duracaoBase), ativo: true }]);
    setF({ nome: "", valorBase: "", duracaoBase: "" });
    setNovo(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4" onClick={onFechar}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold tracking-tight">Tipos de evento</h3>
        <p className="mt-1 text-xs text-stone-500">Mesma tabela de domínio do Catálogo (§5, "Serviço Principal") — nome, valor base e duração base.</p>

        <div className="mt-4 space-y-1.5">
          {tiposEvento.map((t) => (
            <div key={t.id} className="rounded-lg border border-stone-200 p-2.5">
              {editandoId === t.id ? (
                <div className="grid grid-cols-3 gap-2">
                  <input autoFocus value={rascunho.nome} onChange={(e) => setRascunho((s) => ({ ...s, nome: e.target.value }))} placeholder="Nome" className="col-span-3 rounded-md border border-stone-200 px-2 py-1 text-sm focus:outline-none sm:col-span-1" />
                  <input type="number" value={rascunho.valorBase} onChange={(e) => setRascunho((s) => ({ ...s, valorBase: e.target.value }))} placeholder="Valor base (R$)" className="rounded-md border border-stone-200 px-2 py-1 text-sm focus:outline-none" />
                  <input type="number" value={rascunho.duracaoBase} onChange={(e) => setRascunho((s) => ({ ...s, duracaoBase: e.target.value }))} placeholder="Duração (h)" className="rounded-md border border-stone-200 px-2 py-1 text-sm focus:outline-none" />
                  <div className="col-span-3 flex justify-end gap-2">
                    <button onClick={() => setEditandoId(null)} className="rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-stone-50">Cancelar</button>
                    <button onClick={() => salvarEdicao(t.id)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}><Check className="h-3.5 w-3.5" /> Salvar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`flex-1 text-sm ${t.ativo ? "text-stone-700" : "text-stone-400 line-through"}`}>{t.nome}</span>
                  {t.valorBase === null ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">Sem valor definido</span>
                  ) : (
                    <span className="text-xs tabular-nums text-stone-500">R$ {t.valorBase.toLocaleString("pt-BR")} · {t.duracaoBase}h</span>
                  )}
                  <button onClick={() => iniciarEdicao(t)} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-50"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => toggleAtivo(t.id)} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${t.ativo ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-400"}`}>{t.ativo ? "Ativo" : "Inativo"}</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {novo ? (
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-dashed border-stone-300 p-2.5">
            <input autoFocus value={f.nome} onChange={(e) => setF((s) => ({ ...s, nome: e.target.value }))} placeholder="Nome do tipo" className="col-span-3 rounded-md border border-stone-200 px-2 py-1 text-sm focus:outline-none sm:col-span-1" />
            <input type="number" value={f.valorBase} onChange={(e) => setF((s) => ({ ...s, valorBase: e.target.value }))} placeholder="Valor base (R$)" className="rounded-md border border-stone-200 px-2 py-1 text-sm focus:outline-none" />
            <input type="number" value={f.duracaoBase} onChange={(e) => setF((s) => ({ ...s, duracaoBase: e.target.value }))} placeholder="Duração (h)" className="rounded-md border border-stone-200 px-2 py-1 text-sm focus:outline-none" />
            <div className="col-span-3 flex justify-end gap-2">
              <button onClick={() => setNovo(false)} className="rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-stone-50">Cancelar</button>
              <button onClick={adicionar} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}><Plus className="h-3.5 w-3.5" /> Adicionar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setNovo(true)} className="mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
            <Plus className="h-4 w-4" /> Novo tipo de evento
          </button>
        )}

        <p className="mt-4 flex items-start gap-1.5 text-xs text-stone-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> "Sem valor definido" não impede o uso no checklist — só sinaliza que o cadastro no Catálogo ficou incompleto.
        </p>

        <div className="mt-4 flex justify-end">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Fechar</button>
        </div>
      </div>
    </div>
  );
}

function ModalChecklist({ checklist, equipamentos, categorias, tiposEvento, onNovoTipo, onFechar, onSalvar }) {
  const [tipo, setTipo] = useState(checklist.tipo || "");
  const [itens, setItens] = useState(checklist.itens || []);
  const selecionaveis = equipamentos.filter((e) => e.ativo && !e.padrao); // padrão entra sozinho
  const nomeCategoria = (id) => categorias.find((c) => c.id === id)?.nome;
  const tiposAtivos = tiposEvento.filter((t) => t.ativo);
  const toggle = (id) => setItens((l) => l.includes(id) ? l.filter((x) => x !== id) : [...l, id]);
  const ok = tipo && itens.length >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onFechar}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold tracking-tight">{checklist.tipo ? `Checklist · ${checklist.tipo}` : "Novo checklist"}</h3>

        {!checklist.tipo && (
          <>
            <div className="mt-4 flex items-center justify-between">
              <label className="block text-xs font-semibold text-stone-600">Tipo de evento</label>
              <button type="button" onClick={onNovoTipo} className="text-xs font-medium hover:underline" style={{ color: ACCENT }}>+ Novo tipo de evento</button>
            </div>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none">
              <option value="">Selecione…</option>{tiposAtivos.map((t) => <option key={t.id} value={t.nome}>{t.nome}</option>)}
            </select>
            <p className="mt-1 text-xs text-stone-400">Vem da mesma tabela de domínio do Catálogo (§5, "Serviço Principal") — não é mais texto solto.</p>
          </>
        )}

        <label className="mt-4 block text-xs font-semibold text-stone-600">Selecionar do inventário</label>
        <p className="text-xs text-stone-400">Equipamentos "padrão" já entram sozinhos — aqui só os específicos deste tipo.</p>
        <div className="mt-2 space-y-1.5">
          {selecionaveis.map((e) => {
            const on = itens.includes(e.id);
            return (
              <button key={e.id} onClick={() => toggle(e.id)} className={`flex w-full items-center gap-2 rounded-lg border p-2.5 text-left text-sm transition ${on ? "" : "border-stone-200 hover:bg-stone-50"}`}
                style={on ? { borderColor: ACCENT, boxShadow: `inset 0 0 0 1px ${ACCENT}` } : {}}>
                {on ? <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: ACCENT }} /> : <Circle className="h-4 w-4 shrink-0 text-stone-300" />}
                <span className="flex-1">{e.nome} <span className="text-xs text-stone-400">{nomeCategoria(e.categoriaId)}</span></span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Cancelar</button>
          <button onClick={() => onSalvar(tipo, itens)} disabled={!ok} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ background: ACCENT }}>
            <Save className="h-4 w-4" /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── CONFERÊNCIA (efêmera) ─────────────────────────
function Conferencia({ tipo, equipamentos, checklists, voltar }) {
  const padroes = equipamentos.filter((e) => e.padrao && e.ativo);
  const selecionadosIds = checklists[tipo] || [];
  const selecionados = equipamentos.filter((e) => selecionadosIds.includes(e.id));
  const todos = [...padroes, ...selecionados];

  const [marcados, setMarcados] = useState({});
  const toggle = (id) => setMarcados((m) => ({ ...m, [id]: !m[id] }));
  const n = todos.filter((e) => marcados[e.id]).length;
  const pct = todos.length ? Math.round((n / todos.length) * 100) : 0;
  const completo = n === todos.length && todos.length > 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <button onClick={voltar} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4" /> Checklists</button>

      <div className="mt-4 flex items-center gap-2">
        <Package className="h-5 w-5 text-stone-400" />
        <h1 className="text-2xl font-bold tracking-tight">Conferir · {tipo}</h1>
      </div>
      <p className="mt-1 text-sm text-stone-500">Marque conforme guarda na mochila. Só um lembrete — não fica salvo depois.</p>

      <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">{completo ? "Tudo conferido" : "Progresso"}</span>
          <span className="tabular-nums text-stone-500">{n}/{todos.length}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full transition-all" style={{ width: `${pct}%`, background: completo ? "#059669" : ACCENT }} /></div>
        {completo && <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Pronto — pode sair, está tudo aí.</div>}
      </div>

      <div className="mt-4 space-y-2">
        {todos.map((e) => {
          const on = marcados[e.id];
          return (
            <button key={e.id} onClick={() => toggle(e.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition ${on ? "border-emerald-200 bg-emerald-50/50" : "border-stone-200 bg-white hover:bg-stone-50"}`}>
              {on ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> : <Circle className="h-5 w-5 shrink-0 text-stone-300" />}
              <span className={`flex-1 text-sm ${on ? "text-stone-400 line-through" : "text-stone-700"}`}>{e.nome} <span className="text-xs text-stone-400">{e.marca} {e.modelo}</span></span>
              {e.padrao && <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold" style={{ color: ACCENT }}>padrão</span>}
            </button>
          );
        })}
      </div>

      <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> A lista = equipamentos "padrão" do inventário + os selecionados para {tipo}. Ao reabrir, volta desmarcada.
      </p>
    </main>
  );
}
