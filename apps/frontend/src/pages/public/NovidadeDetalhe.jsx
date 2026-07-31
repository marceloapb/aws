import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSiteConfig } from './SiteLayout';

const API = process.env.REACT_APP_API_URL || '';

export default function NovidadeDetalhe() {
  const { slug } = useParams();
  const config = useSiteConfig();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [comment, setComment] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`${API}/public/novidades/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => setPost(data.data || data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const nome = config?.nome || 'Marcelo Bloise';
  const logoUrl = config?.logo_dark_url || config?.logo_url;

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 animate-pulse">
          <div className="h-5 bg-stone-800 rounded w-20 mb-8" />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-stone-800" />
            <div>
              <div className="h-4 bg-stone-800 rounded w-28 mb-1" />
              <div className="h-3 bg-stone-800 rounded w-20" />
            </div>
          </div>
          <div className="h-8 bg-stone-800 rounded w-2/3 mb-8" />
          <div className="aspect-[2/1] bg-stone-900 rounded-xl mb-8" />
          <div className="space-y-3">
            <div className="h-4 bg-stone-800 rounded w-full" />
            <div className="h-4 bg-stone-800 rounded w-5/6" />
            <div className="h-4 bg-stone-800 rounded w-4/5" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-400 text-lg mb-4">Publicação não encontrada.</p>
          <Link
            to="/novidades"
            className="inline-flex items-center gap-2 text-[#EA580C] hover:underline font-medium"
          >
            <ArrowLeft size={16} /> Voltar para Novidades
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 py-12 sm:py-16">
      <article className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Back button */}
        <Link
          to="/novidades"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-700 text-stone-300 hover:text-white hover:border-stone-500 transition-colors text-sm font-medium mb-8"
        >
          Voltar
        </Link>

        {/* Author + Date */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-800 border border-stone-700 shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={nome} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-500 text-xs font-bold">
                MB
              </div>
            )}
          </div>
          <div>
            <p className="text-stone-200 text-sm font-medium">
              {nome.split(' ').slice(0, 2).join(' ')}
            </p>
            <p className="text-stone-500 text-xs">
              {formatDate(post.publicado_em || post.data || post.created_at)}
            </p>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-50 leading-tight mb-8">
          {post.titulo}
        </h1>

        {/* Cover image */}
        {post.capa_url && (
          <div className="overflow-hidden rounded-xl mb-8">
            <img
              src={post.capa_url}
              alt={post.titulo}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* Body */}
        <div
          className="prose prose-invert prose-lg max-w-none text-stone-300
            prose-headings:text-stone-50 prose-strong:text-stone-50
            prose-a:text-[#EA580C] prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-xl prose-blockquote:border-[#EA580C]
            prose-p:leading-relaxed prose-li:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.corpo_html || post.corpo || post.body || post.conteudo }}
        />

        {/* Category link (if available) */}
        {post.categoria && (
          <div className="mt-10 pt-6 border-t border-stone-800">
            <Link
              to="/novidades"
              className="text-[#EA580C] text-sm hover:underline font-medium"
            >
              {post.categoria}
            </Link>
          </div>
        )}

        {/* Comments Section */}
        <section className="mt-12 pt-8 border-t border-stone-800">
          <h2 className="text-xl font-bold text-stone-50 mb-6">Comentários</h2>

          {/* Comment input */}
          <div className="bg-stone-900 rounded-xl border border-stone-800 p-4">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escreva um comentário..."
              rows={3}
              className="w-full bg-transparent text-stone-200 placeholder-stone-600 outline-none resize-none text-sm"
            />
            <div className="flex justify-end mt-3">
              <button
                disabled={!comment.trim()}
                onClick={() => {
                  // TODO: integrate with comments API
                  setComment('');
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#EA580C] text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Publicar
              </button>
            </div>
          </div>

          {/* Empty state for comments */}
          <p className="text-stone-600 text-sm text-center mt-6">
            Nenhum comentário ainda. Seja o primeiro!
          </p>
        </section>

        {/* Bottom back link */}
        <div className="mt-12 pt-8 border-t border-stone-800">
          <Link
            to="/novidades"
            className="inline-flex items-center gap-2 text-[#EA580C] hover:underline font-medium"
          >
            <ArrowLeft size={16} /> Todas as novidades
          </Link>
        </div>
      </article>
    </div>
  );
}
