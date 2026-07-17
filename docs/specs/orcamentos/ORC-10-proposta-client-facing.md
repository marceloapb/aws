# ORC-10: Proposta Client-Facing (proteção de preço)

## Metadados
- **ID:** ORC-10
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** ORC-03, ORC-04

## Contexto
O cliente só deve ver valores APÓS o admin enviar a proposta. Antes disso, nenhuma informação de preço pode ser acessível. No portal do cliente, apenas orçamentos com status 'enviado' ou posterior aparecem.

## Escopo
- Portal do cliente (área pública/autenticada)
- Backend: Lambda `getOrcamentoCliente` — filtra dados sensíveis
- API: GET /cliente/orcamentos/:id

## Fora de Escopo (NÃO TOCAR)
- Admin views (Orcamentos.jsx, OrcamentoDetalhe.jsx)
- Criação de orçamento
- Envio de orçamento

## Spec Técnica

### Regras de Visibilidade
| Campo | Visível ao cliente? |
|---|---|
| Opções com valores | ✅ Sim (após envio) |
| Status interno | ❌ Não (mostra status_cliente) |
| Notas internas do admin | ❌ Não |
| Condições de pagamento | ✅ Sim |
| Eventos (data/local) | ✅ Sim |
| Histórico de revisões | ❌ Não |
| Desconto (% aplicado) | ❌ Não (mostra só valor final) |

### Lambda — getOrcamentoCliente
- Verificar: status_interno IN ('enviado', 'aceito', 'recusado', 'expirado', 'contrato_gerado')
- Se não: retornar 404
- Filtrar campos sensíveis
- Retornar apenas: opcoes (com valores), condicoes_pagamento, eventos, status_cliente, expira_em

### Portal do Cliente
- Card por opção com valor total e itens
- Badge "Recomendado" na opção destacada
- Botões: "Aceitar esta opção" + seletor de forma de pagamento
- Recusar: campo motivo (opcional)

## Critérios de Aceite
- [ ] Cliente não vê orçamentos em rascunho/revisão
- [ ] Campos sensíveis filtrados
- [ ] Opções com valores visíveis após envio
- [ ] Botão aceitar funciona com seleção de opção + pagamento
- [ ] Recusar com motivo opcional
- [ ] 404 para orçamentos não-enviados

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-10: Proposta Client-Facing.

1. Lambda getOrcamentoCliente: filtrar campos sensíveis, verificar status.
2. API GET /cliente/orcamentos/:id com autenticação Cognito.
3. Frontend portal: cards de opções, botão aceitar com seleção.
4. Validação: 404 se status não permitido.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
