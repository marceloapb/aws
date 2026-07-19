import React from 'react';
import { Shield, ShieldCheck } from 'lucide-react';

/**
 * WatermarkBadge — badge indicando status de marca d'água
 * @param {number} props.percentualPago - 0 a 100
 */
export default function WatermarkBadge({ percentualPago = 0 }) {
  const pago = Number(percentualPago) || 0;

  if (pago >= 100) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
        <ShieldCheck size={12} />
        Sem marca d'água
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
      <Shield size={12} />
      Marca d'água ativa ({pago}% pago)
    </span>
  );
}
