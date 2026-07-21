import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, FileText, FolderOpen, Image, CreditCard,
  Bell, ChevronRight, AlertCircle
} from 'lucide-react';

const ACCENT = '#EA580C';

export default function ClienteDashboard() {
  const { authFetch, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authFetch('/client/portal/dashboard').then(r => r.json()).catch(() => null),
      authFetch('/client/portal/eventos').then(r => r.json()).catch(() => null),
    ]).then(([dashRes, evtRes]) => {
      if (dashRes?.success) setData(dashRes.data);
      else if (dashRes?.data) setData(dashRes.data);
      else setData(dashRes);
      if (evtRes?.success) setEventos(evtRes.data || []);
      else if (evtRes?.data) setEventos(evtRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Carregando...
      </div>
    );
  }

  const resumo = data?.resumo || {};
  const pendencias = data?.pendencias || [];
  const proximo = data?.proximo_evento;

  // Format next event text
  const proximoTexto = proximo
    ? `${proximo.tipo_evento || 'Evento'} - ${new Date(proximo.data_evento).toLocaleDateString('pt-BR')}`
    : 'Nenhum evento agendado.';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8"
      style={{ borderTop: `4px solid ${ACCENT}` }}>

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Olá, {user?.name || 'Cliente'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Acompanhe sua jornada conosco.</p>
      </div>

      {/* Summary Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Próximo Evento */}
        <div className="rounded-xl border border-gray-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={18} style={{ color: ACCENT }} />
              <span className="text-sm font-semibold" style={{ color: ACCENT }}>Próximo Evento</span>
            </div>
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              {proximoTexto}
            </p>
          </div>
        </div>

        {/* Orçamentos */}
        <div className="rounded-xl border border-gray-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText size={18} style={{ color: ACCENT }} />
              <span className="text-sm font-semibold" style={{ color: ACCENT }}>Orçamentos</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{resumo.orcamentos || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Total de solicitações</p>
          </div>
          <button
            onClick={() => navigate('/cliente/orcamentos')}
            className="mt-4 flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: ACCENT }}
          >
            Ver orçamentos <ChevronRight size={16} />
          </button>
        </div>

        {/* Contratos */}
        <div className="rounded-xl border border-gray-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen size={18} style={{ color: ACCENT }} />
              <span className="text-sm font-semibold" style={{ color: ACCENT }}>Contratos</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{resumo.contratos || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Contratos gerados</p>
          </div>
          <button
            onClick={() => navigate('/cliente/contratos')}
            className="mt-4 flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: ACCENT }}
          >
            Ver contratos <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Summary Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pagamentos */}
        <div className="rounded-xl border border-gray-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={18} style={{ color: ACCENT }} />
              <span className="text-sm font-semibold" style={{ color: ACCENT }}>Pagamentos</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{resumo.pagamentos_pendentes || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Cobranças registradas</p>
          </div>
          <button
            onClick={() => navigate('/cliente/pagamentos')}
            className="mt-4 flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: ACCENT }}
          >
            Ver pagamentos <ChevronRight size={16} />
          </button>
        </div>

        {/* Álbuns */}
        <div className="rounded-xl border border-gray-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Image size={18} style={{ color: ACCENT }} />
              <span className="text-sm font-semibold" style={{ color: ACCENT }}>Álbuns</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{resumo.albuns || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Álbuns disponíveis</p>
          </div>
          <button
            onClick={() => navigate('/cliente/albuns')}
            className="mt-4 flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: ACCENT }}
          >
            Acessar álbuns <ChevronRight size={16} />
          </button>
        </div>

        {/* Avisos */}
        <div className="rounded-xl p-5 flex flex-col justify-between" style={{ backgroundColor: '#FFF4EB' }}>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bell size={18} style={{ color: ACCENT }} />
              <span className="text-sm font-semibold" style={{ color: ACCENT }}>Avisos</span>
            </div>
            {pendencias.length > 0 ? (
              <ul className="space-y-2">
                {pendencias.map((p, i) => (
                  <li key={i} className="text-sm text-gray-700 border border-orange-200 bg-white/60 rounded-lg px-3 py-2">
                    {p.mensagem}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-600 border border-orange-200 bg-white/60 rounded-lg px-3 py-2">
                Você não possui novos avisos no momento.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Próximos Passos */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Próximos Passos</h2>
        {pendencias.length > 0 ? (
          <div className="space-y-3">
            {pendencias.map((acao, i) => (
              <div key={i} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle size={18} style={{ color: ACCENT }} />
                  <span className="text-sm font-medium text-gray-800">{acao.mensagem}</span>
                </div>
                {acao.tipo === 'assinar_contrato' && (
                  <button onClick={() => navigate('/cliente/contratos')}
                    className="px-3 py-1.5 text-white rounded-lg text-xs font-medium hover:opacity-90"
                    style={{ background: ACCENT }}>
                    Ver
                  </button>
                )}
                {acao.tipo === 'pagamento' && (
                  <button onClick={() => navigate('/cliente/pagamentos')}
                    className="px-3 py-1.5 text-white rounded-lg text-xs font-medium hover:opacity-90"
                    style={{ background: ACCENT }}>
                    Ver
                  </button>
                )}
                {acao.tipo === 'responder_orcamento' && (
                  <button onClick={() => navigate('/cliente/orcamentos')}
                    className="px-3 py-1.5 text-white rounded-lg text-xs font-medium hover:opacity-90"
                    style={{ background: ACCENT }}>
                    Ver
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-green-600">Tudo certo por aqui! Nenhuma ação pendente.</p>
        )}
      </div>

      {/* Meus Eventos */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Meus Eventos</h2>
        {eventos.length > 0 ? (
          <div className="space-y-3">
            {eventos.map((evt) => (
              <div key={evt.id}
                className="rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/cliente/eventos/${evt.id}`)}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${ACCENT}15` }}>
                    <Calendar size={20} style={{ color: ACCENT }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{evt.tipo_evento || 'Evento'}</p>
                    <p className="text-sm text-gray-500">
                      {evt.data_evento ? new Date(evt.data_evento).toLocaleDateString('pt-BR') : 'Data a definir'}
                      {evt.local ? ` • ${evt.local}` : ''}
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 p-8 text-center">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Calendar size={24} className="text-gray-400" />
              </div>
            </div>
            <p className="font-semibold text-gray-700">Nenhum evento encontrado</p>
            <p className="text-sm text-gray-500 mt-1">
              Você ainda não possui eventos registrados ou orçamentos<br />aprovados em nosso sistema.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
