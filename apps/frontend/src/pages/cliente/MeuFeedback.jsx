import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Star, MessageSquare, CheckCircle, ExternalLink } from 'lucide-react';

const ACCENT = '#EA580C';
const API = process.env.REACT_APP_API_URL || '';

export default function MeuFeedback() {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [texto, setTexto] = useState('');
  const [autoriza, setAutoriza] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [googlePlaceId, setGooglePlaceId] = useState('');

  useEffect(() => {
    // Load feedback status and Google Place ID in parallel
    Promise.all([
      authFetch('/client/feedback').then(r => r.json()).catch(() => null),
      fetch(`${API}/public/site/seo`).then(r => r.json()).catch(() => null),
    ]).then(([feedbackData, seoData]) => {
      if (feedbackData && feedbackData.rating) setSubmitted(feedbackData);
      if (seoData?.success && seoData.data?.google_place_id) {
        setGooglePlaceId(seoData.data.google_place_id);
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (rating === 0) { setError('Selecione uma nota.'); return; }
    if (texto.length < 20) { setError('O comentário deve ter pelo menos 20 caracteres.'); return; }

    setSaving(true);
    try {
      const res = await authFetch('/client/portal/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, texto, autoriza_depoimento: autoriza }),
      });
      if (!res.ok) throw new Error();
      setSubmitted({ rating, texto, autoriza_depoimento: autoriza });
    } catch {
      setError('Erro ao enviar feedback. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  if (submitted) {
    const googleReviewUrl = googlePlaceId
      ? `https://search.google.com/local/writereview?placeid=${googlePlaceId}`
      : '';

    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Meu Feedback</h1>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
          <p className="font-semibold text-gray-900 mb-4">Feedback enviado!</p>
          <div className="flex justify-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} size={24} fill={s <= submitted.rating ? '#FBBF24' : 'none'}
                className={s <= submitted.rating ? 'text-yellow-400' : 'text-gray-300'} />
            ))}
          </div>
          <p className="text-sm text-gray-600 max-w-md mx-auto">{submitted.texto}</p>
          {submitted.autoriza_depoimento && (
            <p className="text-xs text-gray-400 mt-3">✓ Autorizado como depoimento público</p>
          )}

          {/* Botão Avalie no Google */}
          {googleReviewUrl && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-3">
                Gostou do nosso trabalho? Deixe sua avaliação no Google também! ⭐
              </p>
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity shadow-sm"
                style={{ background: '#4285F4' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Avaliar no Google
                <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Meu Feedback</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Como você avalia nosso serviço?</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} type="button"
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(s)}
                className="p-1 transition-transform hover:scale-110">
                <Star size={32}
                  fill={(hoverRating || rating) >= s ? '#FBBF24' : 'none'}
                  className={(hoverRating || rating) >= s ? 'text-yellow-400' : 'text-gray-300'}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Conte-nos sobre sua experiência</label>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            placeholder="Mínimo de 20 caracteres..."
          />
          <p className={`text-xs mt-1 ${texto.length < 20 ? 'text-gray-400' : 'text-green-600'}`}>
            {texto.length}/20 caracteres mínimos
          </p>
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={autoriza} onChange={e => setAutoriza(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300" style={{ accentColor: ACCENT }} />
          <span className="text-sm text-gray-600">Autorizo uso como depoimento público</span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={saving} style={{ background: ACCENT }}
          className="w-full py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? 'Enviando...' : 'Enviar feedback'}
        </button>
      </form>
    </div>
  );
}
