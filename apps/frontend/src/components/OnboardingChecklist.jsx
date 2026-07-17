import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, ArrowRight } from 'lucide-react';

const ACCENT = '#EA580C';

export default function OnboardingChecklist({ steps }) {
  // steps = [{ label, done, to }]
  const completed = steps.filter(s => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Primeiros passos</h3>
        <span className="text-sm text-gray-500">{completed}/{steps.length}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: ACCENT }} />
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <StepItem key={i} {...step} />
        ))}
      </div>
    </div>
  );
}

function StepItem({ label, done, to }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => !done && navigate(to)}
      className={`w-full flex items-center gap-3 p-2 rounded-lg text-left text-sm ${done ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-50'}`}>
      {done ? <CheckCircle size={18} className="text-green-500" /> : <Circle size={18} className="text-gray-300" />}
      <span className={done ? 'line-through' : ''}>{label}</span>
      {!done && <ArrowRight size={14} className="ml-auto text-gray-400" />}
    </button>
  );
}
