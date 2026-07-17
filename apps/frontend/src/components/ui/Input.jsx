import React from 'react';

/**
 * Input — componente base com label, erro e hint
 * @param {Object} props
 * @param {string} props.label
 * @param {boolean} props.required
 * @param {string} props.error - mensagem de erro
 * @param {string} props.hint - texto de ajuda
 * @param {string} props.icon - ícone à esquerda (componente)
 */
export default function Input({ label, required, error, hint, icon: Icon, className = '', ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={16} />
          </div>
        )}
        <input
          className={`w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-orange-200 ${
            Icon ? 'pl-9' : ''
          } ${error ? 'border-red-400 focus:ring-red-200' : 'border-gray-300'} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
