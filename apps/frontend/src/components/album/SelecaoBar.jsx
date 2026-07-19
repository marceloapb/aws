import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

const ACCENT = '#EA580C';

export default function SelecaoBar({ totalSelecionadas = 0, cota = 0, confirmada = false, onConfirmar }) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const progress = cota > 0 ? Math.min((totalSelecionadas / cota) * 100, 100) : 0;
  const atQuota = cota > 0 && totalSelecionadas >= cota;

  const handleConfirmar = async () => {
    setConfirming(true);
    try {
      await onConfirmar?.();
    } finally {
      setConfirming(false);
      setShowConfirmDialog(false);
    }
  };

  // Confirmed state
  if (confirmada) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <div className="flex items-center justify-center gap-3 px-6 py-4 bg-green-50 border border-green-200 rounded-xl shadow-lg">
            <CheckCircle2 size={20} className="text-green-600" />
            <span className="text-sm font-medium text-green-700">Seleção confirmada ✓</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <div className="px-6 py-4 bg-white border rounded-xl shadow-lg space-y-3">
            {/* Progress info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">
                  <span className="text-lg font-bold" style={{ color: ACCENT }}>{totalSelecionadas}</span>
                  {' / '}
                  <span className="text-gray-500">{cota}</span>
                  {' '}selecionadas
                </span>
                {atQuota && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    <AlertTriangle size={12} />Cota atingida
                  </span>
                )}
              </div>

              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={totalSelecionadas === 0}
                className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{ backgroundColor: ACCENT }}
              >
                Confirmar Seleção
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  backgroundColor: atQuota ? '#D97706' : ACCENT,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmDialog(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-sm shadow-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Confirmar seleção?</h3>
            <p className="text-sm text-gray-600">
              Você selecionou <strong>{totalSelecionadas}</strong> de <strong>{cota}</strong> fotos.
              Após confirmar, a seleção não poderá ser alterada.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={confirming}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-50 hover:opacity-90"
                style={{ backgroundColor: ACCENT }}
              >
                {confirming ? 'Confirmando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
