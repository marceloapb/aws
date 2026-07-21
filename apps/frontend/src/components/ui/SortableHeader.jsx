import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

/**
 * Componente de cabeçalho de tabela com indicador de ordenação.
 *
 * @param {Object} props
 * @param {string} props.label - Texto do cabeçalho
 * @param {string} props.field - Nome do campo para ordenar
 * @param {function} props.onSort - Callback chamado ao clicar (recebe field)
 * @param {'asc'|'desc'|null} props.active - Indicador do estado de ordenação atual
 * @param {string} props.align - Alinhamento do texto: 'left', 'center', 'right'
 * @param {string} props.className - Classes CSS adicionais
 */
export default function SortableHeader({
  label,
  field,
  onSort,
  active = null,
  align = 'left',
  className = '',
}) {
  const alignClass =
    align === 'right' ? 'justify-end' :
    align === 'center' ? 'justify-center' :
    'justify-start';

  const textAlignClass =
    align === 'right' ? 'text-right' :
    align === 'center' ? 'text-center' :
    'text-left';

  return (
    <th
      className={`px-4 py-3 font-medium text-gray-600 select-none cursor-pointer hover:bg-gray-100 transition-colors ${textAlignClass} ${className}`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1 ${alignClass}`}>
        <span>{label}</span>
        <span className="inline-flex flex-col text-gray-400">
          {active === 'asc' ? (
            <ChevronUp size={14} className="text-orange-600" />
          ) : active === 'desc' ? (
            <ChevronDown size={14} className="text-orange-600" />
          ) : (
            <ChevronsUpDown size={12} className="opacity-40" />
          )}
        </span>
      </div>
    </th>
  );
}
