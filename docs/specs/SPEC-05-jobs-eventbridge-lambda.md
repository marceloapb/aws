# SPEC-05 — Jobs In-Process → EventBridge Scheduler + Lambda

**ID:** 05  
**TIPO:** Readequação  
**PRIORIDADE:** P1  
**IMPACTO:** Confiabilidade | **ESFORÇO:** Médio  

## CONTEXTO

5 jobs rodam via cron in-process (`albumRetentionJob`, `backupJob`, `calendarSyncJob`, `instagramPublisherJob`, `whatsappReminderJob`). Se o processo morre, os jobs param. Em Lambda, não há processo persistente.

## ESCOPO

- `apps/api/src/jobs/*.js` → converter cada um em handler Lambda independente
- `template.yaml` → adicionar 5 funções Lambda + EventBridge Schedule para cada
- Remover inicialização de cron do `app.js`

## FORA DE ESCOPO (NÃO TOCAR)

- Lógica interna dos jobs (manter como está, só wrappear em handler)
- Rotas, adapters, frontend

## SPEC TÉCNICA

- Cada job vira: `exports.handler = async (event) => { await jobFunction(); }`
- Schedules:
  - `albumRetentionJob`: `rate(1 day)` — 03:00 UTC
  - `backupJob`: `rate(1 day)` — 02:00 UTC
  - `calendarSyncJob`: `rate(15 minutes)`
  - `instagramPublisherJob`: `rate(1 hour)`
  - `whatsappReminderJob`: `rate(1 day)` — 08:00 BRT (11:00 UTC)
- Timeout: 300s para cada
- Memory: 256MB

## CRITÉRIOS DE ACEITE

- Jobs executam via EventBridge sem depender do processo principal
- Logs no CloudWatch para cada execução
- Zero referência a cron/node-cron no código

## PROMPT PRONTO PARA O KIRO CLI

```
Converta os 5 jobs in-process em Lambda handlers invocados por EventBridge Scheduler.

1. Para cada arquivo em `apps/api/src/jobs/`:
   - `albumRetentionJob.js` → exporte `exports.handler = async () => { ... lógica existente ... }`
   - `backupJob.js` → idem
   - `calendarSyncJob.js` → idem
   - `instagramPublisherJob.js` → idem
   - `whatsappReminderJob.js` → idem
   Mantenha a lógica interna intacta, apenas wrapeie em handler async.

2. No `template.yaml`, adicione 5 recursos `AWS::Serverless::Function`:
   - AlbumRetentionFunction: Handler `src/jobs/albumRetentionJob.handler`, Events: Schedule `rate(1 day)`
   - BackupFunction: Handler `src/jobs/backupJob.handler`, Events: Schedule `rate(1 day)`
   - CalendarSyncFunction: Handler `src/jobs/calendarSyncJob.handler`, Events: Schedule `rate(15 minutes)`
   - InstagramPublisherFunction: Handler `src/jobs/instagramPublisherJob.handler`, Events: Schedule `rate(1 hour)`
   - WhatsappReminderFunction: Handler `src/jobs/whatsappReminderJob.handler`, Events: Schedule `rate(1 day)`
   Todas com Runtime nodejs20.x, Timeout 300, MemorySize 256.

3. Em `apps/api/src/app.js`: remova qualquer require/import de `./jobs/*` e qualquer inicialização de cron/scheduler.

4. Remova `node-cron` ou `node-schedule` do `package.json` se existir.

Altere SOMENTE: `apps/api/src/jobs/*.js`, `apps/api/src/app.js`, `template.yaml`, `apps/api/package.json`. Não refatore, renomeie ou mexa em mais nada.
```
