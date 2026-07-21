import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FileText, RefreshCw, Trash2, CheckCircle, XCircle, ArrowLeft, Filter } from 'lucide-react';
import { PageHeader } from '../../components/ui';

const ACCENT = '#EA580C';

export default function IntegracoesLogs() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [clearing, setClearing] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const url = filtro
        ? `/admin/integracoes/logs?integracao=${filtro}`
        : '/admin/integracoes/logs';
      const res = await authFetch(url);
      const data = await res.json();
      if (data.success) setLogs(data.data || []);
    } catch {} finally {
      setLoading(false);
    }
  }, [authFetch, filtro]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleClear = async () => {
    if (!window.confirm('Tem certeza que deseja limpar todos os logs?')) return;
    setClearing(true);
    try {
      await authFetch('/admin/integracoes/logs', { method: 'DELETE' });
      setLogs([]);
    } catch {} finally {
      setClearing(false);
    }
  };

  const getIntegracaoLabel = (integracao) => {
    const map = {
      'whatsapp': 'WhatsApp',
      'instagram': 'Instagram',
      'google-calendar': 'Google Calendar',
      'email': 'E-mail (SES)',
      'maps': 'Google Maps',
      'gateway': 'Pagamento',
      'nf': 'Nota Fiscal',
    };
    return map[integracao] || integracao;
  };

  const getIntegracaoColor = (integracao) => {
    const map = {
      'whatsapp': 'bg-green-100 text-green-700',
      'instagram': 'bg-purple-100 text-purple-700',
      'google-calendar': 'bg-blue-100 text-blue-700',
      'email': 'bg-yellow-100 text-yellow-700',
      'maps': 'bg-indigo-100 text-indigo-700',
      'gateway': 'bg-orange-100 text-orange-700',
      'nf': 'bg-teal-100 text-teal-700',
    };
    return map[integracao] || 'bg-gray-100 text-gray-700';
  };

  const filteredLogs = filtroStatus ? logs.filter(l => l.resultado === filtroStatus) : logs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={FileText}
        title="Logs de Integrações"
        subtitle="Histórico de testes e eventos das integrações"
        actions={
          <>
            <button onClick={() => navigate('/admin/config')}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
              <ArrowLeft size={14} /> Voltar
            </button>
            <button onClick={loadLogs} disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
            <button onClick={handleClear} disabled={clearing || logs.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50">
              <Trash2 size={14} />
              Limpar
            </button>
          </>
        }
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {[{ value: '', label: 'Todos' }, { value: 'whatsapp', label: 'WhatsApp' }, { value: 'instagram', label: 'Instagram' }, { value: 'google-calendar', label: 'Calendar' }, { value: 'email', label: 'E-mail' }, { value: 'maps', label: 'Maps' }, { value: 'nf', label: 'NF' }].map(f => (
            <button key={f.value} onClick={() => setFiltro(f.value)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${filtro === f.value ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              style={filtro === f.value ? { borderColor: ACCENT, color: ACCENT } : {}}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex border-b border-gray-200">
            {[{ value: '', label: 'Todos' }, { value: 'erro', label: 'Erros' }, { value: 'sucesso', label: 'Sucesso' }].map(f => (
              <button key={f.value} onClick={() => setFiltroStatus(f.value)}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${filtroStatus === f.value ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                style={filtroStatus === f.value ? { borderColor: ACCENT, color: ACCENT } : {}}>
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400">{filteredLogs.length} registro{filteredLogs.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Lista de logs */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">Nenhum log registrado</p>
          <p className="text-xs text-gray-400 mt-1">Use os botões de teste nas integrações para gerar logs</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <div key={log.id} className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              {/* Ícone de resultado */}
              {log.resultado === 'sucesso' ? (
                <CheckCircle size={18} className="text-green-500 shrink-0" />
              ) : (
                <XCircle size={18} className="text-red-500 shrink-0" />
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getIntegracaoColor(log.integracao)}`}>
                    {getIntegracaoLabel(log.integracao)}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">{log.tipo}</span>
                </div>
                {log.detalhes && (
                  <p className="text-sm text-gray-600 truncate">{log.detalhes}</p>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                {new Date(log.created).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
