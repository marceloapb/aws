import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Bell, Mail, MessageCircle, CheckCircle, XCircle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import KPICard from '../../components/ui/KPICard';

const ACCENT = '#EA580C';

const TIPOS_EVENTO = [
  'orcamento.criado',
  'orcamento.enviado',
  'orcamento.aceito',
  'orcamento.recusado',
  'contrato.enviado',
  'contrato.assinado',
  'pagamento.confirmado',
  'pagamento.vencido',
  'evento.criado',
  'evento.confirmado',
  'evento.realizado',
  'album.publicado',
  'album.baixado',
  'feedback.respondido',
  'cliente.criado',
  'mensagem.recebida',
];

const CANAL_CONFIG = {
  inapp: { label: 'In-App', variant: 'blue', icon: Bell },
  email: { label: 'E-mail', variant: 'purple', icon: Mail },
  whatsapp: { label: 'WhatsApp', variant: 'green', icon: MessageCircle },
};

const PERIODOS = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'todos', label: 'Todos' },
];

const PAGE_SIZE = 20;

export default function NotificacoesLog() {
  const { authFetch } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [periodo, setPeriodo] = useState('30d');
  const [canal, setCanal] = useState('');
  const [status, setStatus] = useState('');
  const [tipoEvento, setTipoEvento] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', PAGE_SIZE.toString());
      if (periodo && periodo !== 'todos') params.set('periodo', periodo);
      if (canal) params.set('canal', canal);
      if (status) params.set('status', status);
      if (tipoEvento) params.set('tipo_evento', tipoEvento);

      const res = await authFetch(`/admin/notificacoes/logs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
        setTotal(data.total || data.data?.length || 0);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [authFetch, page, periodo, canal, status, tipoEvento]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [periodo, canal, status, tipoEvento]);

  // Compute KPIs from loaded data
  const kpis = React.useMemo(() => {
    const totalCount = total || logs.length;
    const enviados = logs.filter(l => l.status === 'enviado').length;
    const falhas = logs.filter(l => l.status === 'falha').length;
    const taxaSucesso = totalCount > 0 ? Math.round((enviados / (enviados + falhas || 1)) * 100) : 0;
    return { total: totalCount, enviados, falhas, taxaSucesso };
  }, [logs, total]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatEvento = (tipo) => {
    if (!tipo) return '-';
    return tipo.replace('.', ' → ').replace(/^\w/, c => c.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText size={24} style={{ color: ACCENT }} />
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Log de Notificações</h1>
          <p className="text-sm text-gray-500">Histórico de envios e auditoria de notificações</p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="ml-auto p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          aria-label="Atualizar"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard icon={FileText} label="Total de Envios" value={kpis.total} color="text-gray-500" />
        <KPICard icon={CheckCircle} label="Enviados" value={kpis.enviados} color="text-green-500" />
        <KPICard icon={XCircle} label="Falhas" value={kpis.falhas} color="text-red-500" />
        <KPICard icon={Bell} label="Taxa de Sucesso" value={`${kpis.taxaSucesso}%`} color="text-blue-500" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Select
            label="Período"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            options={PERIODOS}
            placeholder="Todos"
          />
          <Select
            label="Canal"
            value={canal}
            onChange={(e) => setCanal(e.target.value)}
            options={[
              { value: 'inapp', label: 'In-App' },
              { value: 'email', label: 'E-mail' },
              { value: 'whatsapp', label: 'WhatsApp' },
            ]}
            placeholder="Todos"
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: 'enviado', label: 'Enviado' },
              { value: 'falha', label: 'Falha' },
            ]}
            placeholder="Todos"
          />
          <Select
            label="Tipo de Evento"
            value={tipoEvento}
            onChange={(e) => setTipoEvento(e.target.value)}
            options={TIPOS_EVENTO.map(t => ({ value: t, label: formatEvento(t) }))}
            placeholder="Todos"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">Nenhum log encontrado</p>
          <p className="text-xs text-gray-400 mt-1">Ajuste os filtros ou aguarde o envio de notificações</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Data/Hora</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Evento</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Canal</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Destino</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => {
                  const canalConfig = CANAL_CONFIG[log.canal] || { label: log.canal, variant: 'gray' };
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDateTime(log.created_at || log.created)}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {formatEvento(log.tipo_evento)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={canalConfig.variant} size="sm">
                          {canalConfig.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]">
                        {log.destino || log.destinatario_email || log.destinatario_phone || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={log.status === 'enviado' ? 'green' : 'red'}
                          size="sm"
                          dot
                        >
                          {log.status === 'enviado' ? 'Enviado' : 'Falha'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[200px]">
                        {log.detalhes || log.erro || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden divide-y">
            {logs.map((log) => {
              const canalConfig = CANAL_CONFIG[log.canal] || { label: log.canal, variant: 'gray' };
              return (
                <div key={log.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {formatEvento(log.tipo_evento)}
                    </span>
                    <Badge
                      variant={log.status === 'enviado' ? 'green' : 'red'}
                      size="sm"
                      dot
                    >
                      {log.status === 'enviado' ? 'Enviado' : 'Falha'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={canalConfig.variant} size="sm">
                      {canalConfig.label}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {formatDateTime(log.created_at || log.created)}
                    </span>
                  </div>
                  {(log.destino || log.destinatario_email) && (
                    <p className="text-xs text-gray-500">
                      Para: {log.destino || log.destinatario_email || log.destinatario_phone}
                    </p>
                  )}
                  {(log.detalhes || log.erro) && (
                    <p className="text-xs text-gray-400 truncate">
                      {log.detalhes || log.erro}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <p className="text-xs text-gray-500">
                Página {page} de {totalPages} • {total} registro{total !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} className="text-gray-600" />
                </button>
                <span className="px-3 py-1 text-sm font-medium text-gray-700">{page}</span>
                <button
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Próxima página"
                >
                  <ChevronRight size={16} className="text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
