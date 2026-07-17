# FIN-18: API — Fluxo de Caixa (Entradas − Saídas = Saldo)

## Metadados
- **ID:** FIN-18
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** FIN-15, FIN-17

## Contexto
O admin quer ver o fluxo de caixa consolidado: todas as entradas (cobranças pagas + entradas manuais) menos todas as saídas (despesas) = saldo do mês. Visão mensal com drill-down.

## Escopo
- `apps/backend/src/handlers/financeiro/fluxoCaixa.js` — NOVO
- `apps/frontend/src/pages/admin/FluxoCaixa.jsx` — NOVO
- API: GET /admin/financeiro/fluxo-caixa?mes=2026-07

## Fora de Escopo (NÃO TOCAR)
- Rentabilidade por evento (FIN-19)
- Gateway (FIN-07+)
- Módulo Orçamentos

## Spec Técnica

### API Response
```json
{
  "mes": "2026-07",
  "entradas": {
    "cobrancas_pagas": 8500.00,
    "entradas_manuais": 800.00,
    "total": 9300.00
  },
  "saidas": {
    "despesas_fixas": 5000.00,
    "despesas_variaveis": 1200.00,
    "total": 6200.00
  },
  "saldo": 3100.00,
  "detalhamento_entradas": [
    { "tipo": "cobranca", "descricao": "Parcela 1/3 - Casamento Ana", "valor": 1500, "data": "2026-07-10" },
    { "tipo": "entrada_manual", "descricao": "Workshop", "valor": 800, "data": "2026-07-15" }
  ],
  "detalhamento_saidas": [
    { "tipo": "despesa_fixa", "descricao": "Aluguel", "valor": 2500, "data": "2026-07-01" },
    { "tipo": "despesa", "descricao": "Combustível ensaio", "valor": 120, "data": "2026-07-08" }
  ]
}
```

### Frontend — FluxoCaixa.jsx
- **Cards Resumo (3):**
  - Total Entradas (verde)
  - Total Saídas (vermelho)
  - Saldo (azul se positivo, vermelho se negativo)
- **Breakdown:**
  - Entradas: cobranças pagas + entradas manuais
  - Saídas: fixas + variáveis
- **Timeline do mês:**
  - Lista cronológica de todas as movimentações
  - Entradas em verde, saídas em vermelho
  - Running balance (saldo acumulado dia a dia)
- **Navegação por mês:** < Jul 2026 >
- **Gráfico simples:** barras empilhadas (entradas vs saídas por semana)

### Cálculo
```
Entradas = SUM(cobranças com status='paga' no mês) + SUM(entradas_manuais no mês)
Saídas = SUM(despesas no mês)
Saldo = Entradas - Saídas
```

### Fontes de Dados
- Cobranças pagas: GSI1 com status='paga', filtro por data_pagamento no mês
- Entradas manuais: GSI1 com ENTRADA#YYYY-MM
- Despesas: GSI1 com DESPESA#YYYY-MM

## Critérios de Aceite
- [ ] Cards com totais corretos
- [ ] Breakdown entradas/saídas
- [ ] Timeline cronológica
- [ ] Saldo positivo/negativo com cor
- [ ] Navegação por mês
- [ ] Dados consistentes (soma bate)
- [ ] Drill-down por item

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-18: Fluxo de Caixa.

1. Crie handlers/financeiro/fluxoCaixa.js: agregar entradas (cobranças pagas + manuais) e saídas (despesas).
2. Crie pages/admin/FluxoCaixa.jsx: 3 cards + breakdown + timeline.
3. Navegação por mês.
4. Saldo = entradas - saídas.
5. SAM: rota GET /admin/financeiro/fluxo-caixa.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
