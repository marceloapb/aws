import React from 'react';

/**
 * Select — dropdown padrão com label e erro
 */
export default function Select({ label, required, error, options = [], placeholder = 'Selecione...', className = '', ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        className={`w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-orange-200 ${
          error ? 'border-red-400' : 'border-gray-300'
        } ${className}`}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value || opt} value={opt.value || opt}>
            {opt.label || opt}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
