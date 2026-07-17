import React, { useState } from "react";
import {
  Receipt, FileText, Settings, Check, X, AlertTriangle, Download,
  Info, Ban, Plus, Lock, ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Nota Fiscal de Serviço (NFS-e)
// Emissão SEMPRE MANUAL, disparada a partir do álbum entregue. Adapter
// plugável entre Prefeitura de SP (portal próprio) e provedor terceirizado
// (ex.: NFE.io, eNotas, Focus NFe) — um ativo por vez, mesmo padrão do
// Gateway de Pagamentos (§21). Um álbum pode ter VÁRIAS notas independentes
// (renegociação com cobrança adicional = nota nova, não correção vinculada).
// Nota emitida dispara aviso automático (e-mail + WhatsApp, via matriz de
// Notificações §23) e fica disponível na Central do Cliente (§13) — aqui
// simulado só como confirmação visual, sem cross-file real. Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const fmtBRL = (n) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtData = (iso) => iso ? iso.split("-").reverse().join("/") : "—";

// álbuns entregues (fonte real seria Álbum §11 + Identidade §4 + Orçamento/Contrato §6/§8)
const ALBUNS_SEED = [
  { id: "a1", titulo: "Casamento Marina e Rafael", cliente: "Marina Silva", cpfCnpj: "123.456.789-00", valor: 5000, dataEntrega: "2026-06-20", descricaoServico: "Serviço de fotografia de casamento" },
  { id: "a2", titulo: "Batizado da Sofia", cliente: "Família Souza", cpfCnpj: "", valor: 800, dataEntrega: "2026-06-25", descricaoServico: "Serviço de fotografia de batizado" },
  { id: "a3", titulo: "Ensaio Família Costa", cliente: "Roberto Costa", cpfCnpj: "987.654.321-00", valor: 1200, dataEntrega: "2026-06-28", descricaoServico: "Serviço de ensaio fotográfico" },
];

const NOTAS_SEED = [
  { id: "n1", albumId: "a1", cliente: "Marina Silva", valor: 5000, descricao: "Serviço de fotografia de casamento", status: "emitida", numero: "NFS-2026-00891", provedor: "prefeitura_sp", data: "2026-06-21" },
  // exemplo de renegociação: mesma álbum, segunda nota independente (cobrança adicional §26)
  { id: "n2", albumId: "a1", cliente: "Marina Silva", valor: 600, descricao: "Serviço adicional — hora extra de cobertura (aditivo)", status: "emitida", numero: "NFS-2026-00934", provedor: "prefeitura_sp", data: "2026-06-29" },
  { id: "n3", albumId: "a3", cliente: "Roberto Costa", valor: 1200, descricao: "Serviço de ensaio fotográfico", status: "erro", numero: null, provedor: "prefeitura_sp", data: "2026-06-29", motivoErro: "CPF inválido junto à Receita Federal" },
];

export default function NotaFiscal() {
  const [aba, setAba] = useState("pendentes");
  const [albuns] = useState(ALBUNS_SEED);
  const [notas, setNotas] = useState(NOTAS_SEED);
  const [config, setConfig] = useState({ provedorAtivo: "prefeitura_sp", credenciaisSp: { usuario: "", certificado: "" }, credenciaisTerceirizado: { apiKey: "" } });
  const [emitindo, setEmitindo] = useState(null); // álbum sendo emitido
  const [cancelando, setCancelando] = useState(null); // nota sendo cancelada

  const notasAtivasPorAlbum = (albumId) => notas.filter((n) => n.albumId === albumId && n.status !== "cancelada");
  const totalPagoPorAlbum = (albumId) => notasAtivasPorAlbum(albumId).filter((n) => n.status === "emitida").reduce((s, n) => s + n.valor, 0);

  const emitir = (albumId, descricao, valor) => {
    const novaNota = {
      id: "n" + Date.now(), albumId, cliente: albuns.find((a) => a.id === albumId).cliente,
      valor, descricao, status: "emitida", numero: "NFS-2026-" + Math.floor(Math.random() * 9000 + 1000),
      provedor: config.provedorAtivo, data: new Date().toISOString().slice(0, 10),
    };
    setNotas((l) => [novaNota, ...l]);
    setEmitindo(null);
  };

  const cancelar = (notaId, motivo) => {
    setNotas((l) => l.map((n) => n.id === notaId ? { ...n, status: "cancelada", motivoCancelamento: motivo } : n));
    setCancelando(null);
  };

  const ABAS = [["pendentes", "Álbuns"], ["notas", "Notas emitidas"], ["config", "Provedor"]];

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><Receipt className="h-4 w-4 text-white" /></div>
            <span className="text-sm font-semibold tracking-tight">Financeiro · Nota Fiscal de Serviço</span>
          </div>
          <div className="flex rounded-lg bg-stone-100 p-0.5 text-xs font-semibold">
            {ABAS.map(([k, r]) => (
              <button key={k} onClick={() => setAba(k)} className={`rounded-md px-3 py-1.5 transition ${aba === k ? "bg-white shadow-sm" : "text-stone-500"}`} style={aba === k ? { color: ACCENT } : {}}>{r}</button>
            ))}
          </div>
        </div>
      </div>

      {aba === "pendentes" && (
        <AbaAlbuns albuns={albuns} notasAtivasPorAlbum={notasAtivasPorAlbum} totalPagoPorAlbum={totalPagoPorAlbum} onEmitir={setEmitindo} />
      )}
      {aba === "notas" && <AbaNotas notas={notas} onCancelar={setCancelando} />}
      {aba === "config" && <AbaConfig config={config} setConfig={setConfig} />}

      {emitindo && (
        <ModalEmitir album={emitindo} provedorAtivo={config.provedorAtivo} jaFaturado={totalPagoPorAlbum(emitindo.id)}
          onFechar={() => setEmitindo(null)} onConfirmar={emitir} />
      )}
      {cancelando && <ModalCancelar nota={cancelando} onFechar={() => setCancelando(null)} onConfirmar={cancelar} />}
    </div>
  );
}

// ───────────────────────── ABA: Álbuns (pendentes de nota) ─────────────────────────
function AbaAlbuns({ albuns, notasAtivasPorAlbum, totalPagoPorAlbum, onEmitir }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Álbuns entregues</h1>
      <p className="mt-1 text-sm text-stone-500">Emita a nota fiscal a partir daqui. Um álbum pode ter mais de uma nota — cada cobrança adicional (ex.: renegociação) gera uma nota nova e independente.</p>

      <div className="mt-5 space-y-3">
        {albuns.map((a) => {
          const notasDoAlbum = notasAtivasPorAlbum(a.id);
          const faturado = totalPagoPorAlbum(a.id);
          const semCpf = !a.cpfCnpj;
          return (
            <div key={a.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-stone-800">{a.titulo}</div>
                  <div className="mt-0.5 text-xs text-stone-400">{a.cliente} · entregue em {fmtData(a.dataEntrega)}</div>
                </div>
                <button onClick={() => onEmitir(a)} disabled={semCpf}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: ACCENT }}>
                  <FileText className="h-3.5 w-3.5" /> Emitir nota fiscal
                </button>
              </div>

              {semCpf && (
                <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Cliente sem CPF/CNPJ cadastrado — complete o cadastro em Identidade antes de emitir.
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                <span className="tabular-nums">Contratado: {fmtBRL(a.valor)}</span>
                {faturado > 0 && <span className="tabular-nums text-emerald-600">Já faturado: {fmtBRL(faturado)}</span>}
                {notasDoAlbum.length > 0 && <span className="rounded-full bg-stone-100 px-2 py-0.5">{notasDoAlbum.length} nota{notasDoAlbum.length > 1 ? "s" : ""} nesse álbum</span>}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Emissão é sempre manual — o sistema nunca dispara uma nota sozinho.
      </p>
    </main>
  );
}

function ModalEmitir({ album, provedorAtivo, jaFaturado, onFechar, onConfirmar }) {
  const [descricao, setDescricao] = useState(album.descricaoServico);
  const [valor, setValor] = useState(album.valor - jaFaturado > 0 ? album.valor - jaFaturado : album.valor);
  const inp = "w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold tracking-tight">Emitir nota fiscal</h3>
        <p className="mt-1 text-xs text-stone-500">{album.titulo} · {album.cliente} · {album.cpfCnpj}</p>

        <label className="mt-4 block text-xs font-semibold text-stone-600">Descrição do serviço</label>
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} className={inp + " resize-none"} />

        <label className="mt-3 block text-xs font-semibold text-stone-600">Valor da nota (R$)</label>
        <input type="number" value={valor} onChange={(e) => setValor(Number(e.target.value))} className={inp} />
        {jaFaturado > 0 && <p className="mt-1 text-xs text-stone-400">Já foram faturados {fmtBRL(jaFaturado)} deste álbum em nota(s) anterior(es) — ajuste se este for um valor complementar.</p>}

        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">
          <Lock className="h-3.5 w-3.5 shrink-0" /> Emitindo via: <strong>{provedorAtivo === "prefeitura_sp" ? "Portal da Prefeitura de SP" : "Provedor terceirizado"}</strong>
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Cancelar</button>
          <button onClick={() => onConfirmar(album.id, descricao, valor)} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
            <Check className="h-4 w-4" /> Confirmar emissão
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── ABA: Notas emitidas (log) ─────────────────────────
function AbaNotas({ notas, onCancelar }) {
  const badge = { emitida: "bg-emerald-50 text-emerald-600", erro: "bg-red-50 text-red-600", cancelada: "bg-stone-100 text-stone-400", pendente: "bg-amber-50 text-amber-600" };
  const rotulo = { emitida: "Emitida", erro: "Erro", cancelada: "Cancelada", pendente: "Pendente" };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Notas emitidas</h1>
      <p className="mt-1 text-sm text-stone-500">Log completo — inclusive notas de erro e canceladas.</p>

      <div className="mt-5 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Descrição</th>
              <th className="px-4 py-3 font-semibold">Número</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Valor</th>
              <th className="px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {notas.map((n) => (
              <tr key={n.id} className="border-b border-stone-100 align-top">
                <td className="px-4 py-3 font-medium text-stone-700">{n.cliente}<div className="text-xs font-normal text-stone-400">{fmtData(n.data)}</div></td>
                <td className="max-w-[180px] px-4 py-3 text-stone-600">{n.descricao}</td>
                <td className="px-4 py-3 tabular-nums text-stone-500">{n.numero || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge[n.status]}`}>{rotulo[n.status]}</span>
                  {n.status === "erro" && <div className="mt-1 text-xs text-red-500">{n.motivoErro}</div>}
                  {n.status === "cancelada" && <div className="mt-1 text-xs text-stone-400">{n.motivoCancelamento}</div>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-stone-700">{fmtBRL(n.valor)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {n.status === "emitida" && (
                      <>
                        <button className="flex items-center gap-1 text-xs font-medium text-stone-500 hover:underline"><Download className="h-3 w-3" /> PDF</button>
                        <button onClick={() => onCancelar(n)} className="flex items-center gap-1 text-xs font-medium text-red-500 hover:underline"><Ban className="h-3 w-3" /> Cancelar</button>
                      </>
                    )}
                    {n.status === "erro" && <button className="text-xs font-medium hover:underline" style={{ color: ACCENT }}>Tentar de novo</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Nota emitida com sucesso avisa o cliente automaticamente por e-mail e WhatsApp, e fica disponível pra download na Central do Cliente — sem reenvio manual seu.
      </p>
    </main>
  );
}

function ModalCancelar({ nota, onFechar, onConfirmar }) {
  const [motivo, setMotivo] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="flex items-center gap-1.5 text-base font-bold tracking-tight text-red-600"><Ban className="h-4 w-4" /> Cancelar nota fiscal</h3>
        <p className="mt-1 text-xs text-stone-500">{nota.numero} · {nota.cliente} · {fmtBRL(nota.valor)}</p>
        <label className="mt-4 block text-xs font-semibold text-stone-600">Justificativa (obrigatória) *</label>
        <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Ex: valor emitido incorretamente" className="w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none" />
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Cancelamento nunca é automático — esta ação fica registrada com sua justificativa.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Voltar</button>
          <button onClick={() => onConfirmar(nota.id, motivo)} disabled={!motivo.trim()} className="rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ background: "#dc2626" }}>Confirmar cancelamento</button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── ABA: Configuração do provedor ─────────────────────────
function AbaConfig({ config, setConfig }) {
  const [f, setF] = useState(config);
  const [salvo, setSalvo] = useState(false);
  const inp = "w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none";
  const salvar = () => { setConfig(f); setSalvo(true); setTimeout(() => setSalvo(false), 2000); };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Provedor de emissão</h1>
      <p className="mt-1 text-sm text-stone-500">Um provedor ativo por vez — trocar não altera notas já emitidas.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button onClick={() => setF((s) => ({ ...s, provedorAtivo: "prefeitura_sp" }))}
          className={`rounded-xl border p-4 text-left transition ${f.provedorAtivo === "prefeitura_sp" ? "" : "border-stone-200 hover:bg-stone-50"}`}
          style={f.provedorAtivo === "prefeitura_sp" ? { borderColor: ACCENT, boxShadow: `inset 0 0 0 1px ${ACCENT}` } : {}}>
          <div className="font-semibold text-stone-800">Portal da Prefeitura de SP</div>
          <p className="mt-1 text-xs text-stone-500">Direto, sem taxa por nota. Exige certificado digital (e-CNPJ).</p>
        </button>
        <button onClick={() => setF((s) => ({ ...s, provedorAtivo: "terceirizado" }))}
          className={`rounded-xl border p-4 text-left transition ${f.provedorAtivo === "terceirizado" ? "" : "border-stone-200 hover:bg-stone-50"}`}
          style={f.provedorAtivo === "terceirizado" ? { borderColor: ACCENT, boxShadow: `inset 0 0 0 1px ${ACCENT}` } : {}}>
          <div className="font-semibold text-stone-800">Provedor terceirizado</div>
          <p className="mt-1 text-xs text-stone-500">Ex.: NFE.io, eNotas, Focus NFe. Cobra por nota emitida.</p>
        </button>
      </div>

      {f.provedorAtivo === "prefeitura_sp" ? (
        <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Lock className="h-4 w-4 text-stone-400" /> Credenciais — Prefeitura de SP</div>
          <label className="block text-xs font-semibold text-stone-600">Usuário do portal</label>
          <input value={f.credenciaisSp.usuario} onChange={(e) => setF((s) => ({ ...s, credenciaisSp: { ...s.credenciaisSp, usuario: e.target.value } }))} className={inp + " mt-1"} />
          <label className="mt-3 block text-xs font-semibold text-stone-600">Certificado digital (e-CNPJ)</label>
          <input type="file" className="mt-1 text-xs text-stone-500" />
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Lock className="h-4 w-4 text-stone-400" /> Credenciais — Provedor terceirizado</div>
          <label className="block text-xs font-semibold text-stone-600">Chave de API</label>
          <input type="password" value={f.credenciaisTerceirizado.apiKey} onChange={(e) => setF((s) => ({ ...s, credenciaisTerceirizado: { apiKey: e.target.value } }))} className={inp + " mt-1"} placeholder="••••••••••••" />
        </div>
      )}

      <button onClick={salvar} className="mt-5 flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
        <Check className="h-4 w-4" /> {salvo ? "Salvo!" : "Salvar configuração"}
      </button>

      <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Trocar de provedor aqui não reemite nem altera nenhuma nota já emitida pelo provedor anterior.
      </p>
    </main>
  );
}
