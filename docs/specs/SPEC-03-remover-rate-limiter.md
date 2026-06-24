# SPEC-03 — Rate Limiter em Memória → API Gateway Throttling

**ID:** 03  
**TIPO:** Correção  
**PRIORIDADE:** P0  
**IMPACTO:** Segurança | **ESFORÇO:** Baixo  

## CONTEXTO

`middlewares/rateLimiter.js` usa contadores em memória. Em Lambda, cada invocação pode ser uma instância diferente — o rate limit nunca funciona corretamente.

## ESCOPO

- `apps/api/src/middlewares/rateLimiter.js` → remover
- `apps/api/src/app.js` → remover import/use do rateLimiter
- `template.yaml` → configurar ThrottlingBurstLimit e ThrottlingRateLimit no Stage do HTTP API

## FORA DE ESCOPO (NÃO TOCAR)

- Rotas, services, adapters, frontend
- Outros middlewares

## SPEC TÉCNICA

- HTTP API Gateway: `DefaultRouteSettings.ThrottlingBurstLimit: 50`, `ThrottlingRateLimit: 100`
- Para rotas sensíveis (webhooks, auth): throttle específico por rota se necessário
- Remover dependência `express-rate-limit` do `package.json` se existir

## CRITÉRIOS DE ACEITE

- Zero referências a rateLimiter no código
- API Gateway com throttling configurado no SAM template
- Teste: burst de requests retorna 429 do API Gateway

## PROMPT PRONTO PARA O KIRO CLI

```
Remova o rate limiter in-memory e configure throttling no API Gateway.

1. Delete `apps/api/src/middlewares/rateLimiter.js`.
2. Em `apps/api/src/app.js`: remova qualquer import ou `app.use()` referente a rateLimiter ou express-rate-limit.
3. Em `apps/api/package.json`: remova `express-rate-limit` das dependencies se existir.
4. No `template.yaml` (SAM), na definição do HttpApi, adicione:
   ```yaml
   StageName: prod
   DefaultRouteSettings:
     ThrottlingBurstLimit: 50
     ThrottlingRateLimit: 100
   ```

Altere SOMENTE: `apps/api/src/middlewares/rateLimiter.js` (deletar), `apps/api/src/app.js`, `apps/api/package.json`, `template.yaml`. Não refatore, renomeie ou mexa em mais nada.
```
