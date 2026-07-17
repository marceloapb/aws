# CFG-07: Webhook URL + Log de eventos

## Metadados
- **ID:** CFG-07
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** CFG-01

## Contexto
Gateways enviam webhooks (confirmação de pagamento, estorno, falha). O admin precisa ver: URL do webhook, log dos últimos eventos recebidos, status de processamento, e opção de reprocessar falhas.

## Escopo
- `apps/frontend/src/pages/admin/Configuracoes/GatewayWebhookLog.jsx` — NOVO
- `apps/frontend/src/pages/admin/Configuracoes/Gateway.jsx` — aba ou seção de webhook
- `apps/api/src/routes/admin-configuracoes.js` — GET /configuracoes/gateways/webhook-log
- DynamoDB: entidade WEBHOOK_LOG

## Fora de Escopo (NÃO TOCAR)
- Processamento real do webhook (SPEC-09 já cobre)
- SQS/DLQ (já configurado)
- Credenciais dos gateways (CFG-03)
- Outros módulos

## Spec Técnica

### DynamoDB — Entidade Webhook Log
```
PK: TENANT#<id>
SK: WEBHOOK#<timestamp>#<event_id>
GSI1PK: TENANT#<id>
GSI1SK: WEBHOOK_STATUS#<status>#<timestamp>
attributes:
  provider: string
  event_type: string (payment.confirmed, payment.refunded, payment.failed, etc.)
  payload_summary: string (primeiros 200 chars)
  status: 'processado' | 'falha' | 'pendente'
  error_message: string | null
  received_at: ISO string
  processed_at: ISO string | null
```

### API
| Método | Path | Descrição |
|---|---|---|
| GET | /admin/configuracoes/gateways/webhook-url | Retorna URL do endpoint |
| GET | /admin/configuracoes/gateways/webhook-log | Lista últimos 50 eventos (paginado) |
| POST | /admin/configuracoes/gateways/webhook-log/:eventId/retry | Reprocessa evento com falha |

### Frontend — GatewayWebhookLog.jsx
- Seção "Webhook" dentro da página Gateway (abaixo da matriz ou como aba)
- Campo readonly: URL do webhook + botão copiar
- Tabela de eventos:
  - Colunas: Data/Hora, Provedor, Tipo Evento, Status, Ações
  - Status: badge (verde=processado, vermelho=falha, amarelo=pendente)
  - Ação: botão "Reprocessar" para falhas
- Filtros: por provedor, por status, por período
- Paginação: 20 por página

## Critérios de Aceite
- [ ] URL do webhook visível e copiável
- [ ] Tabela lista últimos eventos com badge de status
- [ ] Filtro por provedor e status funciona
- [ ] Botão reprocessar dispara retry e atualiza status
- [ ] Paginação funcional

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CFG-07: Webhook URL + Log de eventos.

1. Crie apps/frontend/src/pages/admin/Configuracoes/GatewayWebhookLog.jsx:
   - URL do webhook readonly com botão copiar
   - Tabela de eventos: Data, Provedor, Tipo, Status (badge), Ações
   - Filtros: select provedor, select status, date range
   - Botão "Reprocessar" em eventos com status=falha
   - Paginação (20/página)

2. Em Gateway.jsx, adicione seção/aba "Webhook" que renderiza GatewayWebhookLog.

3. Backend em admin-configuracoes.js:
   - GET /admin/configuracoes/gateways/webhook-url
   - GET /admin/configuracoes/gateways/webhook-log?provider=&status=&limit=20&lastKey=
   - POST /admin/configuracoes/gateways/webhook-log/:eventId/retry

4. DynamoDB: PK TENANT#<id>, SK WEBHOOK#<ts>#<id>, GSI1 para filtro por status.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
