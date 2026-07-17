import React, { useState } from "react";
import {
  MessageCircle, Check, Info, AlertTriangle, Plus, Save, Eye, EyeOff,
  ShieldCheck, ShieldAlert, Clock, XCircle, CheckCircle2, Link2, Tag, Pencil,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — WhatsApp · Frente 1: Conexão & Templates (menu ADM)
// Base técnica do canal WhatsApp (Meta Cloud API DIRETO — sem BSP).
// Duas abas:
//   (A) CONEXÃO   — credenciais da Cloud API (WABA ID, Phone Number ID, token),
//                   modo teste/produção, status da verificação de negócio Meta.
//   (B) TEMPLATES — CRUD de templates que a Meta pré-aprova: categoria
//                   (utility/marketing/auth), corpo com variáveis, status
//                   (rascunho/pendente/aprovado/rejeitado + motivo), vínculo a evento.
// Regra-chave: nenhum template é usável no Outbound sem status "aprovado".
// Categoria é decisão de CUSTO (utility barato/grátis na janela 24h; marketing
// sempre cobrado). Disparo real e inbound são Frentes 2 e 3. Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

const EVENTOS = [
  { id: "", label: "— Sem vínculo —" },
  { id: "pagamento_confirmado", label: "Pagamento confirmado" },
  { id: "pagamento_atrasado", label: "Pagamento atrasado" },
  { id: "album_pronto", label: "Álbum pronto" },
  { id: "album_expirar", label: "Álbum a expirar" },
  { id: "contrato_assinado", label: "Contrato assinado" },
  { id: "lead_frio", label: "Follow-up de lead frio" },
];
const evLabel = (id) => EVENTOS.find((e) => e.id === id)?.label || null;

const CATEGORIAS = {
  utility: { label: "Utility", cls: "bg-emerald-50 text-emerald-600", nota: "Transacional (recibo, aviso). Barato — e grátis dentro da janela de 24h." },
  marketing: { label: "Marketing", cls: "bg-amber-50 text-amber-700", nota: "Promocional. SEMPRE cobrado, mesmo na janela de 24h. Exige opt-out ou a Meta rejeita." },
  authentication: { label: "Authentication", cls: "bg-blue-50 text-blue-600", nota: "Código/verificação. Sempre cobrado, mas com desconto por volume." },
};

const STATUS = {
  rascunho: { label: "Rascunho", cls: "bg-stone-100 text-stone-500", icon: Pencil },
  pendente: { label: "Pendente na Meta", cls: "bg-amber-50 text-amber-700", icon: Clock },
  aprovado: { label: "Aprovado", cls: "bg-emerald-50 text-emerald-600", icon: CheckCircle2 },
  rejeitado: { label: "Rejeitado", cls: "bg-red-50 text-red-600", icon: XCircle },
};

const TEMPLATES_SEED = [
  { id: "t1", nome: "recibo_pagamento", categoria: "utility", idioma: "pt_BR", status: "aprovado", evento: "pagamento_confirmado",
    corpo: "Olá {{1}}! Confirmamos o pagamento de {{2}} referente a {{3}}. Obrigado! 💛" },
  { id: "t2", nome: "album_pronto", categoria: "utility", idioma: "pt_BR", status: "aprovado", evento: "album_pronto",
    corpo: "Oi {{1}}! Seu álbum de {{2}} está pronto 🎉 Acesse: {{3}}" },
  { id: "t3", nome: "lembrete_expiracao", categoria: "utility", idioma: "pt_BR", status: "pendente", evento: "album_expirar",
    corpo: "{{1}}, seu álbum fica disponível até {{2}}. Baixe suas fotos antes que expire!" },
  { id: "t4", nome: "promo_indicacao", categoria: "marketing", idioma: "pt_BR", status: "rejeitado", evento: "",
    corpo: "Indique um amigo e ganhe 10% no próximo ensaio!", motivo: "Falta variável de opt-out exigida pela política de marketing da Meta." },
];

export default function WhatsAppFrente1() {
  const [aba, setAba] = useState("conexao");
  const [conta, setConta] = useState({
    waba_id: "", phone_number_id: "", token: "",
    modo: "teste", verificacao: "nao_verificada", conectado: false,
  });
  const [templates, setTemplates] = useState(TEMPLATES_SEED);

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><MessageCircle className="h-4 w-4 text-white" /></div>
          <span className="text-sm font-semibold tracking-tight">WhatsApp · Conexão e templates</span>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp Business</h1>
        <p className="mt-1 text-sm text-stone-500">Conexão via Meta Cloud API (direto) e gestão dos templates que a Meta precisa aprovar antes de qualquer disparo.</p>

        <div className="mt-5 flex gap-1 border-b border-stone-200">
          {[["conexao", "Conexão"], ["templates", "Templates"]].map(([k, r]) => (
            <button key={k} onClick={() => setAba(k)}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition ${aba === k ? "" : "border-transparent text-stone-400 hover:text-stone-600"}`}
              style={aba === k ? { borderColor: ACCENT, color: ACCENT } : {}}>
              {r}{k === "templates" && <span className="ml-1.5 tabular-nums">({templates.length})</span>}
            </button>
          ))}
        </div>

        {aba === "conexao"
          ? <AbaConexao conta={conta} setConta={setConta} />
          : <AbaTemplates templates={templates} setTemplates={setTemplates} conectado={conta.conectado} />}
      </main>
    </div>
  );
}

// ───────────────────────── CONEXÃO ─────────────────────────
function AbaConexao({ conta, setConta }) {
  const [verToken, setVerToken] = useState(false);
  const set = (k, v) => setConta((c) => ({ ...c, [k]: v }));
  const podeConectar = conta.waba_id.trim() && conta.phone_number_id.trim() && conta.token.trim();

  const conectar = () => set("conectado", true);

  const VERIF = {
    nao_verificada: { label: "Negócio não verificado", cls: "bg-amber-50 text-amber-700 ring-amber-200", icon: ShieldAlert, nota: "Limite de 250 conversas/24h até a Meta verificar. Verificação leva de 2 a 10 dias úteis." },
    em_analise: { label: "Verificação em análise", cls: "bg-blue-50 text-blue-600 ring-blue-200", icon: Clock, nota: "A Meta está analisando os documentos enviados." },
    verificada: { label: "Negócio verificado", cls: "bg-emerald-50 text-emerald-600 ring-emerald-200", icon: ShieldCheck, nota: "Sem limite de conversas por verificação. Tudo liberado." },
  };
  const v = VERIF[conta.verificacao];

  return (
    <>
      {/* status geral */}
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${conta.conectado ? "bg-emerald-50" : "bg-stone-100"}`}>
          <MessageCircle className={`h-5 w-5 ${conta.conectado ? "text-emerald-500" : "text-stone-400"}`} />
        </div>
        <div>
          <div className="text-sm font-semibold">{conta.conectado ? "Conta conectada" : "Conta não conectada"}</div>
          <div className="text-xs text-stone-400">{conta.conectado ? `Modo ${conta.modo} · Meta Cloud API` : "Preencha as credenciais abaixo"}</div>
        </div>
        <span className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${v.cls}`}>
          <v.icon className="h-3.5 w-3.5" /> {v.label}
        </span>
      </div>

      {/* nota da verificação */}
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {v.nota}
      </div>

      {/* credenciais */}
      <div className="mt-5 rounded-xl border border-stone-200 bg-white p-5">
        <div className="text-sm font-semibold">Credenciais da Meta Cloud API</div>
        <p className="mt-0.5 text-xs text-stone-400">Encontradas no Meta Business Suite → WhatsApp Manager → configurações da API.</p>

        <label className="mt-4 block text-xs font-semibold text-stone-600">WABA ID <span className="font-normal text-stone-400">(WhatsApp Business Account ID)</span></label>
        <input value={conta.waba_id} onChange={(e) => set("waba_id", e.target.value)} placeholder="ex.: 102290129340398" className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm tabular-nums focus:outline-none" />

        <label className="mt-3 block text-xs font-semibold text-stone-600">Phone Number ID</label>
        <input value={conta.phone_number_id} onChange={(e) => set("phone_number_id", e.target.value)} placeholder="ex.: 106540352242922" className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm tabular-nums focus:outline-none" />

        <label className="mt-3 block text-xs font-semibold text-stone-600">Token de acesso</label>
        <div className="mt-1 flex items-center rounded-lg border border-stone-200">
          <input type={verToken ? "text" : "password"} value={conta.token} onChange={(e) => set("token", e.target.value)} placeholder="EAAG..." className="w-full rounded-lg bg-transparent px-3 py-2 text-sm focus:outline-none" />
          <button onClick={() => setVerToken((s) => !s)} className="px-3 text-stone-400 hover:text-stone-600">{verToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </div>
        <p className="mt-1 flex items-start gap-1 text-xs text-stone-400"><Info className="mt-0.5 h-3 w-3 shrink-0" /> Guardado em cofre criptografado (LGPD). Token permanente exige app em modo produção na Meta.</p>

        <label className="mt-3 block text-xs font-semibold text-stone-600">Modo</label>
        <div className="mt-1 flex gap-2">
          {[["teste", "Teste (sandbox)"], ["producao", "Produção"]].map(([k, r]) => (
            <button key={k} onClick={() => set("modo", k)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${conta.modo === k ? "text-white" : "text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50"}`}
              style={conta.modo === k ? { background: ACCENT } : {}}>{r}</button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button onClick={conectar} disabled={!podeConectar}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ background: ACCENT }}>
            <Check className="h-4 w-4" /> {conta.conectado ? "Reconectar" : "Conectar conta"}
          </button>
          {/* simulação de verificação, só do protótipo */}
          {conta.conectado && conta.verificacao !== "verificada" && (
            <button onClick={() => set("verificacao", conta.verificacao === "nao_verificada" ? "em_analise" : "verificada")}
              className="text-xs text-stone-400 hover:text-stone-600 underline">simular avanço da verificação Meta</button>
          )}
        </div>
      </div>
    </>
  );
}

// ───────────────────────── TEMPLATES ─────────────────────────
function AbaTemplates({ templates, setTemplates, conectado }) {
  const [modal, setModal] = useState(null); // template em edição ou {} novo

  const salvar = (tpl) => {
    setTemplates((l) => tpl.id ? l.map((t) => t.id === tpl.id ? tpl : t) : [...l, { ...tpl, id: "t" + Date.now(), status: "rascunho" }]);
    setModal(null);
  };
  const submeter = (id) => setTemplates((l) => l.map((t) => t.id === id ? { ...t, status: "pendente", motivo: undefined } : t));

  return (
    <>
      {!conectado && (
        <div className="mt-5 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Conta ainda não conectada — você pode rascunhar templates, mas só dá pra submeter à Meta depois de conectar (aba Conexão).
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-stone-500">Templates que a Meta aprova antes do disparo. Só os <strong>aprovados</strong> podem ser usados no Outbound.</p>
        <button onClick={() => setModal({})} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
          <Plus className="h-3.5 w-3.5" /> Novo template
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {templates.map((t) => {
          const cat = CATEGORIAS[t.categoria];
          const st = STATUS[t.status];
          const StIcon = st.icon;
          return (
            <div key={t.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold">{t.nome}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cat.cls}`}>{cat.label}</span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">{t.idioma}</span>
                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}><StIcon className="h-3 w-3" /> {st.label}</span>
                {t.evento && <span className="flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700"><Link2 className="h-3 w-3" /> {evLabel(t.evento)}</span>}
              </div>

              <p className="mt-2 rounded-lg bg-stone-50 p-2.5 text-sm text-stone-600">{t.corpo}</p>

              {t.status === "rejeitado" && t.motivo && (
                <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 p-2.5 text-xs text-red-600">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span><strong>Rejeitado pela Meta:</strong> {t.motivo}</span>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={() => setModal(t)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                {(t.status === "rascunho" || t.status === "rejeitado") && (
                  <button onClick={() => submeter(t.id)} disabled={!conectado}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ background: ACCENT }}>
                    <Check className="h-3.5 w-3.5" /> Submeter à Meta
                  </button>
                )}
                <span className="ml-auto text-xs text-stone-400">{cat.nota}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> A categoria é decisão de custo, não cosmética: utility é barato (e grátis dentro da janela de 24h que abre quando o cliente te escreve); marketing é sempre cobrado e exige opt-out. Aprovação da Meta leva de 1 min a 24h.
      </p>

      {modal !== null && <ModalTemplate template={modal} onFechar={() => setModal(null)} onSalvar={salvar} />}
    </>
  );
}

function ModalTemplate({ template, onFechar, onSalvar }) {
  const novo = !template.id;
  const [f, setF] = useState({
    id: template.id, nome: template.nome || "", categoria: template.categoria || "utility",
    idioma: template.idioma || "pt_BR", corpo: template.corpo || "", evento: template.evento || "",
    status: template.status, motivo: template.motivo,
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const ok = f.nome.trim() && f.corpo.trim();
  const cat = CATEGORIAS[f.categoria];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onFechar}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold tracking-tight">{novo ? "Novo template" : "Editar template"}</h3>
        <p className="mt-0.5 text-sm text-stone-500">Use variáveis {"{{1}}"}, {"{{2}}"} para os dados dinâmicos preenchidos no disparo.</p>

        <label className="mt-4 block text-xs font-semibold text-stone-600">Nome <span className="font-normal text-stone-400">(minúsculo, sem espaço — ex.: recibo_pagamento)</span></label>
        <input value={f.nome} onChange={(e) => set("nome", e.target.value.toLowerCase().replace(/\s+/g, "_"))} placeholder="recibo_pagamento" className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-mono text-sm focus:outline-none" />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-600">Categoria</label>
            <select value={f.categoria} onChange={(e) => set("categoria", e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none">
              {Object.entries(CATEGORIAS).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600">Idioma</label>
            <select value={f.idioma} onChange={(e) => set("idioma", e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none">
              <option value="pt_BR">Português (BR)</option>
              <option value="en_US">Inglês (US)</option>
            </select>
          </div>
        </div>

        <div className={`mt-2 rounded-lg p-2.5 text-xs ${f.categoria === "marketing" ? "bg-amber-50 text-amber-700" : "bg-stone-50 text-stone-500"}`}>
          {f.categoria === "marketing" && <AlertTriangle className="mr-1 inline h-3 w-3" />}{cat.nota}
        </div>

        <label className="mt-3 block text-xs font-semibold text-stone-600">Corpo da mensagem</label>
        <textarea value={f.corpo} onChange={(e) => set("corpo", e.target.value)} rows={3} placeholder="Olá {{1}}! ..." className="mt-1 w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none" />

        <label className="mt-3 block text-xs font-semibold text-stone-600">Vincular a evento <span className="font-normal text-stone-400">(opcional)</span></label>
        <select value={f.evento} onChange={(e) => set("evento", e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none">
          {EVENTOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Cancelar</button>
          <button onClick={() => onSalvar(f)} disabled={!ok} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ background: ACCENT }}>
            <Save className="h-4 w-4" /> Salvar rascunho
          </button>
        </div>
      </div>
    </div>
  );
}
