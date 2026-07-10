# SPEC-26 — Notificações Multi-canal

| Campo | Valor |
|-------|-------|
| ID | GAP-14 / SPEC-26 |
| Tipo | Feature |
| Prioridade | P2 |
| Impacto | Médio |
| Esforço | Médio |

## CONTEXTO

§23 do MVP-1 define sistema de notificações multi-canal: in-app, email (SES), WhatsApp (futuro). Eventos do sistema disparam notificações conforme regras configuráveis.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/notificacao/disparar.js` — invocado por eventos internos
- `src/functions/notificacao/listar.js` — GET /client/notificacoes
- `src/functions/notificacao/marcar-lida.js` — PUT /client/notificacoes/:id/lida
- `src/functions/notificacao/enviar-email.js` — Lambda consumer de SQS (envia via SES)
- `template.yaml` — rotas + SQS queue + role

## FORA DE ESCOPO (NÃO TOCAR)

- WhatsApp real (SPEC futura)
- Push notification mobile
- Preferências granulares do cliente
- Qualquer outro arquivo

## SPEC TÉCNICA

### Modelo DynamoDB

```
PK: TENANT#1
SK: NOTIF#<ulid>
GSI2PK: CLIENTE#<sub>
GSI2SK: NOTIF#<created_at>
```

Campos: id, cliente_id, tipo (orcamento_enviado|contrato_pronto|pagamento_confirmado|album_publicado|lembrete), titulo, mensagem, canal (in_app|email|whatsapp), lida (bool), created_at

### Fluxos

**Disparar (interno):**
- Recebe evento: { tipo, cliente_id, dados }
- Cria item NOTIF no DynamoDB (in-app)
- Se canal inclui email: envia mensagem para SQS → Lambda consumer envia via SES

**Listar (cliente):**
- Query GSI2: GSI2PK=CLIENTE#<sub>, order DESC
- Query param: `?nao_lidas=true`

**Marcar lida:**
- UpdateItem: lida=true

### IAM

Role `NotificacaoFunctionRole`:
- DynamoDB: PutItem, Query, UpdateItem
- SQS: SendMessage

Role `EmailSenderRole`:
- SES: SendEmail
- SQS: ReceiveMessage, DeleteMessage

## CRITÉRIOS DE ACEITE

1. Notificação in-app criada no DynamoDB
2. Email enviado via SES quando canal=email
3. Cliente lista apenas suas notificações
4. Marcar lida funciona
5. Notificações ordenadas por data DESC

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar sistema de Notificações conforme spec SPEC-26.
Handlers em src/functions/notificacao/, SQS para email async,
SES para envio, GSI2 para busca por cliente.

Alterar SOMENTE:
- template.yaml (rotas, SQS queue, roles)
- src/functions/notificacao/*.js (4 handlers)

NÃO refatorar, renomear ou mexer em mais nada.
```
