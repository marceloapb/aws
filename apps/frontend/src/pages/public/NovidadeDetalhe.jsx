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

  // Dynamic SEO meta tags for this post
  useEffect(() => {
    if (!post) return;

    const title = post.seo_titulo || post.titulo || '';
    const description = post.seo_descricao || post.resumo || '';
    const keywords = post.seo_keywords || '';
    const image = post.capa_url || '';
    const url = `https://www.marcelobloisefotografia.com.br/novidades/${slug}`;

    // Title
    if (title) document.title = title;

    // Helper
    const setMeta = (attr, attrValue, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('name', 'description', description);
    if (keywords) setMeta('name', 'keywords', keywords);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:type', 'article');
    if (image) {
      setMeta('property', 'og:image', image);
      setMeta('name', 'twitter:image', image);
    }
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);

    // Update canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // Article JSON-LD
    let scriptEl = document.getElementById('post-schema-jsonld');
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'post-schema-jsonld';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description: description,
      ...(image && { image }),
      url,
      datePublished: post.publicado_em,
      author: { '@type': 'Person', name: config?.nome || 'Marcelo Bloise' },
    });

    return () => {
      // Cleanup article schema on unmount
      const el = document.getElementById('post-schema-jsonld');
      if (el) el.parentNode?.removeChild(el);
    };
  }, [post, slug, config]);

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
        {/* Top banner - viewing indicator */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-xs text-stone-500 bg-stone-900 px-3 py-1 rounded-full">
            Você está no modo visualização
          </span>
          <Link
            to="/novidades"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-700 text-stone-300 hover:text-white hover:border-stone-500 transition-colors text-sm font-medium"
          >
            Voltar
          </Link>
        </div>

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
              {formatDate(post.publicado_em)}
            </p>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-50 leading-tight mb-8">
          {post.titulo}
        </h1>

        {/* Cover image + resumo side by side on desktop */}
        {(post.capa_url || post.resumo) && (
          <div className="flex flex-col sm:flex-row gap-6 mb-10">
            {post.capa_url && (
              <div className="sm:w-1/2 overflow-hidden rounded-xl shrink-0">
                <img
                  src={post.capa_url}
                  alt={post.titulo}
                  loading="lazy"
                  className="w-full h-auto object-cover rounded-xl"
                />
              </div>
            )}
            {post.resumo && (
              <div className="sm:w-1/2 flex items-center">
                <p className="text-stone-300 leading-relaxed text-sm sm:text-base">
                  {post.resumo}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Body content */}
        <div
          className="prose prose-invert prose-lg max-w-none text-stone-300
            prose-headings:text-stone-50 prose-strong:text-stone-50
            prose-a:text-[#EA580C] prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-xl prose-blockquote:border-[#EA580C]
            prose-p:leading-relaxed prose-li:leading-relaxed
            prose-hr:border-stone-800
            [&_figure]:my-6 [&_figure]:text-center
            [&_figcaption]:text-xs [&_figcaption]:text-stone-500 [&_figcaption]:mt-2
            [&_img]:mx-auto [&_img]:rounded-xl"
          dangerouslySetInnerHTML={{ __html: post.corpo_html || '' }}
        />

        {/* Category tag */}
        {post.categoria && (
          <div className="mt-10 pt-6 border-t border-stone-800">
            <Link
              to="/novidades"
              className="inline-flex items-center gap-2 text-[#EA580C] text-sm hover:underline font-medium"
            >
              <span className="px-3 py-1 rounded-full border border-[#EA580C]/30 bg-[#EA580C]/10 text-[#EA580C] text-xs font-medium">
                {post.categoria}
              </span>
            </Link>
          </div>
        )}

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
