import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, ChevronDown, Plus, CheckCircle } from 'lucide-react';
import StatusTracker from '../../components/cliente/StatusTracker';

const ACCENT = '#EA580C';

export default function MeusOrcamentos() {
  const { authFetch, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTracker, setExpandedTracker] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (location.state?.openModal) {
      // Redirect to the new dedicated page
      navigate('/cliente/orcamentos/novo', { replace: true });
    }
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      setTab('orcamentos');
      window.history.replaceState({}, document.title);
      // Auto-dismiss after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [location.state]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const orcRes = await authFetch('/client/orcamentos').then(r => r.json()).catch(() => ({ data: [] }));
      setOrcamentos(orcRes.data || []);
    } catch {}
    setLoading(false);
  };

  const handleSolicitar = () => {
    navigate('/cliente/orcamentos/novo');
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  const statusLabel = {
    solicitado: 'Solicitado', rascunho: 'Em análise', enviado: 'Aguardando sua aprovação', confirmado: 'Confirmado', aceito: 'Confirmado',
    recusado: 'Recusado', expirado: 'Expirado', gerado: 'Pendente', assinado: 'Assinado',
    publicado: 'Disponível', ativo: 'Disponível',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${ACCENT}15` }}>
          <FileText size={20} style={{ color: ACCENT }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Meus Orçamentos</h1>
          <p className="text-sm text-gray-500">Acompanhe suas solicitações e propostas</p>
        </div>
      </div>

      {/* Orçamentos */}
      <div className="space-y-3">
        {successMessage && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
              <CheckCircle size={16} />
              {successMessage}
            </div>
          )}
          <button onClick={handleSolicitar} style={{ background: ACCENT }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
            <Plus size={18} /> Solicitar Novo Orçamento
          </button>
          {orcamentos.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">Nenhum orçamento</div>
          ) : orcamentos.map(o => {
            const showTracker = o.status && !['aceito', 'confirmado'].includes(o.status);
            const isExpanded = expandedTracker === o.id;
            // Map backend status to tracker status
            const trackerStatus = o.status === 'rascunho' ? 'orcando' :
              o.status === 'enviado' ? 'enviado' :
              o.status === 'recusado' ? 'orcando' : (o.status || 'orcando');

            return (
              <div key={o.id} className="bg-white rounded-xl border overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{o.tipo_evento || 'Orçamento'}</p>
                    <p className="text-sm text-gray-500">R$ {(o.valor_total || 0).toLocaleString('pt-BR')} • {o.created ? new Date(o.created).toLocaleDateString('pt-BR') : ''}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${['confirmado', 'aceito'].includes(o.status) ? 'bg-green-50 text-green-700' : o.status === 'enviado' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {statusLabel[o.status] || o.status}
                  </span>
                </div>
                {showTracker && (
                  <>
                    {o.status === 'enviado' && (
                      <button
                        onClick={() => navigate(`/cliente/orcamentos/${o.id}`)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-t text-sm font-semibold transition-colors text-white"
                        style={{ background: ACCENT }}
                      >
                        Ver Orçamento
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedTracker(isExpanded ? null : o.id)}
                      className="w-full flex items-center justify-between px-4 py-2 border-t text-sm font-medium hover:bg-gray-50 transition-colors"
                      style={{ color: ACCENT }}
                    >
                      Ver progresso
                      <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t bg-gray-50">
                        <StatusTracker status={trackerStatus} createdAt={o.created} />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
