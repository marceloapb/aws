import React from 'react';
import { Check } from 'lucide-react';

const ACCENT = '#EA580C';
const steps = ['Serviço', 'Evento', 'Detalhes', 'Enviar'];

export default function StepProgress({ currentStep, totalSteps = 4 }) {
  return (
    <div className="flex items-center w-full">
      {steps.slice(0, totalSteps).map((label, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        const isFuture = stepNum > currentStep;

        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  isCompleted ? 'bg-green-500 border-green-500 text-white' :
                  isActive ? 'border-[var(--accent)] text-white' :
                  'border-gray-300 text-gray-400 bg-white'
                }`}
                style={isActive ? { borderColor: ACCENT, backgroundColor: ACCENT } : undefined}
              >
                {isCompleted ? <Check size={16} /> : stepNum}
              </div>
              <span className={`text-xs mt-1.5 font-medium ${
                isCompleted ? 'text-green-600' : isActive ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {label}
              </span>
            </div>
            {i < totalSteps - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${
                stepNum < currentStep ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
