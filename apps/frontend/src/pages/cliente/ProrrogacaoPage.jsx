import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Calendar, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const ACCENT = '#EA580C';

const TIERS = [
  { dias: 15, preco: 'R$29,90', valor: 29.90 },
  { dias: 30, preco: 'R$49,90', valor: 49.90 },
  { dias: 60, preco: 'R$79,90', valor: 79.90 },
];

/**
 * ProrrogacaoPage — página de compra de prorrogação de álbum
 * Route: /cliente/albuns/:id/prorrogar
 */
export default function ProrrogacaoPage() {
  const { id: slug } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [album, setAlbum] = useState(null);
  const [opcoes, setOpcoes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`/client/albuns/${slug}/prorrogacao/opcoes`);
        if (!res.ok) throw new Error('Erro ao carregar opções de prorrogação');
        const json = await res.json();
        setAlbum(json.data?.album || json.album || { nome: json.data?.nome, expiraEm: json.data?.expiraEm });
        setOpcoes(json.data?.opcoes || json.opcoes || TIERS);
      } catch (err) {
        setError(err.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug, authFetch]);

  const getNewExpiration = (dias) => {
    const baseDate = album?.expiraEm ? new Date(album.expiraEm) : new Date();
    const newDate = new Date(baseDate);
    newDate.setDate(newDate.getDate() + dias);
    return newDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatExpiration = (dateStr) => {
    if (!dateStr) return 'Não definida';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleSubmit = async () => {
    if (!selectedTier || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await authFetch(`/client/albuns/${slug}/prorrogacao`, {
        method: 'POST',
        body: JSON.stringify({ dias: selectedTier.dias }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || 'Erro ao solicitar prorrogação');
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Erro ao solicitar prorrogação');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 size={24} className="animate-spin" />
          <span>Carregando opções...</span>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${ACCENT}15` }}
          >
            <CheckCircle size={32} style={{ color: ACCENT }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Solicitação enviada!</h2>
          <p className="text-gray-600 mb-6">
            Aguarde aprovação. Você será notificado quando a prorrogação for confirmada.
          </p>
          <button
            onClick={() => navigate(`/cliente/albuns/${slug}`)}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: ACCENT }}
          >
            <ArrowLeft size={16} />
            Voltar ao álbum
          </button>
        </div>
      </div>
    );
  }

  const tiers = opcoes || TIERS;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(`/cliente/albuns/${slug}`)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar ao álbum
        </button>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Prorrogar Álbum</h1>
          {album && (
            <div className="space-y-1">
              <p className="text-gray-600">
                <span className="font-medium">{album.nome || album.name || 'Álbum'}</span>
              </p>
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <Calendar size={14} />
                Expira em: <span className="font-medium">{formatExpiration(album.expiraEm || album.expiresAt)}</span>
              </p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 mb-6 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {tiers.map((tier) => {
            const dias = tier.dias;
            const preco = tier.preco || `R$${tier.valor?.toFixed(2).replace('.', ',')}`;
            const isSelected = selectedTier?.dias === dias;

            return (
              <button
                key={dias}
                onClick={() => setSelectedTier(tier)}
                className={`relative p-6 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
                style={isSelected ? { borderColor: ACCENT } : {}}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <div
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: ACCENT }}
                  >
                    <CheckCircle size={12} className="text-white" />
                  </div>
                )}

                {/* Duration */}
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={18} className="text-gray-400" />
                  <span className="text-lg font-bold text-gray-900">{dias} dias</span>
                </div>

                {/* Price */}
                <p className="text-2xl font-bold mb-3" style={{ color: ACCENT }}>
                  {preco}
                </p>

                {/* New expiration preview */}
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Nova data de expiração:</p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">
                    {getNewExpiration(dias)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Submit */}
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!selectedTier || submitting}
            className="inline-flex items-center gap-2 px-8 py-3 text-base font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
            style={{ backgroundColor: ACCENT }}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Calendar size={18} />
                Solicitar Prorrogação
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
