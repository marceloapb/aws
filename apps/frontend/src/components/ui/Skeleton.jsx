import React from 'react';

/**
 * Skeleton — placeholder de carregamento
 * @param {'text'|'card'|'table'|'avatar'|'kpi'} props.variant
 * @param {number} props.rows - para variante table
 */
export default function Skeleton({ variant = 'text', rows = 5, className = '' }) {
  const pulse = 'animate-pulse bg-gray-200 rounded';

  if (variant === 'avatar') {
    return <div className={`w-10 h-10 rounded-full ${pulse} ${className}`} />;
  }

  if (variant === 'kpi') {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl border p-4 space-y-2">
            <div className={`h-4 w-16 ${pulse}`} />
            <div className={`h-8 w-24 ${pulse}`} />
            <div className={`h-3 w-20 ${pulse}`} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`bg-white rounded-xl border p-6 space-y-3 ${className}`}>
        <div className={`h-5 w-1/3 ${pulse}`} />
        <div className={`h-4 w-full ${pulse}`} />
        <div className={`h-4 w-2/3 ${pulse}`} />
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b"><div className={`h-4 w-1/4 ${pulse}`} /></div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
            <div className={`h-4 w-1/4 ${pulse}`} />
            <div className={`h-4 w-1/5 ${pulse}`} />
            <div className={`h-4 w-1/6 ${pulse}`} />
            <div className={`h-4 w-16 ${pulse}`} />
          </div>
        ))}
      </div>
    );
  }

  // Default: text lines
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`h-4 ${pulse}`} style={{ width: `${70 + Math.random() * 30}%` }} />
      ))}
    </div>
  );
}
