import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FolderOpen, Plus, FileSignature, CheckCircle, Clock, Send } from 'lucide-react';

const ACCENT = '#EA580C';

const STATUS_MAP = {
  draft: { label: 'Rascunho', color: 'text-gray-500 bg-gray-100' },
  sent: { label: 'Enviado', color: 'text-blue-600 bg-blue-50' },
  signed: { label: 'Assinado', color: 'text-green-600 bg-green-50' },
};

export default function Contratos() {
  const { authFetch } = useAuth();
  const [contracts, setContracts] = useState([]);

  useEffect(() => {
    authFetch('/contracts').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setContracts(data);
    }).catch(() => {});
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FolderOpen size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
        </div>
        <button style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Novo Contrato
        </button>
      </div>

      <div className="space-y-3">
        {contracts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            Nenhum contrato cadastrado. Crie modelos e gere contratos a partir dos orçamentos aceitos.
          </div>
        ) : (
          contracts.map(c => {
            const st = STATUS_MAP[c.status] || STATUS_MAP.draft;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50">
                    <FileSignature size={18} style={{ color: ACCENT }} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{c.clientName || 'Cliente'}</p>
                    <p className="text-sm text-gray-500">{c.title || 'Contrato de serviço'}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
