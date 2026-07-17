import React from 'react';
import { Check } from 'lucide-react';

const ACCENT = '#EA580C';

const STATUS_ORDER = ['orcando', 'em_analise', 'pronto', 'enviado', 'aceito'];

const LABELS = [
  'Solicitação recebida',
  'Em análise pelo fotógrafo',
  'Proposta sendo montada',
  'Proposta enviada - confira!',
  'Confirmado!',
];

export default function StatusTracker({ status, createdAt }) {
  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <div className="py-3">
      <div className="space-y-0">
        {LABELS.map((label, i) => {
          const isCompleted = i < currentIndex;
          const isActive = i === currentIndex;
          const isFuture = i > currentIndex;

          return (
            <div key={label} className="flex items-start gap-3">
              {/* Vertical line + dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted ? 'bg-green-500' :
                    isActive ? 'animate-pulse' :
                    'border-2 border-dashed border-gray-300 bg-white'
                  }`}
                  style={isActive ? { backgroundColor: ACCENT } : undefined}
                >
                  {isCompleted && <Check size={10} className="text-white" />}
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                {i < LABELS.length - 1 && (
                  <div className={`w-0.5 h-8 ${
                    isCompleted ? 'bg-green-300' :
                    isFuture ? 'border-l-2 border-dashed border-gray-200' : 'bg-gray-200'
                  }`} />
                )}
              </div>

              {/* Text */}
              <div className="pt-0">
                <p className={`text-sm font-medium leading-4 ${
                  isCompleted ? 'text-green-700' :
                  isActive ? 'text-gray-900' :
                  'text-gray-400'
                }`}>
                  {label}
                </p>
                {i === 0 && createdAt && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                {isActive && i > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: ACCENT }}>Em andamento...</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
