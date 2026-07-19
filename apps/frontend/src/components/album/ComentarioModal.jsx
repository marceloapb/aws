import React, { useState, useEffect, useCallback } from 'react';
import { X, MessageCircle, CheckCircle, Trash2, Send, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#EA580C';
const MAX_CHARS = 500;

/**
 * ComentarioModal — modal de comentários para fotos de álbum
 * @param {string} props.fotoId
 * @param {string} props.albumSlug - slug (client) ou albumId (admin)
 * @param {boolean} props.isAdmin
 * @param {Function} props.onClose
 */
export default function ComentarioModal({ fotoId, albumSlug, isAdmin, onClose }) {
  const { authFetch } = useAuth();
  const [comentarios, setComentarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [texto, setTexto] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchComentarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const path = isAdmin
        ? `/admin/albuns/${albumSlug}/comentarios`
        : `/client/albuns/${albumSlug}/comentarios/${fotoId}`;
      const res = await authFetch(path);
      if (!res.ok) throw new Error('Erro ao carregar comentários');
      const json = await res.json();
      setComentarios(json.data || json.comentarios || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar comentários');
    } finally {
      setLoading(false);
    }
  }, [authFetch, albumSlug, fotoId, isAdmin]);

  useEffect(() => {
    fetchComentarios();
  }, [fetchComentarios]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!texto.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const path = isAdmin
        ? `/admin/albuns/${albumSlug}/comentarios`
        : `/client/albuns/${albumSlug}/comentarios/${fotoId}`;
      const res = await authFetch(path, {
        method: 'POST',
        body: JSON.stringify({ texto: texto.trim(), fotoId }),
      });
      if (!res.ok) throw new Error('Erro ao enviar comentário');
      setTexto('');
      await fetchComentarios();
    } catch (err) {
      setError(err.message || 'Erro ao enviar comentário');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (comentarioId) => {
    setActionLoading(comentarioId);
    try {
      const res = await authFetch(`/admin/albuns/${albumSlug}/comentarios/${comentarioId}/aprovar`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Erro ao aprovar comentário');
      await fetchComentarios();
    } catch (err) {
      setError(err.message || 'Erro ao aprovar comentário');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (comentarioId) => {
    setActionLoading(comentarioId);
    try {
      const res = await authFetch(`/admin/albuns/${albumSlug}/comentarios/${comentarioId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao excluir comentário');
      await fetchComentarios();
    } catch (err) {
      setError(err.message || 'Erro ao excluir comentário');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} style={{ color: ACCENT }} />
            <h2 className="text-lg font-bold text-gray-900">Comentários</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[200px]">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : comentarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle size={40} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Nenhum comentário ainda</p>
              <p className="text-gray-400 text-sm mt-1">Seja o primeiro a comentar!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comentarios.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {c.autor || c.author || 'Anônimo'}
                      </span>
                      {c.aprovado && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          <CheckCircle size={10} />
                          Aprovado
                        </span>
                      )}
                      {c.aprovado === false && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                          Pendente
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDate(c.criadoEm || c.createdAt || c.data)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {c.texto || c.text}
                  </p>

                  {/* Admin actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                      {!c.aprovado && (
                        <button
                          onClick={() => handleApprove(c.id)}
                          disabled={actionLoading === c.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle size={12} />
                          Aprovar
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={actionLoading === c.id}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md disabled:opacity-50 transition-colors"
                      >
                        <Trash2 size={12} />
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer — input de comentário */}
        <form onSubmit={handleSubmit} className="px-6 py-4 border-t">
          <div className="relative">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Escreva um comentário..."
              rows={3}
              maxLength={MAX_CHARS}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': ACCENT }}
              disabled={submitting}
            />
            <span className="absolute bottom-2 right-2 text-xs text-gray-400">
              {texto.length}/{MAX_CHARS}
            </span>
          </div>
          <div className="flex items-center justify-end mt-2">
            <button
              type="submit"
              disabled={!texto.trim() || submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: ACCENT }}
            >
              <Send size={14} />
              {submitting ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
