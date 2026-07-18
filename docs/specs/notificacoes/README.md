# Módulo Notificações — Specs

## Decisões de Design (§23)
- Fire-and-forget: 1 disparo por evento, sem insistência (insistência = Follow-up §20)
- Barramento: EventBridge como bus único, todo domínio emite
- Canais: in-app (admin), email (SES), WhatsApp (Cloud API)
- Idempotência: dedup por evento_id
- Matriz configurável: admin escolhe quais eventos notificam e por qual canal
- Destinatário: in-app = admin | externo = cliente

## Entidades DynamoDB
- REGRA_NTF (PK: TENANT#t, SK: REGRA_NTF#id)
- NOTIFICACAO (PK: TENANT#t, SK: NTF#id, GSI1: DEST#admin#lida)
- LOG_ENTREGA (PK: TENANT#t, SK: LOG_NTF#id)
- DEDUP_EVENTO (PK: EVENTO#evento_id — TTL 24h)

## Fora de Escopo
- Follow-up/Lembretes (§20 — módulo separado)
- SMS
- Push notifications mobile

## Dependências entre specs:

- **Fase 1 (P0):** NTF-01 → NTF-03 → NTF-07
- **Fase 2 (P1):** NTF-02 | NTF-04 | NTF-05 | NTF-06 (paralelas, dependem de NTF-03)
- **Fase 3 (P2):** NTF-08

## Lista de Specs

| ID | Arquivo | Prioridade | Título |
|---|---|---|---|
| NTF-01 | [NTF-01-barramento-eventos.md](./NTF-01-barramento-eventos.md) | P0 | Barramento de Eventos |
| NTF-02 | [NTF-02-crud-regras.md](./NTF-02-crud-regras.md) | P1 | CRUD Regras |
| NTF-03 | [NTF-03-listener-dispatcher.md](./NTF-03-listener-dispatcher.md) | P0 | Listener + Dispatcher |
| NTF-04 | [NTF-04-inapp-admin.md](./NTF-04-inapp-admin.md) | P1 | In-App Admin |
| NTF-05 | [NTF-05-entrega-email.md](./NTF-05-entrega-email.md) | P1 | Entrega Email |
| NTF-06 | [NTF-06-entrega-whatsapp.md](./NTF-06-entrega-whatsapp.md) | P1 | Entrega WhatsApp |
| NTF-07 | [NTF-07-idempotencia.md](./NTF-07-idempotencia.md) | P0 | Idempotência |
| NTF-08 | [NTF-08-log-auditoria.md](./NTF-08-log-auditoria.md) | P2 | Log Auditoria |
