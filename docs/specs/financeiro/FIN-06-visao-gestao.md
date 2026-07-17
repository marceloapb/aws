# FIN-06: API — Visão de Gestão (Cards + Listas + Filtro)

## Metadados
- **ID:** FIN-06
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** FIN-03

## Contexto
O admin precisa de uma visão consolidada do financeiro: 4 cards resumo no topo (total a receber, recebido no mês, atrasado, próximo vencimento) + listagem de cobranças com filtros.

## Escopo
- `apps/backend/src/handlers/financeiro/visaoGestao.js` — NOVO
- `apps/frontend/src/pages/admin/Financeiro.jsx` — NOVO
- API: GET /admin/financeiro/resumo, GET /admin/financeiro/cobrancas

## Fora de Escopo (NÃO TOCAR)
- Gateway (FIN-07+)
- Despesas (FIN-13+)
- Módulo Orçamentos

## Spec Técnica

### API — GET /admin/financeiro/resumo
```json
{
  "total_a_receber": 12500.00,
  "recebido_mes_atual": 4500.00,
  "total_atrasado": 3000.00,
  "proximo_vencimento": { "valor": 1500.00, "data": "2026-08-01", "cliente": "Ana Silva" },
  "cobrancas_por_status": {
    "em_aberto": 5,
    "atrasada": 2,
    "paga": 12,
    "paga_parcial": 1
  }
}
```

### API — GET /admin/financeiro/cobrancas
Query params: `status`, `cliente_id`, `mes`, `metodo_pagamento`, `page`, `limit`

```json
{
  "items": [
    {
      "id": "cob_001",
      "cliente_nome": "Ana Silva",
      "orcamento_titulo": "Casamento Ana & João",
      "parcela": "1/3",
      "valor": 1500.00,
      "vencimento": "2026-08-01",
      "status": "em_aberto",
      "metodo_pagamento": null
    }
  ],
  "total": 20,
  "page": 1,
  "pages": 2
}
```

### Frontend — Financeiro.jsx
- **Cards Resumo (4):**
  - Total a receber (azul)
  - Recebido este mês (verde)
  - Total atrasado (vermelho)
  - Próximo vencimento (amarelo)
- **Filtros:** Status, cliente, mês, método
- **Tabela:** Cliente, Orçamento, Parcela, Valor, Vencimento, Status, Ações
- **Ações por cobrança:** Marcar pago (FIN-03), Ver detalhes, Enviar lembrete
- **Indicadores visuais:** badge de status colorido, ícone de atraso

### Layout
```
[4 Cards Resumo]
[Barra de Filtros]
[Tabela de Cobranças com ações]
[Paginação]
```

## Critérios de Aceite
- [ ] API resumo retorna totais corretos
- [ ] API cobranças com paginação e filtros
- [ ] 4 cards com valores corretos
- [ ] Filtro por status funciona
- [ ] Filtro por cliente funciona
- [ ] Filtro por mês funciona
- [ ] Ação marcar pago na listagem
- [ ] Badge de status colorido

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-06: Visão de Gestão do Financeiro.

1. Crie handlers/financeiro/visaoGestao.js: resumo agregado + listagem com filtros.
2. Crie pages/admin/Financeiro.jsx: 4 cards + filtros + tabela + ações.
3. Rotas: GET /admin/financeiro/resumo, GET /admin/financeiro/cobrancas.
4. Paginação server-side.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
