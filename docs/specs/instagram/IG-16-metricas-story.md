# IG-16: Métricas de Story (Coleta 24h)

## Metadados
- **ID:** IG-16
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Baixo
- **Esforço:** Médio
- **Dependência:** IG-11

## Contexto
Stories expiram em 24h. O sistema coleta métricas antes de expirar (impressões, respostas, saídas, toques para frente/trás). Coleta automática 23h após publicação.

## Escopo
- `apps/backend/src/handlers/instagram/metricasStory.js` — NOVO
- EventBridge: schedule 23h após publicação de story

## Fora de Escopo (NÃO TOCAR)
- Publicação de story (IG-11/12)
- Insights conta (IG-08)
- Dashboard custos (IG-17)

## Spec Técnica

### Coleta (23h após publicação)
```js
async function coletarMetricasStory(tenantId, storyId) {
  const story = await getStory(tenantId, storyId)
  const token = await getTokenSSM(conta.token_ssm_path)
  
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${story.ig_media_id}/insights?` +
    `metric=impressions,reach,replies,exits,taps_forward,taps_back&` +
    `access_token=${token}`
  )
  
  const metricas = parsearMetricas(response.data)
  
  await atualizarStory(tenantId, storyId, {
    metricas: {
      impressions: metricas.impressions,
      reach: metricas.reach,
      replies: metricas.replies,
      exits: metricas.exits,
      taps_forward: metricas.taps_forward,
      taps_back: metricas.taps_back
    },
    metricas_coletadas: true
  })
}
```

### Métricas de Story
| Métrica | Descrição | Bom sinal |
|---|---|---|
| impressions | Vezes exibido | Alto |
| reach | Contas únicas | Alto |
| replies | Respostas DM | Alto (engajamento) |
| exits | Saíram do story | Baixo é melhor |
| taps_forward | Tocou pra frente | Baixo é melhor |
| taps_back | Tocou pra trás | Alto (reviram) |

### Agendamento da Coleta
```js
async function agendarColetaStory(tenantId, storyId, publicadoEm) {
  const coletarEm = new Date(new Date(publicadoEm).getTime() + 23 * 60 * 60 * 1000)
  
  await criarSchedule({
    nome: `story-metrics-${storyId}`,
    expression: `at(${coletarEm.toISOString().replace('.000Z', '')})`,
    target: 'MetricasStoryFunction',
    input: { tenantId, storyId },
    deleteAfterCompletion: true
  })
}
```

### Frontend (dentro de IG-11/12)
- Após coleta: exibir métricas no card do story
- Badges: 👁 Impressões, 💬 Replies, ➡️ Exits
- Comparativo com média dos outros stories

## Critérios de Aceite
- [ ] Coleta automática 23h após publicação
- [ ] Métricas salvas no STORY_IG
- [ ] Schedule criado ao publicar story
- [ ] Schedule deletado após coleta
- [ ] Frontend exibe métricas
- [ ] Comparativo com média

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-16: Métricas de Story.

1. Crie handlers/instagram/metricasStory.js: coletar métricas Graph API.
2. Agendar coleta 23h após publicação (EventBridge one-time).
3. Salvar métricas no STORY_IG.
4. Deletar schedule após coleta.
5. Exibir métricas no card do story.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
