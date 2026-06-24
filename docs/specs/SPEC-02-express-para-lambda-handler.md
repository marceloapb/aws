# SPEC-02 — Quebrar Monolito Express em Lambda Handler

**ID:** 02  
**TIPO:** Readequação  
**PRIORIDADE:** P0  
**IMPACTO:** Crítico | **ESFORÇO:** Alto  

## CONTEXTO

`app.js` monta Express com 19 rotas + middlewares + jobs. `index.js` faz `app.listen(PORT)`. Isso é servidor always-on. Para serverless, o Express precisa ser wrapeado em handler Lambda.

## ESCOPO

- `apps/api/src/index.js` → substituir por entry point local-only
- `apps/api/src/app.js` → manter como configuração Express, exportar `app` sem `.listen()`
- Criar `apps/api/src/handler.js` (entry point Lambda)
- Remover inicialização de jobs do `app.js`

## FORA DE ESCOPO (NÃO TOCAR)

- Frontend, adapters, services (mantêm interface)
- Jobs (tratados na SPEC-05)
- Rotas (mantêm lógica)

## SPEC TÉCNICA

- Usar `@vendia/serverless-express` para wrapping do Express existente (migração incremental)
- Handler principal: `exports.handler = serverlessExpress({ app })`
- Remover `app.listen()` do `index.js`
- Manter `index.js` apenas para dev local com flag `if (process.env.IS_LOCAL)`

## CRITÉRIOS DE ACEITE

- `sam local invoke` executa o handler com sucesso
- Nenhum `app.listen()` em produção
- Dev local ainda funciona com `node src/index.js`

## PROMPT PRONTO PARA O KIRO CLI

```
Converta o servidor Express monolítico para Lambda handler usando @vendia/serverless-express.

1. Em `apps/api/src/app.js`: remova a chamada `app.listen()` se existir. Remova imports e inicialização de jobs (cron). Exporte apenas `module.exports = app`.
2. Crie `apps/api/src/handler.js`:
   ```js
   const serverlessExpress = require('@vendia/serverless-express');
   const app = require('./app');
   exports.handler = serverlessExpress({ app });
   ```
3. Em `apps/api/src/index.js`: mantenha apenas para dev local:
   ```js
   if (process.env.IS_LOCAL) {
     const app = require('./app');
     const port = process.env.PORT || 3000;
     app.listen(port, () => console.log(`Local server on ${port}`));
   }
   ```
4. Adicione `@vendia/serverless-express` ao `package.json` dependencies.
5. Remova qualquer import/require de jobs (`./jobs/*`) do `app.js`.

Altere SOMENTE: `apps/api/src/app.js`, `apps/api/src/index.js`, `apps/api/src/handler.js` (criar), `apps/api/package.json`. Não refatore, renomeie ou mexa em mais nada.
```
