# SPEC-13 — Logs Estruturados JSON + X-Ray

**ID:** 13  
**TIPO:** Feature  
**PRIORIDADE:** P3  
**IMPACTO:** Observabilidade | **ESFORÇO:** Baixo  

## CONTEXTO

Sem logs estruturados, debug em produção é difícil. CloudWatch Logs Insights funciona melhor com JSON. X-Ray já está habilitado no Globals do SAM (Tracing: Active).

## ESCOPO

- Criar `apps/api/src/config/logger.js` — logger JSON simples (sem lib externa)
- Substituir `console.log` por logger estruturado nos services e handlers
- Garantir `Tracing: Active` no template

## FORA DE ESCOPO (NÃO TOCAR)

- Ferramentas pagas (Datadog, New Relic)
- Frontend
- Lógica de negócio

## SPEC TÉCNICA

- Logger: função que emite JSON com `{ level, message, timestamp, requestId, ...context }`
- Níveis: info, warn, error
- RequestId: extraído do `context.awsRequestId` no handler
- Sem dependência externa — apenas `JSON.stringify`

## CRITÉRIOS DE ACEITE

- Todos os logs em formato JSON
- CloudWatch Logs Insights consegue filtrar por level, requestId, etc.
- X-Ray mostra traces das invocações

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente logging estruturado em JSON para todas as Lambdas.

1. Crie `apps/api/src/config/logger.js`:
   ```js
   let requestId = 'local';

   function setRequestId(id) { requestId = id; }

   function log(level, message, context = {}) {
     const entry = {
       level,
       message,
       timestamp: new Date().toISOString(),
       requestId,
       ...context,
     };
     const output = JSON.stringify(entry);
     if (level === 'error') console.error(output);
     else if (level === 'warn') console.warn(output);
     else console.log(output);
   }

   module.exports = {
     setRequestId,
     info: (msg, ctx) => log('info', msg, ctx),
     warn: (msg, ctx) => log('warn', msg, ctx),
     error: (msg, ctx) => log('error', msg, ctx),
   };
   ```

2. Em `apps/api/src/handler.js`, antes de chamar serverlessExpress:
   ```js
   const logger = require('./config/logger');
   exports.handler = (event, context) => {
     logger.setRequestId(context.awsRequestId);
     return serverlessExpress({ app })(event, context);
   };
   ```

3. Em `apps/api/src/middlewares/errorHandler.js`:
   - Substitua `console.error` por `logger.error(err.message, { stack: err.stack, path: req.path })`

4. No `template.yaml`, confirme que Globals tem:
   ```yaml
   Globals:
     Function:
       Tracing: Active
   ```

Altere SOMENTE: `apps/api/src/config/logger.js` (criar), `apps/api/src/handler.js`, `apps/api/src/middlewares/errorHandler.js`, `template.yaml`. Não refatore, renomeie ou mexa em mais nada.
```
