# SAT-08: Dashboard Motivos de Recusa (Analytics Admin)

## Metadados
- **ID:** SAT-08
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** SAT-07

## Contexto
Painel analítico para o admin entender por que orçamentos são recusados: ranking de motivos, evolução mensal, correlação com valor do orçamento, e insights acionáveis.

## Escopo
- `apps/backend/src/handlers/satisfacao/dashboardRecusa.js` — NOVO
- `apps/frontend/src/pages/admin/DashboardRecusa.jsx` — NOVO
- API: GET /admin/pesquisas-recusa/dashboard

## Fora de Escopo (NÃO TOCAR)
- Tela de resposta (SAT-07)
- Disparo (SAT-06)
- Feedbacks positivos (SAT-04)

## Spec Técnica

### API — GET /admin/pesquisas-recusa/dashboard
Query params: `periodo` (30d, 90d, 6m, 1a)

```json
{
  "resumo": {
    "total_pesquisas": 25,
    "respondidas": 18,
    "taxa_resposta": 72,
    "periodo": "90d"
  },
  "ranking_motivos": [
    { "codigo": "preco", "label": "Preço acima do esperado", "contagem": 12, "percentual": 66.7 },
    { "codigo": "outro_profissional", "label": "Escolhi outro profissional", "contagem": 5, "percentual": 27.8 },
    { "codigo": "disponibilidade", "label": "Indisponível na data", "contagem": 4, "percentual": 22.2 },
    { "codigo": "prazo_entrega", "label": "Prazo de entrega", "contagem": 3, "percentual": 16.7 },
    { "codigo": "desistiu_evento", "label": "Desistiu do evento", "contagem": 2, "percentual": 11.1 }
  ],
  "evolucao_mensal": [
    { "mes": "2026-05", "total": 6, "preco": 4, "outro_profissional": 1, "outros": 1 },
    { "mes": "2026-06", "total": 7, "preco": 5, "disponibilidade": 2, "outros": 0 },
    { "mes": "2026-07", "total": 5, "preco": 3, "prazo": 1, "outros": 1 }
  ],
  "correlacao_valor": {
    "media_orcamentos_recusados": 4200,
    "media_orcamentos_aceitos": 3500,
    "diferenca_percentual": 20
  },
  "comentarios_recentes": [
    { "texto": "Achei caro para aniversário", "motivo": "preco", "data": "2026-07-15" },
    { "texto": "Já fechei com outro fotógrafo", "motivo": "outro_profissional", "data": "2026-07-12" }
  ]
}
```

### Frontend — DashboardRecusa.jsx
- **Cards resumo:** Total, Respondidas, Taxa de resposta
- **Gráfico barras horizontal:** Ranking de motivos (% + contagem)
- **Gráfico linha:** Evolução mensal por motivo
- **Card insight:** "Orçamentos recusados são em média 20% mais caros que os aceitos"
- **Filtro:** Período (30d, 90d, 6m, 1a)
- **Lista:** Comentários abertos recentes

### Regras
- Percentuais sobre total de respondidas (não enviadas)
- Um orçamento pode ter múltiplos motivos
- Motivo principal pesa mais no ranking
- Insights gerados automaticamente (comparação valor aceito vs recusado)

## Critérios de Aceite
- [ ] Ranking de motivos com percentual
- [ ] Evolução mensal
- [ ] Correlação com valor do orçamento
- [ ] Taxa de resposta
- [ ] Comentários recentes
- [ ] Filtro por período
- [ ] Card de insight automático

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SAT-08: Dashboard Motivos de Recusa.

1. Crie handlers/satisfacao/dashboardRecusa.js: agregações.
2. Crie pages/admin/DashboardRecusa.jsx: gráficos + cards.
3. Ranking de motivos (barras horizontais).
4. Evolução mensal (linha).
5. Correlação valor aceito vs recusado.
6. Filtro por período.
7. SAM: rota GET /admin/pesquisas-recusa/dashboard.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
