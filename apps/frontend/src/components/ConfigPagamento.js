import React from 'react';

const ACCENT = '#EA580C';
const PAYMENT_METHODS = [
  { key: 'pix', label: 'PIX' },
  { key: 'boleto', label: 'Boleto Bancário' },
  { key: 'credit_card', label: 'Cartão de Crédito' },
  { key: 'debit_card', label: 'Cartão de Débito' },
  { key: 'cash', label: 'Dinheiro' },
  { key: 'transfer', label: 'Transferência Bancária' },
];

export default function ConfigPagamento({ form, setForm }) {
  const handleChange = (e) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };

  const handlePaymentMethod = (key) => {
    const methods = form.paymentMethods || [];
    setForm({
      ...form,
      paymentMethods: methods.includes(key) ? methods.filter(m => m !== key) : [...methods, key],
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Configure as condições de pagamento padrão para orçamentos e cobranças.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Desconto à Vista (%)</label>
          <input name="cashDiscountPercent" type="number" min={0} max={50} step={0.5} value={form.cashDiscountPercent || 10} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Desconto Máximo Permitido (%)</label>
          <input name="maxDiscountPercent" type="number" min={0} max={50} step={0.5} value={form.maxDiscountPercent || 15} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de Parcelas sem Juros</label>
          <input name="maxInstallmentsNoInterest" type="number" min={1} max={24} value={form.maxInstallmentsNoInterest || 6} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor Mínimo da Parcela (R$)</label>
          <input name="minInstallmentValue" type="number" min={50} step={10} value={form.minInstallmentValue || 200} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Taxa de Juros ao Mês (%)</label>
          <input name="monthlyInterestRate" type="number" min={0} max={10} step={0.1} value={form.monthlyInterestRate || 2.5} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
          <p className="text-xs text-gray-400 mt-1">Aplicado em parcelas acima do limite sem juros</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sinal Mínimo (%)</label>
          <input name="minDownPaymentPercent" type="number" min={0} max={100} step={5} value={form.minDownPaymentPercent || 30} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
          <p className="text-xs text-gray-400 mt-1">Percentual mínimo de entrada/sinal exigido</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Condição Padrão</label>
          <select name="defaultPaymentCondition" value={form.defaultPaymentCondition || 'sinal_parcelas'} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none">
            <option value="avista">À vista</option>
            <option value="sinal_parcelas">Sinal + Parcelas</option>
            <option value="parcelas">Parcelas sem sinal</option>
            <option value="personalizado">Personalizado</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">Usado como padrão ao criar novo orçamento</p>
        </div>
      </div>

      {/* Meios de pagamento */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Meios de Pagamento Aceitos</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PAYMENT_METHODS.map(({ key, label }) => {
            const active = (form.paymentMethods || []).includes(key);
            return (
              <button key={key} type="button" onClick={() => handlePaymentMethod(key)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${active ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${active ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                  {active && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </div>
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
