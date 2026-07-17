import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { User, Edit2, MessageCircle, FileText, FolderOpen, Image, CreditCard, ArrowLeft, Plus } from 'lucide-react';

const ACCENT = '#EA580C';

export default function ClienteDetalhe() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [orcamentos, setOrcamentos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [albuns, setAlbuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [cliRes, orcRes, contRes, albRes] = await Promise.all([
        authFetch(`/admin/clientes/${id}`).then(r => r.json()),
        authFetch(`/admin/orcamentos?cliente_id=${id}`).then(r => r.json()).catch(() => ({ data: [] })),
        authFetch(`/admin/contratos?cliente_id=${id}`).then(r => r.json()).catch(() => ({ data: [] })),
        authFetch(`/admin/albuns?cliente_id=${id}`).then(r => r.json()).catch(() => ({ data: [] })),
      ]);
      if (cliRes.success) setCliente(cliRes.data);
      setOrcamentos(orcRes.data || []);
      setContratos(contRes.data || []);
      setAlbuns(albRes.data || []);
    } catch {}
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;
  if (!cliente) return <div className="text-center py-20 text-gray-400">Cliente não encontrado</div>;

  const totalPago = orcamentos.reduce((sum, o) => sum + (o.valor_pago || 0), 0);
  const totalPendente = orcamentos.reduce((sum, o) => sum + ((o.valor_total || 0) - (o.valor_pago || 0)), 0);

  return (
    <div>
      <button onClick={() => navigate('/admin/clientes')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Voltar para Clientes
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${ACCENT}15` }}>
              <User size={28} style={{ color: ACCENT }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{cliente.nome || cliente.name}</h1>
              <p className="text-sm text-gray-500">{cliente.email}</p>
              <p className="text-sm text-gray-500">{cliente.telefone || cliente.phone} {cliente.whatsapp && `• WhatsApp: ${cliente.whatsapp}`}</p>
              {cliente.cidade && <p className="text-sm text-gray-400">{cliente.cidade}/{cliente.estado}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {cliente.whatsapp && (
              <a href={`https://wa.me/55${(cliente.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
                <MessageCircle size={14} /> WhatsApp
              </a>
            )}
            <button onClick={() => navigate(`/admin/clientes/${id}/editar`)}
              className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
              <Edit2 size={14} /> Editar
            </button>
            <button onClick={() => navigate(`/admin/orcamentos/novo?cliente_id=${id}`)} style={{ background: ACCENT }}
              className="inline-flex items-center gap-1 px-3 py-2 text-white rounded-lg text-sm hover:opacity-90">
              <Plus size={14} /> Novo Orçamento
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{orcamentos.length}</p>
            <p className="text-xs text-gray-500">Orçamentos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{contratos.length}</p>
            <p className="text-xs text-gray-500">Contratos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{albuns.length}</p>
            <p className="text-xs text-gray-500">Álbuns</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: ACCENT }}>R$ {totalPago.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-gray-500">Total Pago</p>
          </div>
        </div>
      </div>

      {/* Histórico */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Orçamentos */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3"><FileText size={16} /> Orçamentos</h3>
          {orcamentos.length === 0 ? <p className="text-sm text-gray-400">Nenhum orçamento</p> : (
            <div className="space-y-2">
              {orcamentos.slice(0, 5).map(o => (
                <div key={o.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/admin/orcamentos/${o.id}`)}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{o.tipo_evento || 'Orçamento'}</p>
                    <p className="text-xs text-gray-500">{o.created ? new Date(o.created).toLocaleDateString('pt-BR') : ''}</p>
                  </div>
                  <span className="text-sm font-medium">R$ {(o.valor_total || 0).toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contratos */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3"><FolderOpen size={16} /> Contratos</h3>
          {contratos.length === 0 ? <p className="text-sm text-gray-400">Nenhum contrato</p> : (
            <div className="space-y-2">
              {contratos.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Contrato #{c.id?.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">{c.created ? new Date(c.created).toLocaleDateString('pt-BR') : ''}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'assinado' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {c.status || 'pendente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Álbuns */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3"><Image size={16} /> Álbuns</h3>
          {albuns.length === 0 ? <p className="text-sm text-gray-400">Nenhum álbum</p> : (
            <div className="space-y-2">
              {albuns.slice(0, 5).map(a => (
                <div key={a.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                  <p className="text-sm font-medium text-gray-900">{a.titulo || 'Álbum'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'publicado' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {a.status || 'rascunho'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financeiro */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3"><CreditCard size={16} /> Financeiro</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Pago</span>
              <span className="text-sm font-medium text-green-600">R$ {totalPago.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Pendente</span>
              <span className="text-sm font-medium text-orange-600">R$ {totalPendente.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
