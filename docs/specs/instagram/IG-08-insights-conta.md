# IG-08: Insights da Conta (Métricas 7 dias)

## Metadados
- **ID:** IG-08
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** IG-01

## Contexto
Coletar métricas da conta IG Business via Graph API (impressões, alcance, profile views, website clicks) e armazenar historicamente para exibir evolução. Coleta via cron a cada 1h.

## Escopo
- `apps/backend/src/handlers/instagram/insightsConta.js` — NOVO
- `apps/frontend/src/pages/admin/InstagramInsights.jsx` — NOVO
- API: GET /admin/instagram/insights/conta
- EventBridge: cron de coleta (1h)

## Fora de Escopo (NÃO TOCAR)
- Insights por post (IG-09)
- Publicação (IG-03)
- Stories métricas (IG-16)

## Spec Técnica

### Coleta (Cron 1h)
```js
async function coletarInsightsConta(tenantId) {
  const conta = await getContaInstagram(tenantId)
  const token = await getTokenSSM(conta.token_ssm_path)
  
  // Métricas da conta
  const metrics = await fetch(
    `https://graph.facebook.com/v21.0/${conta.ig_user_id}/insights?` +
    `metric=impressions,reach,profile_views,website_clicks&` +
    `period=day&access_token=${token}`
  )
  
  // Dados do perfil
  const profile = await fetch(
    `https://graph.facebook.com/v21.0/${conta.ig_user_id}?` +
    `fields=followers_count,follows_count,media_count&access_token=${token}`
  )
  
  await salvarInsightConta(tenantId, {
    data: new Date().toISOString().split('T')[0],
    followers: profile.followers_count,
    follows: profile.follows_count,
    media_count: profile.media_count,
    impressions: metrics.data[0].values[0].value,
    reach: metrics.data[1].values[0].value,
    profile_views: metrics.data[2].values[0].value,
    website_clicks: metrics.data[3].values[0].value
  })
}
```

### API — GET /admin/instagram/insights/conta
Query params: `periodo` (7d, 30d, 90d)

```json
{
  "periodo": "7d",
  "atual": {
    "followers": 2500,
    "impressions": 8750,
    "reach": 6200,
    "profile_views": 315,
    "website_clicks": 84,
    "engagement_rate": 4.2
  },
  "variacao": {
    "followers": "+12",
    "impressions": "+15%",
    "reach": "+8%"
  },
  "historico": [
    { "data": "2026-07-11", "followers": 2488, "impressions": 1100, "reach": 850 },
    { "data": "2026-07-12", "followers": 2490, "impressions": 1250, "reach": 900 }
  ]
}
```

### Frontend — InstagramInsights.jsx
- **Cards:** Seguidores, Impressões, Alcance, Views Perfil, Cliques Site
- **Variação:** ↑↓ comparativo com período anterior
- **Gráfico de linha:** Evolução dos últimos 7/30/90 dias
- **Seletor período:** 7d | 30d | 90d
- **Melhor dia:** Qual dia da semana tem mais alcance

### EventBridge (Cron)
```yaml
InstagramInsightsSchedule:
  Type: AWS::Scheduler::Schedule
  Properties:
    ScheduleExpression: 'rate(1 hour)'
    Target:
      Arn: !GetAtt InsightsContaFunction.Arn
      RoleArn: !GetAtt SchedulerRole.Arn
    FlexibleTimeWindow:
      Mode: 'FLEXIBLE'
      MaximumWindowInMinutes: 15
```

## Critérios de Aceite
- [ ] Coleta automática a cada 1h
- [ ] Métricas salvas historicamente
- [ ] API retorna período selecionado
- [ ] Variação calculada vs período anterior
- [ ] Cards com métricas atuais
- [ ] Gráfico de evolução
- [ ] Seletor de período

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-08: Insights da Conta.

1. Crie handlers/instagram/insightsConta.js: coletar métricas Graph API.
2. Crie pages/admin/InstagramInsights.jsx: cards, gráfico, variação.
3. EventBridge cron 1h para coleta.
4. Salvar INSIGHT_CONTA_IG diário.
5. API: GET /admin/instagram/insights/conta com período.
6. SAM: schedule + rota.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
