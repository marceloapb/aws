import React from 'react';

export default function ConfigPrazos({ form, setForm }) {
  const handleChange = (e) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Configure os prazos padrão do sistema. Esses valores serão usados automaticamente nos orçamentos e contratos.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Validade do Orçamento (dias)</label>
          <input name="quoteValidityDays" type="number" min={1} max={90} value={form.quoteValidityDays || 7} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
          <p className="text-xs text-gray-400 mt-1">Após esse prazo, o orçamento expira automaticamente</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reserva Temporária (dias)</label>
          <input name="tempReservationDays" type="number" min={1} max={30} value={form.tempReservationDays || 3} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
          <p className="text-xs text-gray-400 mt-1">Dias que a data fica reservada enquanto aguarda aceite</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prazo Padrão de Entrega (dias)</label>
          <input name="defaultDeliveryDays" type="number" min={1} max={365} value={form.defaultDeliveryDays || 30} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
          <p className="text-xs text-gray-400 mt-1">Prazo padrão para entrega das fotos após a sessão</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiração do Álbum (dias)</label>
          <input name="albumExpirationDays" type="number" min={30} max={365} value={form.albumExpirationDays || 90} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
          <p className="text-xs text-gray-400 mt-1">Após esse prazo, o álbum do cliente expira</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiração do Contrato (dias)</label>
          <input name="contractExpirationDays" type="number" min={1} max={30} value={form.contractExpirationDays || 5} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
          <p className="text-xs text-gray-400 mt-1">Dias para o cliente assinar o contrato após geração</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prazo para Feedback Pós-Entrega (dias)</label>
          <input name="feedbackDeadlineDays" type="number" min={1} max={90} value={form.feedbackDeadlineDays || 14} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
          <p className="text-xs text-gray-400 mt-1">Dias após entrega para solicitar avaliação do cliente</p>
        </div>
      </div>

      {/* Texto de aviso */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Texto de Aviso de Expiração</label>
        <textarea name="expirationWarningText" value={form.expirationWarningText || ''} onChange={handleChange} rows={3}
          placeholder="Olá {{cliente}}, seu orçamento expira em {{data}}. Entre em contato para não perder sua data!"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none resize-none" />
        <p className="text-xs text-gray-400 mt-1">Variáveis disponíveis: {'{{cliente}}'}, {'{{data}}'}, {'{{valor}}'}</p>
      </div>
    </div>
  );
}
