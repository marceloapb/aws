import React from 'react';
import { maskPhone, maskCPF, maskCNPJ, maskCPFCNPJ, maskCEP, validateCPF, validateCNPJ, validateCPFCNPJ, validatePhone } from '../../utils/formatters';
import { AlertCircle, Check } from 'lucide-react';

const MASKS = {
  phone: { mask: maskPhone, validate: validatePhone, placeholder: '(11) 99999-9999' },
  cpf: { mask: maskCPF, validate: validateCPF, placeholder: '000.000.000-00' },
  cnpj: { mask: maskCNPJ, validate: validateCNPJ, placeholder: '00.000.000/0000-00' },
  cpfcnpj: { mask: maskCPFCNPJ, validate: validateCPFCNPJ, placeholder: 'CPF ou CNPJ' },
  cep: { mask: maskCEP, validate: (v) => v.replace(/\D/g, '').length === 8, placeholder: '00000-000' },
};

/**
 * Input com máscara e validação inline.
 * Props:
 * - type: 'phone' | 'cpf' | 'cnpj' | 'cpfcnpj' | 'cep'
 * - value, onChange, label, required, className, ...rest
 * - showValidation: boolean (mostra ícone de check/erro)
 */
export default function MaskedInput({ type, value = '', onChange, label, required, showValidation = true, className = '', ...rest }) {
  const config = MASKS[type];
  if (!config) return <input value={value} onChange={onChange} className={className} {...rest} />;

  const handleChange = (e) => {
    const masked = config.mask(e.target.value);
    onChange({ target: { value: masked, name: e.target.name } });
  };

  const digits = (value || '').replace(/\D/g, '');
  const isFilled = digits.length >= (type === 'phone' ? 10 : type === 'cpf' ? 11 : type === 'cnpj' ? 14 : type === 'cep' ? 8 : 11);
  const isValid = isFilled ? config.validate(value) : null;

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          value={value}
          onChange={handleChange}
          placeholder={config.placeholder}
          className={`w-full px-3 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-200 pr-9 ${
            isValid === false ? 'border-red-400' : isValid === true ? 'border-green-400' : 'border-gray-300'
          } ${className}`}
          {...rest}
        />
        {showValidation && isFilled && (
          <span className="absolute right-3 top-3">
            {isValid ? <Check size={14} className="text-green-500" /> : <AlertCircle size={14} className="text-red-500" />}
          </span>
        )}
      </div>
      {isValid === false && (
        <p className="text-xs text-red-500 mt-0.5">
          {type === 'cpf' ? 'CPF inválido' : type === 'cnpj' ? 'CNPJ inválido' : type === 'cpfcnpj' ? 'Documento inválido' : type === 'phone' ? 'Telefone inválido' : 'Valor inválido'}
        </p>
      )}
    </div>
  );
}
