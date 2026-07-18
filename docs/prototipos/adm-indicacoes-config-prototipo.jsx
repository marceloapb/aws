import React, { useState } from "react";
import { SlidersHorizontal, Info, Check, AlertTriangle } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Configuração do Programa de Indicações (menu ADM / §31)
// ADM define percentuais, incremento e tetos, liga/desliga o programa
// e vê um exemplo de cálculo ao vivo. Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

export default function ConfigIndicacoes() {
  const [ativo, setAtivo] = useState(true);
  const [base, setBase] = useState(5);
  const [incremento, setIncremento] = useState(4);
  const [teto, setTeto] = useState(20);       // Cap A — teto da indicação
  const [maxOrc, setMaxOrc] = useState(30);   // Cap B — desconto máx do orçamento (§6)
  const [nInd, setNInd] = useState(5);        // simulação
  const [salvo, setSalvo] = useState(false);

  const brutoInd = nInd * incremento;
  const descInd = Math.min(brutoInd, teto);
  const avista = 5, negoc = 8;
  const somaBruta = descInd + avista + negoc;
  const totalFinal = Math.min(somaBruta, maxOrc);
  const grampeou = somaBruta > maxOrc;
  const bateuTeto = brutoInd > teto;

  const salvar = () => { setSalvo(true); setTimeout(() => setSalvo(false), 1800); };

  // helper de campo numérico — função que devolve JSX (não é componente, não remonta)
  const num = (v, set) => (
    <div className="inline-flex items-center rounded-lg ring-1 ring-stone-300">
      <input type="number" value={v} onChange={(e) => set(Number(e.target.value))}
        className="w-16 bg-transparent px-3 py-2 text-sm tabular-nums outline-none" />
      <span className="pr-2 text-sm text-stone-400">%</span>
    </div>
  );

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
      className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
            <SlidersHorizontal className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Programa de indicações · Configuração</span>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Configuração do programa</h1>
            <p className="mt-1 text-sm text-stone-500">Percentuais, incremento e limites que regem as indicações.</p>
          </div>
          <button onClick={() => setAtivo((a) => !a)}
            className="relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors"
            style={{ background: ativo ? ACCENT : "#e7e5e4" }}>
            <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
              style={{ left: ativo ? 22 : 2 }} />
          </button>
        </div>
        {!ativo && (
          <div className="mt-3 rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-500">Programa desligado: novos links param de atribuir indicações. Descontos já acumulados continuam válidos.</div>
        )}

        {/* indicado */}
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
          <div className="text-sm font-semibold">Desconto de quem é indicado</div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-stone-600">% de entrada no primeiro orçamento</div>
            {num(base, setBase)}
          </div>
        </div>

        {/* indicador */}
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
          <div className="text-sm font-semibold">Desconto de quem indica</div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-stone-600">Ganho por cada indicação que fecha</div>
            {num(incremento, setIncremento)}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
            <div className="text-sm text-stone-600">Teto do desconto de indicação <span className="text-stone-400">(Cap A)</span></div>
            {num(teto, setTeto)}
          </div>
        </div>

        {/* limite geral */}
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
          <div className="text-sm font-semibold">Limite geral do orçamento <span className="text-stone-400">(Cap B)</span></div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-stone-600">Desconto máximo somando tudo</div>
            {num(maxOrc, setMaxOrc)}
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-600">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Este limite vive na configuração do Orçamento (§6). Alterar aqui reflete lá — é o grampo final que protege sua margem.
          </p>
        </div>

        {/* simulação ao vivo */}
        <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold">Simulação</div>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              Indicador com
              <input type="number" value={nInd} onChange={(e) => setNInd(Number(e.target.value))}
                className="w-14 rounded-lg px-2 py-1 text-sm tabular-nums ring-1 ring-stone-300 outline-none" />
              fechados
            </div>
          </div>
          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">Indicação ({nInd} × {incremento}%{bateuTeto ? `, teto ${teto}%` : ""})</span><span className="font-semibold tabular-nums">{descInd}%</span></div>
            <div className="flex justify-between"><span className="text-stone-500">À vista</span><span className="font-semibold tabular-nums">{avista}%</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Negociação do ADM</span><span className="font-semibold tabular-nums">{negoc}%</span></div>
            <div className="flex justify-between border-t border-stone-100 pt-1.5"><span className="text-stone-500">Soma bruta</span><span className="font-semibold tabular-nums">{somaBruta}%</span></div>
            <div className="mt-1 flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "#fff7ed" }}>
              <span className="text-sm font-semibold" style={{ color: ACCENT }}>Desconto final aplicado</span>
              <span className="text-lg font-bold tabular-nums" style={{ color: ACCENT }}>{totalFinal}%</span>
            </div>
            {grampeou && <p className="text-xs text-amber-600">A soma de {somaBruta}% foi grampeada no limite de {maxOrc}%.</p>}
          </div>
        </div>

        {/* salvar */}
        <div className="mt-6 flex justify-end">
          <button onClick={salvar}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            style={{ background: ACCENT }}>
            {salvo ? <><Check className="h-4 w-4" /> Salvo</> : "Salvar configuração"}
          </button>
        </div>

        <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> O desconto do indicador é pessoal, permanente e não expira. O gatilho que confirma uma indicação é a assinatura do contrato do indicado.
        </p>
      </main>
    </div>
  );
}
