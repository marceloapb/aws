import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FolderOpen, FileSignature, CheckCircle } from 'lucide-react';

const ACCENT = '#EA580C';

export default function MeusContratos() {
  const { authFetch } = useAuth();
  const [contracts, setContracts] = useState([]);

  useEffect(() => {
    authFetch('/contracts/mine').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setContracts(data);
    }).catch(() => {});
  }, []);

  const handleSign = async (id) => {
    if (!window.confirm('Confirma a assinatura eletrônica deste contrato?')) return;
    await authFetch(`/contracts/${id}/sign`, { method: 'POST' });
    setContracts(contracts.map(c => c.id === id ? { ...c, status: 'signed' } : c));
  };

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
          contracts.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50">
                    <FileSignature size={18} style={{ color: ACCENT }} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{c.title || 'Contrato de serviço'}</p>
                    <p className="text-sm text-gray-500">{c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.status === 'sent' && (
                    <button onClick={() => handleSign(c.id)} style={{ background: ACCENT }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-medium hover:opacity-90">
                      <CheckCircle size={14} /> Assinar
                    </button>
                  )}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    c.status === 'signed' ? 'bg-green-50 text-green-600' :
                    c.status === 'sent' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {c.status === 'signed' ? 'Assinado' : c.status === 'sent' ? 'Pendente' : c.status}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
