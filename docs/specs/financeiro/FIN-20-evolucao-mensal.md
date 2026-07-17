# FIN-20: API — Evolução Mês a Mês (Comparativo)

## Metadados
- **ID:** FIN-20
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** FIN-18

## Contexto
O admin quer ver a evolução financeira ao longo dos meses: receita, despesa e saldo mês a mês, identificando tendências e sazonalidades.

## Escopo
- `apps/backend/src/handlers/financeiro/evolucao.js` — NOVO
- `apps/frontend/src/components/financeiro/EvolucaoMensal.jsx` — NOVO
- API: GET /admin/financeiro/evolucao?meses=12

## Fora de Escopo (NÃO TOCAR)
- Rentabilidade (FIN-19)
- Fluxo de caixa detalhado (FIN-18)
- Dashboard principal

## Spec Técnica

### API Response
```json
{
  "periodo": "2025-08 a 2026-07",
  "meses": [
    {
      "mes": "2025-08",
      "receita": 8500,
      "despesa": 4200,
      "saldo": 4300,
      "eventos": 4
    },
    {
      "mes": "2025-09",
      "receita": 12000,
      "despesa": 5100,
      "saldo": 6900,
      "eventos": 6
    }
  ],
  "totais": {
    "receita_total": 95000,
    "despesa_total": 52000,
    "saldo_total": 43000,
    "media_mensal_receita": 7916,
    "media_mensal_saldo": 3583,
    "melhor_mes": { "mes": "2025-12", "saldo": 9500 },
    "pior_mes": { "mes": "2026-02", "saldo": 800 }
  }
}
```

### Frontend — EvolucaoMensal.jsx
- Gráfico de linhas: receita, despesa, saldo (3 linhas)
- Tabela resumo: mês, receita, despesa, saldo, eventos
- Cards resumo: total anual, média mensal, melhor/pior mês
- Seletor de período: 6, 12, 24 meses
- Indicadores de tendência (↑ ↓)

### Cálculo
- Para cada mês do período:
  - Receita: cobranças pagas + entradas manuais
  - Despesa: despesas avulsas + fixas
  - Saldo: receita - despesa
  - Eventos: quantidade de eventos no mês

## Critérios de Aceite
- [ ] Dados dos últimos N meses corretos
- [ ] Gráfico de linhas renderiza
- [ ] Tabela resumo com totais
- [ ] Cards com média e melhor/pior mês
- [ ] Seletor de período funciona (6/12/24)
- [ ] Tendência calculada (↑ ↓)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-20: Evolução Mês a Mês.

1. Crie handlers/financeiro/evolucao.js: agregar receita/despesa por mês.
2. Crie components/financeiro/EvolucaoMensal.jsx: gráfico + tabela + cards.
3. Seletor de período (6/12/24 meses).
4. SAM: rota GET /admin/financeiro/evolucao.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
