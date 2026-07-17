import React from 'react';

const VARIANTS = {
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-green-50 text-green-700',
  blue: 'bg-blue-50 text-blue-700',
  yellow: 'bg-yellow-50 text-yellow-700',
  red: 'bg-red-50 text-red-700',
  orange: 'bg-orange-50 text-orange-700',
  purple: 'bg-purple-50 text-purple-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  pink: 'bg-pink-50 text-pink-700',
};

/**
 * Badge — status/tag visual
 * @param {'gray'|'green'|'blue'|'yellow'|'red'|'orange'|'purple'|'emerald'|'pink'} props.variant
 * @param {'sm'|'md'} props.size
 * @param {boolean} props.dot - mostrar dot colorido
 * @param {boolean} props.pulse - animação pulse
 */
export default function Badge({ children, variant = 'gray', size = 'sm', dot, pulse, className = '' }) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${VARIANTS[variant]} ${sizeClasses} ${pulse ? 'animate-pulse' : ''} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${variant === 'green' ? 'bg-green-500' : variant === 'red' ? 'bg-red-500' : variant === 'yellow' ? 'bg-yellow-500' : 'bg-gray-400'}`} />}
      {children}
    </span>
  );
}
