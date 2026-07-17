# FIN-07: DynamoDB — Modelagem Gateway + EventoWebhook

## Metadados
- **ID:** FIN-07
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** FIN-01

## Contexto
O sistema suporta múltiplos gateways de pagamento (plugável). O admin configura qual gateway usar. Cada gateway tem credenciais (SSM), e cada cobrança pode ter um vínculo com o gateway externo. Eventos de webhook são registrados para auditoria e idempotência.

## Escopo
- `apps/backend/src/models/gateway.js` — NOVO
- DynamoDB: entidades GATEWAY, EVENTO_WEBHOOK
- SSM Parameter Store: credenciais

## Fora de Escopo (NÃO TOCAR)
- Frontend
- Adapter de cobrança (FIN-09)
- Webhook handler (FIN-10)

## Spec Técnica

### Entidade GATEWAY
```json
{
  "PK": "TENANT#t123",
  "SK": "GATEWAY#gw_001",
  "id": "gw_001",
  "provedor": "mercadopago",
  "nome_exibicao": "Mercado Pago Principal",
  "ativo": true,
  "padrao": true,
  "credenciais_ssm_path": "/mbf/t123/gateways/gw_001",
  "webhook_url": "https://api.app.com/webhooks/gw_001",
  "webhook_secret_ssm": "/mbf/t123/gateways/gw_001/webhook_secret",
  "config": {
    "sandbox": false,
    "pix_expiracao_minutos": 30,
    "boleto_dias_vencimento": 3,
    "notificacao_url": "https://api.app.com/webhooks/gw_001"
  },
  "created_at": "2026-07-17T10:00:00Z",
  "updated_at": "2026-07-17T10:00:00Z"
}
```

### Provedores Suportados
| Provedor | Métodos | Prioridade Implementação |
|---|---|---|
| mercadopago | PIX, Cartão, Boleto | 1º |
| stripe | Cartão, PIX (via Stripe) | 2º |
| pagarme | PIX, Cartão, Boleto | 3º |
| manual | Nenhum (controle manual) | já existe (FIN-03) |

### Entidade EVENTO_WEBHOOK
```json
{
  "PK": "GATEWAY#gw_001",
  "SK": "WEBHOOK#2026-07-17T10:00:00Z#evt_001",
  "id": "evt_001",
  "gateway_id": "gw_001",
  "tipo_evento": "payment.approved",
  "payload_raw": "{...}",
  "cobranca_id": "cob_001",
  "processado": true,
  "resultado": "sucesso",
  "idempotency_key": "mp_evt_12345",
  "created_at": "2026-07-17T10:00:00Z",
  "TTL": 1759276800
}
```

### Credenciais (SSM Parameter Store)
```
/mbf/{tenant_id}/gateways/{gateway_id}/access_token
/mbf/{tenant_id}/gateways/{gateway_id}/webhook_secret
/mbf/{tenant_id}/gateways/{gateway_id}/public_key
```
- Tipo: SecureString
- Criptografia: AWS-managed key
- Lambda precisa: ssm:GetParameter com decrypt

### TTL para Eventos Webhook
- Eventos de webhook: TTL de 90 dias (auto-cleanup)
- Suficiente para auditoria/debug

## Critérios de Aceite
- [ ] Entidade GATEWAY no DynamoDB
- [ ] Entidade EVENTO_WEBHOOK com TTL
- [ ] Credenciais em SSM (nunca no código)
- [ ] Suporte a múltiplos provedores
- [ ] Flag padrao (1 gateway padrão por tenant)
- [ ] Flag ativo (desativar sem deletar)
- [ ] Idempotency_key para dedup de webhooks

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-07: Modelagem Gateway no DynamoDB.

1. Crie models/gateway.js com helpers CRUD.
2. Entidades: GATEWAY (PK=TENANT, SK=GATEWAY#id) e EVENTO_WEBHOOK (PK=GATEWAY#id, SK=WEBHOOK#ts#id).
3. Credenciais em SSM Parameter Store (SecureString).
4. TTL 90 dias nos eventos webhook.
5. Provedores: mercadopago, stripe, pagarme.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
