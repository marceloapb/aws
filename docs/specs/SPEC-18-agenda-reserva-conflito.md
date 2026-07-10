# SPEC-18 — Agenda: Reserva Temporal + Conflitos + Google Calendar

| Campo | Valor |
|-------|-------|
| ID | GAP-04 / SPEC-18 |
| Tipo | Feature |
| Prioridade | P1 |
| Impacto | Alto |
| Esforço | Médio |

## CONTEXTO

§7 do MVP-1 define que o sistema MBF é fonte da verdade para a agenda; Google Calendar é espelho mão-única (MBF → Google). Reserva temporária é criada no envio do orçamento, confirmada no aceite, com detecção de conflito de data/horário.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/agenda/reservar.js` — invocado pelo envio do orçamento
- `src/functions/agenda/confirmar.js` — invocado pelo aceite
- `src/functions/agenda/liberar.js` — invocado por expiração/recusa
- `src/functions/agenda/bloquear.js` — POST /admin/agenda/bloquear
- `src/functions/agenda/listar.js` — GET /admin/agenda
- `src/functions/agenda/sync-google.js` — Lambda dedicada para sync
- `template.yaml` — rotas + roles + EventBridge retry rule

## FORA DE ESCOPO (NÃO TOCAR)

- Google Maps / distância de carro
- Leitura DO Google Calendar (mão-única: só escrita)
- Multi-calendar
- Frontend de agenda
- Qualquer arquivo não listado

## SPEC TÉCNICA

### Modelo DynamoDB

```
PK: TENANT#1
SK: AGENDA#<data_iso>#<ulid>
```

Campos: id, data_evento, hora_inicio, hora_fim, tipo (reserva_temporaria|confirmado|bloqueio), orcamento_id, google_event_id, sync_status (ok|pendente|falho), expira_em, local, created_at

### Fluxos

**Reservar (interno — chamado pelo envio do orçamento):**
- Cria item tipo=`reserva_temporaria`
- expira_em = now + config.prazos.reserva_temporaria_dias
- Tenta criar evento no Google Calendar; se ok, salva google_event_id
- Se Google fora: marca sync_status=`pendente`

**Confirmar (interno — chamado pelo aceite):**
- Atualiza tipo → `confirmado`
- Remove expira_em
- Update no Google Calendar (muda cor/título)

**Liberar (interno — chamado por expiração/recusa):**
- Deleta item do DynamoDB
- Deleta evento do Google Calendar

**Bloquear (admin manual):**
- Cria tipo=`bloqueio` com motivo
- Se flag `replicar_google=true`, cria evento no Google

**Listar (admin):**
- Query por range de datas (SK between AGENDA#<start> and AGENDA#<end>)
- Retorna lista com tipo, status, orçamento vinculado

### Detecção de Conflito

- No aceite: query por data_evento
- Se existe item tipo=`confirmado` no mesmo horário → retorna conflito
- Conditional write: `attribute_not_exists(SK) OR (tipo = reserva_temporaria AND orcamento_id = :meu)`

### Sync Google Calendar

- Lambda `sync-google.js` cria/atualiza/deleta evento via googleapis
- Credenciais: refresh_token em SSM `/mbf/google-calendar/refresh-token`
- Se falha: EventBridge retry a cada 15min, máx 5 tentativas
- Log de sync: `PK=TENANT#1, SK=SYNCLOG#<timestamp>#<id>`

### IAM

Role `AgendaFunctionRole`:
- DynamoDB: PutItem, GetItem, UpdateItem, DeleteItem, Query na tabela principal
- SSM: GetParameter em `/mbf/google-calendar/*`

## CRITÉRIOS DE ACEITE

1. Reserva criada automaticamente no envio do orçamento
2. Confirmada automaticamente no aceite
3. Conflito de data detectado e retornado
4. Evento criado/deletado no Google Calendar
5. Falha de sync logada e retentada (máx 5x)
6. Bloqueio manual funciona com/sem replicação Google

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar módulo Agenda conforme spec SPEC-18.
Handlers em src/functions/agenda/, modelo DynamoDB com data no SK,
sync Google Calendar via googleapis com retry, detecção de conflito,
bloqueio manual.

Alterar SOMENTE:
- template.yaml (rotas, roles, EventBridge retry rule)
- src/functions/agenda/*.js (6 handlers)

NÃO refatorar, renomear ou mexer em mais nada.
```
