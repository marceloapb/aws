# NVD-05 — Slug + SEO Mínimo

**TIPO:** Melhoria  
**PRIORIDADE:** P2  
**IMPACTO:** Médio — URLs amigáveis e meta tags  
**ESFORÇO:** Baixo  

## CONTEXTO

Posts devem ter URLs amigáveis (`/novidades/meu-ensaio-na-praia`) e meta tags básicas para SEO e compartilhamento em redes sociais (Open Graph). O slug já é gerado no NVD-01; esta spec garante que o frontend renderiza as meta tags corretas e que o SSR/prerender entrega HTML indexável.

## ESCOPO

- `src/pages/public/NovidadePost.jsx` — meta tags dinâmicas
- `src/utils/seo.js` — helper de meta tags
- Ajuste no router para rota `/novidades/:slug`

## FORA DE ESCOPO (NÃO TOCAR)

- Backend (slugs já funcionam)
- Editor admin
- Outros módulos

## SPEC TÉCNICA

**Meta tags (por post):**
```html
<title>{titulo} | Blog | MBF</title>
<meta name="description" content="{resumo}" />
<meta property="og:title" content="{titulo}" />
<meta property="og:description" content="{resumo}" />
<meta property="og:image" content="{capa_url}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="https://bloise.com.br/novidades/{slug}" />
<meta name="twitter:card" content="summary_large_image" />
```

**Listagem pública:**
```html
<title>Novidades | Blog | MBF</title>
<meta name="description" content="Acompanhe as novidades do estúdio..." />
```

**Helper `seo.js`:**
- Função `setPageMeta({ title, description, ogImage, ogUrl, type })` que atualiza document.head dinamicamente.
- Chamada no useEffect do componente ao carregar dados do post.

**Prerender (futuro):** se SPA pura, meta tags dinâmicas não funcionam para crawlers. Mitigação mínima: usar `react-helmet-async` ou equivalente. SSR completo é melhoria futura, fora desta spec.

**Sitemap (bonus):**
- `GET /public/sitemap-novidades.xml` — Lambda que lista slugs publicados e monta XML sitemap.
- Opcional nesta spec (pode virar spec separada se necessário).

## CRITÉRIOS DE ACEITE

1. Rota `/novidades/:slug` renderiza o post.
2. Meta tags OG preenchidas com dados do post.
3. Compartilhar link no WhatsApp/Instagram mostra preview com título + capa.
4. Title tag diferente por post.
5. Listagem tem meta tags genéricas.

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente o SEO mínimo para posts de Novidades conforme spec NVD-05. Crie src/utils/seo.js com função setPageMeta({title, description, ogImage, ogUrl, type}) que atualiza meta tags no document.head. No componente NovidadePost.jsx (rota /novidades/:slug), chame setPageMeta com dados do post (titulo, resumo, capa_url, slug). Use react-helmet-async se já no projeto. Meta tags: og:title, og:description, og:image, og:type=article, og:url, twitter:card=summary_large_image. Listagem com meta genéricas. ALTERE SOMENTE os arquivos listados; não refatore, renomeie ou mexa em mais nada.
```
