import React, { useState } from "react";
import {
  ShieldCheck, Settings, Play, History, Download, RotateCcw, AlertTriangle,
  Check, X, Info, Clock,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Backup do Sistema (Configurações)
// Backup é sempre de DADOS (banco), nunca de mídia — fotos já vivem no S3
// dos álbuns, backup de mídia não é responsabilidade deste módulo. Automático
// 1x/dia no horário configurado + manual sob demanda. Retenção configurável
// (rotação descarta o mais antigo automaticamente, sem confirmação). Restaurar
// é ação de alto risco — SEMPRE exige confirmação explícita, nunca um clique
// só. Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

const CONFIG_SEED = { ativo: true, horarioExecucao: "02:00", prefixoS3: "backups", retencaoQtd: 10 };

const HISTORICO_SEED = [
  { id: "b1", tipo: "manual", status: "sucesso", data: "2026-07-05 09:20:33", duracaoS: 4, registros: 55, tamanhoMb: 0.01, mensagem: "Backup concluído com sucesso: 55 registros exportados." },
  { id: "b2", tipo: "automatico", status: "sucesso", data: "2026-07-04 02:00:05", duracaoS: 3, registros: 55, tamanhoMb: 0.01, mensagem: "Backup concluído com sucesso: 55 registros exportados." },
  { id: "b3", tipo: "automatico", status: "sucesso", data: "2026-07-03 02:00:04", duracaoS: 3, registros: 41, tamanhoMb: 0.01, mensagem: "Backup concluído com sucesso: 41 registros exportados." },
  { id: "b4", tipo: "automatico", status: "erro", data: "2026-07-02 02:00:11", duracaoS: 1, registros: null, tamanhoMb: null, mensagem: "Backup falhou: The AWS Access Key Id you provided does not exist in our records." },
  { id: "b5", tipo: "automatico", status: "erro", data: "2026-07-01 02:00:09", duracaoS: 1, registros: null, tamanhoMb: null, mensagem: "Backup falhou: The AWS Access Key Id you provided does not exist in our records." },
];

const fmtData = (s) => { const [d, h] = s.split(" "); return d.split("-").reverse().join("/") + " " + h; };

export default function BackupSistema() {
  const [config, setConfig] = useState(CONFIG_SEED);
  const [historico, setHistorico] = useState(HISTORICO_SEED);
  const [rodando, setRodando] = useState(false);
  const [restaurando, setRestaurando] = useState(null); // backup selecionado pra restaurar
  const [aviso, setAviso] = useState(null);

  const ultimoSucesso = historico.find((b) => b.status === "sucesso");
  const errosSeguidos = (() => {
    let n = 0;
    for (const b of historico) { if (b.status === "erro") n++; else break; }
    return n;
  })();

  const salvarConfig = (novo) => { setConfig(novo); setAviso("Configuração de backup salva."); setTimeout(() => setAviso(null), 2000); };

  const fazerBackupAgora = () => {
    setRodando(true);
    setTimeout(() => {
      const credencialValida = true; // simulação — trocar pra testar o caminho de erro
      const novo = credencialValida
        ? { id: "b" + Date.now(), tipo: "manual", status: "sucesso", data: new Date().toISOString().slice(0, 16).replace("T", " "), duracaoS: 3, registros: 55, tamanhoMb: 0.01, mensagem: "Backup concluído com sucesso: 55 registros exportados." }
        : { id: "b" + Date.now(), tipo: "manual", status: "erro", data: new Date().toISOString().slice(0, 16).replace("T", " "), duracaoS: 1, registros: null, tamanhoMb: null, mensagem: "Backup falhou: The AWS Access Key Id you provided does not exist in our records." };
      setHistorico((l) => [novo, ...l]);
      setRodando(false);
    }, 900);
  };

  const restaurar = (backup) => {
    const registro = { id: "r" + Date.now(), tipo: "restauracao", status: "sucesso", data: new Date().toISOString().slice(0, 16).replace("T", " "), duracaoS: 5, registros: backup.registros, tamanhoMb: backup.tamanhoMb, mensagem: `Sistema restaurado a partir do backup de ${fmtData(backup.data)}.` };
    setHistorico((l) => [registro, ...l]);
    setRestaurando(null);
  };

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><ShieldCheck className="h-4 w-4 text-white" /></div>
          <span className="text-sm font-semibold tracking-tight">Configurações · Backup do Sistema</span>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Backup</h1>
        <p className="mt-1 text-sm text-stone-500">Rotina automática de backup dos dados do sistema. Fotos e mídia não entram aqui — já vivem no S3 dos álbuns.</p>

        {errosSeguidos >= 2 && (
          <p className="mt-4 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Backup automático falhando há {errosSeguidos} execuções seguidas — {ultimoSucesso ? `último sucesso em ${fmtData(ultimoSucesso.data)}` : "nenhum backup bem-sucedido no histórico"}. Confira a credencial S3 nas configurações do provedor.
          </p>
        )}

        {/* Configuração */}
        <section className="mt-5 rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="flex items-center gap-2 font-semibold tracking-tight"><Settings className="h-4 w-4" style={{ color: ACCENT }} /> Configuração do Backup</h2>

          <label className="mt-4 flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={config.ativo} onChange={(e) => salvarConfig({ ...config, ativo: e.target.checked })} className="h-4 w-4 rounded" style={{ accentColor: ACCENT }} />
            Backup automático ativo
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-stone-600">Frequência</label>
              <select disabled value="diario" className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500 focus:outline-none">
                <option value="diario">Diário</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600">Horário de execução</label>
              <input type="time" value={config.horarioExecucao} onChange={(e) => setConfig((c) => ({ ...c, horarioExecucao: e.target.value }))} onBlur={() => salvarConfig(config)}
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600">Prefixo S3</label>
              <input value={config.prefixoS3} onChange={(e) => setConfig((c) => ({ ...c, prefixoS3: e.target.value }))} onBlur={() => salvarConfig(config)}
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600">Backups a manter (retenção)</label>
              <input type="number" min={1} value={config.retencaoQtd} onChange={(e) => setConfig((c) => ({ ...c, retencaoQtd: Number(e.target.value) }))} onBlur={() => salvarConfig(config)}
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm tabular-nums focus:outline-none" />
            </div>
          </div>

          {aviso && <p className="mt-3 text-xs" style={{ color: ACCENT }}>{aviso}</p>}
          <p className="mt-3 flex items-start gap-1.5 text-xs text-stone-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Reduzir a retenção descarta os backups mais antigos automaticamente, sem pedir confirmação — só restaurar pede.
          </p>
        </section>

        {/* Backup manual */}
        <section className="mt-5 rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="flex items-center gap-2 font-semibold tracking-tight"><Play className="h-4 w-4" style={{ color: ACCENT }} /> Backup Manual</h2>
          <p className="mt-1 text-sm text-stone-500">Execute um backup completo agora, além do automático diário.</p>

          {ultimoSucesso && (
            <div className="mt-3 rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
              Último backup com sucesso: <span className="font-medium text-stone-700">{fmtData(ultimoSucesso.data)}</span>
            </div>
          )}

          <button onClick={fazerBackupAgora} disabled={rodando} className="mt-3 flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60" style={{ background: ACCENT }}>
            <Play className="h-4 w-4" /> {rodando ? "Executando backup…" : "Fazer backup agora"}
          </button>
        </section>

        {/* Histórico */}
        <section className="mt-5 rounded-xl border border-stone-200 bg-white">
          <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3 font-semibold tracking-tight"><History className="h-4 w-4 text-stone-400" /> Histórico de Backups</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs uppercase tracking-wide text-stone-400">
                  <th className="px-5 py-2.5 font-semibold">Data/Hora</th>
                  <th className="px-3 py-2.5 font-semibold">Tipo</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Registros</th>
                  <th className="px-3 py-2.5 font-semibold">Tamanho</th>
                  <th className="px-3 py-2.5 font-semibold">Mensagem</th>
                  <th className="px-5 py-2.5 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((b) => (
                  <tr key={b.id} className="border-b border-stone-50 align-top">
                    <td className="px-5 py-3 tabular-nums text-stone-600">{fmtData(b.data)}</td>
                    <td className="px-3 py-3"><span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">{b.tipo}</span></td>
                    <td className="px-3 py-3">
                      <span className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${b.status === "sucesso" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                        {b.status === "sucesso" ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {b.status === "sucesso" ? "Sucesso" : "Erro"}
                      </span>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-stone-600">{b.registros ?? "—"}</td>
                    <td className="px-3 py-3 tabular-nums text-stone-600">{b.tamanhoMb != null ? `${b.tamanhoMb} MB` : "—"}</td>
                    <td className="max-w-[220px] px-3 py-3 text-xs text-stone-500">{b.mensagem}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1.5">
                        {b.status === "sucesso" && (
                          <>
                            <button className="flex items-center gap-1 text-xs font-medium text-stone-500 hover:underline"><Download className="h-3 w-3" /> Baixar</button>
                            <button onClick={() => setRestaurando(b)} className="flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100">
                              <RotateCcw className="h-3 w-3" /> Restaurar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Backup nunca inclui fotos/mídia — apenas os dados do sistema. Restaurar sobrescreve o estado atual por completo (não é seletivo por módulo).
        </p>
      </main>

      {restaurando && <ModalConfirmarRestauracao backup={restaurando} onFechar={() => setRestaurando(null)} onConfirmar={restaurar} />}
    </div>
  );
}

function ModalConfirmarRestauracao({ backup, onFechar, onConfirmar }) {
  const [confirmado, setConfirmado] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
        <h3 className="mt-3 text-base font-bold tracking-tight text-stone-900">Restaurar backup de {fmtData(backup.data)}?</h3>
        <p className="mt-2 text-sm text-stone-500">
          Isso vai <strong>sobrescrever todos os dados atuais</strong> do sistema pelo estado salvo neste backup ({backup.registros} registros, {backup.tamanhoMb} MB).
          Qualquer alteração feita depois deste backup será perdida. Essa ação não tem desfazer automático.
        </p>

        <label className="mt-4 flex items-start gap-2 rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
          <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} className="mt-0.5 h-4 w-4 rounded" style={{ accentColor: "#dc2626" }} />
          Entendo que isso substitui os dados atuais e não pode ser desfeito automaticamente.
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Cancelar</button>
          <button onClick={() => onConfirmar(backup)} disabled={!confirmado}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ background: "#dc2626" }}>
            <RotateCcw className="h-4 w-4" /> Restaurar mesmo assim
          </button>
        </div>
      </div>
    </div>
  );
}
