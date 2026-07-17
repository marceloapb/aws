import React, { useState } from "react";
import {
  Camera, Plus, Search, Settings, ChevronRight, ArrowLeft, Image as ImageIcon,
  FolderPlus, Heart, Clock, Download, MessageSquare, AlertTriangle, Check, X,
  Eye, Trash2, Upload, Lock, Info, Folder, Pencil, Instagram
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Álbum/Entrega: GESTÃO (visão ADM)
// Telas: 1) Lista de álbuns  2) Gerenciar álbum (galerias, seleção,
//        regras/prazos)  3) Editar regras
// A experiência do cliente (vitrine) e o serviço de mídia (S3 + 3
// versões) são frentes separadas. Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const fmt = (iso) => iso ? (() => { const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; })() : "—";

const ALBUNS_SEED = [
  { id: 1, titulo: "Casamento Marina e Rafael", cliente: "Marina Silva", data_evento: "2026-12-12", status: "rascunho", origem: "orcamento", criado: "2026-06-17", pctPago: 30, meioPgto: "pix",
    galerias: [{ id: 1, nome: "Cerimônia", fotos: 120 }, { id: 2, nome: "Festa", fotos: 340 }], selecao: true, selecionadas: 0,
    permite_download: true, permite_comentarios: false, disponivel_em: "", expira_em: "", prazo_dias: 180 },
  { id: 2, titulo: "Batizado da Sofia", cliente: "Família Souza", data_evento: "2026-08-21", status: "rascunho", origem: "orcamento", criado: "2026-06-17", pctPago: 50, meioPgto: "boleto",
    galerias: [{ id: 3, nome: "Igreja", fotos: 80 }], selecao: false, selecionadas: 0,
    permite_download: true, permite_comentarios: false, disponivel_em: "", expira_em: "", prazo_dias: 180 },
  { id: 3, titulo: "Ensaio Família Costa", cliente: "Roberto Costa", data_evento: "2026-06-28", status: "publicado", origem: "avulso", criado: "2026-06-10", pctPago: 100, meioPgto: "dinheiro",
    galerias: [{ id: 4, nome: "Ensaio", fotos: 45 }], selecao: true, selecionadas: 12,
    permite_download: true, permite_comentarios: true, disponivel_em: "2026-06-12", expira_em: "2026-12-12", prazo_dias: 180 },
];

const CONFIG_SEED = {
  prazoPadrao: 30,
  prazoUnidade: "dias",
  notificacoesAtivas: true,
  diasAntecedencia: [7, 3, 1],
  canais: ["whatsapp", "email"],
  templateAviso: "Olá! Seu álbum *{nome_evento}* vencerá em {dias_restantes} dias. Clique aqui para renovar: {link_album}",
  templateExpirado: "Seu álbum *{nome_evento}* expirou em {data_expiracao}. Renove agora para continuar acessando suas fotos: {link_album}",
  faixas: [
    { meses: 1, ativo: true, valor: 150 },
    { meses: 3, ativo: true, valor: 350 },
    { meses: 6, ativo: true, valor: 600 },
    { meses: 12, ativo: true, valor: 1000 },
  ],
  mostrarOpcoesExtensao: true,
  mostrarAlertaExpiracao: true,
  bloquearVisualizacao: true,
  bloquearDownload: true,
  mensagemExpirado: "Este álbum expirou e não está mais disponível para visualização. Entre em contato conosco para renová-lo e recuperar o acesso.",
};

export default function AlbumGestao() {
  const [tela, setTela] = useState("lista"); // "lista" | "config"
  const [albuns, setAlbuns] = useState(ALBUNS_SEED);
  const [abrindo, setAbrindo] = useState(null); // id do álbum aberto
  const [config, setConfig] = useState(CONFIG_SEED);

  const album = albuns.find((a) => a.id === abrindo);
  const upd = (id, patch) => setAlbuns((l) => l.map((a) => a.id === id ? { ...a, ...patch } : a));

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
         className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
              <Camera className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Álbuns</span>
          </div>
          {!album && (
            <div className="flex rounded-lg bg-stone-100 p-0.5 text-xs font-semibold">
              {[["lista", "Álbuns"], ["config", "Configurações"]].map(([k, r]) => (
                <button key={k} onClick={() => setTela(k)} className={`rounded-md px-3 py-1.5 transition ${tela === k ? "bg-white shadow-sm" : "text-stone-500"}`} style={tela === k ? { color: ACCENT } : {}}>{r}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {album
        ? <Gerenciar album={album} onVoltar={() => setAbrindo(null)} onUpd={(p) => upd(album.id, p)} />
        : tela === "config"
          ? <ConfiguracoesAlbum config={config} setConfig={setConfig} />
          : <Lista albuns={albuns} onAbrir={setAbrindo} onNovo={() => {
              const novo = { id: Date.now(), titulo: "Novo álbum avulso", cliente: "—", data_evento: "", status: "rascunho", origem: "avulso", criado: "2026-06-30", pctPago: 0, meioPgto: "—", galerias: [], selecao: false, selecionadas: 0, permite_download: true, permite_comentarios: false, disponivel_em: "", expira_em: "", prazo_dias: config.prazoPadrao };
              setAlbuns((l) => [novo, ...l]); setAbrindo(novo.id);
            }} />}
    </div>
  );
}

// ── Tela 1: Lista de álbuns ──────────────────────────────────

function Lista({ albuns, onAbrir, onNovo }) {
  const [busca, setBusca] = useState("");
  const filtrados = albuns.filter((a) => (a.titulo + a.cliente).toLowerCase().includes(busca.toLowerCase()));

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Álbuns</h1>
          <p className="mt-1 text-sm text-stone-500">Gerencie as entregas de fotos. Álbuns de orçamentos aprovados já aparecem aqui como rascunho.</p>
        </div>
        <button onClick={onNovo} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: ACCENT }}>
          <Plus className="h-4 w-4" /> Novo álbum avulso
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3">
        <Search className="h-4 w-4 text-stone-400" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por evento ou cliente…" className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-stone-300" />
      </div>

      <div className="space-y-3">
        {filtrados.map((a) => (
          <button key={a.id} onClick={() => onAbrir(a.id)} className="flex w-full items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-orange-300">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-stone-100">
              <ImageIcon className="h-6 w-6 text-stone-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{a.titulo}</span>
                <StatusTag status={a.status} />
                {a.origem === "orcamento" && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">do orçamento</span>}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
                <span>{a.cliente}</span>
                <span>evento {fmt(a.data_evento)}</span>
                <span>{a.galerias.reduce((s, g) => s + g.fotos, 0)} fotos</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-orange-600">
              <Settings className="h-4 w-4" /> Gerenciar <ChevronRight className="h-4 w-4" />
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}

function StatusTag({ status }) {
  const map = { rascunho: { r: "Rascunho", bg: "#F5F5F4", fg: "#57534e" }, publicado: { r: "Publicado", bg: "#ECFDF5", fg: "#047857" } };
  const s = map[status];
  return <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: s.bg, color: s.fg }}>{s.r}</span>;
}

// ── Tela 2: Gerenciar álbum ──────────────────────────────────

function Gerenciar({ album, onVoltar, onUpd }) {
  const [editandoRegras, setEditandoRegras] = useState(false);
  const [novaGaleria, setNovaGaleria] = useState(false);
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [escolhendoCapa, setEscolhendoCapa] = useState(false);
  const [visualizando, setVisualizando] = useState(false);
  const [renomeando, setRenomeando] = useState(null);
  const [apagando, setApagando] = useState(null);
  const totalFotos = album.galerias.reduce((s, g) => s + g.fotos, 0);
  const bloqueio70 = album.meioPgto === "boleto" && album.pctPago < 70;

  const addGaleria = (nome) => {
    onUpd({ galerias: [...album.galerias, { id: Date.now(), nome, fotos: 0 }] });
    setNovaGaleria(false);
  };
  const renomearGaleria = (id, nome) => {
    onUpd({ galerias: album.galerias.map((g) => g.id === id ? { ...g, nome } : g) });
    setRenomeando(null);
  };
  const apagarGaleria = (id) => {
    onUpd({ galerias: album.galerias.filter((g) => g.id !== id) });
    setApagando(null);
  };
  const publicar = () => { if (!bloqueio70 && totalFotos > 0) onUpd({ status: "publicado" }); };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <button onClick={onVoltar} className="mb-4 flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800">
        <ArrowLeft className="h-4 w-4" /> Voltar para álbuns
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{album.titulo}</h1>
            <button onClick={() => setEditandoTitulo(true)} title="Editar título" className="rounded-md p-1.5 text-stone-300 transition hover:bg-stone-100 hover:text-stone-600">
              <Pencil className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-stone-500">
            <StatusTag status={album.status} />
            <span>·</span><span>{album.cliente}</span>
            <span>·</span><span>evento {fmt(album.data_evento)}</span>
            <span>·</span><span>{totalFotos} fotos</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setVisualizando({ instagram: true })} disabled={totalFotos === 0}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-500 ring-1 ring-stone-300 hover:bg-stone-50 disabled:opacity-40">
            <Instagram className="h-4 w-4" /> Publicar no Instagram
          </button>
          <button onClick={() => setVisualizando(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-500 ring-1 ring-stone-300 hover:bg-stone-50">
            <Eye className="h-4 w-4" /> Visualizar
          </button>
          <button onClick={publicar} disabled={album.status === "publicado" || bloqueio70 || totalFotos === 0}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-90" style={{ background: ACCENT }}>
            <Check className="h-4 w-4" /> {album.status === "publicado" ? "Publicado" : "Publicar"}
          </button>
        </div>
      </div>

      {/* alerta da trava dos 70% */}
      {bloqueio70 && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Entrega bloqueada.</strong> Este cliente pagou {album.pctPago}% (boleto) — abaixo dos 70% necessários para liberar as fotos.
            Publicar só será possível ao atingir 70%.
          </div>
        </div>
      )}

      {/* organização: galerias */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-semibold tracking-tight"><Folder className="h-4 w-4" style={{ color: ACCENT }} /> Organização do álbum</h2>
            <p className="text-xs text-stone-400">Crie galerias (pastas) para dividir as fotos por momento. Clique numa galeria para organizar as fotos.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEscolhendoCapa(true)} disabled={totalFotos === 0} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-500 ring-1 ring-stone-300 transition hover:bg-stone-50 disabled:opacity-40">
              <ImageIcon className="h-4 w-4" /> {album.capa_foto_id ? "Trocar capa" : "Escolher capa"}
            </button>
            <button onClick={() => setNovaGaleria(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>
              <FolderPlus className="h-4 w-4" /> Nova galeria
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {album.galerias.map((g) => (
            <div key={g.id} onClick={() => setVisualizando({ galeria: g.nome })}
              className="cursor-pointer rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-orange-300">
              <div className="flex items-center justify-between">
                <span className="font-medium">{g.nome}</span>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setRenomeando(g); }} title="Renomear" className="rounded-md p-1.5 text-stone-300 transition hover:bg-stone-100 hover:text-stone-600">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setApagando(g); }} title="Apagar" className="rounded-md p-1.5 text-stone-300 transition hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-1 text-xs text-stone-400">{g.fotos} fotos · clique para organizar</div>
              <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-stone-200 py-2 text-xs font-medium text-stone-400">
                <Upload className="h-3.5 w-3.5" /> Subir / organizar fotos
              </div>
            </div>
          ))}
          {album.galerias.length === 0 && (
            <div className="col-span-full rounded-xl border-2 border-dashed border-stone-200 px-5 py-8 text-center text-sm text-stone-400">
              Nenhuma galeria ainda. Crie a primeira para começar a subir fotos.
            </div>
          )}
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-xs text-stone-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Cada foto enviada gera 3 versões automaticamente (miniatura, média e original para download).
        </p>
      </section>

      {/* seleção do cliente */}
      <section className="mt-6 rounded-xl border-l-4 border-stone-200 bg-white p-5" style={{ borderLeftColor: ACCENT }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-semibold tracking-tight"><Heart className="h-4 w-4" style={{ color: ACCENT }} /> Seleção do cliente</h2>
            <p className="text-xs text-stone-400">O cliente marca favoritas para você saber quais ele quer (ex.: álbum impresso).</p>
          </div>
          <button onClick={() => onUpd({ selecao: !album.selecao })} className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${album.selecao ? "" : "bg-stone-200"}`} style={album.selecao ? { background: ACCENT } : {}}>
            <span className={`h-4 w-4 rounded-full bg-white shadow transition ${album.selecao ? "translate-x-4" : ""}`} />
          </button>
        </div>
        {album.selecao && (
          <div className="mt-3 rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-600">
            {album.selecionadas > 0
              ? <><strong>{album.selecionadas}</strong> fotos marcadas como favoritas pelo cliente.</>
              : "Nenhuma foto selecionada ainda. O cliente verá um coração em cada foto."}
          </div>
        )}
      </section>

      {/* regras e prazos */}
      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-semibold tracking-tight"><Settings className="h-4 w-4" style={{ color: ACCENT }} /> Regras e prazos</h2>
            <p className="text-xs text-stone-400">Prazos e permissões específicas deste álbum.</p>
          </div>
          <button onClick={() => setEditandoRegras(true)} className="rounded-lg px-3 py-1.5 text-xs font-medium" style={{ background: "#FEF3EC", color: "#C2410C" }}>Editar regras</button>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          <Campo rotulo="Disponível em" valor={fmt(album.disponivel_em)} />
          <Campo rotulo="Vence em" valor={fmt(album.expira_em)} />
          <Campo rotulo="Prazo" valor={`${album.prazo_dias} dias`} />
          <Campo rotulo="% pago" valor={`${album.pctPago}%`} destaque={bloqueio70} />
          <Campo rotulo="Download" valor={album.permite_download ? "Sim" : "Não"} />
          <Campo rotulo="Comentários" valor={album.permite_comentarios ? "Sim" : "Não"} />
          <Campo rotulo="Seleção" valor={album.selecao ? "Ativa" : "Inativa"} />
          <Campo rotulo="Meio de pgto" valor={album.meioPgto} />
        </div>
      </section>

      {editandoRegras && <ModalRegras album={album} onClose={() => setEditandoRegras(false)} onSalvar={(p) => { onUpd(p); setEditandoRegras(false); }} />}
      {novaGaleria && <ModalNovaGaleria onClose={() => setNovaGaleria(false)} onSalvar={addGaleria} />}
      {renomeando && <ModalRenomearGaleria galeria={renomeando} onClose={() => setRenomeando(null)} onSalvar={(nome) => renomearGaleria(renomeando.id, nome)} />}
      {apagando && <ModalApagarGaleria galeria={apagando} onClose={() => setApagando(null)} onConfirmar={() => apagarGaleria(apagando.id)} />}
      {editandoTitulo && <ModalTitulo titulo={album.titulo} onClose={() => setEditandoTitulo(false)} onSalvar={(t) => { onUpd({ titulo: t }); setEditandoTitulo(false); }} />}
      {escolhendoCapa && <AvisoProximaRodada titulo="Escolher foto de capa" texto="A escolha da capa acontece na tela de organização de fotos da galeria — a próxima a ser construída. Lá você verá todas as fotos e poderá definir a capa, reordenar e editar cada uma." onClose={() => setEscolhendoCapa(false)} />}
      {visualizando && <AvisoProximaRodada titulo={visualizando.instagram ? "Publicar no Instagram" : visualizando.galeria ? `Organizar fotos · ${visualizando.galeria}` : "Visualizar como o cliente"} texto={visualizando.instagram ? "Daqui você é levado à tela de publicação: seleciona as fotos deste álbum (post ou carrossel), escreve a legenda e publica na hora ou agenda. A tela é um protótipo próprio (instagram-publicar-prototipo), com a fila de publicações." : visualizando.galeria ? "A tela de organização de fotos da galeria (grade de fotos, selecionar, mover, definir capa, editar título/descrição de cada foto) é a próxima rodada do módulo." : "A visualização da vitrine (a experiência do cliente — capa, galeria, ampliar, download) é a frente seguinte, a Camada 2 do álbum."} onClose={() => setVisualizando(false)} />}
    </main>
  );
}

function ConfiguracoesAlbum({ config, setConfig }) {
  const [f, setF] = useState(config);
  const [salvo, setSalvo] = useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const salvarSecao = (nome) => { setConfig(f); setSalvo(nome); setTimeout(() => setSalvo(null), 2000); };
  const inp = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
  const txt = inp + " resize-none";

  const PRESETS = [[30, "30 dias"], [60, "60 dias"], [90, "90 dias"], [180, "6 meses (180 dias)"], [365, "12 meses (365 dias)"]];
  const toggleDia = (d) => set("diasAntecedencia", f.diasAntecedencia.includes(d) ? f.diasAntecedencia.filter((x) => x !== d) : [...f.diasAntecedencia, d].sort((a, b) => b - a));
  const toggleCanal = (c) => set("canais", f.canais.includes(c) ? f.canais.filter((x) => x !== c) : [...f.canais, c]);
  const setFaixa = (meses, campo, valor) => set("faixas", f.faixas.map((fx) => fx.meses === meses ? { ...fx, [campo]: valor } : fx));

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Configurações do Álbum</h1>
      <p className="mt-1 text-sm text-stone-500">Prazos, avisos, templates de mensagem e preços de prorrogação — regra global, vale para todo álbum novo.</p>

      {/* Disponibilidade */}
      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-semibold tracking-tight"><Clock className="h-4 w-4" style={{ color: ACCENT }} /> Disponibilidade do Álbum</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Prazo Padrão *</label>
            <input type="number" value={f.prazoPadrao} onChange={(e) => set("prazoPadrao", Number(e.target.value))} className={inp} /></div>
          <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Unidade *</label>
            <select value={f.prazoUnidade} onChange={(e) => set("prazoUnidade", e.target.value)} className={inp}><option value="dias">Dias</option></select></div>
        </div>
        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-medium text-stone-700">Opções de Prazo Predefinidas</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PRESETS.map(([dias, r]) => (
              <button key={dias} onClick={() => set("prazoPadrao", dias)} className={`rounded-lg border p-2 text-left text-xs transition ${f.prazoPadrao === dias ? "" : "border-stone-200 hover:bg-stone-50"}`}
                style={f.prazoPadrao === dias ? { borderColor: ACCENT, boxShadow: `inset 0 0 0 1px ${ACCENT}`, color: ACCENT } : {}}>{r}</button>
            ))}
          </div>
        </div>
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Regra: o prazo configurado será aplicado automaticamente a novos álbuns criados. O prazo atual configurado é de {f.prazoPadrao} dias.
        </p>
        <button onClick={() => salvarSecao("disponibilidade")} className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
          {salvo === "disponibilidade" ? "Salvo!" : "Salvar Configurações de Disponibilidade"}
        </button>
      </section>

      {/* Notificação */}
      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold tracking-tight"><AlertTriangle className="h-4 w-4" style={{ color: ACCENT }} /> Notificação de Expiração</h2>
          <Toggle label="" on={f.notificacoesAtivas} onToggle={() => set("notificacoesAtivas", !f.notificacoesAtivas)} />
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-stone-700">Dias de Antecedência *</label>
          <div className="flex flex-wrap gap-2">
            {[7, 3, 1].map((d) => (
              <button key={d} onClick={() => toggleDia(d)} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${f.diasAntecedencia.includes(d) ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200" : "bg-stone-100 text-stone-400"}`}>
                {f.diasAntecedencia.includes(d) && <Check className="h-3 w-3" />} {d} dia{d > 1 ? "s" : ""} antes
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-medium text-stone-700">Canais de Notificação *</label>
          <div className="flex flex-wrap gap-2">
            {[["whatsapp", "WhatsApp"], ["email", "E-mail"]].map(([c, r]) => (
              <button key={c} onClick={() => toggleCanal(c)} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${f.canais.includes(c) ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200" : "bg-stone-100 text-stone-400"}`}>
                {f.canais.includes(c) && <Check className="h-3 w-3" />} {r}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Regra: o sistema enviará alertas automáticos para os clientes nos dias selecionados antes da expiração do álbum.
        </p>
        <button onClick={() => salvarSecao("notificacao")} className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
          {salvo === "notificacao" ? "Salvo!" : "Salvar Configurações de Notificação"}
        </button>
      </section>

      {/* Templates */}
      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-semibold tracking-tight"><MessageSquare className="h-4 w-4" style={{ color: ACCENT }} /> Templates de Mensagem (WhatsApp)</h2>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-stone-700">Mensagem de aviso (antes de expirar)</label>
          <textarea value={f.templateAviso} onChange={(e) => set("templateAviso", e.target.value)} rows={2} className={txt} />
        </div>
        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-medium text-stone-700">Mensagem de álbum expirado</label>
          <textarea value={f.templateExpirado} onChange={(e) => set("templateExpirado", e.target.value)} rows={2} className={txt} />
        </div>
        <div className="mt-3 rounded-lg bg-stone-50 p-3">
          <div className="mb-1.5 text-xs font-semibold text-stone-600">Variáveis disponíveis:</div>
          <div className="flex flex-wrap gap-1.5">
            {["{nome_cliente}", "{nome_evento}", "{data_expiracao}", "{dias_restantes}", "{link_album}", "{valor_extensao_1_mes}", "{valor_extensao_3_meses}", "{valor_extensao_6_meses}", "{valor_extensao_12_meses}"].map((v) => (
              <code key={v} className="rounded bg-white px-1.5 py-0.5 text-[11px] text-stone-500 ring-1 ring-stone-200">{v}</code>
            ))}
          </div>
        </div>
        <button onClick={() => salvarSecao("templates")} className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
          {salvo === "templates" ? "Salvo!" : "Salvar Templates de WhatsApp"}
        </button>
      </section>

      {/* Extensão / preços */}
      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-semibold tracking-tight"><Lock className="h-4 w-4" style={{ color: ACCENT }} /> Extensão do Álbum</h2>
        <table className="mt-4 w-full text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wide text-stone-400"><th className="pb-2">Período</th><th className="pb-2">Ativo?</th><th className="pb-2">Valor (R$)</th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {f.faixas.map((fx) => (
              <tr key={fx.meses}>
                <td className="py-2">{fx.meses === 1 ? "+1 mês" : fx.meses === 12 ? "+12 meses" : `+${fx.meses} meses`}</td>
                <td className="py-2"><Toggle label="" on={fx.ativo} onToggle={() => setFaixa(fx.meses, "ativo", !fx.ativo)} /></td>
                <td className="py-2"><input type="number" value={fx.valor} onChange={(e) => setFaixa(fx.meses, "valor", Number(e.target.value))} className="w-28 rounded-lg border border-stone-300 px-2 py-1 text-sm outline-none focus:border-orange-400" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Regra: os clientes poderão solicitar a extensão do prazo de acesso ao álbum pagando os valores configurados acima. Faixa inativa some das opções mostradas ao cliente.
        </p>
        <button onClick={() => salvarSecao("faixas")} className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
          {salvo === "faixas" ? "Salvo!" : "Salvar Extensão do Álbum"}
        </button>
      </section>

      {/* Exibição pro cliente */}
      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-semibold tracking-tight"><Eye className="h-4 w-4" style={{ color: ACCENT }} /> Exibição para o Cliente</h2>
        <div className="mt-4 space-y-3">
          <Toggle label="Mostrar opções de extensão — exibe os botões para o cliente comprar mais tempo de acesso" on={f.mostrarOpcoesExtensao} onToggle={() => set("mostrarOpcoesExtensao", !f.mostrarOpcoesExtensao)} />
          <Toggle label="Mostrar alerta de expiração — exibe um banner no álbum quando estiver próximo de expirar" on={f.mostrarAlertaExpiracao} onToggle={() => set("mostrarAlertaExpiracao", !f.mostrarAlertaExpiracao)} />
          <Toggle label="Bloquear visualização após expirar — impede que o cliente veja as fotos após a data limite" on={f.bloquearVisualizacao} onToggle={() => set("bloquearVisualizacao", !f.bloquearVisualizacao)} />
          <Toggle label="Bloquear download após expirar — impede que o cliente baixe as fotos após a data limite" on={f.bloquearDownload} onToggle={() => set("bloquearDownload", !f.bloquearDownload)} />
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-stone-700">Mensagem exibida quando o álbum expira</label>
          <textarea value={f.mensagemExpirado} onChange={(e) => set("mensagemExpirado", e.target.value)} rows={3} className={txt} />
        </div>
        {!f.bloquearVisualizacao && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Com "Bloquear visualização" desligado, o cliente continua vendo as fotos mesmo expirado — só o download pode ficar bloqueado, se ativado.
          </p>
        )}
        <button onClick={() => salvarSecao("exibicao")} className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
          {salvo === "exibicao" ? "Salvo!" : "Salvar Configurações de Exibição"}
        </button>
      </section>
    </main>
  );
}


function Campo({ rotulo, valor, destaque }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-stone-400">{rotulo}</div>
      <div className={`font-medium ${destaque ? "text-amber-600" : "text-stone-700"}`}>{valor}</div>
    </div>
  );
}

// ── Tela 3: Editar regras ────────────────────────────────────

function ModalRegras({ album, onClose, onSalvar }) {
  const [f, setF] = useState({
    prazo_dias: album.prazo_dias, disponivel_em: album.disponivel_em, expira_em: album.expira_em,
    permite_download: album.permite_download, permite_comentarios: album.permite_comentarios,
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const inp = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
          <h2 className="text-lg font-bold tracking-tight">Regras e prazos do álbum</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Disponível em</label>
              <input type="date" value={f.disponivel_em} onChange={(e) => set("disponivel_em", e.target.value)} className={inp} /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Vence em</label>
              <input type="date" value={f.expira_em} onChange={(e) => set("expira_em", e.target.value)} className={inp} /></div>
          </div>
          <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Prazo (dias)</label>
            <input type="number" value={f.prazo_dias} onChange={(e) => set("prazo_dias", e.target.value)} className={inp} />
            <p className="mt-1 text-xs text-stone-400">Pré-preenchido pelo Prazo Padrão das Configurações — editável só para este álbum.</p>
          </div>
          <Toggle label="Permitir download das fotos" on={f.permite_download} onToggle={() => set("permite_download", !f.permite_download)} />
          <Toggle label="Permitir comentários nas fotos" on={f.permite_comentarios} onToggle={() => set("permite_comentarios", !f.permite_comentarios)} />
          <p className="flex items-start gap-1.5 rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Aviso de expiração, canais de notificação e preços de prorrogação são regra global — configure na aba "Configurações".
          </p>
        </div>
        <div className="flex justify-end gap-3 border-t border-stone-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100">Cancelar</button>
          <button onClick={() => onSalvar(f)} className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>Salvar regras</button>
        </div>
      </div>
    </div>
  );
}

function ModalNovaGaleria({ onClose, onSalvar }) {
  const [nome, setNome] = useState("");
  const inp = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
          <h2 className="text-lg font-bold tracking-tight">Nova galeria</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-5">
          <label className="mb-1.5 block text-sm font-medium text-stone-700">Nome da galeria</label>
          <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && nome.trim() && onSalvar(nome.trim())} className={inp} placeholder="Ex.: Cerimônia, Festa, Cabine" />
        </div>
        <div className="flex justify-end gap-3 border-t border-stone-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100">Cancelar</button>
          <button onClick={() => nome.trim() && onSalvar(nome.trim())} disabled={!nome.trim()} className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-40 hover:opacity-90" style={{ background: ACCENT }}>Criar galeria</button>
        </div>
      </div>
    </div>
  );
}

function ModalTitulo({ titulo, onClose, onSalvar }) {
  const [t, setT] = useState(titulo);
  const inp = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
          <h2 className="text-lg font-bold tracking-tight">Editar título do álbum</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-5">
          <input autoFocus value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === "Enter" && t.trim() && onSalvar(t.trim())} className={inp} />
        </div>
        <div className="flex justify-end gap-3 border-t border-stone-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100">Cancelar</button>
          <button onClick={() => t.trim() && onSalvar(t.trim())} disabled={!t.trim()} className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-40 hover:opacity-90" style={{ background: ACCENT }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

function AvisoProximaRodada({ titulo, texto, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="px-6 py-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
            <ImageIcon className="h-6 w-6" style={{ color: ACCENT }} />
          </div>
          <h2 className="text-lg font-bold tracking-tight">{titulo}</h2>
          <p className="mt-2 text-sm text-stone-500">{texto}</p>
          <button onClick={onClose} className="mt-5 w-full rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>Entendi</button>
        </div>
      </div>
    </div>
  );
}

function ModalRenomearGaleria({ galeria, onClose, onSalvar }) {
  const [nome, setNome] = useState(galeria.nome);
  const inp = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
          <h2 className="text-lg font-bold tracking-tight">Renomear galeria</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-5">
          <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && nome.trim() && onSalvar(nome.trim())} className={inp} />
        </div>
        <div className="flex justify-end gap-3 border-t border-stone-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100">Cancelar</button>
          <button onClick={() => nome.trim() && onSalvar(nome.trim())} disabled={!nome.trim()} className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-40 hover:opacity-90" style={{ background: ACCENT }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

function ModalApagarGaleria({ galeria, onClose, onConfirmar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="px-6 py-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <Trash2 className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">Apagar a galeria "{galeria.nome}"?</h2>
          <p className="mt-2 text-sm text-stone-500">
            {galeria.fotos > 0
              ? <>Esta galeria tem <strong>{galeria.fotos} fotos</strong>. Apagá-la remove a galeria e todas as fotos dentro dela. Esta ação não pode ser desfeita.</>
              : "Esta galeria está vazia. Tem certeza que deseja removê-la?"}
          </p>
          <div className="mt-5 flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-lg py-2.5 text-sm font-medium text-stone-500 ring-1 ring-stone-300 hover:bg-stone-50">Cancelar</button>
            <button onClick={onConfirmar} className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: "#DC2626" }}>Apagar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, on, onToggle }) {
  return (
    <button onClick={onToggle} className="flex w-full items-center justify-between text-left text-sm">
      <span className="text-stone-600">{label}</span>
      <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${on ? "" : "bg-stone-200"}`} style={on ? { background: ACCENT } : {}}>
        <span className={`h-4 w-4 rounded-full bg-white shadow transition ${on ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}
