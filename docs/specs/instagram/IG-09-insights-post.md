# IG-09: Insights por Post (Curtidas, Alcance, Engajamento)

## Metadados
- **ID:** IG-09
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** IG-03, IG-08

## Contexto
Após publicação, coletar métricas individuais de cada post (likes, comments, saves, shares, reach, impressions). Coleta junto com o cron de insights da conta.

## Escopo
- `apps/backend/src/handlers/instagram/insightsPost.js` — NOVO
- API: GET /admin/instagram/insights/post/:postId

## Fora de Escopo (NÃO TOCAR)
- Insights conta (IG-08)
- Central (IG-06 — exibe resumo)
- Stories (IG-16)

## Spec Técnica

### Coleta (junto com cron IG-08)
```js
async function coletarInsightsPosts(tenantId) {
  const posts = await getPostsPublicados(tenantId, { ultimos: 50 })
  
  for (const post of posts) {
    const insights = await fetch(
      `https://graph.facebook.com/v21.0/${post.ig_media_id}/insights?` +
      `metric=impressions,reach,saved,shares&access_token=${token}`
    )
    
    const basic = await fetch(
      `https://graph.facebook.com/v21.0/${post.ig_media_id}?` +
      `fields=like_count,comments_count,timestamp&access_token=${token}`
    )
    
    await salvarInsightPost(post.id, {
      likes: basic.like_count,
      comments: basic.comments_count,
      saves: insights.data.find(m => m.name === 'saved').values[0].value,
      shares: insights.data.find(m => m.name === 'shares').values[0].value,
      reach: insights.data.find(m => m.name === 'reach').values[0].value,
      impressions: insights.data.find(m => m.name === 'impressions').values[0].value,
      engagement_rate: calcularEngagement(basic, insights, conta.followers)
    })
  }
}

function calcularEngagement(basic, insights, followers) {
  const total = basic.like_count + basic.comments_count + 
    insights.saves + insights.shares
  return ((total / followers) * 100).toFixed(2)
}
```

### API — GET /admin/instagram/insights/post/:postId
```json
{
  "post_id": "post_001",
  "caption": "Casamento Ana & Pedro 💍",
  "publicado_em": "2026-07-17T10:00:00Z",
  "metricas": {
    "likes": 45,
    "comments": 8,
    "saves": 12,
    "shares": 3,
    "reach": 890,
    "impressions": 1250,
    "engagement_rate": 2.72
  },
  "historico": [
    { "data": "2026-07-17", "likes": 20, "reach": 400 },
    { "data": "2026-07-18", "likes": 45, "reach": 890 }
  ]
}
```

### Frontend (na Central IG-06)
- Ao clicar no post: modal/drawer com métricas
- Cards: Likes, Comments, Saves, Shares, Reach, Engagement Rate
- Mini gráfico de evolução (primeiras 72h)
- Comparativo com média dos outros posts

### Regras
- Coletar insights dos últimos 50 posts publicados
- Coleta junto com o cron de IG-08 (não fazer cron separado)
- Engagement rate = (likes + comments + saves + shares) / followers × 100
- Posts com menos de 1h: não coletar ainda (dados instáveis)

## Critérios de Aceite
- [ ] Métricas por post coletadas
- [ ] Engagement rate calculado
- [ ] API retorna métricas + histórico
- [ ] Modal de insights no frontend
- [ ] Últimos 50 posts
- [ ] Não coletar posts com < 1h

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-09: Insights por Post.

1. Crie handlers/instagram/insightsPost.js: coletar métricas por post.
2. Integrar com cron de IG-08 (mesma execução).
3. API: GET /admin/instagram/insights/post/{postId}.
4. Engagement rate: (likes+comments+saves+shares)/followers×100.
5. Últimos 50 posts, ignorar posts com < 1h.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
