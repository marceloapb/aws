# FIN-06: API — Visão de Gestão (4 Cards + Listas + Filtro)

## Metadados
- **ID:** FIN-06
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** FIN-03

## Contexto
O admin precisa de uma visão consolidada do financeiro: quanto tem a receber, quanto está atrasado, quanto já recebeu no mês, e próximos vencimentos. Tela principal do módulo Financeiro.

## Escopo
- `apps/backend/src/handlers/financeiro/visaoGestao.js` — NOVO
- `apps/frontend/src/pages/admin/Financeiro.jsx` — NOVO
- API: GET /admin/financeiro/resumo?mes=2026-07

## Fora de Escopo (NÃO TOCAR)
- Gateway (FIN-07+)
- Despesas (FIN-13+)
- Outros módulos

## Spec Técnica

### API Response
```json
{
  "mes": "2026-07",
  "cards": {
    "a_receber": 12500.00,
    "recebido_mes": 4500.00,
    "atrasado": 3000.00,
    "proximo_vencimento": { "valor": 1500.00, "data": "2026-07-20", "cliente": "Ana Silva" }
  },
  "cobrancas_atrasadas": [
    { "id": "cob_001", "cliente": "João", "valor": 1500, "vencimento": "2026-07-01", "dias_atraso": 16 }
  ],
  "proximos_vencimentos": [
    { "id": "cob_005", "cliente": "Maria", "valor": 2000, "vencimento": "2026-07-25" }
  ],
  "recebidos_mes": [
    { "id": "cob_003", "cliente": "Ana", "valor": 1500, "data_pagamento": "2026-07-10", "metodo": "pix" }
  ]
}
```

### Frontend — Financeiro.jsx
- **4 Cards no topo:**
  - A Receber (total em_aberto, azul)
  - Recebido no Mês (total pago, verde)
  - Atrasado (total atrasadas, vermelho)
  - Próximo Vencimento (valor + data + cliente, amarelo)
- **3 Listas abaixo:**
  - Tab 1: Atrasadas (ordenadas por dias de atraso desc)
  - Tab 2: Próximos Vencimentos (ordenados por data asc)
  - Tab 3: Recebidos no Mês (ordenados por data desc)
- **Filtros:**
  - Mês (seletor de mês/ano)
  - Cliente (select com busca)
  - Status (multi-select)
- **Ações rápidas:**
  - Botão "Marcar como Pago" em cada linha
  - Botão "Enviar Lembrete" nas atrasadas

### Filtro por Mês
- Default: mês atual
- Seletor: navegação < mês/ano >
- Recalcula todos os cards e listas

## Critérios de Aceite
- [ ] 4 cards com valores corretos
- [ ] Lista de atrasadas com dias de atraso
- [ ] Lista de próximos vencimentos
- [ ] Lista de recebidos no mês
- [ ] Filtro por mês funciona
- [ ] Filtro por cliente funciona
- [ ] Ação "Marcar como Pago" funciona
- [ ] Ação "Enviar Lembrete" funciona
- [ ] Responsive (cards empilham em mobile)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-06: Visão de Gestão Financeira.

1. Crie handlers/financeiro/visaoGestao.js: agregar cobranças por status, mês, calcular cards.
2. Crie pages/admin/Financeiro.jsx: 4 cards + 3 tabs de listas + filtros.
3. Ações: marcar pago (chama FIN-03), enviar lembrete.
4. Filtro por mês (default: atual) e cliente.
5. SAM: rota GET /admin/financeiro/resumo.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
