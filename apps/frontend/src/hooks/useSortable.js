import { useState, useMemo } from 'react';

/**
 * Hook para ordenação de tabelas por coluna.
 *
 * @param {Array} data - Array de dados a ordenar
 * @param {Object} options - Opções de configuração
 * @param {string} options.defaultField - Campo padrão para ordenação inicial
 * @param {'asc'|'desc'} options.defaultDirection - Direção padrão ('asc' ou 'desc')
 * @param {Object} options.customComparators - Comparadores customizados por campo { campo: (a, b) => number }
 *
 * @returns {{ sortedData, sortField, sortDirection, requestSort, getSortIndicator }}
 */
export default function useSortable(data, options = {}) {
  const {
    defaultField = null,
    defaultDirection = 'asc',
    customComparators = {},
  } = options;

  const [sortField, setSortField] = useState(defaultField);
  const [sortDirection, setSortDirection] = useState(defaultDirection);

  const requestSort = (field) => {
    if (sortField === field) {
      // Ciclo: asc -> desc -> null (sem ordenação)
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortField || !data) return data;

    return [...data].sort((a, b) => {
      // Usa comparador customizado se existir
      if (customComparators[sortField]) {
        const result = customComparators[sortField](a, b);
        return sortDirection === 'asc' ? result : -result;
      }

      let aVal = a[sortField];
      let bVal = b[sortField];

      // Trata null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;

      // Detecta tipo e compara
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Tenta como número
      const numA = Number(aVal);
      const numB = Number(bVal);
      if (!isNaN(numA) && !isNaN(numB) && aVal !== '' && bVal !== '') {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      // Tenta como data
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const dateA = Date.parse(aVal);
        const dateB = Date.parse(bVal);
        if (!isNaN(dateA) && !isNaN(dateB) && aVal.includes('-')) {
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        }
      }

      // String comparison (locale-aware)
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      const cmp = strA.localeCompare(strB, 'pt-BR');
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [data, sortField, sortDirection, customComparators]);

  const getSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortDirection;
  };

  return {
    sortedData,
    sortField,
    sortDirection,
    requestSort,
    getSortIndicator,
  };
}
