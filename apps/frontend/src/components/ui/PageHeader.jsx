import React from 'react';

const ACCENT = '#EA580C';

/**
 * PageHeader — cabeçalho padronizado de página
 *
 * @param {React.ElementType} props.icon - Componente de ícone (lucide-react)
 * @param {string} props.title - Título principal da página
 * @param {string} [props.subtitle] - Subtítulo/descrição opcional
 * @param {React.ReactNode} [props.actions] - Botões de ação (lado direito)
 */
export default function PageHeader({ icon: Icon, title, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
      <div className="flex items-center gap-3">
        {Icon && <Icon size={24} style={{ color: ACCENT }} />}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
