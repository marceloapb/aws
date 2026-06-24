import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { formatarMoeda } from '../../lib/formatters.js';
import PageHeader from '../../components/PageHeader.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard/stats')
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral do seu negócio" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Eventos este mês" value={stats?.eventos_mes ?? 0} icon="📅" />
        <StatCard label="Receita do mês" value={formatarMoeda(stats?.receita_mes ?? 0)} icon="💰" />
        <StatCard label="Clientes ativos" value={stats?.clientes_ativos ?? 0} icon="👥" />
        <StatCard label="Álbuns pendentes" value={stats?.albuns_pendentes ?? 0} icon="📸" />
      </div>
    </div>
  );
}
