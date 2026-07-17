import React from 'react';

const ACCENT = '#EA580C';

const VARIANTS = {
  primary: 'text-white hover:opacity-90',
  secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-gray-600 hover:bg-gray-100',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

/**
 * Button — componente base
 * @param {Object} props
 * @param {'primary'|'secondary'|'danger'|'ghost'} props.variant
 * @param {'sm'|'md'|'lg'} props.size
 * @param {ReactNode} props.icon - Ícone lucide-react (componente)
 * @param {boolean} props.loading
 * @param {boolean} props.disabled
 * @param {boolean} props.fullWidth
 */
export default function Button({
  children, variant = 'primary', size = 'md', icon: Icon, loading, disabled, fullWidth, className = '', ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = VARIANTS[variant] || VARIANTS.primary;
  const sizeClasses = SIZES[size] || SIZES.md;
  const widthClass = fullWidth ? 'w-full' : '';

  const style = variant === 'primary' ? { backgroundColor: ACCENT } : {};

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${widthClass} ${className}`}
      style={style}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : Icon ? <Icon size={size === 'sm' ? 14 : 16} /> : null}
      {children}
    </button>
  );
}
