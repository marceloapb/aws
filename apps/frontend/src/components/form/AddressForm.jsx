import React, { useState } from 'react';
import { maskCEP, fetchAddressByCEP } from '../../utils/formatters';
import { Loader2, MapPin } from 'lucide-react';

/**
 * Componente de endereço com busca automática por CEP.
 * Props: { form, setForm, prefix? }
 * Os campos são: cep, rua, numero, complemento, bairro, cidade, estado
 * Se prefix='endereco', usa form.endereco.cep etc.
 */
export default function AddressForm({ form, setForm, prefix = '' }) {
  const [loading, setLoading] = useState(false);
  const [cepError, setCepError] = useState('');

  const get = (field) => prefix ? (form[prefix]?.[field] || '') : (form[field] || '');
  const set = (field, value) => {
    if (prefix) {
      setForm({ ...form, [prefix]: { ...(form[prefix] || {}), [field]: value } });
    } else {
      setForm({ ...form, [field]: value });
    }
  };

  const handleCEP = async (value) => {
    const masked = maskCEP(value);
    set('cep', masked);
    setCepError('');

    const digits = value.replace(/\D/g, '');
    if (digits.length === 8) {
      setLoading(true);
      const address = await fetchAddressByCEP(digits);
      if (address) {
        if (prefix) {
          setForm({ ...form, [prefix]: { ...(form[prefix] || {}), cep: masked, ...address } });
        } else {
          setForm({ ...form, cep: masked, ...address });
        }
      } else {
        setCepError('CEP não encontrado');
      }
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <MapPin size={16} className="text-gray-400" />
        <span className="text-sm font-semibold text-gray-700">Endereço</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* CEP */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">CEP *</label>
          <div className="relative">
            <input
              value={get('cep')}
              onChange={(e) => handleCEP(e.target.value)}
              placeholder="00000-000"
              maxLength={9}
              className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200 ${cepError ? 'border-red-400' : 'border-gray-300'}`}
            />
            {loading && <Loader2 size={14} className="absolute right-3 top-2.5 animate-spin text-orange-500" />}
          </div>
          {cepError && <p className="text-xs text-red-500 mt-0.5">{cepError}</p>}
        </div>

        {/* Rua */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Rua</label>
          <input
            value={get('rua')}
            onChange={(e) => set('rua', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Número */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Número</label>
          <input
            value={get('numero')}
            onChange={(e) => set('numero', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>

        {/* Complemento */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Complemento</label>
          <input
            value={get('complemento')}
            onChange={(e) => set('complemento', e.target.value)}
            placeholder="Apto, sala..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>

        {/* Bairro */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Bairro</label>
          <input
            value={get('bairro')}
            onChange={(e) => set('bairro', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>

        {/* Cidade + Estado */}
        <div className="col-span-2 sm:col-span-1 grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Cidade</label>
            <input
              value={get('cidade')}
              onChange={(e) => set('cidade', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">UF</label>
            <input
              value={get('estado')}
              onChange={(e) => set('estado', e.target.value.toUpperCase().slice(0, 2))}
              maxLength={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200 uppercase"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
