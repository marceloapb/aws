import React, { useState, useEffect } from 'react';
import { Eye, Download, Image, Clock, BarChart3, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#EA580C';

/**
 * EstatisticasPanel — painel de estatísticas do álbum (admin)
 * @param {string} props.albumId
 */
export default function EstatisticasPanel({ albumId }) {
  const { authFetch } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`/admin/albuns/${albumId}/estatisticas`);
        if (!res.ok) throw new Error('Erro ao carregar estatísticas');
        const json = await res.json();
        setStats(json.data || json);
      } catch (err) {
        setError(err.message || 'Erro ao carregar estatísticas');
      } finally {
        setLoading(false);
      }
    };

    if (albumId) fetchStats();
  }, [albumId, authFetch]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Nunca';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* KPI skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-8 mb-3" />
              <div className="h-6 bg-gray-200 rounded w-16 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        <AlertCircle size={16} />
        <span>{error}</span>
      </div>
    );
  }

  if (!stats || (stats.totalVisualizacoes === 0 && stats.totalDownloads === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BarChart3 size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium text-lg">Sem dados ainda</p>
        <p className="text-gray-400 text-sm mt-1">
          As estatísticas aparecerão conforme o álbum for acessado.
        </p>
      </div>
    );
  }

  const kpis = [
    {
      icon: Eye,
      label: 'Total visualizações',
      value: stats.totalVisualizacoes?.toLocaleString('pt-BR') || '0',
      color: 'text-blue-500',
    },
    {
      icon: Download,
      label: 'Total downloads',
      value: stats.totalDownloads?.toLocaleString('pt-BR') || '0',
      color: 'text-green-500',
    },
    {
      icon: Image,
      label: 'Fotos mais vistas',
      value: stats.fotosMaisVistas?.length || stats.topFotos || '0',
      color: 'text-purple-500',
    },
    {
      icon: Clock,
      label: 'Último acesso',
      value: formatDate(stats.ultimoAcesso),
      color: 'text-orange-500',
    },
  ];

  const topFotos = stats.fotosMaisVistas || stats.topFotos || [];
  const atividade = stats.atividade || stats.atividadeDiaria || [];

  // Normalize activity data for chart
  const maxAtividade = Math.max(...atividade.map((a) => a.views || a.visualizacoes || 0), 1);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <kpi.icon size={18} className={kpi.color} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Top 5 fotos mais vistas */}
      {topFotos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Eye size={16} style={{ color: ACCENT }} />
            Top 5 — Fotos mais vistas
          </h3>
          <div className="grid grid-cols-5 gap-3">
            {topFotos.slice(0, 5).map((foto, idx) => (
              <div key={foto.id || idx} className="text-center">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
                  {foto.thumbnail || foto.url ? (
                    <img
                      src={foto.thumbnail || foto.url}
                      alt={foto.nome || `Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image size={20} className="text-gray-300" />
                    </div>
                  )}
                  <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    #{idx + 1}
                  </span>
                </div>
                <p className="text-xs font-medium text-gray-700 flex items-center justify-center gap-0.5">
                  <Eye size={10} className="text-gray-400" />
                  {(foto.views || foto.visualizacoes || 0).toLocaleString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Chart (last 30 days) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <BarChart3 size={16} style={{ color: ACCENT }} />
          Atividade — Últimos 30 dias
        </h3>
        {atividade.length > 0 ? (
          <div className="flex items-end gap-1 h-32">
            {atividade.slice(-30).map((dia, idx) => {
              const value = dia.views || dia.visualizacoes || 0;
              const height = (value / maxAtividade) * 100;
              return (
                <div
                  key={dia.data || idx}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  <div
                    className="w-full rounded-t-sm transition-colors hover:opacity-80 min-h-[2px]"
                    style={{
                      height: `${Math.max(height, 2)}%`,
                      backgroundColor: ACCENT,
                      opacity: 0.7 + (height / 100) * 0.3,
                    }}
                    title={`${dia.data || ''}: ${value} views`}
                  />
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                    {dia.data ? new Date(dia.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : `Dia ${idx + 1}`}: {value}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            <p>Sem dados de atividade disponíveis</p>
          </div>
        )}
        <div className="flex justify-between mt-2 text-[10px] text-gray-400">
          <span>30 dias atrás</span>
          <span>Hoje</span>
        </div>
      </div>
    </div>
  );
}
