import React from 'react';
import { Check } from 'lucide-react';

const ACCENT = '#EA580C';

const STATUS_ORDER = ['orcando', 'em_analise', 'pronto', 'enviado', 'aceito'];

const LABELS = [
  'Solicitação recebida',
  'Em análise pelo fotógrafo',
  'Orçamento sendo montado',
  'Orçamento enviado',
  'Aprovado!',
];

function fmtDateTime(d) {
  if (!d) return null;
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function StatusTracker({ status, createdAt, enviadoEm, visualizadoEm, aprovadoEm }) {
  const currentIndex = STATUS_ORDER.indexOf(status);

  // Map dates to each step
  const dates = [
    createdAt,      // Solicitação recebida
    null,           // Em análise (no specific date)
    null,           // Orçamento sendo montado
    enviadoEm,     // Orçamento enviado
    aprovadoEm,    // Aprovado
  ];

  return (
    <div className="py-3">
      <div className="space-y-0">
        {LABELS.map((label, i) => {
          const isCompleted = i <= currentIndex;
          const isActive = i === currentIndex;
          const isFuture = i > currentIndex;
          const stepDate = dates[i];

          return (
            <div key={label} className="flex items-start gap-3">
              {/* Vertical line + dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted ? 'bg-green-500' :
                    'border-2 border-dashed border-gray-300 bg-white'
                  }`}
                >
                  {isCompleted && <Check size={12} className="text-white" />}
                </div>
                {i < LABELS.length - 1 && (
                  <div className={`w-0.5 h-8 ${
                    isCompleted && i < currentIndex ? 'bg-green-300' : 'bg-gray-200'
                  }`} />
                )}
              </div>

              {/* Text */}
              <div className="pt-0.5">
                <p className={`text-sm font-medium leading-4 ${
                  isCompleted ? 'text-green-700' : 'text-gray-400'
                }`}>
                  {label}
                </p>
                {isCompleted && stepDate && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fmtDateTime(stepDate)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
