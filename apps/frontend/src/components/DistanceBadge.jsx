import React, { useState } from 'react';
import { MapPin, Clock, Navigation, Loader2, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cleanEventAddress } from '../utils/formatters';

/**
 * DistanceBadge — mostra distância e tempo até o local
 * MAP-05/MAP-06: Usado na Agenda e Orçamento
 * Quando distância não está disponível, permite calcular sob demanda.
 */
export default function DistanceBadge({ distancia_km, duracao_minutos, endereco, compact, onDistanceCalculated }) {
  const [loading, setLoading] = useState(false);
  const [localDistance, setLocalDistance] = useState(null);
  const [error, setError] = useState('');
  const { authFetch } = useAuth();

  if (!endereco && !distancia_km) return null;

  const km = distancia_km || localDistance?.distancia_km;
  const minutos = duracao_minutos || localDistance?.duracao_minutos;

  const enderecoLimpo = cleanEventAddress(endereco);
  const linkMaps = enderecoLimpo ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(enderecoLimpo)}` : null;

  const handleCalcular = async () => {
    setLoading(true);
    setError('');
    try {
      // First geocode the event address
      const geoRes = await authFetch('/admin/maps/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endereco: enderecoLimpo }),
      });
      const geoData = await geoRes.json();

      if (!geoData.success || !geoData.data) {
        setError('Endereço não encontrado');
        return;
      }

      // Then calculate distance from company to event
      const distRes = await authFetch('/admin/maps/distance-from-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destino_lat: geoData.data.lat,
          destino_lng: geoData.data.lng,
        }),
      });
      const distData = await distRes.json();

      if (distData.success && distData.data) {
        setLocalDistance(distData.data);
        if (onDistanceCalculated) onDistanceCalculated(distData.data);
      } else {
        setError(distData.message || 'Não foi possível calcular');
      }
    } catch {
      setError('Erro ao calcular distância');
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    if (km) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
          <Navigation size={10} />
          {km ? `${km}km` : ''}
          {minutos ? ` · ${minutos}min` : ''}
        </span>
      );
    }
    return (
      <button onClick={handleCalcular} disabled={loading}
        className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700">
        {loading ? <Loader2 size={10} className="animate-spin" /> : <Navigation size={10} />}
        {loading ? 'Calculando...' : 'Calcular distância'}
      </button>
    );
  }

  // Se já tem distância, mostrar normalmente
  if (km) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
          <MapPin size={12} /> {km} km
        </span>
        {minutos && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
            <Clock size={12} /> {minutos} min
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

  // Se não tem distância, mostrar botão para calcular
  return (
    <div className="flex items-center gap-3 text-sm">
      <button
        onClick={handleCalcular}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-xs font-medium hover:bg-orange-100 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
        {loading ? 'Calculando distância...' : 'Calcular distância da empresa'}
      </button>
      {error && (
        <span className="text-xs text-red-500">{error}</span>
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
