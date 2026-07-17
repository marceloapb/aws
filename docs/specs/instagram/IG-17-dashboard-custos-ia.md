# IG-17: Dashboard de Custos IA (Stories)

## Metadados
- **ID:** IG-17
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Médio
- **Dependência:** IG-13, IG-14

## Contexto
Tela de monitoramento de gastos com IA (LLM + geração de arte) usada nos stories. Exibe custo por story, por provider, projeção mensal, e alerta de budget.

## Escopo
- `apps/backend/src/handlers/instagram/custosIA.js` — NOVO
- `apps/frontend/src/pages/admin/InstagramCustosIA.jsx` — NOVO
- API: GET /admin/instagram/custos-ia

## Fora de Escopo (NÃO TOCAR)
- Adapters (IG-13/14)
- Stories (IG-11/12)
- Dashboard custos WhatsApp (WPP-16)

## Spec Técnica

### API — GET /admin/instagram/custos-ia
Query params: `mes` (YYYY-MM)

```json
{
  "mes": "2026-07",
  "resumo": {
    "custo_total_usd": 1.85,
    "custo_llm": 0.45,
    "custo_arte": 1.40,
    "stories_gerados": 35,
    "custo_medio_por_story": 0.053,
    "budget_mensal": 10.00,
    "budget_usado_pct": 18.5
  },
  "por_provider": [
    { "provider": "claude", "tipo": "llm", "chamadas": 35, "custo": 0.45 },
    { "provider": "dall-e", "tipo": "arte", "chamadas": 35, "custo": 1.40 }
  ],
  "por_dia": [
    { "data": "2026-07-01", "stories": 2, "custo": 0.11 },
    { "data": "2026-07-02", "stories": 3, "custo": 0.16 }
  ],
  "projecao_mensal": {
    "custo_estimado": 3.33,
    "stories_estimados": 63
  }
}
```

### Frontend — InstagramCustosIA.jsx
- **Cards:** Custo Total, Custo LLM, Custo Arte, Stories Gerados, Budget Usado %
- **Barra de progresso:** Budget usado vs total
- **Gráfico barras:** Custo por dia
- **Tabela:** Custo por provider
- **Alertas:**
  - 🟡 > 70% budget: "Atenção: 70% do budget usado"
  - 🔴 > 90% budget: "Limite próximo! Desativar geração?"
- **Seletor de mês**

### Configuração de Budget
- Budget mensal configurável (default: $10 USD)
- Se exceder: bloquear geração + notificar admin
- Admin pode aumentar budget a qualquer momento

## Critérios de Aceite
- [ ] Custo total calculado (LLM + Arte)
- [ ] Custo por provider
- [ ] Custo por dia
- [ ] Projeção mensal
- [ ] Budget com alertas
- [ ] Bloquear se exceder budget
- [ ] Seletor de mês

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-17: Dashboard Custos IA.

1. Crie handlers/instagram/custosIA.js: agregar CUSTO_IA_IG por mês/dia/provider.
2. Crie pages/admin/InstagramCustosIA.jsx: cards, gráfico, alertas budget.
3. Projeção mensal.
4. Alertas: 70% amarelo, 90% vermelho.
5. Bloquear geração se exceder budget.
6. SAM: rota GET /admin/instagram/custos-ia.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
