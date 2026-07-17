import React from 'react';

const ACCENT = '#EA580C';

/**
 * Tabs — navegação por abas
 * @param {Array<{key: string, label: string, count?: number}>} props.tabs
 * @param {string} props.active - key da aba ativa
 * @param {Function} props.onChange
 */
export default function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 bg-gray-100 rounded-lg p-1 w-fit overflow-x-auto ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
            active === tab.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${active === tab.key ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-500'}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
