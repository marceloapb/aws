# SPEC-29 — WhatsApp Cloud API

| Campo | Valor |
|-------|-------|
| ID | GAP-15 / SPEC-29 |
| Tipo | Feature |
| Prioridade | P2 |
| Impacto | Alto |
| Esforço | Alto |

## CONTEXTO

§24 do MVP-1 define integração com WhatsApp Cloud API (Meta) para envio de mensagens via templates aprovados e recebimento de respostas.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/lib/whatsapp/client.js` — wrapper da API Meta
- `src/functions/whatsapp/enviar-template.js` — invocado internamente
- `src/functions/whatsapp/webhook-verify.js` — GET /public/whatsapp/webhook (challenge)
- `src/functions/whatsapp/webhook-receive.js` — POST /public/whatsapp/webhook
- `template.yaml` — rotas públicas + role

## FORA DE ESCOPO (NÃO TOCAR)

- Chatbot/respostas automáticas
- Mensagens fora de template (janela 24h para futuro)
- Interface de chat no admin
- Qualquer outro arquivo

## SPEC TÉCNICA

### Credenciais (SSM)

- `/mbf/whatsapp/phone-number-id`
- `/mbf/whatsapp/access-token`
- `/mbf/whatsapp/verify-token` (para webhook challenge)

### Client (src/lib/whatsapp/client.js)

```javascript
const enviarTemplate = async ({ telefone, template_name, parameters }) => {
  // POST https://graph.facebook.com/v20.0/{phone_number_id}/messages
  // Content-Type: application/json
  // Authorization: Bearer {access_token}
};
```

### Webhook Verify (GET)

- Valida `hub.verify_token` contra SSM
- Retorna `hub.challenge` se válido

### Webhook Receive (POST)

- Recebe eventos de entrega/leitura/resposta
- Salva em DynamoDB: `PK=TENANT#1, SK=WAMSG#<timestamp>#<msg_id>`
- Se resposta do cliente: pode disparar ação (futuro)

### Enviar template (interno)

- Chamado pelo follow-up (SPEC-25) ou notificações (SPEC-26)
- Input: { telefone, template_name, parameters[] }
- Registra envio em DynamoDB para auditoria

### IAM

Role `WhatsAppFunctionRole`:
- SSM: GetParameter `/mbf/whatsapp/*`
- DynamoDB: PutItem, Query

## CRITÉRIOS DE ACEITE

1. Webhook challenge funciona (Meta valida)
2. Envio de template funciona (resposta 200 da Meta API)
3. Recebimento de evento salvo no DynamoDB
4. Credenciais em SSM, nunca hardcoded
5. Rotas webhook são públicas (sem auth)

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar integração WhatsApp Cloud API conforme spec SPEC-29.
Client em src/lib/whatsapp/client.js, handlers em src/functions/whatsapp/,
webhook público para Meta, envio via template.

Alterar SOMENTE:
- template.yaml (rotas públicas, role)
- src/lib/whatsapp/client.js
- src/functions/whatsapp/*.js (3 handlers)

NÃO refatorar, renomear ou mexer em mais nada.
```
