import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { formatarData } from '../../lib/formatters.js';
import PageHeader from '../../components/PageHeader.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function GoogleCalendar() {
  const [config, setConfig] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [configRes, logsRes] = await Promise.all([
        api.get('/admin/google-calendar/config'),
        api.get('/admin/google-calendar/logs'),
      ]);
      setConfig(configRes.data);
      setLogs(logsRes.data || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }

  async function conectar() {
    try {
      const { data } = await api.get('/admin/google-calendar/auth-url');
      window.location.href = data.url;
    } catch (err) {
      alert(err.message);
    }
  }

  async function sincronizarAgora() {
    setSyncing(true);
    try {
      await api.post('/admin/google-calendar/sync');
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function desconectar() {
    if (!confirm('Desconectar Google Calendar?')) return;
    try {
      await api.post('/admin/google-calendar/desconectar');
      setConfig(null);
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader title="Google Calendar" subtitle="Sincronização bidirecional de eventos" />

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold mb-4">Status da Conexão</h3>
        {config?.connected ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-700">Conectado</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div><p className="text-xs text-gray-500">Calendar ID</p><p className="text-sm font-medium">{config.calendar_id || 'primary'}</p></div>
              <div><p className="text-xs text-gray-500">Última sincronização</p><p className="text-sm font-medium">{config.last_sync ? formatarData(config.last_sync) : 'Nunca'}</p></div>
              <div><p className="text-xs text-gray-500">Intervalo</p><p className="text-sm font-medium">A cada 30 minutos</p></div>
            </div>
            <div className="flex gap-3">
              <button onClick={sincronizarAgora} disabled={syncing} className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm disabled:opacity-50">
                {syncing ? '🔄 Sincronizando...' : '🔄 Sincronizar Agora'}
              </button>
              <button onClick={desconectar} className="px-4 py-2 bg-red-100 text-red-700 rounded-md text-sm">Desconectar</button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500 mb-4">Google Calendar não conectado</p>
            <button onClick={conectar} className="px-6 py-3 bg-primary-600 text-white rounded-md font-medium">
              🔗 Conectar Google Calendar
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold mb-4">Histórico de Sincronização</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum log disponível</p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 20).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="text-sm font-medium">{log.tipo}</p>
                  <p className="text-xs text-gray-500">{formatarData(log.created)} • {log.total_operacoes} operações</p>
                </div>
                <StatusBadge status={log.status === 'sucesso' ? 'pago' : 'erro'} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
