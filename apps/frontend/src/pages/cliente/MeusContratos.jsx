import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FolderOpen, FileSignature, CheckCircle, Eye } from 'lucide-react';

const ACCENT = '#EA580C';

const STATUS_LABEL = {
  rascunho: { label: 'Rascunho', cls: 'bg-gray-100 text-gray-600' },
  gerado: { label: 'Gerado', cls: 'bg-gray-100 text-gray-600' },
  enviado: { label: 'Pendente Assinatura', cls: 'bg-blue-50 text-blue-600' },
  pendente_assinatura: { label: 'Pendente Assinatura', cls: 'bg-blue-50 text-blue-600' },
  assinado: { label: 'Assinado', cls: 'bg-green-50 text-green-600' },
  expirado: { label: 'Expirado', cls: 'bg-red-50 text-red-600' },
};

export default function MeusContratos() {
  const { authFetch } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/client/contratos')
      .then(r => r.json())
      .then(json => {
        const data = Array.isArray(json) ? json : (json.data || []);
        setContracts(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const abrirContrato = (c) => {
    if (c.token_assinatura) {
      window.open(`/contrato/${c.token_assinatura}`, '_blank');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FolderOpen size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Meus Contratos</h1>
      </div>

      <div className="space-y-3">
        {contracts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            Nenhum contrato disponível. Após aceitar um orçamento, o contrato aparecerá aqui para assinatura.
          </div>
        ) : (
          contracts.map(c => {
            const st = STATUS_LABEL[c.status] || STATUS_LABEL.gerado;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50">
                      <FileSignature size={18} style={{ color: ACCENT }} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Contrato {c.numero_contrato || `#${(c.id || '').slice(-6)}`}</p>
                      <p className="text-sm text-gray-500">
                        {c.created ? new Date(c.created).toLocaleDateString('pt-BR') : ''}
                        {c.enviado_em && ` • Enviado em ${new Date(c.enviado_em).toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(c.status === 'enviado' || c.status === 'pendente_assinatura') && c.token_assinatura && (
                      <button onClick={() => abrirContrato(c)} style={{ background: ACCENT }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-medium hover:opacity-90">
                        <CheckCircle size={14} /> Assinar
                      </button>
                    )}
                    {c.status === 'assinado' && (
                      <button onClick={() => abrirContrato(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50">
                        <Eye size={14} /> Visualizar
                      </button>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
