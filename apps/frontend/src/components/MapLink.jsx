import React from 'react';
import { Navigation, MapPin } from 'lucide-react';

/**
 * MAP-03: Link "Abrir no Maps" com rota (origem → destino)
 * Custo: $0 — apenas URL formatada
 */
export function MapLink({ origem, destino, label, className }) {
  if (!destino) return null;

  const destinoStr = destino.endereco || (destino.lat && destino.lng ? `${destino.lat},${destino.lng}` : null);
  if (!destinoStr) return null;

  let url;
  if (origem && origem.lat && origem.lng) {
    // Directions: origem → destino
    url = `https://www.google.com/maps/dir/?api=1&origin=${origem.lat},${origem.lng}&destination=${encodeURIComponent(destinoStr)}`;
  } else {
    // Só destino (sem origem)
    url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinoStr)}`;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className || 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-xs font-medium hover:bg-orange-100 transition-colors'}
    >
      <Navigation size={12} />
      {label || 'Abrir no Maps'}
    </a>
  );
}

/**
 * MAP-03: Link para ver localização no mapa (só destino, sem rota)
 * Custo: $0
 */
export function MapLinkDestino({ endereco, lat, lng, label, className }) {
  if (!endereco && (!lat || !lng)) return null;

  const query = lat && lng ? `${lat},${lng}` : encodeURIComponent(endereco);
  const url = `https://www.google.com/maps/search/?api=1&query=${query}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className || 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium hover:bg-gray-200 transition-colors'}
    >
      <MapPin size={12} />
      {label || 'Ver no Mapa'}
    </a>
  );
}

export default MapLink;
