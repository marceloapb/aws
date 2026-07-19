import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  HardDrive, Database, CheckCircle2, AlertTriangle, FileImage,
  RefreshCw, Clock, Folder, BarChart3, Activity
} from 'lucide-react';

const ACCENT = '#EA580C';

const fmtSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const CONTEXTOS = ['album', 'portfolio', 'novidades', 'perfil', 'config'];

const CONTEXTO_LABELS = {
  album: 'Álbuns',
  portfolio: 'Portfólio',
  novidades: 'Novidades',
  perfil: 'Perfil',
  config: 'Configurações',
};

const CONTEXTO_COLORS = {
  album: '#3b82f6',
  portfolio: '#8b5cf6',
  novidades: '#10b981',
  perfil: '#f59e0b',
  config: '#6b7280',
};

const STATUS_BADGE = {
  processed: { label: 'Processado', bg: 'bg-green-100', text: 'text-green-700' },
  processing: { label: 'Processando', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  error: { label: 'Erro', bg: 'bg-red-100', text: 'text-red-700' },
  pending: { label: 'Pendente', bg: 'bg-gray-100', text: 'text-gray-700' },
  uploaded: { label: 'Enviado', bg: 'bg-blue-100', text: 'text-blue-700' },
};

export default function Storage() {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [breakdown, setBreakdown] = useState({});
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessResult, setReprocessResult] = useState(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch general metrics
      const metricsRes = await authFetch('/admin/media/metrics');
      const metricsData = await metricsRes.json();
      if (metricsData.success) {
        setMetrics(metricsData.data);
      }

      // Fetch per-context breakdown
      const contextResults = {};
      const contextPromises = CONTEXTOS.map(async (ctx) => {
        try {
          const res = await authFetch(`/admin/media/metrics?contexto=${ctx}`);
          const data = await res.json();
          if (data.success) contextResults[ctx] = data.data;
        } catch {
          contextResults[ctx] = null;
        }
      });
      await Promise.all(contextPromises);
      setBreakdown(contextResults);
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
    }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  const handleReprocess = async () => {
    setReprocessing(true);
    setReprocessResult(null);
    try {
      const res = await authFetch('/admin/media/reprocess-dlq', { method: 'POST' });
      const data = await res.json();
      setReprocessResult(data.success
        ? { type: 'success', message: `${data.data?.reprocessed || 0} mensagens reprocessadas com sucesso.` }
        : { type: 'error', message: data.error || 'Erro ao reprocessar.' }
      );
      // Refresh metrics after reprocess
      setTimeout(loadMetrics, 2000);
    } catch {
      setReprocessResult({ type: 'error', message: 'Erro de conexão ao reprocessar.' });
    }
    setReprocessing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={24} className="animate-spin text-gray-400" />
        <span className="ml-3 text-gray-500">Carregando métricas...</span>
      </div>
    );
  }

  const totalBytes = metrics?.totalBytes || 0;
  const totalFiles = metrics?.totalFiles || 0;
  const processedOk = metrics?.processedOk || 0;
  const errorsDlq = metrics?.errorsDlq || 0;
  const dlqCount = metrics?.dlqMessages || 0;
  const lastDlqError = metrics?.lastDlqError || null;
  const recentUploads = metrics?.recentUploads || [];

  // Calculate breakdown totals for progress bars
  const breakdownTotal = Object.values(breakdown).reduce((sum, ctx) => sum + (ctx?.totalBytes || 0), 0) || totalBytes || 1;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <HardDrive size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Armazenamento & Mídia</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">Métricas de armazenamento, processamento de mídia e monitoramento de filas.</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={<Database size={18} />}
          iconColor="#3b82f6"
          label="Total armazenado"
          value={fmtSize(totalBytes)}
          sublabel={totalBytes >= 1024 * 1024 * 1024 ? `${(totalBytes / (1024 * 1024 * 1024)).toFixed(3)} GB` : null}
        />
        <KpiCard
          icon={<FileImage size={18} />}
          iconColor="#8b5cf6"
          label="Total de arquivos"
          value={totalFiles.toLocaleString('pt-BR')}
          sublabel="em todos os contextos"
        />
        <KpiCard
          icon={<CheckCircle2 size={18} />}
          iconColor="#10b981"
          label="Processados com sucesso"
          value={processedOk.toLocaleString('pt-BR')}
          sublabel={totalFiles > 0 ? `${((processedOk / totalFiles) * 100).toFixed(1)}% do total` : null}
        />
        <KpiCard
          icon={<AlertTriangle size={18} />}
          iconColor={errorsDlq > 0 ? '#ef4444' : '#6b7280'}
          label="Erros/DLQ pendentes"
          value={errorsDlq.toLocaleString('pt-BR')}
          sublabel={errorsDlq > 0 ? 'requer atenção' : 'nenhum erro'}
          alert={errorsDlq > 0}
        />
      </div>

      {/* Barra de Uso Total */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HardDrive size={18} style={{ color: ACCENT }} />
            <h3 className="font-semibold text-gray-900">Uso Total do Armazenamento</h3>
          </div>
          <span className="text-sm text-gray-500">{fmtSize(totalBytes)} / 50 GB</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min((totalBytes / (50 * 1024 * 1024 * 1024)) * 100, 100)}%`,
              background: (totalBytes / (50 * 1024 * 1024 * 1024)) > 0.85 ? '#ef4444' : (totalBytes / (50 * 1024 * 1024 * 1024)) > 0.7 ? '#f59e0b' : ACCENT,
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">{((totalBytes / (50 * 1024 * 1024 * 1024)) * 100).toFixed(1)}% utilizado</span>
          <span className="text-xs text-gray-400">{fmtSize(50 * 1024 * 1024 * 1024 - totalBytes)} disponível</span>
        </div>
        {(totalBytes / (50 * 1024 * 1024 * 1024)) > 0.85 && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700 flex items-center gap-1"><AlertTriangle size={12} /> Atenção: armazenamento próximo do limite. Considere excluir álbuns antigos ou fazer upgrade.</p>
          </div>
        )}
      </div>

      {/* Breakdown by Context + DLQ Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} style={{ color: ACCENT }} />
            <h3 className="font-semibold text-gray-900">Uso por Contexto</h3>
          </div>
          <div className="space-y-4">
            {CONTEXTOS.map((ctx) => {
              const ctxData = breakdown[ctx];
              const ctxBytes = ctxData?.totalBytes || 0;
              const ctxFiles = ctxData?.totalFiles || 0;
              const pct = breakdownTotal > 0 ? (ctxBytes / breakdownTotal) * 100 : 0;

              return (
                <div key={ctx}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Folder size={14} style={{ color: CONTEXTO_COLORS[ctx] }} />
                      <span className="text-sm font-medium text-gray-700">{CONTEXTO_LABELS[ctx]}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-800">{fmtSize(ctxBytes)}</span>
                      <span className="text-xs text-gray-400 ml-2">({pct.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 0.5)}%`, background: CONTEXTO_COLORS[ctx] }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{ctxFiles.toLocaleString('pt-BR')} arquivos</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* DLQ Monitor */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-red-500" />
            <h3 className="font-semibold text-gray-900">DLQ Monitor</h3>
          </div>

          <div className="text-center py-4 mb-4 rounded-lg" style={{ background: dlqCount > 0 ? '#fef2f2' : '#f0fdf4' }}>
            <p className="text-3xl font-bold" style={{ color: dlqCount > 0 ? '#dc2626' : '#16a34a' }}>
              {dlqCount}
            </p>
            <p className="text-sm text-gray-500 mt-1">mensagens na DLQ</p>
          </div>

          <button
            onClick={handleReprocess}
            disabled={reprocessing || dlqCount === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ background: ACCENT }}
          >
            <RefreshCw size={16} className={reprocessing ? 'animate-spin' : ''} />
            {reprocessing ? 'Reprocessando...' : 'Reprocessar'}
          </button>

          {reprocessResult && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${reprocessResult.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {reprocessResult.message}
            </div>
          )}

          {lastDlqError && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium text-gray-500 mb-1">Último erro:</p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-red-600 font-mono break-all leading-relaxed">
                  {lastDlqError.message || JSON.stringify(lastDlqError)}
                </p>
                {lastDlqError.timestamp && (
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(lastDlqError.timestamp).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={18} style={{ color: ACCENT }} />
            <h3 className="font-semibold text-gray-900">Uploads Recentes</h3>
          </div>
          <button
            onClick={loadMetrics}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>

        {recentUploads.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileImage size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum upload recente encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2.5 px-2 text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="text-left py-2.5 px-2 text-xs font-medium text-gray-500 uppercase">Contexto</th>
                  <th className="text-left py-2.5 px-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right py-2.5 px-2 text-xs font-medium text-gray-500 uppercase">Tamanho</th>
                  <th className="text-right py-2.5 px-2 text-xs font-medium text-gray-500 uppercase">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentUploads.slice(0, 20).map((item) => {
                  const badge = STATUS_BADGE[item.status] || STATUS_BADGE.pending;
                  return (
                    <tr key={item.media_id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-2 font-mono text-xs text-gray-600 truncate max-w-[120px]" title={item.media_id}>
                        {item.media_id?.slice(0, 8)}...
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ background: CONTEXTO_COLORS[item.contexto] || '#6b7280' }}
                          />
                          <span className="text-gray-700">{CONTEXTO_LABELS[item.contexto] || item.contexto}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-gray-600">{fmtSize(item.size)}</td>
                      <td className="py-2.5 px-2 text-right text-gray-500 text-xs whitespace-nowrap">
                        {item.created_at ? new Date(item.created_at).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* KPI Card Component */
function KpiCard({ icon, iconColor, label, value, sublabel, alert }) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${alert ? 'border-red-200 bg-red-50/30' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: iconColor }}>{icon}</span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
    </div>
  );
}
