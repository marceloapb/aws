import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { Camera, FileText, FolderOpen, Image, CreditCard, Star, Calendar, ChevronRight, ChevronDown, Plus, X } from 'lucide-react';
import StatusTracker from '../../components/cliente/StatusTracker';

const ACCENT = '#EA580C';

export default function MeusOrcamentos() {
  const { authFetch, user } = useAuth();
  const location = useLocation();
  const [tab, setTab] = useState('orcamentos');
  const [orcamentos, setOrcamentos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [albuns, setAlbuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTracker, setExpandedTracker] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ tipo_evento: '', data_evento: '', local: '', observacoes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (location.state?.openModal) {
      setShowModal(true);
      setTab('orcamentos');
      // Clear the state to avoid reopening on re-render
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [orcRes, contRes, albRes] = await Promise.all([
        authFetch('/client/orcamentos').then(r => r.json()).catch(() => ({ data: [] })),
        authFetch('/client/contratos').then(r => r.json()).catch(() => ({ data: [] })),
        authFetch('/client/albuns').then(r => r.json()).catch(() => ({ data: [] })),
      ]);
      setOrcamentos(orcRes.data || []);
      setContratos(contRes.data || []);
      setAlbuns(albRes.data || []);
    } catch {}
    setLoading(false);
  };

  const handleSolicitar = async (e) => {
    e.preventDefault();
    if (!formData.tipo_evento.trim()) return;
    setSubmitting(true);
    try {
      const res = await authFetch('/client/orcamentos', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setFormData({ tipo_evento: '', data_evento: '', local: '', observacoes: '' });
        loadData();
        setTab('orcamentos');
      }
    } catch {}
    setSubmitting(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  const statusLabel = {
    solicitado: 'Solicitado', rascunho: 'Em análise', enviado: 'Aguardando resposta', confirmado: 'Confirmado', aceito: 'Confirmado',
    recusado: 'Recusado', expirado: 'Expirado', gerado: 'Pendente', assinado: 'Assinado',
    publicado: 'Disponível', ativo: 'Disponível',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${ACCENT}15` }}>
          <Camera size={20} style={{ color: ACCENT }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Olá, {user?.email?.split('@')[0] || 'Cliente'}!</h1>
          <p className="text-sm text-gray-500">Acompanhe seus eventos e entregas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
        {[{ key: 'resumo', label: 'Resumo', icon: Calendar }, { key: 'orcamentos', label: 'Orçamentos', icon: FileText }, { key: 'contratos', label: 'Contratos', icon: FolderOpen }, { key: 'albuns', label: 'Fotos', icon: Image }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Resumo */}
      {tab === 'resumo' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: ACCENT }}>{orcamentos.length}</div>
              <p className="text-xs text-gray-400">Orçamentos</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-2xl font-bold">{contratos.length}</div>
              <p className="text-xs text-gray-400">Contratos</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-2xl font-bold">{albuns.length}</div>
              <p className="text-xs text-gray-400">Álbuns</p>
            </div>
          </div>

          {/* Próximos eventos */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Seus Eventos</h3>
            {orcamentos.filter(o => ['confirmado', 'aceito'].includes(o.status)).length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum evento confirmado no momento</p>
            ) : (
              <div className="space-y-2">
                {orcamentos.filter(o => ['confirmado', 'aceito'].includes(o.status)).slice(0, 5).map(o => (
                  <div key={o.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">{o.tipo_evento || 'Evento'}</p>
                      <p className="text-xs text-gray-500">{o.data_evento ? new Date(o.data_evento).toLocaleDateString('pt-BR') : ''} • {o.local || ''}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Álbuns disponíveis */}
          {albuns.filter(a => ['publicado', 'ativo'].includes(a.status)).length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-900 mb-3">📸 Fotos Disponíveis</h3>
              <div className="space-y-2">
                {albuns.filter(a => ['publicado', 'ativo'].includes(a.status)).map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                    <div>
                      <p className="font-medium text-green-900">{a.titulo || 'Álbum'}</p>
                      <p className="text-xs text-green-600">{a.total_fotos || '?'} fotos • {a.data_expiracao ? `Expira: ${new Date(a.data_expiracao).toLocaleDateString('pt-BR')}` : ''}</p>
                    </div>
                    <button onClick={() => setTab('albuns')} style={{ background: ACCENT }} className="px-3 py-1.5 text-white text-xs rounded-lg">Ver Fotos</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Orçamentos */}
      {tab === 'orcamentos' && (
        <div className="space-y-3">
          <button onClick={() => setShowModal(true)} style={{ background: ACCENT }}
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
      )}

      {/* Contratos */}
      {tab === 'contratos' && (
        <div className="space-y-3">
          {contratos.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">Nenhum contrato</div>
          ) : contratos.map(c => (
            <div key={c.id} className="bg-white rounded-xl border p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Contrato #{c.id?.slice(0, 8)}</p>
                <p className="text-sm text-gray-500">{c.created ? new Date(c.created).toLocaleDateString('pt-BR') : ''}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.status === 'assinado' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                {statusLabel[c.status] || c.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Álbuns */}
      {tab === 'albuns' && (
        <div className="space-y-3">
          {albuns.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">Nenhum álbum disponível</div>
          ) : albuns.map(a => (
            <div key={a.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-900">{a.titulo || 'Álbum'}</p>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${['publicado', 'ativo'].includes(a.status) ? 'bg-green-50 text-green-700' : a.status === 'expirado' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                  {statusLabel[a.status] || a.status}
                </span>
              </div>
              <p className="text-sm text-gray-500">{a.total_fotos || '?'} fotos{a.data_expiracao ? ` • Disponível até ${new Date(a.data_expiracao).toLocaleDateString('pt-BR')}` : ''}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal Solicitar Orçamento */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Solicitar Orçamento</h2>
            <form onSubmit={handleSolicitar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Evento *</label>
                <input type="text" required placeholder="Ex: Casamento, Aniversário, Ensaio..."
                  value={formData.tipo_evento} onChange={e => setFormData({ ...formData, tipo_evento: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do Evento</label>
                <input type="date" value={formData.data_evento} onChange={e => setFormData({ ...formData, data_evento: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
                <input type="text" placeholder="Cidade, espaço do evento..." value={formData.local}
                  onChange={e => setFormData({ ...formData, local: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea rows={3} placeholder="Detalhes adicionais, quantidade de convidados, estilo desejado..."
                  value={formData.observacoes} onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none" />
              </div>
              <button type="submit" disabled={submitting} style={{ background: ACCENT }}
                className="w-full py-3 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {submitting ? 'Enviando...' : 'Enviar Solicitação'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
