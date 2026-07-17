import React from 'react';
import { useNavigate } from 'react-router-dom';

const ACCENT = '#EA580C';

/**
 * EmptyState — tela quando não há dados
 * @param {ReactNode} props.icon - Ícone lucide-react
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} props.actionLabel - texto do botão CTA
 * @param {string} props.actionTo - rota de navegação
 * @param {Function} props.onAction - callback alternativo ao navigate
 */
export default function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onAction) onAction();
    else if (actionTo) navigate(actionTo);
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {Icon && (
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: `${ACCENT}15` }}>
          <Icon size={28} style={{ color: ACCENT }} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title || 'Nenhum dado encontrado'}</h3>
      {description && <p className="text-sm text-gray-500 text-center max-w-sm mb-6">{description}</p>}
      {actionLabel && (
        <button onClick={handleClick} style={{ background: ACCENT }}
          className="px-5 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
