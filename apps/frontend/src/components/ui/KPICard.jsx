import React from 'react';

const ACCENT = '#EA580C';

/**
 * KPICard — card de métrica/indicador
 * @param {ReactNode} props.icon - Ícone lucide-react
 * @param {string} props.label
 * @param {string|number} props.value
 * @param {string} props.color - classe Tailwind de cor
 * @param {string} props.trend - '+12%' ou '-5%'
 */
export default function KPICard({ icon: Icon, label, value, color = '', trend }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        {Icon && <Icon size={18} className={color || 'text-gray-400'} />}
        {trend && (
          <span className={`text-xs font-medium ${trend.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
