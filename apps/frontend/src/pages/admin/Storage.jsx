import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  HardDrive, Database, CheckCircle2, AlertTriangle, FileImage,
  RefreshCw, Clock, Folder, BarChart3, DollarSign
} from 'lucide-react';

const ACCENT = '#EA580C';

const fmtSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const CONTEXTOS = ['album', 'portfolio', 'perfil', 'whatsapp', 'backups'];

const CONTEXTO_LABELS = {
  album: 'Álbuns',
  portfolio: 'Portfólio',
  novidades: 'Novidades',
  perfil: 'Perfil',
  config: 'Configurações',
  whatsapp: 'WhatsApp',
  backups: 'Backups',
};

const CONTEXTO_COLORS = {
  album: '#3b82f6',
  portfolio: '#8b5cf6',
  novidades: '#10b981',
  perfil: '#f59e0b',
  config: '#6b7280',
  whatsapp: '#25d366',
  backups: '#64748b',
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
  const [storageLimit, setStorageLimit] = useState(50); // GB, vem da config

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch config for storage limit
      const configRes = await authFetch('/admin/configuracoes');
      const configData = await configRes.json();
      if (configData.success && configData.data?.storageLimit) {
        setStorageLimit(Number(configData.data.storageLimit) || 50);
      }

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
      <p className="text-sm text-gray-500 mb-6">Métricas de armazenamento e uso de espaço por contexto.</p>

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
          icon={<Clock size={18} />}
          iconColor="#6b7280"
          label="Espaço disponível"
          value={fmtSize(storageLimit * 1024 * 1024 * 1024 - totalBytes)}
          sublabel={`de ${storageLimit} GB`}
        />
      </div>

      {/* Barra de Uso Total */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HardDrive size={18} style={{ color: ACCENT }} />
            <h3 className="font-semibold text-gray-900">Uso Total do Armazenamento</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{fmtSize(totalBytes)} /</span>
            <input
              type="number"
              value={storageLimit}
              onChange={(e) => setStorageLimit(Number(e.target.value) || 50)}
              onBlur={() => { authFetch('/admin/configuracoes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storageLimit: String(storageLimit) }) }).catch(() => {}); }}
              className="w-16 px-2 py-1 border border-gray-200 rounded text-sm text-center focus:ring-2 focus:ring-orange-200 outline-none"
              min="1"
            />
            <span className="text-sm text-gray-500">GB</span>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min((totalBytes / (storageLimit * 1024 * 1024 * 1024)) * 100, 100)}%`,
              background: (totalBytes / (storageLimit * 1024 * 1024 * 1024)) > 0.85 ? '#ef4444' : (totalBytes / (storageLimit * 1024 * 1024 * 1024)) > 0.7 ? '#f59e0b' : ACCENT,
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">{((totalBytes / (storageLimit * 1024 * 1024 * 1024)) * 100).toFixed(1)}% utilizado</span>
          <span className="text-xs text-gray-400">{fmtSize(storageLimit * 1024 * 1024 * 1024 - totalBytes)} disponível</span>
        </div>
        {(totalBytes / (storageLimit * 1024 * 1024 * 1024)) > 0.85 && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700 flex items-center gap-1"><AlertTriangle size={12} /> Atenção: armazenamento próximo do limite. Considere excluir álbuns antigos ou fazer upgrade.</p>
          </div>
        )}
      </div>

      {/* Uso por Contexto (70%) + Estimativa de Custo (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Uso por Contexto — 70% */}
        <div className="lg:col-span-7 bg-white rounded-xl border p-6">
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
                      <span className="text-xs text-gray-400 ml-2">{ctxFiles.toLocaleString('pt-BR')} arq.</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 0.5)}%`, background: CONTEXTO_COLORS[ctx] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Estimativa de Custo S3 — 30% */}
        <div className="lg:col-span-3 bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={18} style={{ color: ACCENT }} />
            <h3 className="font-semibold text-gray-900">Custo S3</h3>
          </div>
          {(() => {
            const totalBytes = metrics?.totalBytes || 0;
            const totalGB = totalBytes / (1024 * 1024 * 1024);
            const custoArmazenamento = totalGB * 0.023;
            const custoRequests = 0.012;
            const transferGB = Math.min(totalGB * 0.5, 10);
            const custoTransfer = transferGB * 0.09;
            const custoTotal = custoArmazenamento + custoRequests + custoTransfer;

            return (
              <div className="space-y-3">
                <div className="rounded-lg p-4 text-center" style={{ background: `${ACCENT}10` }}>
                  <p className="text-xs" style={{ color: ACCENT }}>Total Estimado</p>
                  <p className="text-2xl font-bold" style={{ color: ACCENT }}>${custoTotal.toFixed(2)}<span className="text-sm font-normal">/mês</span></p>
                  <p className="text-xs text-gray-400 mt-1">~R$ {(custoTotal * 5.5).toFixed(2)}/mês</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Armazenamento</span>
                    <span className="font-medium">${custoArmazenamento.toFixed(3)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Requests</span>
                    <span className="font-medium">${custoRequests.toFixed(3)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Transfer Out</span>
                    <span className="font-medium">${custoTransfer.toFixed(3)}</span>
                  </div>
                </div>
                <p className="text-[9px] text-gray-400 text-center pt-2 border-t">S3 Standard us-east-1 · $1≈R$5,50</p>
              </div>
            );
          })()}
        </div>
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
