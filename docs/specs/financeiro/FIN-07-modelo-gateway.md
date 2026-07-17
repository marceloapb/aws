# FIN-07: DynamoDB — Modelagem Gateway + EventoWebhook

## Metadados
- **ID:** FIN-07
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** FIN-01

## Contexto
O sistema suporta múltiplos gateways de pagamento (Mercado Pago, Stripe, PagSeguro, Asaas, etc.) via padrão adapter. Cada tenant configura seu(s) gateway(s) com credenciais. Events de webhook são registrados para auditoria e idempotência.

## Escopo
- `apps/backend/src/models/gateway.js` — NOVO
- DynamoDB: entidades GATEWAY_CONFIG, EVENTO_WEBHOOK
- SAM template: GSIs

## Fora de Escopo (NÃO TOCAR)
- CRUD de gateways (FIN-08)
- Adapter (FIN-09)
- Webhook handler (FIN-10)

## Spec Técnica

### Entidade GATEWAY_CONFIG
```json
{
  "PK": "TENANT#t123",
  "SK": "GATEWAY#gw_001",
  "id": "gw_001",
  "provedor": "mercado_pago",
  "nome_exibicao": "Mercado Pago Produção",
  "ativo": true,
  "padrao": true,
  "ambiente": "producao",
  "credenciais_ssm_path": "/mbf/t123/gateways/gw_001",
  "metodos_habilitados": ["pix", "cartao_credito", "boleto"],
  "webhook_secret_ssm_path": "/mbf/t123/gateways/gw_001/webhook_secret",
  "configuracao": {
    "taxa_pix": 0.99,
    "taxa_cartao": 4.99,
    "dias_recebimento_pix": 0,
    "dias_recebimento_cartao": 30,
    "parcelas_max": 12
  },
  "created_at": "2026-07-17T10:00:00Z",
  "updated_at": "2026-07-17T10:00:00Z"
}
```

### Provedores Suportados
| Provedor | Slug | Métodos |
|---|---|---|
| Mercado Pago | mercado_pago | pix, cartao_credito, boleto |
| Stripe | stripe | cartao_credito, cartao_debito |
| PagSeguro | pagseguro | pix, cartao_credito, boleto |
| Asaas | asaas | pix, cartao_credito, boleto |
| Manual | manual | pix, transferencia, dinheiro |

### Entidade EVENTO_WEBHOOK
```json
{
  "PK": "GATEWAY#gw_001",
  "SK": "WEBHOOK#2026-07-17T10:05:00Z#evt_001",
  "id": "evt_001",
  "gateway_id": "gw_001",
  "tipo_evento": "payment.confirmed",
  "payload_raw": "{...}",
  "cobranca_id": "cob_001",
  "processado": true,
  "resultado": "sucesso",
  "idempotency_key": "pay_abc123",
  "received_at": "2026-07-17T10:05:00Z",
  "processed_at": "2026-07-17T10:05:01Z",
  "TTL": 1758240000
}
```

### Regras
- Credenciais NUNCA no DynamoDB — sempre SSM Parameter Store (SecureString)
- Webhook secret também em SSM
- TTL de 90 dias nos eventos de webhook (auditoria temporária)
- Um tenant pode ter vários gateways (ex: PIX no Mercado Pago, cartão no Stripe)
- Flag `padrao`: gateway usado quando não especificado

### GSIs
| GSI | PK | SK | Uso |
|---|---|---|---|
| — | GATEWAY#id | WEBHOOK#timestamp#id | Eventos de um gateway |

## Critérios de Aceite
- [ ] Entidade GATEWAY_CONFIG no DynamoDB
- [ ] Entidade EVENTO_WEBHOOK com TTL
- [ ] Credenciais em SSM (nunca no banco)
- [ ] Suporte a múltiplos provedores
- [ ] Flag padrao funciona
- [ ] Model helper criado

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-07: Modelagem Gateway no DynamoDB.

1. Crie apps/backend/src/models/gateway.js com helpers CRUD.
2. Entidade GATEWAY_CONFIG: PK=TENANT#id, SK=GATEWAY#id.
3. Entidade EVENTO_WEBHOOK: PK=GATEWAY#id, SK=WEBHOOK#timestamp#id, TTL 90 dias.
4. Credenciais em SSM Parameter Store (SecureString).
5. Provedores: mercado_pago, stripe, pagseguro, asaas, manual.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
