import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar, MapPin, FileText, FileSignature, CreditCard, Image,
  ArrowLeft, Download, CheckCircle, Clock
} from 'lucide-react';

const ACCENT = '#EA580C';

const TABS = [
  { key: 'orcamento', label: 'Orçamento', icon: FileText },
  { key: 'contrato', label: 'Contrato', icon: FileSignature },
  { key: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
  { key: 'album', label: 'Álbum', icon: Image },
];

export default function EventoDetalhe() {
  const { authFetch } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [evento, setEvento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orcamento');

  useEffect(() => {
    authFetch(`/client/portal/eventos/${id}`)
      .then(r => r.json())
      .then(d => setEvento(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleSign = async () => {
    if (!window.confirm('Confirma a assinatura eletrônica deste contrato?')) return;
    try {
      await authFetch(`/client/portal/eventos/${id}/contrato/assinar`, { method: 'POST' });
      setEvento(prev => ({ ...prev, contrato: { ...prev.contrato, status: 'assinado' } }));
    } catch {}
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;
  if (!evento) return <div className="text-center py-20 text-gray-400">Evento não encontrado.</div>;

  const { orcamento, contrato, pagamentos, album } = evento;

  return (
    <div>
      <button onClick={() => navigate('/cliente/eventos')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h1 className="text-xl font-bold text-gray-900">{evento.tipo_evento}</h1>
        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(evento.data_evento).toLocaleDateString('pt-BR')}</span>
          {evento.local && <span className="flex items-center gap-1"><MapPin size={14} /> {evento.local}</span>}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'orcamento' && <OrcamentoTab orcamento={orcamento} />}
      {activeTab === 'contrato' && <ContratoTab contrato={contrato} onSign={handleSign} />}
      {activeTab === 'pagamentos' && <PagamentosTab pagamentos={pagamentos} />}
      {activeTab === 'album' && <AlbumTab album={album} navigate={navigate} />}
    </div>
  );
}

function OrcamentoTab({ orcamento }) {
  if (!orcamento) return <EmptyState msg="Orçamento não disponível." />;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h3 className="font-semibold text-gray-900">Itens do orçamento</h3>
      <div className="space-y-2">
        {(orcamento.itens || []).map((item, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
            <span className="text-sm text-gray-700">{item.descricao}</span>
            <span className="text-sm font-medium text-gray-900">
              R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-gray-200">
        <span className="font-semibold text-gray-900">Total</span>
        <span className="font-bold text-lg" style={{ color: ACCENT }}>
          R$ {Number(orcamento.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>
      {orcamento.condicoes_pagamento && (
        <p className="text-sm text-gray-500"><strong>Condições:</strong> {orcamento.condicoes_pagamento}</p>
      )}
    </div>
  );
}

function ContratoTab({ contrato, onSign }) {
  if (!contrato) return <EmptyState msg="Contrato não disponível." />;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Contrato</h3>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          contrato.status === 'assinado' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-700'
        }`}>
          {contrato.status === 'assinado' ? 'Assinado' : 'Pendente de assinatura'}
        </span>
      </div>
      {contrato.status !== 'assinado' && (
        <button onClick={onSign} style={{ background: ACCENT }}
          className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
          <CheckCircle size={16} /> Assinar contrato
        </button>
      )}
      {contrato.pdf_url && (
        <a href={contrato.pdf_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Download size={16} /> Ver PDF
        </a>
      )}
    </div>
  );
}

function PagamentosTab({ pagamentos }) {
  if (!pagamentos || pagamentos.length === 0) return <EmptyState msg="Nenhum pagamento registrado." />;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      {pagamentos.map((p, i) => {
        const isOverdue = p.status === 'em_aberto' && new Date(p.vencimento) < new Date();
        return (
          <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
            isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-100'
          }`}>
            <div>
              <p className="text-sm font-medium text-gray-900">Parcela {p.numero}</p>
              <p className="text-xs text-gray-500">Venc: {new Date(p.vencimento).toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-900">
                R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              {p.status === 'pago' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-600">Pago</span>
              ) : (
                <button style={{ background: ACCENT }}
                  className="px-3 py-1 text-white rounded-lg text-xs font-medium hover:opacity-90">Pagar</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AlbumTab({ album, navigate }) {
  if (!album) return <EmptyState msg="Álbum não disponível." />;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Álbum de fotos</h3>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          album.status === 'pronto' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
        }`}>
          {album.status === 'pronto' ? 'Pronto' : 'Em produção'}
        </span>
      </div>
      {album.status === 'pronto' && album.id && (
        <button onClick={() => navigate(`/cliente/albuns/${album.id}`)} style={{ background: ACCENT }}
          className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
          <Image size={16} /> Ver álbum
        </button>
      )}
      {album.status !== 'pronto' && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock size={16} /> Suas fotos estão sendo editadas. Avisaremos quando estiverem prontas.
        </div>
      )}
    </div>
  );
}

function EmptyState({ msg }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">{msg}</div>
  );
}
