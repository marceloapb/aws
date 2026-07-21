import React from 'react';

const ACCENT = '#EA580C';

const sections = [
  {
    title: 'Orçamentos',
    fields: [
      { name: 'quoteValidityDays', label: 'Validade padrão', unit: 'dias', default: 7, hint: 'Prazo de validade para novos orçamentos', min: 1, max: 90 },
      { name: 'slaResponseHours', label: 'Tempo de resposta SLA', unit: 'horas', default: 24, hint: 'Prazo máximo para responder ao cliente', min: 1, max: 168 },
    ],
  },
  {
    title: 'Contratos',
    fields: [
      { name: 'cancellationFeePercent', label: 'Multa por cancelamento', unit: '%', default: 20, hint: 'Percentual cobrado em caso de cancelamento pelo cliente', min: 0, max: 100 },
      { name: 'depositRefundDays', label: 'Prazo devolução sinal', unit: 'dias', default: 30, hint: 'Dias para devolver sinal em caso de cancelamento pela empresa', min: 1, max: 90 },
    ],
  },
  {
    title: 'Entrega',
    fields: [
      { name: 'defaultDeliveryDays', label: 'Prazo entrega padrão', unit: 'dias', default: 30, hint: 'Prazo padrão para entrega das fotos após a sessão', min: 1, max: 365 },
      { name: 'photoSelectionDays', label: 'Prazo seleção fotos', unit: 'dias', default: 14, hint: 'Dias que o cliente tem para selecionar suas fotos', min: 1, max: 60 },
      { name: 'minSessionNoticeDays', label: 'Prazo mínimo aviso ensaio', unit: 'dias', default: 3, hint: 'Antecedência mínima para agendar ou reagendar um ensaio', min: 1, max: 30 },
    ],
  },
  {
    title: 'Financeiro',
    fields: [
      { name: 'lateInterestPercent', label: 'Juros por atraso', unit: '% ao mês', default: 2, hint: 'Juros mensais aplicados sobre parcelas em atraso', min: 0, max: 10, step: 0.1 },
      { name: 'lateFeePercent', label: 'Multa por atraso', unit: '%', default: 2, hint: 'Multa única aplicada ao valor em atraso', min: 0, max: 20, step: 0.1 },
      { name: 'earlyPaymentDiscount', label: 'Desconto antecipação', unit: '%', default: 5, hint: 'Desconto oferecido para pagamento antecipado', min: 0, max: 30, step: 0.5 },
    ],
  },
  {
    title: 'LGPD',
    fields: [
      { name: 'dataRetentionMonths', label: 'Prazo retenção dados', unit: 'meses', default: 60, hint: 'Tempo que os dados do cliente são mantidos após conclusão do serviço', min: 6, max: 120 },
    ],
  },
];

export default function ConfigPrazos({ form, setForm }) {
  const handleChange = (e) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };

  const handleToggle = (name) => {
    setForm({ ...form, [name]: !form[name] });
  };

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-500">Configure os prazos, políticas financeiras e regras de conformidade do sistema.</p>

      {sections.map(section => (
        <div key={section.title}>
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
            {section.title}
          </h3>
          <div className="grid md:grid-cols-2 gap-5">
            {section.fields.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    name={field.name}
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step || 1}
                    value={form[field.name] ?? field.default}
                    onChange={handleChange}
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap min-w-[60px]">{field.unit}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{field.hint}</p>
              </div>
            ))}
          </div>

          {/* LGPD toggle for client deletion */}
          {section.title === 'LGPD' && (
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border">
                <div>
                  <p className="text-sm font-medium text-gray-700">Permitir exclusão pelo cliente</p>
                  <p className="text-xs text-gray-400 mt-0.5">O cliente pode solicitar a exclusão dos seus dados pessoais pelo portal</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('allowClientDeletion')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    (form.allowClientDeletion ?? true) ? '' : 'bg-gray-300'
                  }`}
                  style={(form.allowClientDeletion ?? true) ? { background: ACCENT } : {}}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    (form.allowClientDeletion ?? true) ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-700">
                  💡 <strong>Como funciona a LGPD no sistema:</strong> Após o prazo de retenção configurado acima, dados de clientes inativos (sem serviço ativo) são marcados para exclusão automática.
                  Se "Permitir exclusão" estiver ativo, o cliente pode solicitar a remoção dos seus dados a qualquer momento pelo portal.
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
