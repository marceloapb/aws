# Módulo Google Calendar — Specs

## Decisões de Design (§3, §7)
- Mão única: sistema → Google Calendar (nunca lê de volta)
- Falha NÃO bloqueia agenda interna
- OAuth2 na conta do admin
- Token em SSM Parameter Store (criptografado)
- Título evento: "Nome do Evento (via Sistema)"
- Título reserva: "[Reserva] Nome do Evento"
- google_event_id gravado na entidade AGENDA_EVENTO
- Retry 3x com backoff (SQS)

## Fora de Escopo (confirmado)
- Sincronização bidirecional
- Multi-calendário por tipo de evento
- Google Meet automático

## Dependências entre specs:

- **Fase 1 (P0):** GCL-01 → GCL-02
- **Fase 2 (P1):** GCL-03 | GCL-06 (paralelas)
- **Fase 3 (P1):** GCL-04 → GCL-05
- **Fase 4 (P2):** GCL-07

## Lista de Specs

| ID | Arquivo | Prioridade | Título |
|---|---|---|---|
| GCL-01 | [GCL-01-oauth2.md](./GCL-01-oauth2.md) | P0 | Conexão OAuth2 |
| GCL-02 | [GCL-02-espelhar-evento.md](./GCL-02-espelhar-evento.md) | P0 | Espelhar Evento |
| GCL-03 | [GCL-03-retry-sqs.md](./GCL-03-retry-sqs.md) | P1 | Fila de Retry |
| GCL-04 | [GCL-04-log-sync.md](./GCL-04-log-sync.md) | P1 | Log de Sincronização |
| GCL-05 | [GCL-05-reserva-temporaria.md](./GCL-05-reserva-temporaria.md) | P1 | Espelhar Reserva |
| GCL-06 | [GCL-06-token-expirado.md](./GCL-06-token-expirado.md) | P1 | Detectar Token Expirado |
| GCL-07 | [GCL-07-reconexao.md](./GCL-07-reconexao.md) | P2 | Reconexão |
