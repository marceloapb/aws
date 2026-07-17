import React, { useState, useRef, useEffect } from "react";
import {
  Camera, FileText, Plus, Pencil, Trash2, X, Check, Eye, Settings, Send,
  ShieldCheck, Clock, User, Info, ChevronRight, Code2, Layers
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Módulo Contrato (PRÓXIMO)
// Telas: 1) Modelos de contrato  2) ADM gera/ajusta a partir do
//        orçamento aceito  3) Cliente revisa e aceita (aceite eletrônico)
// Edição leve: variáveis automáticas preenchidas + campos manuais.
// Identidade visual padrão. Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

// Variáveis automáticas disponíveis (vêm do orçamento/cliente/empresa)
const VARIAVEIS = [
  "{{cliente_nome}}", "{{cliente_cpf}}", "{{cliente_endereco}}", "{{cliente_contato}}",
  "{{evento_tipo}}", "{{evento_data}}", "{{evento_horario}}", "{{evento_local}}", "{{evento_duracao}}",
  "{{valor_total}}", "{{forma_pagamento}}", "{{empresa_nome}}", "{{empresa_cnpj}}", "{{empresa_pix}}",
];

// Dados de um orçamento aceito (para preencher o contrato na demo)
const ORCAMENTO_ACEITO = {
  cliente_nome: "Marina Silva", cliente_cpf: "123.456.789-00",
  cliente_endereco: "Rua das Flores, 50 — São Paulo/SP", cliente_contato: "(11) 99999-0000",
  evento_tipo: "Casamento", evento_data: "12/12/2026", evento_horario: "16:00 às 23:30",
  evento_local: "Buffet Villa, Itaim Bibi", evento_duracao: "7h30",
  valor_total: "R$ 5.525,00", forma_pagamento: "À vista (5% off) — R$ 5.248,75",
  empresa_nome: "Marcelo Bloise Fotografia", empresa_cnpj: "37.476.502/0001-01",
  empresa_pix: "37476502000101",
};

const MODELO_PADRAO = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS

CONTRATADO: {{empresa_nome}}, CNPJ {{empresa_cnpj}}.
CONTRATANTE: {{cliente_nome}}, CPF {{cliente_cpf}}, residente em {{cliente_endereco}}, contato {{cliente_contato}}.

1. OBJETO
1.1. Prestação de serviços fotográficos de {{evento_tipo}}, na data {{evento_data}}, das {{evento_horario}}, no local {{evento_local}}, com duração de {{evento_duracao}}.
Observações específicas: [obs]

5. PREÇO E PAGAMENTO
5.1. Valor total: {{valor_total}}.
5.2. Forma de pagamento: {{forma_pagamento}}.
5.3. PIX para pagamento: {{empresa_pix}}.

6. SINAL E RESERVA DE DATA
6.1. Para reserva da data, o CONTRATANTE pagará sinal de [percentual_sinal]% do valor total.

(... demais cláusulas fixas do modelo: entrega, cancelamento, direitos autorais,
LGPD, portfólio, foro etc. ...)

4. PRAZO DE ENTREGA
4.1. As fotos serão entregues em até [prazo_entrega] dias corridos após o evento.`;

const MODELOS_SEED = [
  { id: 1, nome: "Contrato Padrão — Eventos", tiposVinculados: ["Casamento", "Aniversário", "Batizado"], camposManuais: ["obs", "prazo_entrega", "percentual_sinal"], ativo: true, texto: MODELO_PADRAO },
  { id: 2, nome: "Contrato — Ensaio", tiposVinculados: ["Ensaio"], camposManuais: ["obs", "prazo_entrega"], ativo: true, texto: "CONTRATO DE ENSAIO FOTOGRÁFICO\n\n(modelo específico para ensaios...)" },
];

const TELAS = [
  { id: "modelos", nome: "1. Modelos", icon: Layers },
  { id: "gerar", nome: "2. Gerar (ADM)", icon: Settings },
  { id: "cliente", nome: "3. Aceite (cliente)", icon: ShieldCheck },
];

export default function ContratoPrototipo() {
  const [tela, setTela] = useState("modelos");
  const [modelos, setModelos] = useState(MODELOS_SEED);

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
         className="min-h-screen bg-stone-50 text-stone-900">
      <div className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
            <Camera className="h-4 w-4 text-white" />
          </div>
          <span className="mr-2 text-sm font-semibold tracking-tight">Contrato</span>
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

      {tela === "modelos" && <TelaModelos modelos={modelos} setModelos={setModelos} />}
      {tela === "gerar" && <TelaGerar modelos={modelos} />}
      {tela === "cliente" && <TelaCliente />}
    </div>
  );
}

// ── Tela 1: Modelos de contrato ──────────────────────────────

function TelaModelos({ modelos, setModelos }) {
  const [editando, setEditando] = useState(null);

  const salvar = (m) => {
    setModelos((l) => m.id ? l.map((x) => (x.id === m.id ? m : x)) : [...l, { ...m, id: Date.now() }]);
    setEditando(null);
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modelos de contrato</h1>
          <p className="mt-1 text-sm text-stone-500">
            Cadastre o texto uma vez, com variáveis que o sistema preenche. Cada tipo de evento aponta para um modelo.
          </p>
        </div>
        <button onClick={() => setEditando({ nome: "", tiposVinculados: [], camposManuais: [], ativo: true, texto: "" })}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: ACCENT }}>
          <Plus className="h-4 w-4" /> Novo modelo
        </button>
      </div>

      <div className="space-y-3">
        {modelos.map((m) => (
          <div key={m.id} className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" style={{ color: ACCENT }} />
                  <h2 className="font-semibold">{m.nome}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.ativo ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-400"}`}>{m.ativo ? "Ativo" : "Inativo"}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.tiposVinculados.map((t) => (
                    <span key={t} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{t}</span>
                  ))}
                  {m.tiposVinculados.length === 0 && <span className="text-xs italic text-stone-300">Nenhum tipo vinculado</span>}
                </div>
                <div className="mt-2 text-xs text-stone-400">
                  {m.camposManuais.length} campo(s) manual(is): {m.camposManuais.join(", ") || "—"}
                </div>
              </div>
              <button onClick={() => setEditando({ ...m })} className="shrink-0 rounded-md p-2" style={{ background: "#FEF3EC", color: "#C2410C" }}>
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editando && <ModalModelo modelo={editando} onClose={() => setEditando(null)} onSalvar={salvar} />}
    </main>
  );
}

function ModalModelo({ modelo, onClose, onSalvar }) {
  const [f, setF] = useState(modelo);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const inserirVar = (v) => set("texto", (f.texto || "") + " " + v);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{modelo.id ? "Editar modelo" : "Novo modelo"}</h2>
            <p className="mt-0.5 text-sm text-stone-500">Texto fixo + variáveis automáticas + campos manuais.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid flex-1 gap-5 overflow-y-auto px-6 py-5 md:grid-cols-[1fr_240px]">
          <div className="space-y-4">
            <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Nome do modelo</label>
              <input value={f.nome} onChange={(e) => set("nome", e.target.value)} className={inp} placeholder="Ex.: Contrato Padrão — Eventos" /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Texto do contrato</label>
              <textarea value={f.texto} onChange={(e) => set("texto", e.target.value)} rows={14} className={`${inp} font-mono text-xs leading-relaxed`} placeholder="Cole aqui o texto do contrato, usando {{variaveis}} e [campos_manuais]." /></div>
            <p className="flex items-start gap-1.5 text-xs text-stone-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Use <code className="rounded bg-stone-100 px-1">{"{{variavel}}"}</code> para dados que o sistema preenche, e <code className="rounded bg-stone-100 px-1">[campo]</code> para o que você completa em cada contrato.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-400">Variáveis automáticas</label>
              <div className="flex flex-wrap gap-1">
                {VARIAVEIS.map((v) => (
                  <button key={v} onClick={() => inserirVar(v)} className="rounded-md bg-stone-100 px-2 py-1 text-[11px] font-mono text-stone-600 transition hover:bg-orange-50 hover:text-orange-700">
                    {v}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-stone-400">Clique para inserir no texto.</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <button onClick={() => set("ativo", !f.ativo)} className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${f.ativo ? "" : "bg-stone-200"}`} style={f.ativo ? { background: ACCENT } : {}}>
                <span className={`h-4 w-4 rounded-full bg-white shadow transition ${f.ativo ? "translate-x-4" : ""}`} />
              </button>
              <span className="text-stone-600">Modelo ativo</span>
            </label>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-stone-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100">Cancelar</button>
          <button onClick={() => onSalvar(f)} className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>
            {modelo.id ? "Salvar modelo" : "Criar modelo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tela 2: ADM gera e ajusta o contrato ─────────────────────

function TelaGerar({ modelos }) {
  const [modeloId, setModeloId] = useState(modelos[0]?.id);
  const [manuais, setManuais] = useState({ obs: "", prazo_entrega: "30", percentual_sinal: "30" });
  const [enviado, setEnviado] = useState(false);

  const modelo = modelos.find((m) => m.id === modeloId);
  const preenchido = preencher(modelo?.texto || "", ORCAMENTO_ACEITO, manuais);
  const faltando = (modelo?.camposManuais || []).filter((c) => !manuais[c]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Orçamento aceito</span>
        <span className="text-stone-400">·</span>
        <span className="text-stone-600">{ORCAMENTO_ACEITO.cliente_nome} — {ORCAMENTO_ACEITO.evento_tipo} {ORCAMENTO_ACEITO.evento_data}</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Gerar contrato</h1>
      <p className="mt-1 text-sm text-stone-500">O sistema preencheu os dados do orçamento. Complete o que falta e revise antes de enviar.</p>

      <div className="mt-6 grid gap-5 md:grid-cols-[260px_1fr]">
        {/* coluna esquerda: escolha de modelo + campos manuais */}
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <label className="mb-1.5 block text-sm font-medium text-stone-700">Modelo</label>
            <select value={modeloId} onChange={(e) => setModeloId(Number(e.target.value))} className={inp}>
              {modelos.filter((m) => m.ativo).map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            <p className="mt-1.5 text-xs text-stone-400">Vários eventos com modelos diferentes? Você escolhe qual usar.</p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">Campos a completar</div>
            <div className="space-y-3">
              {(modelo?.camposManuais || []).map((c) => (
                <div key={c}>
                  <label className="mb-1 block text-sm font-medium text-stone-700">{rotuloCampo(c)}</label>
                  {c === "obs"
                    ? <textarea value={manuais[c] || ""} onChange={(e) => setManuais((m) => ({ ...m, [c]: e.target.value }))} rows={2} className={inp} placeholder="Opcional" />
                    : <input value={manuais[c] || ""} onChange={(e) => setManuais((m) => ({ ...m, [c]: e.target.value }))} className={inp} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* coluna direita: prévia do contrato preenchido */}
        <div className="rounded-xl border border-stone-200 bg-white">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
            <span className="flex items-center gap-2 text-sm font-medium"><Eye className="h-4 w-4 text-stone-400" /> Prévia do contrato</span>
            <span className="text-xs text-stone-400">dados do orçamento já preenchidos</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto px-5 py-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-stone-700">{preenchido}</pre>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4">
        <span className="text-sm text-stone-500">
          {faltando.length > 0
            ? <span className="flex items-center gap-1.5 text-amber-600"><Info className="h-4 w-4" /> Faltam campos: {faltando.map(rotuloCampo).join(", ")}</span>
            : <span className="flex items-center gap-1.5 text-emerald-600"><Check className="h-4 w-4" /> Pronto para enviar</span>}
        </span>
        <button disabled={faltando.length > 0} onClick={() => setEnviado(true)}
          className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-90" style={{ background: ACCENT }}>
          <Send className="h-4 w-4" /> Enviar para o cliente assinar
        </button>
      </div>

      {enviado && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check className="h-4 w-4" /> Contrato enviado. O cliente recebeu o link para revisar e aceitar. (veja a aba "Aceite (cliente)")
        </div>
      )}
    </main>
  );
}

// ── Tela 3: Cliente revisa e aceita ──────────────────────────

function TelaCliente() {
  const [lido, setLido] = useState(false);     // rolou até o fim
  const [marcado, setMarcado] = useState(false); // marcou o checkbox
  const [aceito, setAceito] = useState(false);  // clicou em assinar
  const scrollRef = useRef(null);
  const manuais = { obs: "Cobertura também do making of da noiva.", prazo_entrega: "30", percentual_sinal: "30" };

  // após o render, se o documento couber sem scroll, já libera o aceite
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 40) setLido(true);
  }, []);

  if (aceito) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "#ECFDF5" }}>
          <ShieldCheck className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Contrato assinado!</h1>
        <p className="mt-2 text-stone-500">
          Seu aceite foi registrado em {new Date().toLocaleString("pt-BR")}. Uma cópia em PDF foi enviada
          para o seu e-mail e fica disponível na sua área.
        </p>
        <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-500">
          <ShieldCheck className="h-3.5 w-3.5" /> Aceite eletrônico · {ORCAMENTO_ACEITO.cliente_nome} · registrado com data, hora e dispositivo
        </div>
        <button onClick={() => { setAceito(false); setLido(false); setMarcado(false); }} className="mt-6 block w-full text-sm font-medium text-orange-600 hover:text-orange-700">← Rever (demo)</button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <div className="text-sm text-stone-400">Olá, {ORCAMENTO_ACEITO.cliente_nome.split(" ")[0]} 👋</div>
      <h1 className="text-2xl font-bold tracking-tight">Seu contrato está pronto</h1>
      <p className="mt-1 text-sm text-stone-500">Leia com atenção. Ao concordar, seu aceite é registrado como assinatura.</p>

      {/* documento estilizado */}
      <div className="mt-5 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setLido(true);
          }}
          className="max-h-[440px] overflow-y-auto">
          <ContratoDocumento manuais={manuais} />
        </div>
      </div>

      {!lido && <p className="mt-2 text-center text-xs text-stone-400">↓ Role até o fim do contrato para habilitar o aceite.</p>}

      {/* área de aceite — três estados claros */}
      <div className={`mt-5 rounded-xl border bg-white p-5 transition ${lido ? "border-stone-200" : "border-stone-100 opacity-60"}`}>
        <button
          onClick={() => lido && setMarcado((v) => !v)}
          disabled={!lido}
          className="flex w-full items-start gap-3 text-left disabled:cursor-not-allowed">
          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${marcado ? "border-transparent" : "border-stone-300"}`}
            style={marcado ? { background: ACCENT } : {}}>
            {marcado && <Check className="h-3.5 w-3.5 text-white" />}
          </span>
          <span className="text-sm text-stone-600">
            Li e concordo com todas as cláusulas deste contrato, especialmente preço, pagamento, cancelamento,
            entrega, direitos autorais, autorização de portfólio e LGPD.
          </span>
        </button>
        <button disabled={!marcado} onClick={() => setAceito(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-90" style={{ background: ACCENT }}>
          <ShieldCheck className="h-4 w-4" /> Concordar e assinar
        </button>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-stone-400">
          <Info className="h-3 w-3" /> Seu aceite registra data, hora e dispositivo como prova.
        </p>
      </div>
    </main>
  );
}

// Documento de contrato estilizado (aparência próxima do modelo real)
function ContratoDocumento({ manuais }) {
  const d = ORCAMENTO_ACEITO;
  return (
    <div className="bg-white px-8 py-8 text-stone-800">
      {/* cabeçalho */}
      <div className="mb-6 flex items-center justify-between border-b border-stone-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
            <Camera className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold">{d.empresa_nome}</div>
            <div className="text-[11px] text-stone-400">CNPJ {d.empresa_cnpj}</div>
          </div>
        </div>
        <div className="text-right text-[11px] text-stone-400 leading-tight">
          contato@bloise.com.br<br />(11) 99471-5161
        </div>
      </div>

      <h2 className="mb-6 text-center text-base font-bold uppercase tracking-wide">Contrato de Prestação de Serviços Fotográficos</h2>

      {/* partes */}
      <p className="mb-4 text-sm leading-relaxed">
        <strong>CONTRATADO:</strong> {d.empresa_nome}, CNPJ {d.empresa_cnpj}.
      </p>
      <p className="mb-6 text-sm leading-relaxed">
        <strong>CONTRATANTE:</strong> {d.cliente_nome}, CPF {d.cliente_cpf}, residente em {d.cliente_endereco}, contato {d.cliente_contato}.
      </p>

      <Clausula titulo="1. Objeto">
        Prestação de serviços fotográficos de <Var>{d.evento_tipo}</Var>, na data <Var>{d.evento_data}</Var>, das <Var>{d.evento_horario}</Var>, no local <Var>{d.evento_local}</Var>, com duração de <Var>{d.evento_duracao}</Var>.
        {manuais.obs && <><br /><span className="text-stone-600">Observações: {manuais.obs}</span></>}
      </Clausula>

      <Clausula titulo="4. Prazo de entrega">
        As fotos serão entregues em até <Var>{manuais.prazo_entrega}</Var> dias corridos após o evento, por galeria online.
      </Clausula>

      <Clausula titulo="5. Preço e pagamento">
        Valor total: <Var>{d.valor_total}</Var>.<br />
        Forma de pagamento: <Var>{d.forma_pagamento}</Var>.<br />
        PIX para pagamento: <Var>{d.empresa_pix}</Var>.
      </Clausula>

      <Clausula titulo="6. Sinal e reserva de data">
        Para reserva da data, o CONTRATANTE pagará sinal de <Var>{manuais.percentual_sinal}%</Var> do valor total.
      </Clausula>

      <Clausula titulo="8. Cancelamento">
        Em caso de cancelamento pelo CONTRATANTE, aplicam-se retenções proporcionais conforme a antecedência, considerando reserva de agenda e custos operacionais já assumidos.
      </Clausula>

      <Clausula titulo="16. Direitos autorais">
        As fotografias são obras protegidas. O CONTRATADO permanece titular dos direitos autorais; o CONTRATANTE recebe licença de uso pessoal e familiar.
      </Clausula>

      <Clausula titulo="19. Autorização de portfólio">
        O CONTRATANTE autoriza o uso de fotos selecionadas para divulgação profissional do trabalho do CONTRATADO (site, redes, portfólio), de forma não vexatória e com possibilidade de pedido de remoção.
      </Clausula>

      <Clausula titulo="21. LGPD e proteção de dados">
        Os dados pessoais são tratados para execução do contrato, comunicação, entrega e obrigações legais, com medidas razoáveis de segurança e direito de solicitação de correção ou exclusão.
      </Clausula>

      <p className="mt-6 border-t border-stone-200 pt-4 text-xs italic text-stone-400">
        (Texto resumido para visualização. O contrato real contém todas as cláusulas do modelo cadastrado.)
      </p>

      {/* assinatura */}
      <div className="mt-8 text-center text-sm">
        <div className="text-stone-400">São Paulo/SP, {new Date().toLocaleDateString("pt-BR")}</div>
        <div className="mx-auto mt-6 max-w-xs border-t border-stone-300 pt-1.5 font-medium">{d.cliente_nome}</div>
        <div className="text-xs text-stone-400">CONTRATANTE · CPF {d.cliente_cpf}</div>
      </div>
    </div>
  );
}

function Clausula({ titulo, children }) {
  return (
    <div className="mb-4">
      <div className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>{titulo}</div>
      <p className="text-sm leading-relaxed text-stone-700">{children}</p>
    </div>
  );
}
function Var({ children }) {
  return <span className="font-medium text-stone-900">{children}</span>;
}

// ── helpers ───────────────────────────────────────────────────

function preencher(texto, auto, manuais) {
  let t = texto;
  Object.entries(auto).forEach(([k, v]) => { t = t.split(`{{${k}}}`).join(v); });
  Object.entries(manuais || {}).forEach(([k, v]) => { t = t.split(`[${k}]`).join(v || `[${k}]`); });
  return t;
}
function rotuloCampo(c) {
  return ({ obs: "Observações específicas", prazo_entrega: "Prazo de entrega (dias)", percentual_sinal: "Sinal (%)" })[c] || c;
}
const inp = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-stone-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
