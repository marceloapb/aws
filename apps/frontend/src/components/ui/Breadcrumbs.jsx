import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Breadcrumbs — navegação hierárquica
 * @param {Array<{label: string, to?: string}>} props.items
 */
export default function Breadcrumbs({ items = [] }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4">
      <Link to="/admin" className="hover:text-gray-700">
        <Home size={14} />
      </Link>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <ChevronRight size={12} className="text-gray-300" />
          {item.to ? (
            <Link to={item.to} className="hover:text-gray-700">{item.label}</Link>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
