# WPP-11: Webhook Meta (Receber Mensagens + Delivery)

## Metadados
- **ID:** WPP-11
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Alto
- **Dependência:** WPP-01

## Contexto
A Meta envia webhooks quando: cliente envia mensagem, mensagem é entregue, mensagem é lida. O sistema precisa receber, validar, processar e reagir (abrir janela, atualizar status de delivery, notificar admin).

## Escopo
- `apps/backend/src/handlers/whatsapp/webhook.js` — NOVO
- API: GET /webhooks/whatsapp (verificação) + POST /webhooks/whatsapp (eventos)
- DynamoDB: CONVERSA_WPP, atualizar LOG_WPP

## Fora de Escopo (NÃO TOCAR)
- Envio (WPP-06)
- Tela de conversas (WPP-13)
- Retry (WPP-09)

## Spec Técnica

### Rotas (PÚBLICAS — sem Cognito)
- `GET /webhooks/whatsapp` — Verificação (Meta chama ao configurar)
- `POST /webhooks/whatsapp` — Receber eventos

### Verificação (GET)
```js
function verificarWebhook(event) {
  const mode = event.queryStringParameters['hub.mode']
  const token = event.queryStringParameters['hub.verify_token']
  const challenge = event.queryStringParameters['hub.challenge']
  
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return { statusCode: 200, body: challenge }
  }
  return { statusCode: 403 }
}
```

### Tipos de Evento (POST)
| Tipo | Campo | Ação |
|---|---|---|
| messages | entry[].changes[].value.messages[] | Mensagem recebida → abrir janela |
| statuses | entry[].changes[].value.statuses[] | Delivery status → atualizar LOG |

### Processar Mensagem Recebida
```js
async function processarMensagem(message, metadata) {
  const telefone = message.from
  const tenantId = await identificarTenantPorPhoneId(metadata.phone_number_id)
  const clienteId = await buscarClientePorTelefone(tenantId, telefone)
  
  // 1. Abrir/resetar janela de 24h
  await abrirJanela(tenantId, telefone, clienteId)
  
  // 2. Salvar mensagem na conversa
  await salvarMensagemRecebida(tenantId, clienteId, {
    de: telefone,
    tipo: message.type,
    conteudo: message.text?.body || message.type,
    timestamp: message.timestamp,
    meta_message_id: message.id
  })
  
  // 3. Notificar admin (WPP-14)
  await notificarAdmin(tenantId, clienteId, message)
}
```

### Processar Status de Delivery
```js
async function processarStatus(status) {
  const mapeamento = {
    sent: 'enviado',
    delivered: 'entregue',
    read: 'lido',
    failed: 'falho'
  }
  
  await atualizarLogPorMetaId(status.id, {
    status: mapeamento[status.status],
    updated_at: new Date().toISOString()
  })
}
```

### Segurança
- Validar X-Hub-Signature-256 (HMAC SHA256 do body com app secret)
- Se inválido: 401
- Retornar 200 SEMPRE (mesmo em erro interno) — evitar retry excessivo da Meta

### SAM
```yaml
WhatsAppWebhookFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: src/handlers/whatsapp/webhook.handler
    Events:
      VerifyAPI:
        Type: HttpApi
        Properties:
          Path: /webhooks/whatsapp
          Method: GET
      EventsAPI:
        Type: HttpApi
        Properties:
          Path: /webhooks/whatsapp
          Method: POST
```

## Critérios de Aceite
- [ ] Verificação GET funciona (retorna challenge)
- [ ] POST recebe mensagens
- [ ] POST recebe status de delivery
- [ ] Validação X-Hub-Signature-256
- [ ] Janela 24h aberta ao receber mensagem
- [ ] LOG_WPP atualizado com delivery status
- [ ] Mensagem salva na conversa
- [ ] Admin notificado
- [ ] Retorna 200 sempre (não quebrar webhook)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec WPP-11: Webhook WhatsApp.

1. Crie handlers/whatsapp/webhook.js: GET (verificação) + POST (eventos).
2. Processar messages (abrir janela, salvar) e statuses (atualizar log).
3. Validar X-Hub-Signature-256.
4. Retornar 200 sempre.
5. SAM: rotas públicas GET+POST /webhooks/whatsapp.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
