import React from 'react';

const ACCENT = '#EA580C';

/**
 * KPICard — card de métrica/indicador
 *
 * Layout padrão: ícone à esquerda + label/value à direita
 *
 * @param {React.ElementType} props.icon - Componente de ícone (lucide-react)
 * @param {string} props.label - Rótulo do indicador
 * @param {string|number} props.value - Valor principal
 * @param {string} [props.accent] - Classes de cor para o ícone (ex: 'text-orange-600 bg-orange-50')
 * @param {string} [props.trend] - Tendência: '+12%' ou '-5%'
 */
export default function KPICard({ icon: Icon, label, value, accent = 'text-orange-600 bg-orange-50', trend }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      {Icon && (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}>
          <Icon size={20} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 uppercase tracking-wide truncate">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-lg font-bold text-gray-900">{value}</p>
          {trend && (
            <span className={`text-xs font-medium ${trend.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
