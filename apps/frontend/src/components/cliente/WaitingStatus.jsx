import React from 'react';
import { Hourglass, MessageCircle } from 'lucide-react';
import StatusTracker from './StatusTracker';

const ACCENT = '#EA580C';

export default function WaitingStatus({ status = 'orcando', createdAt, whatsappLink }) {
  return (
    <div className="flex flex-col items-center text-center p-6">
      {/* Animated hourglass icon */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-pulse"
        style={{ backgroundColor: `${ACCENT}15` }}
      >
        <Hourglass size={28} style={{ color: ACCENT }} className="animate-spin" />
      </div>

      {/* Main text */}
      <h2 className="text-lg font-bold text-gray-900 mb-1">
        Sua solicitação foi enviada!
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        O fotógrafo geralmente responde em até 24 horas
      </p>

      {/* Integrated StatusTracker */}
      <div className="w-full max-w-xs text-left bg-gray-50 rounded-xl p-4">
        <StatusTracker status={status} createdAt={createdAt} />
      </div>

      {/* WhatsApp button */}
      {whatsappLink && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#25D366' }}
        >
          <MessageCircle size={16} />
          Enviar mensagem
        </a>
      )}
    </div>
  );
}
