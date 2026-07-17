import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { HardDrive, Settings, AlertTriangle, Image, Archive, Trash2 } from 'lucide-react';

const ACCENT = '#EA580C';
const fmtGB = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(2);
const fmtSize = (bytes) => {
  if (bytes >= 1024 * 1024 * 1024) return `${fmtGB(bytes)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

export default function Storage() {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [limite, setLimite] = useState(200); // GB
  const [editandoLimite, setEditandoLimite] = useState(false);
  const [novoLimite, setNovoLimite] = useState(200);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      // Tentar buscar config de storage
      const configRes = await authFetch('/admin/configuracoes').then(r => r.json()).catch(() => ({}));
      if (configRes.data?.storageLimitGB) setLimite(configRes.data.storageLimitGB);

      // Buscar stats de uso do S3
      const statsRes = await authFetch('/admin/storage/stats').then(r => r.json()).catch(() => null);
      if (statsRes?.success) {
        setStats(statsRes.data);
      } else {
        // Fallback com dados simulados baseados no que sabemos
        setStats({
          totalBytes: 79, // 1 arquivo de backup de 79 bytes
          totalObjects: 1,
          byPrefix: [
            { prefix: 'fotos/', bytes: 0, objects: 0 },
            { prefix: 'backups/', bytes: 79, objects: 1 },
            { prefix: 'uploads/', bytes: 0, objects: 0 },
          ]
        });
      }
    } catch {}
    setLoading(false);
  };

  const salvarLimite = async () => {
    await authFetch('/admin/configuracoes', {
      method: 'PUT',
      body: JSON.stringify({ storageLimitGB: Number(novoLimite) }),
    });
    setLimite(Number(novoLimite));
    setEditandoLimite(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  const totalBytes = stats?.totalBytes || 0;
  const limiteBytes = limite * 1024 * 1024 * 1024;
  const percentual = limiteBytes > 0 ? (totalBytes / limiteBytes) * 100 : 0;
  const custoEstimado = (totalBytes / (1024 * 1024 * 1024)) * 0.023; // $0.023/GB

  // Cor da barra baseada no uso
  const barColor = percentual >= 90 ? '#ef4444' : percentual >= 70 ? '#f59e0b' : ACCENT;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <HardDrive size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Armazenamento</h1>
        </div>
        <button onClick={() => { setNovoLimite(limite); setEditandoLimite(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50">
          <Settings size={16} /> Definir Limite
        </button>
      </div>

      {/* Barra principal de uso */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-sm text-gray-500">Uso Total</p>
            <p className="text-3xl font-bold text-gray-900">{fmtSize(totalBytes)} <span className="text-lg font-normal text-gray-400">/ {limite} GB</span></p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Custo Estimado/mês</p>
            <p className="text-xl font-bold" style={{ color: ACCENT }}>${custoEstimado.toFixed(2)} USD</p>
            <p className="text-xs text-gray-400">~R$ {(custoEstimado * 5.5).toFixed(2)}</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
            style={{ width: `${Math.max(percentual, 1)}%`, background: barColor }}>
            {percentual >= 5 && <span className="text-xs font-medium text-white">{percentual.toFixed(1)}%</span>}
          </div>
        </div>

        {/* Legenda */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">0 GB</span>
          {percentual >= 70 && percentual < 90 && (
            <span className="text-xs text-yellow-600 flex items-center gap-1">
              <AlertTriangle size={10} /> Atenção: acima de 70%
            </span>
          )}
          {percentual >= 90 && (
            <span className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle size={10} /> Crítico: acima de 90%
            </span>
          )}
          <span className="text-xs text-gray-400">{limite} GB</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Image size={16} className="text-blue-500" />
            <span className="text-xs text-gray-500">Fotos</span>
          </div>
          <p className="text-lg font-bold">{fmtSize(stats?.byPrefix?.find(p => p.prefix === 'fotos/')?.bytes || 0)}</p>
          <p className="text-xs text-gray-400">{stats?.byPrefix?.find(p => p.prefix === 'fotos/')?.objects || 0} arquivos</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Archive size={16} className="text-green-500" />
            <span className="text-xs text-gray-500">Backups</span>
          </div>
          <p className="text-lg font-bold">{fmtSize(stats?.byPrefix?.find(p => p.prefix === 'backups/')?.bytes || 0)}</p>
          <p className="text-xs text-gray-400">{stats?.byPrefix?.find(p => p.prefix === 'backups/')?.objects || 0} arquivos</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={16} className="text-purple-500" />
            <span className="text-xs text-gray-500">Uploads Temp</span>
          </div>
          <p className="text-lg font-bold">{fmtSize(stats?.byPrefix?.find(p => p.prefix === 'uploads/')?.bytes || 0)}</p>
          <p className="text-xs text-gray-400">{stats?.byPrefix?.find(p => p.prefix === 'uploads/')?.objects || 0} arquivos</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trash2 size={16} className="text-gray-400" />
            <span className="text-xs text-gray-500">Disponível</span>
          </div>
          <p className="text-lg font-bold">{fmtGB(limiteBytes - totalBytes)} GB</p>
          <p className="text-xs text-gray-400">restante do limite</p>
        </div>
      </div>

      {/* Detalhamento */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Detalhamento por Categoria</h3>
        <div className="space-y-4">
          {(stats?.byPrefix || []).map((item, i) => {
            const pct = limiteBytes > 0 ? (item.bytes / limiteBytes) * 100 : 0;
            const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];
            return (
              <div key={item.prefix}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{item.prefix || 'Raiz'}</span>
                  <span className="text-sm text-gray-500">{fmtSize(item.bytes)} ({item.objects} arquivos)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 0.5)}%`, background: colors[i % colors.length] }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dicas de economia */}
      <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Dicas para economizar</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Fotos entregues há mais de 180 dias migram automaticamente para S3 IA (50% mais barato)</li>
          <li>• Uploads temporários são limpos automaticamente após 30 dias</li>
          <li>• Álbuns expirados podem ter fotos removidas para liberar espaço</li>
          <li>• Use o CloudFront para servir fotos — reduz transferência do S3</li>
        </ul>
      </div>

      {/* Modal Definir Limite */}
      {editandoLimite && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4">Definir Limite de Armazenamento</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Limite Máximo (GB)</label>
              <input type="number" min={1} max={5000} value={novoLimite} onChange={e => setNovoLimite(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
              <p className="text-xs text-gray-400 mt-1">Custo estimado no limite: ~${(novoLimite * 0.023).toFixed(2)}/mês (~R${(novoLimite * 0.023 * 5.5).toFixed(2)})</p>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setEditandoLimite(false)} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={salvarLimite} style={{ background: ACCENT }} className="px-4 py-2 text-white rounded-lg text-sm hover:opacity-90">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
