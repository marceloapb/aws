# IG-02: Modelo de Dados Instagram (DynamoDB)

## Metadados
- **ID:** IG-02
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Médio
- **Dependência:** IG-01

## Contexto
Definir todas as entidades do módulo Instagram no single-table design. Inclui: conta, posts, insights, stories, templates de story, custos IA.

## Escopo
- `apps/backend/src/models/instagram.js` — NOVO
- DynamoDB: 6 entidades

## Fora de Escopo (NÃO TOCAR)
- Conexão OAuth (IG-01)
- Publicação (IG-03)
- Insights (IG-08)

## Spec Técnica

### Entidades

#### 1. POST_INSTAGRAM
```json
{
  "PK": "TENANT#t123",
  "SK": "POST_IG#2026-07-17T10:00:00Z#post_001",
  "id": "post_001",
  "tipo": "imagem",
  "formato": "feed",
  "status": "publicado",
  "caption": "Casamento Ana & Pedro 💍✨",
  "hashtags": ["#casamento", "#fotografia", "#noiva"],
  "midia_urls": ["s3://bucket/fotos/foto1.jpg"],
  "ig_media_id": "17890000000000001",
  "ig_permalink": "https://www.instagram.com/p/ABC123/",
  "agendado_para": null,
  "publicado_em": "2026-07-17T10:00:00Z",
  "album_id": "alb_001",
  "cliente_id": "cli_001",
  "erro": null,
  "tentativas": 1,
  "created_at": "2026-07-17T09:00:00Z"
}
```

#### 2. INSIGHT_CONTA_IG
```json
{
  "PK": "TENANT#t123",
  "SK": "INSIGHT_CONTA_IG#2026-07-17",
  "data": "2026-07-17",
  "followers": 2500,
  "follows": 800,
  "media_count": 340,
  "impressions": 1250,
  "reach": 890,
  "profile_views": 45,
  "website_clicks": 12,
  "coletado_em": "2026-07-17T10:00:00Z"
}
```

#### 3. INSIGHT_POST_IG
```json
{
  "PK": "POST_IG#post_001",
  "SK": "INSIGHT#2026-07-17T10:00:00Z",
  "post_id": "post_001",
  "ig_media_id": "17890000000000001",
  "likes": 45,
  "comments": 8,
  "saves": 12,
  "shares": 3,
  "reach": 890,
  "impressions": 1250,
  "engagement_rate": 5.2,
  "coletado_em": "2026-07-17T10:00:00Z"
}
```

#### 4. STORY_IG
```json
{
  "PK": "TENANT#t123",
  "SK": "STORY_IG#2026-07-17T10:00:00Z#story_001",
  "id": "story_001",
  "modo": "template",
  "template_id": "stpl_001",
  "prompt_usado": null,
  "imagem_gerada_url": "s3://bucket/stories/story1.png",
  "ig_media_id": "17890000000000002",
  "status": "publicado",
  "custo_ia": 0.04,
  "metricas": { "impressions": 500, "replies": 2, "exits": 45 },
  "expira_em": "2026-07-18T10:00:00Z",
  "created_at": "2026-07-17T10:00:00Z"
}
```

#### 5. TEMPLATE_STORY_IG
```json
{
  "PK": "TENANT#t123",
  "SK": "TEMPLATE_STORY#stpl_001",
  "id": "stpl_001",
  "nome": "Casamento Elegante",
  "descricao": "Story com foto do casal + texto overlay",
  "prompt_base": "Crie um story elegante para casamento com a foto do casal...",
  "estilo": "minimalista",
  "paleta_cores": ["#FFFFFF", "#D4AF37", "#1A1A1A"],
  "dimensoes": "1080x1920",
  "ativo": true,
  "created_at": "2026-07-01T10:00:00Z"
}
```

#### 6. CUSTO_IA_IG
```json
{
  "PK": "TENANT#t123",
  "SK": "CUSTO_IA_IG#2026-07-17T10:00:00Z#custo_001",
  "id": "custo_001",
  "story_id": "story_001",
  "servico": "claude-sonnet",
  "tipo": "texto",
  "tokens_input": 500,
  "tokens_output": 200,
  "custo_usd": 0.003,
  "created_at": "2026-07-17T10:00:00Z"
}
```

### GSIs Necessários
| GSI | PK | SK | Uso |
|---|---|---|---|
| GSI-PostStatus | TENANT#t123 | STATUS#agendado | Posts agendados |
| GSI-PostAlbum | TENANT#t123 | ALBUM#alb_001 | Posts de um álbum |

### Status de Post
| Status | Descrição |
|---|---|
| rascunho | Criado, não publicado |
| agendado | Agendado para data futura |
| publicando | Container criado, aguardando publish |
| publicado | No Instagram |
| falho | Erro na publicação |
| cancelado | Admin cancelou |

## Critérios de Aceite
- [ ] 6 entidades criadas no model
- [ ] Helpers CRUD para cada entidade
- [ ] GSIs definidos no SAM
- [ ] Status de post com transições válidas
- [ ] Tipagem de campos consistente

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-02: Modelo de Dados Instagram.

1. Crie models/instagram.js: helpers CRUD para 6 entidades.
2. POST_INSTAGRAM, INSIGHT_CONTA_IG, INSIGHT_POST_IG, STORY_IG, TEMPLATE_STORY_IG, CUSTO_IA_IG.
3. GSIs: PostStatus, PostAlbum.
4. Status: rascunho/agendado/publicando/publicado/falho/cancelado.
5. SAM: adicionar GSIs ao template.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
