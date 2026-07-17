import React from 'react';

/**
 * Card — container visual padrão
 * @param {'sm'|'md'|'lg'} props.padding
 * @param {boolean} props.hover - efeito hover
 * @param {boolean} props.clickable
 */
export default function Card({ children, padding = 'md', hover, clickable, className = '', ...props }) {
  const paddings = { sm: 'p-3', md: 'p-4', lg: 'p-6' };
  const hoverClass = hover ? 'hover:shadow-md transition-shadow' : '';
  const cursorClass = clickable ? 'cursor-pointer' : '';

  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${paddings[padding]} ${hoverClass} ${cursorClass} ${className}`} {...props}>
      {children}
    </div>
  );
}
