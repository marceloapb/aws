import React, { useState } from "react";
import {
  Camera, Plus, Trash2, X, Calendar, Clock, MapPin, Package, Check, Sparkles,
  ArrowRight, Pencil, Layers, Lock, Mail, User, CreditCard, Wallet, Banknote,
  Settings, FileText, ChevronRight, Percent, Info
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo acumulado — Módulo Orçamento (MVP-1)
// Telas: 1) Cadastro/login  2) Solicitação (cliente, sem preço)
//        3) ADM monta opções  4) Proposta (cliente)  5) Configurações
// Identidade visual padrão do projeto. Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── Catálogo mínimo (com descrição, para a visão do cliente) ──
const SERVICOS = [
  { id: 1, nome: "Casamento", valorBase: 5000, duracaoBase: 8, valorHora: 400, descricao: "Cobertura completa da cerimônia e festa, com edição premium das melhores imagens." },
  { id: 2, nome: "Aniversário", valorBase: 400, duracaoBase: 4, valorHora: 100, descricao: "Cobertura da festa do começo ao fim, com fotos tratadas e entregues em galeria online." },
  { id: 3, nome: "Batizado", valorBase: 800, duracaoBase: 3, valorHora: 150, descricao: "Registro da cerimônia religiosa e confraternização, com olhar delicado para os detalhes." },
];
const OPCIONAIS = [
  { id: 4, nome: "Álbum Premium", valorBase: 900, descricao: "Capa em couro, 40 páginas, papel fine art." },
  { id: 5, nome: "Álbum Simples", valorBase: 400, descricao: "Capa rígida, 20 páginas." },
  { id: 6, nome: "Drone", valorBase: 600, descricao: "Tomadas aéreas em 4K." },
  { id: 7, nome: "Cabine", valorBase: 500, descricao: "Cabine de fotos com props e impressão na hora." },
];
const servicoById = (id) => SERVICOS.find((s) => s.id === id);
const opcionalById = (id) => OPCIONAIS.find((o) => o.id === id);

// Config padrão do estúdio (parametrizável na tela 5)
const CONFIG_PADRAO = {
  validadeDias: 30,
  rodapeOrcamento: "Orçamento válido por 30 dias. Valores sujeitos a alteração.",
  aVistaAtivo: true, aVistaDesconto: 5, aVistaDescontoMax: 10,
  aVistaTexto: "5% de desconto à vista no Pix ou transferência.",
  semJurosAtivo: true, semJurosMax: 5, semJurosParcelaMin: 200,
  semJurosTexto: "Em até 5x sem juros no cartão.",
  comJurosAtivo: true, comJurosMax: 12, comJurosTaxa: 3, comJurosParcelaMin: 150,
  comJurosTexto: "Em até 12x com juros (igual maquininha).",
  descontoMaxPct: 20, permiteDescManualRS: true, permiteDescManualPct: true,
  exigeObsDesconto: true, exibeTotalDesconto: true,
  meios: ["Pix", "Dinheiro", "Cartão de crédito", "Transferência"],
  msgOrcamento: "Olá, {{nome_cliente}}! Preparei esta proposta com muito carinho para o seu evento.",
};

// ── Cálculos ──────────────────────────────────────────────────
const parseHora = (hhmm) => {
  if (!hhmm || !hhmm.includes(":")) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h + m / 60;
};
function calcItem(item) {
  const s = servicoById(item.servicoId);
  if (!s) return { base: 0, extra: 0, opcionais: 0, total: 0, horasExtras: 0 };
  const ini = parseHora(item.horaInicio), fim = parseHora(item.horaFim);
  const horas = ini != null && fim != null ? Math.max(0, fim - ini) : s.duracaoBase;
  const horasExtras = Math.max(0, horas - s.duracaoBase);
  const extra = horasExtras * s.valorHora;
  const opcionais = item.opcionalIds.reduce((a, id) => a + (opcionalById(id)?.valorBase || 0), 0);
  return { base: s.valorBase, extra, opcionais, horasExtras: Math.round(horasExtras * 100) / 100, total: s.valorBase + extra + opcionais };
}
function calcOpcao(opcao) {
  const subtotal = opcao.itens.reduce((a, it) => a + calcItem(it).total, 0);
  const desconto = opcao.descTipo === "percentual" ? subtotal * (Number(opcao.desc || 0) / 100) : Number(opcao.desc || 0);
  const sugerido = Math.max(0, subtotal - desconto);
  const final = opcao.valorFinal !== "" && opcao.valorFinal != null ? Number(opcao.valorFinal) : sugerido;
  return { subtotal, desconto, sugerido, final };
}
// tabela price: parcela = PV * i / (1 - (1+i)^-n)
function parcelaComJuros(valor, taxaPct, n) {
  const i = taxaPct / 100;
  if (i === 0) return valor / n;
  return (valor * i) / (1 - Math.pow(1 + i, -n));
}

// máscara de telefone BR: (11) 99999-9999, trava em 11 dígitos
function mascararTelefone(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// CEP simulado (no sistema real consulta um guia postal tipo ViaCEP)
const CEPS_DEMO = {
  "01310100": { rua: "Av. Paulista", bairro: "Bela Vista", cidade: "São Paulo", uf: "SP" },
  "04538133": { rua: "Av. Brigadeiro Faria Lima", bairro: "Itaim Bibi", cidade: "São Paulo", uf: "SP" },
};
function buscarCep(cepDigits) {
  return CEPS_DEMO[cepDigits] || { rua: "Rua encontrada pelo CEP", bairro: "Bairro", cidade: "São Paulo", uf: "SP" };
}

const TELAS = [
  { id: "cadastro", nome: "1. Cadastro", icon: Lock },
  { id: "solicitacao", nome: "2. Solicitação (cliente)", icon: FileText },
  { id: "adm", nome: "3. Montar opções (ADM)", icon: Layers },
  { id: "proposta", nome: "4. Proposta (cliente)", icon: Package },
  { id: "config", nome: "5. Configurações", icon: Settings },
];

export default function OrcamentoCompleto() {
  const [tela, setTela] = useState("cadastro");
  const [config] = useState(CONFIG_PADRAO);

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
         className="min-h-screen bg-stone-50 text-stone-900">
      {/* navegação do protótipo */}
      <div className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 overflow-x-auto px-4 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
            <Camera className="h-4 w-4 text-white" />
          </div>
          {TELAS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTela(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${tela === t.id ? "text-white" : "text-stone-500 hover:text-stone-800"}`}
                style={tela === t.id ? { background: ACCENT } : {}}>
                <Icon className="h-3.5 w-3.5" /> {t.nome}
              </button>
            );
          })}
        </div>
      </div>

      {tela === "cadastro" && <TelaCadastro onIr={() => setTela("solicitacao")} />}
      {tela === "solicitacao" && <TelaSolicitacao onIr={() => setTela("adm")} />}
      {tela === "adm" && <TelaADM config={config} onIr={() => setTela("proposta")} />}
      {tela === "proposta" && <TelaProposta config={config} />}
      {tela === "config" && <TelaConfig config={config} />}
    </div>
  );
}

// ── Tela 1: Cadastro / login do cliente ──────────────────────

function TelaCadastro({ onIr }) {
  const [modo, setModo] = useState("cadastro");
  const [tel, setTel] = useState("");
  return (
    <main className="mx-auto flex max-w-md flex-col px-6 py-12">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {modo === "cadastro" ? "Crie sua conta" : "Entrar"}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {modo === "cadastro"
            ? "Cadastre-se para solicitar seu orçamento e acompanhar tudo num só lugar."
            : "Acesse seus orçamentos, contratos e álbuns."}
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="space-y-4">
          {modo === "cadastro" && (
            <CampoIcone icon={User} label="Nome completo">
              <input className={inp} placeholder="Marina Silva" />
            </CampoIcone>
          )}
          <CampoIcone icon={Mail} label="E-mail">
            <input className={inp} placeholder="voce@email.com" type="email" />
          </CampoIcone>
          {modo === "cadastro" && (
            <CampoIcone icon={User} label="WhatsApp">
              <input className={inp} placeholder="(11) 99999-9999" inputMode="numeric"
                value={tel} onChange={(e) => setTel(mascararTelefone(e.target.value))} />
            </CampoIcone>
          )}
          <CampoIcone icon={Lock} label="Senha">
            <input className={inp} placeholder="••••••••" type="password" />
          </CampoIcone>

          <button onClick={onIr}
            className="mt-2 w-full rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ background: ACCENT }}>
            {modo === "cadastro" ? "Criar conta e continuar" : "Entrar"}
          </button>
        </div>
      </div>

      <button onClick={() => setModo(modo === "cadastro" ? "login" : "cadastro")}
        className="mt-4 text-center text-sm text-stone-500 hover:text-stone-800">
        {modo === "cadastro" ? "Já tem conta? Entrar" : "Não tem conta? Cadastre-se"}
      </button>

      <p className="mt-6 flex items-start gap-1.5 rounded-lg bg-stone-100 p-3 text-xs text-stone-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        O cadastro vem antes do orçamento de propósito: protege os preços e dá ao cliente um espaço para
        acompanhar tudo depois.
      </p>
    </main>
  );
}

function CampoIcone({ icon: Icon, label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-stone-700">{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-stone-300 px-3 transition focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
        <Icon className="h-4 w-4 text-stone-400" />
        {children}
      </div>
    </div>
  );
}
const inp = "w-full bg-transparent py-2 text-sm outline-none placeholder:text-stone-300";

// ── Tela 2: Solicitação do cliente (SEM preço) ───────────────

function TelaSolicitacao({ onIr }) {
  const [eventos, setEventos] = useState([
    { id: 1, servicoId: 1, data: "", horaInicio: "", horaFim: "", nomeLocal: "", cep: "", rua: "", numero: "", bairro: "", cidade: "", complemento: "", opcionalIds: [] },
  ]);
  const upd = (id, patch) => setEventos((e) => e.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)));
  const add = () => setEventos((e) => [...e, { id: Date.now(), servicoId: 1, data: "", horaInicio: "", horaFim: "", nomeLocal: "", cep: "", rua: "", numero: "", bairro: "", cidade: "", complemento: "", opcionalIds: [] }]);
  const rem = (id) => setEventos((e) => e.filter((ev) => ev.id !== id));
  const toggleOpc = (id, opcId) =>
    setEventos((e) => e.map((ev) => ev.id === id ? { ...ev, opcionalIds: ev.opcionalIds.includes(opcId) ? ev.opcionalIds.filter((x) => x !== opcId) : [...ev.opcionalIds, opcId] } : ev));

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Conte sobre seu evento</h1>
      <p className="mt-1 text-sm text-stone-500">
        Monte o que você imagina. O fotógrafo vai preparar uma proposta personalizada e enviar com os valores.
      </p>

      <div className="mt-6 space-y-4">
        {eventos.map((ev, idx) => (
          <div key={ev.id} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Evento {idx + 1}</h2>
              {eventos.length > 1 && (
                <button onClick={() => rem(ev.id)} className="rounded-md p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Tipo de evento</label>
                <select value={ev.servicoId} onChange={(e) => upd(ev.id, { servicoId: Number(e.target.value) })} className={inpBox}>
                  {SERVICOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Data</label>
                <input type="date" value={ev.data} onChange={(e) => upd(ev.id, { data: e.target.value })} className={inpBox} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">Início</label>
                  <input type="time" value={ev.horaInicio} onChange={(e) => upd(ev.id, { horaInicio: e.target.value })} className={inpBox} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">Término</label>
                  <input type="time" value={ev.horaFim} onChange={(e) => upd(ev.id, { horaFim: e.target.value })} className={inpBox} />
                </div>
              </div>
              <CampoLocal ev={ev} upd={(patch) => upd(ev.id, patch)} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">O que mais você gostaria? (opcional)</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {OPCIONAIS.map((o) => {
                    const on = ev.opcionalIds.includes(o.id);
                    return (
                      <button key={o.id} onClick={() => toggleOpc(ev.id, o.id)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm transition ${on ? "bg-orange-50 ring-1 ring-orange-200" : "border border-stone-200 hover:bg-stone-50"}`}>
                        {on ? <Check className="h-3.5 w-3.5" style={{ color: ACCENT }} /> : <span className="h-3.5 w-3.5" />}
                        {o.nome}
                      </button>
                    );
                  })}
                </div>
                {/* sem preço: o cliente não vê valores nesta tela */}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={add} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 py-3 text-sm font-medium text-stone-500 transition hover:border-orange-300 hover:text-orange-600">
        <Plus className="h-4 w-4" /> Adicionar outro evento (ex.: batizado + festa)
      </button>

      <div className="mt-6 flex items-center justify-between rounded-xl bg-stone-100 p-4">
        <span className="flex items-center gap-2 text-sm text-stone-500">
          <Info className="h-4 w-4" /> Você receberá a proposta com os valores em breve.
        </span>
        <button onClick={onIr} className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: ACCENT }}>
          Enviar solicitação
        </button>
      </div>
    </main>
  );
}
const inpBox = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-stone-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

function CampoLocal({ ev, upd }) {
  const onCep = (v) => {
    const masc = v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
    const patch = { cep: masc };
    const digits = masc.replace(/\D/g, "");
    if (digits.length === 8) {
      const r = buscarCep(digits);
      Object.assign(patch, { rua: r.rua, bairro: r.bairro, cidade: `${r.cidade}/${r.uf}` });
    }
    upd(patch);
  };
  return (
    <div className="rounded-xl border border-stone-200 p-3">
      <label className="mb-2 block text-sm font-medium text-stone-700">Local do evento</label>
      <div className="space-y-2.5">
        <input value={ev.nomeLocal} onChange={(e) => upd({ nomeLocal: e.target.value })}
          placeholder="Nome do espaço (ex.: Buffet Villa)" className={inpBox} />
        <div className="grid grid-cols-3 gap-2.5">
          <input value={ev.cep} onChange={(e) => onCep(e.target.value)} inputMode="numeric"
            placeholder="CEP" className={inpBox} />
          <input value={ev.rua} onChange={(e) => upd({ rua: e.target.value })}
            placeholder="Rua" className={`col-span-2 ${inpBox}`} />
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <input value={ev.numero} onChange={(e) => upd({ numero: e.target.value })}
            placeholder="Número" className={inpBox} />
          <input value={ev.bairro} onChange={(e) => upd({ bairro: e.target.value })}
            placeholder="Bairro" className={inpBox} />
          <input value={ev.cidade} onChange={(e) => upd({ cidade: e.target.value })}
            placeholder="Cidade/UF" className={inpBox} />
        </div>
        <input value={ev.complemento} onChange={(e) => upd({ complemento: e.target.value })}
          placeholder="Complemento (opcional)" className={inpBox} />
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-400">
        <Info className="h-3 w-3" /> Digite o CEP que rua, bairro e cidade são preenchidos (use 01310-100 para testar).
      </p>
    </div>
  );
}

// ── Tela 3: ADM monta opções ─────────────────────────────────

function TelaADM({ config, onIr }) {
  const [opcoes, setOpcoes] = useState([
    { id: 1, rotulo: "Opção Completa", descTipo: "percentual", desc: 15, valorFinal: "",
      itens: [{ id: 1, servicoId: 1, data: "2026-12-12", horaInicio: "16:00", horaFim: "23:30", local: "Espaço Villa", opcionalIds: [4, 6] }] },
    { id: 2, rotulo: "Opção Essencial", descTipo: "fixo", desc: 300, valorFinal: "",
      itens: [{ id: 2, servicoId: 1, data: "2026-12-12", horaInicio: "18:00", horaFim: "23:00", local: "Espaço Villa", opcionalIds: [5] }] },
  ]);
  const [modal, setModal] = useState(null);

  const updOpcao = (id, patch) => setOpcoes((o) => o.map((op) => op.id === id ? { ...op, ...patch } : op));
  const addOpcao = () => setOpcoes((o) => [...o, { id: Date.now(), rotulo: `Opção ${o.length + 1}`, descTipo: "percentual", desc: 0, valorFinal: "", itens: [] }]);
  const remOpcao = (id) => setOpcoes((o) => o.filter((op) => op.id !== id));
  const salvarItem = (opId, item) => setOpcoes((o) => o.map((op) => op.id === opId
    ? { ...op, itens: item.id ? op.itens.map((it) => it.id === item.id ? item : it) : [...op.itens, { ...item, id: Date.now() }] } : op));
  const remItem = (opId, itId) => setOpcoes((o) => o.map((op) => op.id === opId ? { ...op, itens: op.itens.filter((it) => it.id !== itId) } : op));

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marina e Rafael</h1>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium" style={{ color: "#C2410C" }}>
              <Layers className="h-3 w-3" /> Montando opções
            </span>
            <span className="text-stone-400">·</span>
            <span className="text-stone-500">Cliente vê: <span className="font-medium text-stone-600">Em análise</span></span>
          </div>
        </div>
        <button onClick={onIr} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: ACCENT }}>
          <ArrowRight className="h-4 w-4" /> Enviar ao cliente
        </button>
      </div>

      <div className="space-y-5">
        {opcoes.map((op) => (
          <OpcaoCard key={op.id} opcao={op} config={config} podeRemover={opcoes.length > 1}
            onUpd={(p) => updOpcao(op.id, p)} onRemove={() => remOpcao(op.id)}
            onAddItem={() => setModal({ opId: op.id, item: { servicoId: 1, data: "", horaInicio: "", horaFim: "", local: "", opcionalIds: [] } })}
            onEditItem={(it) => setModal({ opId: op.id, item: { ...it } })}
            onRemoveItem={(itId) => remItem(op.id, itId)} />
        ))}
      </div>

      <button onClick={addOpcao} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 py-4 text-sm font-medium text-stone-500 transition hover:border-orange-300 hover:text-orange-600">
        <Plus className="h-4 w-4" /> Adicionar outra opção
      </button>

      {modal && <ModalItem dados={modal.item} onClose={() => setModal(null)} onSalvar={(it) => { salvarItem(modal.opId, it); setModal(null); }} />}
    </main>
  );
}

function OpcaoCard({ opcao, config, podeRemover, onUpd, onRemove, onAddItem, onEditItem, onRemoveItem }) {
  const calc = calcOpcao(opcao);
  const aVista = calc.final * (1 - config.aVistaDesconto / 100);
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-stone-100 bg-stone-50/60 px-5 py-3">
        <Package className="h-4 w-4" style={{ color: ACCENT }} />
        <input value={opcao.rotulo} onChange={(e) => onUpd({ rotulo: e.target.value })}
          className="rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold outline-none hover:border-stone-200 focus:border-orange-300 focus:bg-white" />
        <span className="ml-auto text-sm text-stone-400">sugerido <span className="font-medium text-stone-600">{brl(calc.sugerido)}</span></span>
        {podeRemover && <button onClick={onRemove} className="rounded-md p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500"><Trash2 className="h-4 w-4" /></button>}
      </div>

      <div className="divide-y divide-stone-100">
        {opcao.itens.map((it) => {
          const s = servicoById(it.servicoId); const ic = calcItem(it);
          return (
            <div key={it.id} className="flex items-start gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{s?.nome}</div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{it.data || "sem data"}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
                    {it.horaInicio && it.horaFim ? `${it.horaInicio}–${it.horaFim}` : "sem horário"}
                    {ic.horasExtras > 0 && <span style={{ color: ACCENT }}> (+{ic.horasExtras}h)</span>}
                  </span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{it.local || "sem local"}</span>
                </div>
                {it.opcionalIds.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {it.opcionalIds.map((id) => <span key={id} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{opcionalById(id)?.nome}</span>)}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-medium tabular-nums">{brl(ic.total)}</div>
                <div className="mt-1 flex justify-end gap-1">
                  <button onClick={() => onEditItem(it)} className="rounded-md p-1.5" style={{ background: "#FEF3EC", color: "#C2410C" }}><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => onRemoveItem(it.id)} className="rounded-md p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
        {opcao.itens.length === 0 && <div className="px-5 py-6 text-center text-sm text-stone-400">Nenhum evento nesta opção.</div>}
      </div>

      <div className="border-t border-stone-100 px-5 py-3">
        <button onClick={onAddItem} className="mb-3 flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700">
          <Plus className="h-4 w-4" /> Adicionar evento
        </button>
        <div className="flex flex-wrap items-end gap-4 border-t border-stone-100 pt-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">Desconto</label>
            <div className="flex gap-2">
              <select value={opcao.descTipo} onChange={(e) => onUpd({ descTipo: e.target.value })} className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-orange-400">
                <option value="percentual">%</option><option value="fixo">R$</option>
              </select>
              <input type="number" value={opcao.desc} onChange={(e) => onUpd({ desc: e.target.value })} className="w-20 rounded-lg border border-stone-300 px-2 py-1.5 text-sm outline-none focus:border-orange-400" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">Valor final</label>
            <input type="number" value={opcao.valorFinal} placeholder={String(Math.round(calc.sugerido))} onChange={(e) => onUpd({ valorFinal: e.target.value })}
              className="w-36 rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none placeholder:text-stone-300 focus:border-orange-400" />
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-stone-400">à vista {brl(aVista)} · final {brl(calc.final)}</div>
            <div className="text-lg font-bold" style={{ color: ACCENT }}>{brl(calc.final)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalItem({ dados, onClose, onSalvar }) {
  const [f, setF] = useState(dados);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleOpc = (id) => setF((p) => ({ ...p, opcionalIds: p.opcionalIds.includes(id) ? p.opcionalIds.filter((x) => x !== id) : [...p.opcionalIds, id] }));
  const ic = calcItem(f); const s = servicoById(f.servicoId);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5">
          <h2 className="text-lg font-bold tracking-tight">{dados.id ? "Editar evento" : "Adicionar evento"}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Serviço</label>
            <select value={f.servicoId} onChange={(e) => set("servicoId", Number(e.target.value))} className={inpBox}>
              {SERVICOS.map((s) => <option key={s.id} value={s.id}>{s.nome} · {brl(s.valorBase)} ({s.duracaoBase}h)</option>)}
            </select>
          </div>
          <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Data</label>
            <input type="date" value={f.data} onChange={(e) => set("data", e.target.value)} className={inpBox} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Início</label>
              <input type="time" value={f.horaInicio} onChange={(e) => set("horaInicio", e.target.value)} className={inpBox} /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Término</label>
              <input type="time" value={f.horaFim} onChange={(e) => set("horaFim", e.target.value)} className={inpBox} /></div>
          </div>
          <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Local</label>
            <input value={f.local} onChange={(e) => set("local", e.target.value)} className={inpBox} placeholder="Endereço ou espaço" /></div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">Adicionais</label>
            <div className="grid grid-cols-2 gap-1.5">
              {OPCIONAIS.map((o) => {
                const on = f.opcionalIds.includes(o.id);
                return <button key={o.id} onClick={() => toggleOpc(o.id)} className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${on ? "bg-orange-50 ring-1 ring-orange-200" : "border border-stone-200 hover:bg-stone-50"}`}>
                  <span className="flex items-center gap-1.5">{on && <Check className="h-3.5 w-3.5" style={{ color: ACCENT }} />}{o.nome}</span>
                  <span className="text-xs text-stone-400">{brl(o.valorBase)}</span></button>;
              })}
            </div>
          </div>
          <div className="rounded-xl bg-stone-50 p-3 text-sm">
            <div className="flex justify-between text-stone-500"><span>{s?.nome} (base {s?.duracaoBase}h)</span><span className="tabular-nums">{brl(ic.base)}</span></div>
            {ic.horasExtras > 0 && <div className="flex justify-between text-stone-500"><span>{ic.horasExtras}h extra</span><span className="tabular-nums">{brl(ic.extra)}</span></div>}
            {ic.opcionais > 0 && <div className="flex justify-between text-stone-500"><span>Adicionais</span><span className="tabular-nums">{brl(ic.opcionais)}</span></div>}
            <div className="mt-1 flex justify-between border-t border-stone-200 pt-1 font-semibold"><span>Subtotal</span><span className="tabular-nums">{brl(ic.total)}</span></div>
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-stone-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100">Cancelar</button>
          <button onClick={() => onSalvar(f)} className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>
            {dados.id ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tela 4: Proposta na visão do cliente ─────────────────────

function TelaProposta({ config }) {
  const opcoes = [
    { id: 1, rotulo: "Opção Completa", descTipo: "percentual", desc: 15, valorFinal: "",
      itens: [{ id: 1, servicoId: 1, data: "2026-12-12", horaInicio: "16:00", horaFim: "23:30", local: "Espaço Villa", opcionalIds: [4, 6] }] },
    { id: 2, rotulo: "Opção Essencial", descTipo: "fixo", desc: 300, valorFinal: "",
      itens: [{ id: 2, servicoId: 1, data: "2026-12-12", horaInicio: "18:00", horaFim: "23:00", local: "Espaço Villa", opcionalIds: [5] }] },
  ];
  const [escolhida, setEscolhida] = useState(null);
  const [aceitando, setAceitando] = useState(false); // abre o modal de forma de pagamento
  const [confirmado, setConfirmado] = useState(null); // { opcao, forma, valor }

  const opcaoSel = opcoes.find((o) => o.id === escolhida);

  if (confirmado) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "#ECFDF5" }}>
          <Check className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Orçamento confirmado!</h1>
        <p className="mt-2 text-stone-500">
          Você fechou a <strong>{confirmado.opcao.rotulo}</strong>, pagando <strong>{confirmado.formaLabel}</strong> —
          total de <strong>{brl(confirmado.valor)}</strong>. Sua data foi reservada e o fotógrafo dará os próximos passos.
        </p>
        <button onClick={() => { setConfirmado(null); setEscolhida(null); }} className="mt-6 text-sm font-medium text-orange-600 hover:text-orange-700">← Rever proposta (demo)</button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="text-sm text-stone-400">Olá, Marina 👋</div>
      <h1 className="text-2xl font-bold tracking-tight">Sua proposta está pronta</h1>
      <p className="mt-1 max-w-2xl text-sm text-stone-500">{config.msgOrcamento.replace("{{nome_cliente}}", "Marina")}</p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {opcoes.map((op) => {
          const calc = calcOpcao(op);
          const sel = escolhida === op.id;
          const aVista = calc.final * (1 - config.aVistaDesconto / 100);
          const semJuros = calc.final / config.semJurosMax;
          const comJurosParc = parcelaComJuros(calc.final, config.comJurosTaxa, config.comJurosMax);
          return (
            <div key={op.id} className={`flex flex-col rounded-2xl border-2 bg-white p-5 transition ${sel ? "shadow-md" : "border-stone-200"}`} style={sel ? { borderColor: ACCENT } : {}}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight">{op.rotulo}</h2>
                {sel && <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: ACCENT }}>Escolhida</span>}
              </div>

              <div className="my-4 space-y-3">
                {op.itens.map((it) => {
                  const s = servicoById(it.servicoId);
                  return (
                    <div key={it.id} className="rounded-xl bg-stone-50 p-3">
                      <div className="font-medium">{s?.nome}</div>
                      <div className="mt-0.5 text-xs text-stone-500">{s?.descricao}</div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{it.data}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{it.horaInicio}–{it.horaFim}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{it.local}</span>
                      </div>
                      {it.opcionalIds.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {it.opcionalIds.map((id) => {
                            const o = opcionalById(id);
                            return <div key={id} className="text-xs text-stone-600"><span className="font-medium">{o?.nome}</span> — <span className="text-stone-400">{o?.descricao}</span></div>;
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* condições de pagamento — cliente vê só valores finais */}
              <div className="mb-3 rounded-xl border border-stone-100 bg-stone-50/50 p-3">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-sm text-stone-500">Investimento</span>
                  <span className="text-2xl font-bold" style={{ color: ACCENT }}>{brl(calc.final)}</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  {config.aVistaAtivo && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-stone-600"><Wallet className="h-3.5 w-3.5" style={{ color: ACCENT }} /> À vista ({config.aVistaDesconto}% off)</span>
                      <span className="font-semibold tabular-nums" style={{ color: ACCENT }}>{brl(aVista)}</span>
                    </div>
                  )}
                  {config.semJurosAtivo && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-stone-600"><CreditCard className="h-3.5 w-3.5" /> {config.semJurosMax}x sem juros</span>
                      <span className="tabular-nums text-stone-700">{config.semJurosMax}× {brl(semJuros)}</span>
                    </div>
                  )}
                  {config.comJurosAtivo && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-stone-600"><CreditCard className="h-3.5 w-3.5" /> até {config.comJurosMax}x c/ juros</span>
                      <span className="tabular-nums text-stone-500">{config.comJurosMax}× {brl(comJurosParc)}</span>
                    </div>
                  )}
                </div>
              </div>

              <button onClick={() => setEscolhida(op.id)}
                className={`mt-auto w-full rounded-lg py-2.5 text-sm font-semibold transition ${sel ? "text-white" : "ring-1 ring-stone-300 text-stone-600 hover:bg-stone-50"}`}
                style={sel ? { background: ACCENT } : {}}>
                {sel ? "Opção escolhida" : "Escolher esta opção"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-stone-100 p-3 text-xs text-stone-500">
        <Banknote className="h-4 w-4" /> Formas de pagamento aceitas: {config.meios.join(", ")}.
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4">
        <span className="text-sm text-stone-500">{escolhida ? "Tudo certo? Confirme para reservar sua data." : "Escolha uma opção para continuar."}</span>
        <div className="flex gap-2">
          <button className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 ring-1 ring-stone-300 hover:bg-stone-50">Recusar</button>
          <button disabled={!escolhida} onClick={() => setAceitando(true)} className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-90" style={{ background: ACCENT }}>Aceitar e reservar</button>
        </div>
      </div>

      {aceitando && opcaoSel && (
        <ModalPagamento opcao={opcaoSel} config={config}
          onClose={() => setAceitando(false)}
          onConfirmar={(forma) => { setAceitando(false); setConfirmado({ opcao: opcaoSel, ...forma }); }} />
      )}
    </main>
  );
}

// Modal de escolha de forma de pagamento no aceite (compromisso firme)
function ModalPagamento({ opcao, config, onClose, onConfirmar }) {
  const calc = calcOpcao(opcao);
  const aVista = calc.final * (1 - config.aVistaDesconto / 100);
  const semJuros = calc.final / config.semJurosMax;
  const comJurosParc = parcelaComJuros(calc.final, config.comJurosTaxa, config.comJurosMax);
  const comJurosTotal = comJurosParc * config.comJurosMax;

  const formas = [
    config.aVistaAtivo && { id: "avista", label: `À vista (${config.aVistaDesconto}% off)`, detalhe: "Pix ou transferência", valor: aVista, destaque: true },
    config.semJurosAtivo && { id: "semjuros", label: `${config.semJurosMax}x sem juros`, detalhe: `${config.semJurosMax} parcelas de ${brl(semJuros)}`, valor: calc.final },
    config.comJurosAtivo && { id: "comjuros", label: `${config.comJurosMax}x com juros`, detalhe: `${config.comJurosMax} parcelas de ${brl(comJurosParc)}`, valor: comJurosTotal },
  ].filter(Boolean);

  const [sel, setSel] = useState(formas[0]?.id);
  const formaSel = formas.find((f) => f.id === sel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Como você quer pagar?</h2>
            <p className="mt-0.5 text-sm text-stone-500">{opcao.rotulo} · a forma escolhida define o valor final.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto px-6 py-5">
          {formas.map((f) => {
            const on = sel === f.id;
            return (
              <button key={f.id} onClick={() => setSel(f.id)}
                className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition ${on ? "" : "border-stone-200 hover:bg-stone-50"}`}
                style={on ? { borderColor: ACCENT } : {}}>
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    {f.label}
                    {f.destaque && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs" style={{ color: "#C2410C" }}>melhor preço</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-stone-500">{f.detalhe}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold tabular-nums" style={{ color: on ? ACCENT : "#1c1917" }}>{brl(f.valor)}</div>
                  {on && <Check className="ml-auto mt-1 h-4 w-4" style={{ color: ACCENT }} />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="shrink-0 border-t border-stone-100 px-6 py-4">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm text-stone-500">Total a pagar</span>
            <span className="text-xl font-bold" style={{ color: ACCENT }}>{brl(formaSel?.valor)}</span>
          </div>
          <button onClick={() => onConfirmar({ formaLabel: formaSel.label, valor: formaSel.valor })}
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: ACCENT }}>
            Confirmar e reservar minha data
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tela 5: Configurações do Orçamento ───────────────────────

function TelaConfig({ config }) {
  const [c, setC] = useState(config);
  const set = (k, v) => setC((p) => ({ ...p, [k]: v }));
  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Configurações do orçamento</h1>
      <p className="mt-1 text-sm text-stone-500">Prazos, condições de pagamento e mensagens. Tudo parametrizável — nada fixo no sistema.</p>

      <div className="mt-6 space-y-5">
        {/* Validade */}
        <Secao titulo="Validade do orçamento" icon={Calendar}>
          <Linha label="Validade padrão (dias)"><input type="number" value={c.validadeDias} onChange={(e) => set("validadeDias", e.target.value)} className={inpMini} /></Linha>
          <Linha label="Texto de rodapé"><input value={c.rodapeOrcamento} onChange={(e) => set("rodapeOrcamento", e.target.value)} className={inpBox} /></Linha>
          <Varis />
        </Secao>

        {/* À vista */}
        <Secao titulo="Pagamento à vista" icon={Wallet} toggle={c.aVistaAtivo} onToggle={(v) => set("aVistaAtivo", v)}>
          <div className="grid grid-cols-2 gap-3">
            <Linha label="Desconto padrão (%)"><input type="number" value={c.aVistaDesconto} onChange={(e) => set("aVistaDesconto", e.target.value)} className={inpMini} /></Linha>
            <Linha label="Desconto máximo (%)"><input type="number" value={c.aVistaDescontoMax} onChange={(e) => set("aVistaDescontoMax", e.target.value)} className={inpMini} /></Linha>
          </div>
          <Linha label="Texto exibido"><input value={c.aVistaTexto} onChange={(e) => set("aVistaTexto", e.target.value)} className={inpBox} /></Linha>
        </Secao>

        {/* Sem juros */}
        <Secao titulo="Parcelamento sem juros" icon={CreditCard} toggle={c.semJurosAtivo} onToggle={(v) => set("semJurosAtivo", v)}>
          <div className="grid grid-cols-2 gap-3">
            <Linha label="Máx. parcelas"><input type="number" value={c.semJurosMax} onChange={(e) => set("semJurosMax", e.target.value)} className={inpMini} /></Linha>
            <Linha label="Valor mínimo da parcela (R$)"><input type="number" value={c.semJurosParcelaMin} onChange={(e) => set("semJurosParcelaMin", e.target.value)} className={inpMini} /></Linha>
          </div>
          <Linha label="Texto exibido"><input value={c.semJurosTexto} onChange={(e) => set("semJurosTexto", e.target.value)} className={inpBox} /></Linha>
        </Secao>

        {/* Com juros */}
        <Secao titulo="Parcelamento com juros (tabela price)" icon={Percent} toggle={c.comJurosAtivo} onToggle={(v) => set("comJurosAtivo", v)}>
          <div className="grid grid-cols-3 gap-3">
            <Linha label="Máx. parcelas"><input type="number" value={c.comJurosMax} onChange={(e) => set("comJurosMax", e.target.value)} className={inpMini} /></Linha>
            <Linha label="Taxa mensal (%)"><input type="number" value={c.comJurosTaxa} onChange={(e) => set("comJurosTaxa", e.target.value)} className={inpMini} /></Linha>
            <Linha label="Parcela mín. (R$)"><input type="number" value={c.comJurosParcelaMin} onChange={(e) => set("comJurosParcelaMin", e.target.value)} className={inpMini} /></Linha>
          </div>
          <Linha label="Texto exibido"><input value={c.comJurosTexto} onChange={(e) => set("comJurosTexto", e.target.value)} className={inpBox} /></Linha>
          <p className="flex items-start gap-1.5 text-xs text-stone-400"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> A taxa é fixa e vale para todos os orçamentos. Cálculo igual ao da maquininha.</p>
        </Secao>

        {/* Descontos e negociação */}
        <Secao titulo="Descontos e negociação" icon={Percent}>
          <Linha label="Desconto máximo permitido (%)"><input type="number" value={c.descontoMaxPct} onChange={(e) => set("descontoMaxPct", e.target.value)} className={inpMini} /></Linha>
          <CheckLinha label="Permitir desconto manual em R$" checked={c.permiteDescManualRS} onChange={(v) => set("permiteDescManualRS", v)} />
          <CheckLinha label="Permitir desconto manual em %" checked={c.permiteDescManualPct} onChange={(v) => set("permiteDescManualPct", v)} />
          <CheckLinha label="Exigir observação quando houver desconto" checked={c.exigeObsDesconto} onChange={(v) => set("exigeObsDesconto", v)} />
          <CheckLinha label="Exibir total de desconto para o cliente" checked={c.exibeTotalDesconto} onChange={(v) => set("exibeTotalDesconto", v)} />
        </Secao>

        {/* Mensagens */}
        <Secao titulo="Mensagens padrão" icon={FileText}>
          <Linha label="Mensagem do orçamento"><textarea rows={2} value={c.msgOrcamento} onChange={(e) => set("msgOrcamento", e.target.value)} className={inpBox} /></Linha>
          <Varis />
        </Secao>
      </div>

      <button className="mt-6 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>
        <Check className="h-4 w-4" /> Salvar configurações
      </button>
    </main>
  );
}

function Secao({ titulo, icon: Icon, toggle, onToggle, children }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: ACCENT }} />
        <h2 className="font-semibold tracking-tight">{titulo}</h2>
        {onToggle && (
          <button onClick={() => onToggle(!toggle)} className="ml-auto">
            <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${toggle ? "" : "bg-stone-200"}`} style={toggle ? { background: ACCENT } : {}}>
              <span className={`h-4 w-4 rounded-full bg-white shadow transition ${toggle ? "translate-x-4" : ""}`} />
            </span>
          </button>
        )}
      </div>
      <div className={`space-y-3 ${onToggle && !toggle ? "pointer-events-none opacity-40" : ""}`}>{children}</div>
    </div>
  );
}
function Linha({ label, children }) {
  return <div><label className="mb-1.5 block text-sm font-medium text-stone-700">{label}</label>{children}</div>;
}
function CheckLinha({ label, checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex w-full items-center gap-2.5 text-left text-sm">
      <span className={`flex h-4 w-4 items-center justify-center rounded transition ${checked ? "" : "border border-stone-300"}`} style={checked ? { background: ACCENT } : {}}>
        {checked && <Check className="h-3 w-3 text-white" />}
      </span>
      <span className="text-stone-600">{label}</span>
    </button>
  );
}
function Varis() {
  return <p className="text-xs text-stone-400">Variáveis: <code className="rounded bg-stone-100 px-1">{"{{nome_cliente}}"}</code> <code className="rounded bg-stone-100 px-1">{"{{data_vencimento}}"}</code> <code className="rounded bg-stone-100 px-1">{"{{valor_total}}"}</code></p>;
}
const inpMini = "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
