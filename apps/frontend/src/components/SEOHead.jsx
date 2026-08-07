import { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || '';
const SITE_URL = 'https://www.marcelobloisefotografia.com.br';

/**
 * SEOHead — Componente que injeta meta tags, Open Graph, Schema.org JSON-LD,
 * Google Analytics, Meta Pixel e custom head HTML dinamicamente.
 * Renderiza no <head> via DOM manipulation (CRA não suporta react-helmet nativo).
 */
export default function SEOHead() {
  const [seo, setSeo] = useState(null);

  useEffect(() => {
    fetch(`${API}/public/site/seo`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setSeo(json.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!seo) return;

    const cleanupElements = [];

    // Helper: create or update meta tag
    const setMeta = (attr, attrValue, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, attrValue);
        document.head.appendChild(el);
        cleanupElements.push(el);
      }
      el.setAttribute('content', content);
    };

    // ─── Title ───
    if (seo.titulo_padrao) {
      document.title = seo.titulo_padrao;
    }

    // ─── Basic Meta Tags ───
    setMeta('name', 'description', seo.descricao_padrao);
    setMeta('name', 'keywords', seo.keywords);

    // ─── Open Graph ───
    setMeta('property', 'og:title', seo.titulo_padrao);
    setMeta('property', 'og:description', seo.descricao_padrao);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:url', SITE_URL);
    setMeta('property', 'og:site_name', seo.schema_nome || seo.titulo_padrao);
    if (seo.og_image_url) {
      setMeta('property', 'og:image', seo.og_image_url);
      setMeta('property', 'og:image:width', '1200');
      setMeta('property', 'og:image:height', '630');
    }

    // ─── Twitter Card ───
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', seo.titulo_padrao);
    setMeta('name', 'twitter:description', seo.descricao_padrao);
    if (seo.og_image_url) {
      setMeta('name', 'twitter:image', seo.og_image_url);
    }

    // ─── Google Search Console verification ───
    if (seo.google_search_console) {
      setMeta('name', 'google-site-verification', seo.google_search_console);
    }

    // ─── Canonical URL ───
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
      cleanupElements.push(canonical);
    }
    canonical.setAttribute('href', SITE_URL + window.location.pathname);

    // ─── Schema.org JSON-LD ───
    if (seo.schema_nome) {
      let scriptEl = document.getElementById('seo-schema-jsonld');
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = 'seo-schema-jsonld';
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
        cleanupElements.push(scriptEl);
      }

      const schema = {
        '@context': 'https://schema.org',
        '@type': seo.schema_type || 'Photographer',
        name: seo.schema_nome,
        description: seo.schema_descricao || seo.descricao_padrao || '',
        url: SITE_URL,
        ...(seo.og_image_url && { image: seo.og_image_url }),
        ...(seo.schema_telefone && { telephone: seo.schema_telefone }),
        ...(seo.schema_email && { email: seo.schema_email }),
        ...(seo.schema_endereco && {
          address: {
            '@type': 'PostalAddress',
            streetAddress: seo.schema_endereco,
            addressLocality: seo.schema_cidade || '',
            addressRegion: seo.schema_estado || '',
            postalCode: seo.schema_cep || '',
            addressCountry: 'BR',
          },
        }),
        ...((seo.schema_preco_min || seo.schema_preco_max) && {
          priceRange: `R$${seo.schema_preco_min || '0'} - R$${seo.schema_preco_max || ''}`,
        }),
        ...((seo.schema_areas_atuacao && seo.schema_areas_atuacao.length > 0) && {
          knowsAbout: seo.schema_areas_atuacao,
        }),
      };

      scriptEl.textContent = JSON.stringify(schema);
    }

    // ─── Google Analytics 4 ───
    if (seo.google_analytics_id && !document.getElementById('seo-ga4-script')) {
      const gaScript = document.createElement('script');
      gaScript.id = 'seo-ga4-script';
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${seo.google_analytics_id}`;
      document.head.appendChild(gaScript);
      cleanupElements.push(gaScript);

      const gaInit = document.createElement('script');
      gaInit.id = 'seo-ga4-init';
      gaInit.textContent = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${seo.google_analytics_id}');
      `;
      document.head.appendChild(gaInit);
      cleanupElements.push(gaInit);
    }

    // ─── Meta Pixel (Facebook) ───
    if (seo.meta_facebook_pixel && !document.getElementById('seo-fbpixel')) {
      const fbScript = document.createElement('script');
      fbScript.id = 'seo-fbpixel';
      fbScript.textContent = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${seo.meta_facebook_pixel}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(fbScript);
      cleanupElements.push(fbScript);
    }

    // ─── Custom Head HTML ───
    if (seo.meta_custom_head) {
      const customDiv = document.createElement('div');
      customDiv.id = 'seo-custom-head';
      customDiv.innerHTML = seo.meta_custom_head;
      // Move child nodes to head
      const fragment = document.createDocumentFragment();
      while (customDiv.firstChild) {
        const node = customDiv.firstChild;
        customDiv.removeChild(node);
        fragment.appendChild(node);
        cleanupElements.push(node);
      }
      document.head.appendChild(fragment);
    }

    // Cleanup on unmount
    return () => {
      cleanupElements.forEach(el => {
        try { el.parentNode?.removeChild(el); } catch {}
      });
    };
  }, [seo]);

  return null; // This component doesn't render anything visible
}
