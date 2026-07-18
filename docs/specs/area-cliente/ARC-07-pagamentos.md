# ARC-07 — Pagamentos (Cobranças + Link)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | ARC-07 |
| **Tipo** | Feature |
| **Prioridade** | P1 |
| **Impacto** | Alto — gera receita, reduz inadimplência |
| **Esforço** | Médio |

## Contexto
O cliente visualiza suas parcelas (geradas pelo admin em §10/§21.1), com status, valor, vencimento e link de pagamento (Mercado Pago ou Pix). Não gera cobrança — só consome. Visão: timeline de parcelas com status visual.

## Escopo
- **Frontend:** `PagamentosPage.jsx` (aba no EventoDetalhe)
- **Lambda:** `getPagamentosCliente` — lista parcelas do evento com links
- **API Gateway:** `GET /cliente/eventos/:id/pagamentos`
- **Exibe:** parcela, valor, vencimento, status, link de pagamento (se pendente)

## Fora de Escopo (NÃO TOCAR)
- Criação de cobranças (admin, §10)
- Integração com gateway de pagamento (§21.1 — já existe)
- Régua de cobrança / follow-up (§25 Follow-up)
- Emissão de nota fiscal
- Trava 70% (lógica interna, nunca exposta ao cliente)

## Spec Técnica

### Lambda getPagamentosCliente
- Auth: JWT cliente
- Valida: evento pertence ao cliente
- Query: parcelas do evento
- Retorna:
```json
{
  "evento_id": "ev123",
  "valor_total": 8500.00,
  "total_pago": 5100.00,
  "parcelas": [
    {
      "numero": 1,
      "valor": 1700.00,
      "vencimento": "2026-07-20",
      "status": "pago",
      "pago_em": "2026-07-18",
      "link_pagamento": null
    },
    {
      "numero": 2,
      "valor": 1700.00,
      "vencimento": "2026-08-20",
      "status": "pendente",
      "pago_em": null,
      "link_pagamento": "https://mpago.la/abc123"
    },
    {
      "numero": 3,
      "valor": 1700.00,
      "vencimento": "2026-09-20",
      "status": "futuro",
      "pago_em": null,
      "link_pagamento": null
    }
  ]
}
```
- NUNCA retorna: trava 70%, margem, taxa do gateway

### Mapeamento Status Parcela
| Interno | Cliente |
|---|---|
| pago | Pago ✓ |
| pendente | Pendente (com link) |
| vencido | Atrasado ⚠️ (com link) |
| futuro | A vencer |

### Estrutura da Página
```
<PagamentosPage>
  <ResumoFinanceiro>
    - Valor total | Pago | Restante
    - Barra de progresso visual
  </ResumoFinanceiro>
  <TimelineParcelas>
    - Cards por parcela: número, valor, vencimento, status badge
    - Pago: check verde, data do pagamento
    - Pendente/Atrasado: botão "Pagar" → abre link em nova aba
    - Futuro: cinza, sem ação
  </TimelineParcelas>
</PagamentosPage>
```

## Critérios de Aceite
- Cliente vê APENAS suas parcelas (validação de ownership)
- Status sempre traduzido (nunca código interno)
- Link de pagamento abre em nova aba
- Parcela paga → sem link, mostra data
- Parcela futura → sem link, status "A vencer"
- Barra de progresso: (total_pago / valor_total) * 100
- Trava 70% NUNCA mencionada ou visível

## Prompt Pronto para o Kiro CLI
```
Implemente a spec ARC-07 (Pagamentos — Visualização pelo Cliente).

Crie:
1. src/functions/cliente/getPagamentosCliente/index.mjs — lista parcelas com status traduzido
2. Rota GET /cliente/eventos/:id/pagamentos no template.yaml (auth JWT)
3. src/pages/cliente/PagamentosPage.jsx — resumo + timeline + botão pagar

Resumo: valor total, pago, restante, barra progresso.
Parcelas: pago (check verde), pendente/atrasado (botão pagar → link nova aba), futuro (cinza).
NUNCA expor: trava 70%, taxa gateway, margem.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
