import React from 'react';
import { MapPin, Clock, Navigation } from 'lucide-react';

/**
 * DistanceBadge — mostra distância e tempo até o local
 * MAP-05/MAP-06: Usado na Agenda e Orçamento
 */
export default function DistanceBadge({ distancia_km, duracao_minutos, endereco, compact }) {
  if (!distancia_km && !endereco) return null;

  const linkMaps = endereco ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}` : null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        <Navigation size={10} />
        {distancia_km ? `${distancia_km}km` : ''}
        {duracao_minutos ? ` · ${duracao_minutos}min` : ''}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      {distancia_km && (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
          <MapPin size={12} /> {distancia_km} km
        </span>
      )}
      {duracao_minutos && (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
          <Clock size={12} /> {duracao_minutos} min
        </span>
      )}
      {linkMaps && (
        <a href={linkMaps} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium hover:bg-gray-200">
          <Navigation size={12} /> Abrir no Maps
        </a>
      )}
    </div>
  );
}
