import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function FieldLabel({ children, required, hint }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
      {hint && (
        <span className="relative inline-block ml-1 group">
          <HelpCircle size={14} className="inline text-gray-400 cursor-help" />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
            {hint}
          </span>
        </span>
      )}
    </label>
  );
}
