import React from 'react';

const ACCENT = '#EA580C';

export default function SectionHeader({ icon: Icon, title, description, required }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        {Icon && <Icon size={20} style={{ color: ACCENT }} />}
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        {required && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full text-white" style={{ background: ACCENT }}>
            Obrigatório
          </span>
        )}
      </div>
      {description && (
        <p className="text-sm text-gray-500 mt-1 ml-8">{description}</p>
      )}
      <hr className="mt-3 border-gray-200" />
    </div>
  );
}
