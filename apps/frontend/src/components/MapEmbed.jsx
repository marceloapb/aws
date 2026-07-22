import React from 'react';
import { cleanEventAddress } from '../utils/formatters';

/**
 * MAP-04: Mapa embed via iframe clássico (SEM chave de API)
 * Custo: $0
 * URL: maps.google.com/maps?q=...&output=embed
 */
export default function MapEmbed({ endereco, lat, lng, altura = 200, largura = '100%' }) {
  if (!endereco && !lat) return null;

  // Priorizar coordenadas (mais preciso), fallback para endereço limpo (sem prefixos descritivos)
  const query = lat && lng
    ? `${lat},${lng}`
    : encodeURIComponent(cleanEventAddress(endereco));

  const src = `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="map-embed-container" style={{ borderRadius: '8px', overflow: 'hidden' }}>
      <iframe
        src={src}
        width={largura}
        height={altura}
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Localização do evento"
      />
    </div>
  );
}
