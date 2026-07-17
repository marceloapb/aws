import React, { useState } from "react";
import {
  FileSignature, Plus, Minus, Calendar, ArrowRight, Check, X, Info,
  AlertTriangle, Wallet, Eye, Lock, CheckCircle2, RefreshCw, TrendingUp,
  TrendingDown, FileText, ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Renegociação pós-aceite (aditivo de contrato) · dentro do Contrato
// Dois lados, alternáveis por seletor:
//   (A) ADMIN   — abre contrato ASSINADO, cria aditivo (adiciona/remove item,
//                 muda valor/data). Vê o DELTA financeiro e o RECÁLCULO do plano
//                 (parcelas pagas intactas; saldo futuro reajustado).
//   (B) CLIENTE — recebe o aditivo, vê o que muda e o novo valor, e ACEITA/recusa.
// Regras-chave materializadas: contrato original IMUTÁVEL (snapshot); aditivo só
// vale após aceite; aumento → cobrança do diferencial (§21); redução com valor já
// pago a mais → PENDÊNCIA DE REEMBOLSO manual (sem estorno automático). Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const fmt = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// contrato original assinado (imutável)
const CONTRATO = {
  cliente: "Marina & Thiago",
  evento: "Casamento · 15/08/2026",
  assinadoEm: "10/06/2026",
  itens: [
    { id: "i1", nome: "Cobertura fotográfica (8h)", valor: 3500 },
    { id: "i2", nome: "Álbum 30x30 (30 páginas)", valor: 1200 },
    { id: "i3", nome: "Ensaio pré-wedding", valor: 800 },
  ],
  // plano de pagamento: 2 de 3 parcelas pagas
  parcelas: [
    { id: "p1", label: "Sinal", valor: 1500, pago: true },
    { id: "p2", label: "Parcela 2", valor: 2000, pago: true },
    { id: "p3", label: "Parcela 3", valor: 2000, pago: false },
  ],
};
const TOTAL_ORIG = CONTRATO.itens.reduce((s, i) => s + i.valor, 0);
const PAGO = CONTRATO.parcelas.filter((p) => p.pago).reduce((s, p) => s + p.valor, 0);

// itens que podem ser adicionados num aditivo
const ITENS_DISPONIVEIS = [
  { id: "a1", nome: "Segundo dia de cobertura", valor: 2500 },
  { id: "a2", nome: "Hora extra de cobertura", valor: 400 },
  { id: "a3", nome: "Álbum dos pais (20x20)", valor: 600 },
  { id: "a4", nome: "Vídeo highlights (3 min)", valor: 1800 },
];

export default function Renegociacao() {
  const [visao, setVisao] = useState("admin");
  const [aditivo, setAditivo] = useState(null); // aditivo montado pelo admin, enviado ao cliente

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><FileSignature className="h-4 w-4 text-white" /></div>
            <span className="text-sm font-semibold tracking-tight">Contrato · Renegociação (aditivo)</span>
          </div>
          <div className="flex rounded-lg bg-stone-100 p-0.5 text-xs font-semibold">
            <button onClick={() => setVisao("admin")} className={`flex items-center gap-1 rounded-md px-3 py-1.5 transition ${visao === "admin" ? "bg-white shadow-sm" : "text-stone-500"}`} style={visao === "admin" ? { color: ACCENT } : {}}>
              <Wallet className="h-3.5 w-3.5" /> Admin
            </button>
            <button onClick={() => setVisao("cliente")} disabled={!aditivo} title={!aditivo ? "Crie e envie um aditivo primeiro" : ""}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 transition ${visao === "cliente" ? "bg-white shadow-sm" : "text-stone-500"}`} style={visao === "cliente" ? { color: ACCENT } : {}}>
              <Eye className="h-3.5 w-3.5" /> Cliente
            </button>
          </div>
        </div>
      </div>

      {visao === "admin"
        ? <LadoAdmin aditivo={aditivo} setAditivo={setAditivo} irCliente={() => setVisao("cliente")} />
        : <LadoCliente aditivo={aditivo} setAditivo={setAditivo} />}
    </div>
  );
}

// ───────────────────────── ADMIN ─────────────────────────
function LadoAdmin({ aditivo, setAditivo, irCliente }) {
  const [criando, setCriando] = useState(false);
  const [adicionados, setAdicionados] = useState([]);
  const [removidos, setRemovidos] = useState([]); // ids de itens do original a remover

  const toggleAdd = (item) => setAdicionados((l) => l.find((x) => x.id === item.id) ? l.filter((x) => x.id !== item.id) : [...l, item]);
  const toggleRemove = (id) => setRemovidos((l) => l.includes(id) ? l.filter((x) => x !== id) : [...l, id]);

  const deltaAdd = adicionados.reduce((s, i) => s + i.valor, 0);
  const deltaRemove = CONTRATO.itens.filter((i) => removidos.includes(i.id)).reduce((s, i) => s + i.valor, 0);
  const delta = deltaAdd - deltaRemove;
  const novoTotal = TOTAL_ORIG + delta;
  const novoSaldo = novoTotal - PAGO; // pode ficar negativo → reembolso
  const reembolso = novoSaldo < 0 ? -novoSaldo : 0;
  const temMudanca = adicionados.length > 0 || removidos.length > 0;

  const enviar = () => {
    setAditivo({
      adicionados, removidos, delta, novoTotal, novoSaldo, reembolso,
      status: "enviado",
    });
    setCriando(false);
    irCliente();
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      {/* contrato original imutável */}
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-stone-400" />
        <h1 className="text-2xl font-bold tracking-tight">Contrato assinado</h1>
      </div>
      <p className="mt-1 text-sm text-stone-500">{CONTRATO.cliente} · {CONTRATO.evento} · assinado em {CONTRATO.assinadoEm}</p>

      <div className="mt-5 rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Escopo original</span>
          <span className="flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500"><Lock className="h-3 w-3" /> imutável</span>
        </div>
        <div className="mt-3 divide-y divide-stone-100">
          {CONTRATO.itens.map((i) => (
            <div key={i.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-stone-600">{i.nome}</span>
              <span className="tabular-nums text-stone-500">{fmt(i.valor)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-stone-200 pt-3">
          <span className="text-sm font-semibold">Total original</span>
          <span className="text-sm font-bold tabular-nums">{fmt(TOTAL_ORIG)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-stone-400">
          <span>Já pago (2 de 3 parcelas)</span>
          <span className="tabular-nums text-emerald-600">{fmt(PAGO)}</span>
        </div>
      </div>

      {/* aditivo já enviado */}
      {aditivo ? (
        <div className="mt-5 rounded-xl border-2 bg-white p-5" style={{ borderColor: ACCENT }}>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" style={{ color: ACCENT }} />
            <span className="text-sm font-semibold">Aditivo enviado ao cliente</span>
            <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">aguardando aceite</span>
          </div>
          <ResumoDelta aditivo={aditivo} />
          <button onClick={irCliente} className="mt-4 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
            <Eye className="h-3.5 w-3.5" /> Ver como o cliente recebe
          </button>
        </div>
      ) : !criando ? (
        <button onClick={() => setCriando(true)} className="mt-5 flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
          <Plus className="h-4 w-4" /> Criar aditivo
        </button>
      ) : (
        <div className="mt-5 rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="text-base font-bold tracking-tight">Novo aditivo</h2>
          <p className="mt-0.5 text-sm text-stone-500">O contrato original fica intacto. Isto vira um termo aditivo que o cliente precisa aceitar.</p>

          {/* adicionar itens */}
          <div className="mt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400"><Plus className="h-3.5 w-3.5" /> Adicionar ao escopo</div>
            <div className="mt-2 space-y-2">
              {ITENS_DISPONIVEIS.map((item) => {
                const on = adicionados.find((x) => x.id === item.id);
                return (
                  <button key={item.id} onClick={() => toggleAdd(item)}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition ${on ? "" : "border-stone-200 hover:bg-stone-50"}`}
                    style={on ? { borderColor: ACCENT, boxShadow: `inset 0 0 0 1px ${ACCENT}` } : {}}>
                    <span className="flex items-center gap-2">
                      <span className={`flex h-5 w-5 items-center justify-center rounded ${on ? "text-white" : "ring-1 ring-stone-300"}`} style={on ? { background: ACCENT } : {}}>{on && <Check className="h-3 w-3" />}</span>
                      {item.nome}
                    </span>
                    <span className="tabular-nums font-medium text-emerald-600">+{fmt(item.valor)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* remover itens do original */}
          <div className="mt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400"><Minus className="h-3.5 w-3.5" /> Remover do escopo</div>
            <div className="mt-2 space-y-2">
              {CONTRATO.itens.map((item) => {
                const on = removidos.includes(item.id);
                return (
                  <button key={item.id} onClick={() => toggleRemove(item.id)}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition ${on ? "border-red-300 bg-red-50" : "border-stone-200 hover:bg-stone-50"}`}>
                    <span className="flex items-center gap-2">
                      <span className={`flex h-5 w-5 items-center justify-center rounded ${on ? "bg-red-500 text-white" : "ring-1 ring-stone-300"}`}>{on && <X className="h-3 w-3" />}</span>
                      <span className={on ? "text-red-600 line-through" : ""}>{item.nome}</span>
                    </span>
                    <span className="tabular-nums font-medium text-red-500">−{fmt(item.valor)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* delta + recálculo */}
          {temMudanca && (
            <div className="mt-5 rounded-xl bg-stone-50 p-4">
              <ResumoDelta aditivo={{ delta, novoTotal, novoSaldo, reembolso }} />
              <PlanoRecalculado novoSaldo={novoSaldo} reembolso={reembolso} />
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => { setCriando(false); setAdicionados([]); setRemovidos([]); }} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Cancelar</button>
            <button onClick={enviar} disabled={!temMudanca} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ background: ACCENT }}>
              <ArrowRight className="h-4 w-4" /> Enviar ao cliente
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// resumo do delta financeiro
function ResumoDelta({ aditivo }) {
  const { delta, novoTotal, reembolso } = aditivo;
  const aumento = delta > 0;
  return (
    <div className="mt-3 space-y-1.5 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-stone-500">Total original</span>
        <span className="tabular-nums text-stone-500">{fmt(TOTAL_ORIG)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 font-medium" style={{ color: aumento ? "#059669" : "#ef4444" }}>
          {aumento ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {aumento ? "Aumento" : "Redução"}
        </span>
        <span className="tabular-nums font-medium" style={{ color: aumento ? "#059669" : "#ef4444" }}>{aumento ? "+" : "−"}{fmt(Math.abs(delta))}</span>
      </div>
      <div className="flex items-center justify-between border-t border-stone-200 pt-1.5">
        <span className="font-semibold">Novo total</span>
        <span className="tabular-nums font-bold">{fmt(novoTotal)}</span>
      </div>
    </div>
  );
}

// recálculo do plano — parcelas pagas intactas, saldo reajustado, reembolso sinalizado
function PlanoRecalculado({ novoSaldo, reembolso }) {
  return (
    <div className="mt-3 border-t border-stone-200 pt-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">Recálculo do plano</div>
      <div className="mt-2 space-y-1 text-sm">
        {CONTRATO.parcelas.map((p) => (
          <div key={p.id} className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-stone-600">
              {p.pago ? <Lock className="h-3 w-3 text-stone-400" /> : <RefreshCw className="h-3 w-3" style={{ color: ACCENT }} />}
              {p.label} {p.pago && <span className="text-xs text-stone-400">(paga · intacta)</span>}
            </span>
            <span className={`tabular-nums ${p.pago ? "text-stone-400" : "font-medium"}`}>{fmt(p.valor)}</span>
          </div>
        ))}
      </div>

      {reembolso > 0 ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>O cliente já pagou {fmt(PAGO)}, acima do novo total. Há <strong>{fmt(reembolso)} a devolver</strong>. O sistema NÃO estorna automaticamente — isso vira uma pendência de reembolso pra você resolver manualmente e registrar.</span>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-white p-3 ring-1 ring-stone-200">
          <span className="text-sm font-semibold">Novo saldo a pagar</span>
          <span className="tabular-nums text-sm font-bold" style={{ color: ACCENT }}>{fmt(novoSaldo)}</span>
        </div>
      )}
      {novoSaldo > 0 && reembolso === 0 && (
        <p className="mt-2 flex items-start gap-1 text-xs text-stone-400"><Info className="mt-0.5 h-3 w-3 shrink-0" /> Se houve aumento, o diferencial é cobrado via Pagamentos (§21) após o aceite do cliente.</p>
      )}
    </div>
  );
}

// ───────────────────────── CLIENTE ─────────────────────────
function LadoCliente({ aditivo, setAditivo }) {
  if (!aditivo) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="rounded-xl border-2 border-dashed border-stone-200 px-5 py-12 text-sm text-stone-400">Nenhum aditivo enviado. Volte à visão Admin e crie um.</div>
      </main>
    );
  }

  const decidir = (status) => setAditivo((a) => ({ ...a, status }));
  const { adicionados = [], removidos = [], delta, novoTotal, reembolso, status } = aditivo;
  const aumento = delta > 0;

  if (status === "aceito" || status === "recusado") {
    const ok = status === "aceito";
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${ok ? "bg-emerald-50" : "bg-stone-100"}`}>
          {ok ? <CheckCircle2 className="h-9 w-9 text-emerald-500" /> : <X className="h-9 w-9 text-stone-400" />}
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight">{ok ? "Aditivo aceito" : "Aditivo recusado"}</h1>
        <p className="mt-2 text-sm text-stone-500">
          {ok
            ? (reembolso > 0 ? `O novo acordo está válido. Você tem ${fmt(reembolso)} a receber de volta — o fotógrafo fará a devolução.` : aumento ? "O novo acordo está válido. A cobrança do valor adicional foi gerada." : "O novo acordo está válido e seu saldo foi ajustado.")
            : "Nada muda — o contrato original assinado continua valendo integralmente."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <div className="text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: ACCENT }}><FileSignature className="h-5 w-5 text-white" /></div>
        <h1 className="mt-3 text-lg font-bold tracking-tight">Proposta de alteração</h1>
        <p className="text-sm text-stone-500">{CONTRATO.cliente} · {CONTRATO.evento}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">O que muda</div>
        <div className="mt-2 space-y-1.5 text-sm">
          {adicionados.map((i) => (
            <div key={i.id} className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-stone-600"><Plus className="h-3.5 w-3.5 text-emerald-500" /> {i.nome}</span>
              <span className="tabular-nums text-emerald-600">+{fmt(i.valor)}</span>
            </div>
          ))}
          {CONTRATO.itens.filter((i) => removidos.includes(i.id)).map((i) => (
            <div key={i.id} className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-stone-600"><Minus className="h-3.5 w-3.5 text-red-500" /> {i.nome}</span>
              <span className="tabular-nums text-red-500">−{fmt(i.valor)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1.5 border-t border-stone-100 pt-3 text-sm">
          <div className="flex justify-between"><span className="text-stone-500">Total anterior</span><span className="tabular-nums text-stone-500">{fmt(TOTAL_ORIG)}</span></div>
          <div className="flex justify-between font-semibold"><span>Novo total</span><span className="tabular-nums">{fmt(novoTotal)}</span></div>
          {reembolso > 0
            ? <div className="mt-1 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700">Você tem <strong>{fmt(reembolso)}</strong> a receber de volta.</div>
            : aumento
              ? <div className="mt-1 rounded-lg bg-stone-50 p-2.5 text-xs text-stone-500">Valor adicional de <strong>{fmt(delta)}</strong> será cobrado após o aceite.</div>
              : <div className="mt-1 rounded-lg bg-stone-50 p-2.5 text-xs text-stone-500">Seu saldo a pagar foi reduzido.</div>}
        </div>

        <p className="mt-3 flex items-start gap-1 text-xs text-stone-400"><Info className="mt-0.5 h-3 w-3 shrink-0" /> Suas parcelas já pagas continuam válidas. O contrato original só é alterado se você aceitar.</p>
      </div>

      <div className="mt-5 flex gap-2">
        <button onClick={() => decidir("recusado")} className="flex-1 rounded-lg px-4 py-3 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Recusar</button>
        <button onClick={() => decidir("aceito")} className="flex flex-[2] items-center justify-center gap-1.5 rounded-lg px-4 py-3 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
          <Check className="h-4 w-4" /> Aceitar alteração
        </button>
      </div>
    </main>
  );
}
