# SPEC-36 — Instagram: Integração Básica

| Campo | Valor |
|-------|-------|
| ID | GAP-22 / SPEC-36 |
| Tipo | Feature |
| Prioridade | P3 |
| Impacto | Médio |
| Esforço | Alto |

## CONTEXTO

§19 do MVP-1 define publicação de fotos do álbum no Instagram, agendamento de posts e insights básicos.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/lib/instagram/client.js` — wrapper da Instagram Graph API
- `src/functions/instagram/publicar.js` — POST /admin/instagram/publicar
- `src/functions/instagram/agendar.js` — POST /admin/instagram/agendar
- `src/functions/instagram/processar-agendado.js` — EventBridge cron
- `src/functions/instagram/insights.js` — GET /admin/instagram/insights
- `template.yaml` — rotas + EventBridge rule + role

## FORA DE ESCOPO (NÃO TOCAR)

- Stories com IA
- Reels
- Direct messages
- Multi-account
- Qualquer outro arquivo

## SPEC TÉCNICA

### Credenciais (SSM)

- `/mbf/instagram/access-token` (long-lived token)
- `/mbf/instagram/business-account-id`

### Client

```javascript
const publicar = async ({ image_url, caption }) => {
  // 1. POST /{ig-user-id}/media (create container)
  // 2. POST /{ig-user-id}/media_publish (publish)
};

const getInsights = async ({ media_id }) => {
  // GET /{media-id}/insights?metric=impressions,reach,engagement
};
```

### Fluxos

**Publicar (admin):**
- Input: foto_id (do álbum) + caption
- Gera URL pública temporária (CloudFront signed, 1h TTL)
- Chama Instagram API para criar + publicar
- Salva: `PK=TENANT#1, SK=IGPOST#<ulid>` com media_id

**Agendar:**
- Input: foto_id, caption, data_publicacao
- Salva item com status=agendado, publicar_em=data

**Processar agendado (cron):**
- Query: status=agendado AND publicar_em <= now
- Publica e atualiza status

**Insights:**
- Busca últimos posts (query IGPOST)
- Para cada: chama getInsights
- Retorna agregado

### IAM

Role `InstagramFunctionRole`:
- SSM: GetParameter `/mbf/instagram/*`
- DynamoDB: PutItem, UpdateItem, Query

## CRITÉRIOS DE ACEITE

1. Publicação funciona via Instagram Graph API
2. Agendamento salva e cron publica no horário
3. Insights retorna métricas reais
4. Credenciais em SSM
5. Erro de API tratado e logado

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar integração Instagram conforme spec SPEC-36.
Client em src/lib/instagram/client.js, handlers em src/functions/instagram/,
publicação, agendamento via EventBridge, insights.

Alterar SOMENTE:
- template.yaml (rotas, EventBridge rule, role)
- src/lib/instagram/client.js
- src/functions/instagram/*.js (4 handlers)

NÃO refatorar, renomear ou mexer em mais nada.
```
