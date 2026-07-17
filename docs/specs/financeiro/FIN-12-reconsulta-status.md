# FIN-12: API — Reconsultar Status no Provedor

## Metadados
- **ID:** FIN-12
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** FIN-09

## Contexto
Se o webhook falhar ou não chegar, o admin precisa de um botão "Verificar Pagamento" que consulta o status direto na API do provedor. Fallback manual para garantir que nenhum pagamento se perca.

## Escopo
- `apps/backend/src/handlers/financeiro/reconsultarStatus.js` — NOVO
- API: POST /admin/financeiro/cobrancas/:id/verificar

## Fora de Escopo (NÃO TOCAR)
- Webhook (FIN-10 — continua funcionando)
- Adapter (FIN-09 — usa consultarStatus do adapter)
- Frontend principal (botão adicionado em FIN-06)

## Spec Técnica

### Fluxo
```
1. Admin clica "Verificar Pagamento" em uma cobrança
2. Lambda busca cobrança → gateway_id + gateway_cobranca_id
3. Busca credenciais no SSM
4. Chama adapter.consultarStatus(gateway_cobranca_id)
5. Se status mudou: atualiza COBRANCA + dispara evento
6. Se não mudou: retorna status atual
```

### API — POST /admin/financeiro/cobrancas/:id/verificar
```json
// Response
{
  "status_anterior": "em_aberto",
  "status_atual": "paga",
  "atualizado": true,
  "data_pagamento": "2026-07-17T10:05:00Z",
  "valor_pago": 1500.00
}
```

### Regras
- Só funciona se cobrança tem gateway_cobranca_id
- Se não tem (pagamento manual): retornar "Cobrança sem gateway"
- Rate limit: max 1 consulta por cobrança a cada 30s
- Se status mudou → atualizar COBRANCA + disparar cobranca.paga

## Critérios de Aceite
- [ ] Consulta status no provedor via adapter
- [ ] Se mudou: atualiza COBRANCA
- [ ] Se não mudou: informa admin
- [ ] Rate limit: 1 consulta/30s por cobrança
- [ ] Funciona com Mercado Pago
- [ ] Não funciona se sem gateway (mensagem clara)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-12: Reconsultar Status no Provedor.

1. Crie handlers/financeiro/reconsultarStatus.js: buscar cobrança, adapter.consultarStatus.
2. Se mudou: atualizar COBRANCA + disparar evento.
3. Rate limit: max 1 consulta/30s por cobrança.
4. SAM: rota POST /admin/financeiro/cobrancas/{id}/verificar.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
