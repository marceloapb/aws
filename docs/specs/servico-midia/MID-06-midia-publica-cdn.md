# MID-06 — Servir Mídia Pública (CDN)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | MID-06 |
| **Tipo** | Feature |
| **Prioridade** | P1 |
| **Impacto** | Alto — performance do site público |
| **Esforço** | Baixo |

## Contexto
Mídias públicas (portfólio, novidades, perfil, config/logo) são servidas via CloudFront. URL pública permanente, cache agressivo. Invalidação quando admin troca foto.

## Escopo
- **CloudFront:** já criado no MID-01, aqui define cache behaviors e invalidação
- **Lambda:** `invalidateMedia` — cria invalidation no CloudFront quando admin substitui foto
- **Cache:** imutável por path (ULID garante unicidade) → cache infinito
- **URL padrão:** `https://{cdn_domain}/{tenant}/{contexto}/{entidade}/{id}-{versao}.webp`

## Fora de Escopo (NÃO TOCAR)
- Bucket/CloudFront infra (MID-01)
- Mídia privada/presigned (MID-05)
- Domínio custom (STP-11)

## Spec Técnica

### Cache Strategy
- Imagens têm ULID no path → URL muda quando foto muda → cache **1 ano** (imutável)
- Cache-Control header no S3: `public, max-age=31536000, immutable`
- Exceção: `config/` (logo pode mudar sem trocar path) → TTL 5min + invalidation

### Lambda invalidateMedia
- Auth: JWT admin
- Body: { paths: ["/1/config/logo.png"] }
- Cria CloudFront CreateInvalidation
- Usa no máximo quando admin troca logo ou foto de perfil pública
- Não é chamada para portfólio/novidades (ULID resolve)

### URL de Acesso
```
Portfólio:  https://d1234.cloudfront.net/1/portfolio/cat01/01JDEF-web.webp
Novidade:   https://d1234.cloudfront.net/1/novidades/post01/01JGHI-web.webp
Logo:       https://d1234.cloudfront.net/1/config/site/logo.png
Perfil:     https://d1234.cloudfront.net/1/perfil/sub123/01JKLM-thumb.webp
```

### Cache Behavior (CloudFront)
```yaml
CacheBehaviors:
  - PathPattern: "*/config/*"
    CachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    ViewerProtocolPolicy: redirect-to-https
```

## Critérios de Aceite
- URLs públicas servem imagem com HTTPS + cache immutable
- Primeira requisição: cache MISS → busca S3; segunda: cache HIT
- Config/logo: invalidation funciona (<15s para propagar)
- Sem CORS issues no frontend (headers corretos)
- 404 para path inexistente (não expõe listing)

## Prompt Pronto para o Kiro CLI
```
Implemente a spec MID-06 (Servir Mídia Pública via CDN).

Crie:
1. src/functions/media/invalidateMedia/index.mjs — cria invalidation no CloudFront
2. Rota POST /admin/media/invalidate no template.yaml
3. template.yaml — CacheBehavior para */config/* (TTL curto) no CloudFront

Cache: imutável (1 ano) por padrão. Config: TTL curto + invalidation on demand.
Headers S3: Cache-Control: public, max-age=31536000, immutable.
Invalidation: paths[], máx 10 por request.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
