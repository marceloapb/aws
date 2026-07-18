# STP-10 — SEO + Meta Tags + Sitemap

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | STP-10 |
| **Tipo** | Melhoria |
| **Prioridade** | P2 |
| **Impacto** | Médio — visibilidade orgânica, indexação correta |
| **Esforço** | Médio |

## Contexto
O site substitui o Wix que está no ar desde 2015. SEO é fundamental para não perder posição no Google. Meta tags (Open Graph, Twitter Card), sitemap.xml, robots.txt, e structured data (JSON-LD) para fotógrafo local.

## Escopo
- **Meta tags dinâmicas:** title, description, og:image, og:title, og:description, twitter:card por página
- **Lambda:** `getSitemap` — gera sitemap.xml dinâmico (páginas fixas + posts de novidades + categorias de portfólio)
- **Lambda:** `getRobots` — retorna robots.txt
- **CloudFront:** headers de cache para sitemap (TTL 1h) e robots (TTL 24h)
- **Structured Data (JSON-LD):** LocalBusiness (home), ImageGallery (portfólio), BlogPosting (novidades)
- **Canonical URLs** por página

## Fora de Escopo (NÃO TOCAR)
- Migração de domínio (STP-11)
- Redirects 301 do Wix (STP-11)
- Google Search Console setup (manual do admin)
- Performance/Core Web Vitals (consequência do código, não spec própria)

## Spec Técnica

### Meta Tags (por página)
```
Home:     title="Marcelo Bloise Fotografia | SP"
          description="Fotógrafo profissional em São Paulo..."
          og:image=hero_imagem
Portfolio: title="Portfólio | {nome}"
          description="Conheça o trabalho de {nome}..."
Novidades: title="{titulo_post} | {nome}" (detalhe)
Sobre:    title="Sobre | {nome}"
Contato:  title="Contato | {nome}"
```

### Lambda getSitemap
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://domain/</loc><priority>1.0</priority></url>
  <url><loc>https://domain/portfolio</loc><priority>0.9</priority></url>
  <url><loc>https://domain/novidades</loc><priority>0.8</priority></url>
  <!-- posts dinâmicos -->
  <url><loc>https://domain/novidades/{slug}</loc><lastmod>{updated}</lastmod></url>
  <!-- categorias -->
  <url><loc>https://domain/portfolio/{cat_slug}</loc></url>
</urlset>
```

### Structured Data (JSON-LD)
```json
// Home — LocalBusiness
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "{nome}",
  "image": "{logo_url}",
  "address": { "@type": "PostalAddress", "addressLocality": "São Paulo" },
  "url": "https://{domain}",
  "telephone": "{telefone}"
}
```

### API Gateway
- `GET /sitemap.xml` → Lambda getSitemap (público, Content-Type: application/xml)
- `GET /robots.txt` → Lambda getRobots (público, Content-Type: text/plain)

## Critérios de Aceite
- Cada página tem title e og:tags únicos
- sitemap.xml lista todas as páginas fixas + posts publicados + categorias visíveis
- robots.txt permite crawl de /public, bloqueia /admin e /api
- JSON-LD válido (testável no Rich Results Test do Google)
- Canonical URL presente em todas as páginas

## Prompt Pronto para o Kiro CLI
```
Implemente a spec STP-10 (SEO + Meta Tags + Sitemap).

Crie:
1. src/functions/site/getSitemap/index.mjs — gera sitemap.xml dinâmico
2. src/functions/site/getRobots/index.mjs — retorna robots.txt
3. Rotas GET /sitemap.xml e GET /robots.txt no template.yaml
4. src/pages/public/SeoHead.jsx — componente que injeta meta tags + JSON-LD por página

Sitemap: páginas fixas + novidades publicadas + categorias visíveis. Content-Type: application/xml.
Robots: Allow /public, Disallow /admin /api. Sitemap: https://{domain}/sitemap.xml.
JSON-LD: LocalBusiness na home, BlogPosting nos posts.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
