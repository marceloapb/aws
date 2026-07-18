import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Star, MessageSquare, CheckCircle } from 'lucide-react';

const ACCENT = '#EA580C';

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

  useEffect(() => {
    authFetch('/client/feedback')
      .then(r => r.json())
      .then(d => { if (d && d.rating) setSubmitted(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
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
