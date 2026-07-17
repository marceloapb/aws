import React, { useState } from "react";
import {
  CreditCard, QrCode, Copy, Check, Clock, RefreshCw, Send, Link2, FileText,
  Info, AlertTriangle, Wallet, CheckCircle2, Zap, Eye,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Experiência de Cobrança (Financeiro/Pagamentos · Gateway em ação)
// Dois lados no mesmo arquivo, alternáveis por um seletor de visão:
//   (A) ADMIN  — dispara a cobrança: cliente/evento, valor, tipo, gateway padrão.
//   (B) CLIENTE — página pública de pagamento: QR Pix/copia-e-cola, status ao vivo.
// O botão "simular pagamento" imita o WEBHOOK do provedor: dá baixa idempotente,
// atualiza status dos dois lados e (em produção) resolve o gatilho de Follow-up.
// Dados em memória. Status ao vivo é simulado.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

const GATEWAY_PADRAO = { nome: "Asaas", caps: ["pix", "link", "boleto"] };

const TIPOS = [
  { id: "pix", label: "Pix", icon: QrCode, desc: "QR Code + copia-e-cola" },
  { id: "link", label: "Link de pagamento", icon: Link2, desc: "cartão/checkout hospedado" },
  { id: "boleto", label: "Boleto", icon: FileText, desc: "linha digitável" },
];

const fmtBRL = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ExperienciaCobranca() {
  const [visao, setVisao] = useState("admin");
  const [cobranca, setCobranca] = useState(null);

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><CreditCard className="h-4 w-4 text-white" /></div>
            <span className="text-sm font-semibold tracking-tight">Financeiro · Cobrança</span>
          </div>
          <div className="flex rounded-lg bg-stone-100 p-0.5 text-xs font-semibold">
            <button onClick={() => setVisao("admin")} className={`flex items-center gap-1 rounded-md px-3 py-1.5 transition ${visao === "admin" ? "bg-white shadow-sm" : "text-stone-500"}`} style={visao === "admin" ? { color: ACCENT } : {}}>
              <Wallet className="h-3.5 w-3.5" /> Admin
            </button>
            <button onClick={() => setVisao("cliente")} className={`flex items-center gap-1 rounded-md px-3 py-1.5 transition ${visao === "cliente" ? "bg-white shadow-sm" : "text-stone-500"}`} style={visao === "cliente" ? { color: ACCENT } : {}} disabled={!cobranca} title={!cobranca ? "Gere uma cobrança primeiro" : ""}>
              <Eye className="h-3.5 w-3.5" /> Cliente
            </button>
          </div>
        </div>
      </div>

      {visao === "admin"
        ? <LadoAdmin cobranca={cobranca} setCobranca={setCobranca} irParaCliente={() => setVisao("cliente")} />
        : <LadoCliente cobranca={cobranca} setCobranca={setCobranca} />}
    </div>
  );
}

function LadoAdmin({ cobranca, setCobranca, irParaCliente }) {
  const [cliente, setCliente] = useState("Marina Souza");
  const [evento, setEvento] = useState("Casamento · 15/08/2026");
  const [valor, setValor] = useState(1500);
  const [tipo, setTipo] = useState("pix");

  const suportado = GATEWAY_PADRAO.caps.includes(tipo);

  const gerar = () => {
    if (!suportado) return;
    setCobranca({
      id: "cob_" + Date.now(),
      cliente, evento, valor, tipo,
      gateway: GATEWAY_PADRAO.nome,
      status: "aguardando",
      artefato: tipo === "pix"
        ? "00020126580014BR.GOV.BCB.PIX0136mbf-fotografia-chave5204000053039865802BR5920Marcelo Bloise Foto6009SAO PAULO62070503***6304A1B2"
        : tipo === "link" ? "https://pay.mbf.com/c/" + Date.now()
        : "34191.79001 01043.510047 91020.150008 1 98770000150000",
      valorPago: null,
    });
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Nova cobrança</h1>
      <p className="mt-1 text-sm text-stone-500">Gera o Pix/link pelo gateway padrão e acompanha até a confirmação automática.</p>

      <div className="mt-5 space-y-4 rounded-xl border border-stone-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-stone-600">Cliente</label>
            <input value={cliente} onChange={(e) => setCliente(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600">Evento / referência</label>
            <input value={evento} onChange={(e) => setEvento(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-600">Valor</label>
          <input type="number" value={valor} onChange={(e) => setValor(+e.target.value)} className="mt-1 w-40 rounded-lg border border-stone-200 px-3 py-2 text-sm tabular-nums focus:outline-none" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-600">Tipo de cobrança</label>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
            {TIPOS.map((t) => {
              const ok = GATEWAY_PADRAO.caps.includes(t.id);
              const ativo = tipo === t.id;
              return (
                <button key={t.id} onClick={() => ok && setTipo(t.id)} disabled={!ok}
                  className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition ${ativo ? "" : "border-stone-200 hover:bg-stone-50"} ${!ok ? "cursor-not-allowed opacity-40" : ""}`}
                  style={ativo ? { borderColor: ACCENT, boxShadow: `inset 0 0 0 1px ${ACCENT}` } : {}}>
                  <t.icon className="h-4 w-4" style={ativo ? { color: ACCENT } : { color: "#a8a29e" }} />
                  <span className="text-sm font-medium">{t.label}</span>
                  <span className="text-xs text-stone-400">{ok ? t.desc : "não suportado"}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-xs">
          <Zap className="h-3.5 w-3.5" style={{ color: ACCENT }} />
          <span className="text-stone-600">Gateway padrão: <span className="font-semibold">{GATEWAY_PADRAO.nome}</span></span>
        </div>

        {!suportado && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>O gateway padrão ({GATEWAY_PADRAO.nome}) não faz esse tipo. Troque o gateway padrão ou escolha outro tipo. A cobrança fica bloqueada — sem troca automática.</span>
          </div>
        )}

        <button onClick={gerar} disabled={!suportado}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ background: ACCENT }}>
          <QrCode className="h-4 w-4" /> Gerar cobrança
        </button>
      </div>

      {cobranca && (
        <div className="mt-5 rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Cobrança gerada</span>
              <StatusBadge status={cobranca.status} />
            </div>
            <span className="text-sm font-bold tabular-nums">{fmtBRL(cobranca.valor)}</span>
          </div>
          <p className="mt-1 text-xs text-stone-500">{cobranca.cliente} · {cobranca.evento} · via {cobranca.gateway}</p>

          <div className="mt-3 rounded-lg bg-stone-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">{cobranca.tipo === "pix" ? "Pix copia-e-cola" : cobranca.tipo === "link" ? "Link de pagamento" : "Linha digitável"}</div>
            <div className="mt-1 break-all font-mono text-xs text-stone-600">{cobranca.artefato}</div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={irParaCliente} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
              <Eye className="h-3.5 w-3.5" /> Ver página do cliente
            </button>
            <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
              <Send className="h-3.5 w-3.5" /> Enviar ao cliente
            </button>
          </div>

          {cobranca.status === "aguardando" && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-stone-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Aguardando pagamento. Quando o webhook do {cobranca.gateway} confirmar, a baixa é automática — atualiza o % pago e resolve o follow-up de cobrança deste evento.
            </p>
          )}
          {cobranca.status === "pago" && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Pagamento confirmado via webhook. Baixa automática registrada ({fmtBRL(cobranca.valorPago)}).
            </p>
          )}
        </div>
      )}
    </main>
  );
}

function LadoCliente({ cobranca, setCobranca }) {
  const [copiado, setCopiado] = useState(false);
  const [reconsultando, setReconsultando] = useState(false);

  if (!cobranca) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="rounded-xl border-2 border-dashed border-stone-200 px-5 py-12 text-sm text-stone-400">
          Nenhuma cobrança gerada. Volte para a visão Admin e gere uma.
        </div>
      </main>
    );
  }

  const simularWebhook = () => {
    setCobranca((c) => c.status === "pago" ? c : { ...c, status: "pago", valorPago: c.valor });
  };

  const copiar = () => { setCopiado(true); setTimeout(() => setCopiado(false), 1500); };
  const reconsultar = () => { setReconsultando(true); setTimeout(() => setReconsultando(false), 1000); };

  const pago = cobranca.status === "pago";

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <div className="text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
          <CreditCard className="h-5 w-5 text-white" />
        </div>
        <h1 className="mt-3 text-lg font-bold tracking-tight">Marcelo Bloise Fotografia</h1>
        <p className="text-sm text-stone-500">{cobranca.evento}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <div className="text-xs uppercase tracking-wide text-stone-400">Valor a pagar</div>
        <div className="mt-1 text-3xl font-bold tabular-nums">{fmtBRL(cobranca.valor)}</div>

        {pago ? (
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-9 w-9 text-emerald-500" />
            </div>
            <div className="text-base font-semibold text-emerald-600">Pagamento confirmado</div>
            <div className="text-xs text-stone-400">Você já pode fechar esta página.</div>
          </div>
        ) : (
          <>
            {cobranca.tipo === "pix" && (
              <>
                <div className="mt-5 flex justify-center">
                  <div className="grid h-44 w-44 grid-cols-8 gap-0.5 rounded-lg bg-white p-2 ring-1 ring-stone-200">
                    {Array.from({ length: 64 }).map((_, i) => (
                      <span key={i} className="rounded-[1px]" style={{ background: (i * 7 + (i % 5) + (i % 3)) % 2 ? "#1c1917" : "transparent" }} />
                    ))}
                  </div>
                </div>
                <button onClick={copiar} className="mx-auto mt-4 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
                  {copiado ? <><Check className="h-3.5 w-3.5 text-emerald-500" /> Copiado!</> : <><Copy className="h-3.5 w-3.5" /> Copiar código Pix</>}
                </button>
              </>
            )}

            {cobranca.tipo === "link" && (
              <button className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg py-3 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
                <Link2 className="h-4 w-4" /> Ir para o checkout seguro
              </button>
            )}

            {cobranca.tipo === "boleto" && (
              <div className="mt-5">
                <div className="rounded-lg bg-stone-50 p-3 font-mono text-xs text-stone-600 break-all">{cobranca.artefato}</div>
                <button onClick={copiar} className="mx-auto mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
                  {copiado ? <><Check className="h-3.5 w-3.5 text-emerald-500" /> Copiado!</> : <><Copy className="h-3.5 w-3.5" /> Copiar linha digitável</>}
                </button>
              </div>
            )}

            <div className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-amber-50 py-2 text-xs font-medium text-amber-700">
              <Clock className="h-3.5 w-3.5 animate-pulse" /> Aguardando pagamento…
            </div>
          </>
        )}
      </div>

      {!pago && (
        <>
          <button onClick={reconsultar} className="mx-auto mt-3 flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600">
            <RefreshCw className={`h-3 w-3 ${reconsultando ? "animate-spin" : ""}`} /> {reconsultando ? "verificando…" : "já paguei, verificar status"}
          </button>

          <div className="mt-6 rounded-lg border border-dashed border-stone-300 p-3">
            <div className="text-xs font-semibold text-stone-500">— controle do protótipo —</div>
            <p className="mt-1 text-xs text-stone-400">Em produção, quem dispara isto é o webhook do provedor. Aqui, o botão simula essa confirmação.</p>
            <button onClick={simularWebhook} className="mt-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
              <Zap className="h-3.5 w-3.5" /> Simular pagamento (webhook)
            </button>
          </div>
        </>
      )}

      <p className="mt-5 flex items-start justify-center gap-1.5 text-center text-xs text-stone-400">
        <Info className="mt-0.5 h-3 w-3 shrink-0" /> Página pública, acessada por link com token. O status muda sozinho quando o webhook confirma — sem refresh.
      </p>
    </main>
  );
}

function StatusBadge({ status }) {
  const map = {
    aguardando: { label: "Aguardando", cls: "bg-amber-50 text-amber-600" },
    pago: { label: "Pago", cls: "bg-emerald-50 text-emerald-600" },
    expirado: { label: "Expirado", cls: "bg-stone-100 text-stone-500" },
    falho: { label: "Falhou", cls: "bg-red-50 text-red-600" },
  };
  const s = map[status] || map.aguardando;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
