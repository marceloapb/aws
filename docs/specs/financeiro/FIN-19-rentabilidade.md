# FIN-19: API — Rentabilidade por Evento

## Metadados
- **ID:** FIN-19
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** FIN-18

## Contexto
O fotógrafo quer saber quanto lucra em cada evento: receita do orçamento menos despesas vinculadas ao evento = margem de contribuição. Fundamental para precificação futura.

## Escopo
- `apps/backend/src/handlers/financeiro/rentabilidade.js` — NOVO
- `apps/frontend/src/components/financeiro/RentabilidadeEvento.jsx` — NOVO
- API: GET /admin/financeiro/rentabilidade/:eventoId

## Fora de Escopo (NÃO TOCAR)
- Fluxo de caixa geral (FIN-18)
- Módulo Agenda
- Gateway

## Spec Técnica

### Cálculo
```
Receita = valor total do orçamento vinculado ao evento
Despesas = SUM(despesas com evento_id = este evento)
Margem = Receita - Despesas
Margem % = (Margem / Receita) * 100
```

### API Response
```json
{
  "evento_id": "evt_001",
  "evento_titulo": "Casamento Ana & João",
  "receita": 4500.00,
  "despesas": [
    { "descricao": "Combustível", "valor": 120.00 },
    { "descricao": "Assistente", "valor": 400.00 },
    { "descricao": "Alimentação", "valor": 80.00 }
  ],
  "total_despesas": 600.00,
  "margem": 3900.00,
  "margem_percentual": 86.7,
  "horas_trabalhadas": 10,
  "valor_hora": 390.00
}
```

### Frontend — RentabilidadeEvento.jsx
- Cards: Receita, Despesas, Margem, Valor/Hora
- Lista de despesas do evento
- Indicador visual: verde (> 70%), amarelo (40-70%), vermelho (< 40%)
- Acessível no detalhe do evento/orçamento

### Ranking de Eventos
- GET /admin/financeiro/rentabilidade?periodo=2026-07
- Top N eventos por margem
- Média de margem do período
- Evento mais e menos rentável

## Critérios de Aceite
- [ ] Cálculo de margem correto
- [ ] Despesas vinculadas ao evento somadas
- [ ] Margem percentual calculada
- [ ] Indicador visual de saúde
- [ ] Ranking de eventos funciona
- [ ] Valor/hora (se horas informadas)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-19: Rentabilidade por Evento.

1. Crie handlers/financeiro/rentabilidade.js: calcular receita - despesas = margem.
2. Crie components/financeiro/RentabilidadeEvento.jsx: cards + lista despesas + indicador.
3. Ranking: GET /admin/financeiro/rentabilidade?periodo=YYYY-MM.
4. SAM: rotas.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
