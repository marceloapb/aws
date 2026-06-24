# SPEC-07 — Segredos .env → SSM Parameter Store

**ID:** 07  
**TIPO:** Correção  
**PRIORIDADE:** P1  
**IMPACTO:** Segurança | **ESFORÇO:** Baixo  

## CONTEXTO

`.env.example` lista ~20 chaves sensíveis (API keys de gateways de pagamento, Google OAuth, Instagram, WhatsApp). Em Lambda, segredos devem vir de SSM Parameter Store (SecureString) — mais barato que Secrets Manager para este caso.

## ESCOPO

- `apps/api/src/config/env.js` → refatorar para buscar de SSM no cold start
- `.env.example` → manter apenas variáveis não-sensíveis (NODE_ENV, AWS_REGION, TABLE_NAME)
- Documentar parâmetros SSM necessários

## FORA DE ESCOPO (NÃO TOCAR)

- Lógica de negócio, rotas, adapters
- Frontend

## SPEC TÉCNICA

- Usar `@aws-sdk/client-ssm` com `GetParametersByPathCommand`
- Path: `/horizons/prod/` para produção, `/horizons/dev/` para dev
- Cache em variável global (reutiliza entre invocações da mesma instância Lambda)
- Parâmetros: `ASAAS_API_KEY`, `STRIPE_SECRET_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `GOOGLE_CLIENT_SECRET`, `INSTAGRAM_ACCESS_TOKEN`, `WHATSAPP_TOKEN`, `INTER_CLIENT_SECRET`, etc.

## CRITÉRIOS DE ACEITE

- Zero segredos hardcoded ou em .env em produção
- Lambda busca segredos do SSM no cold start
- Fallback para .env em dev local (`IS_LOCAL=true`)

## PROMPT PRONTO PARA O KIRO CLI

```
Migre segredos de .env para SSM Parameter Store.

1. Substitua `apps/api/src/config/env.js` por:
   ```js
   const { SSMClient, GetParametersByPathCommand } = require('@aws-sdk/client-ssm');

   let cachedParams = null;

   async function loadParams() {
     if (cachedParams) return cachedParams;
     if (process.env.IS_LOCAL === 'true') {
       require('dotenv').config();
       cachedParams = process.env;
       return cachedParams;
     }
     const ssm = new SSMClient({});
     const path = `/horizons/${process.env.STAGE || 'prod'}/`;
     const result = await ssm.send(new GetParametersByPathCommand({
       Path: path, WithDecryption: true, Recursive: true
     }));
     cachedParams = {};
     for (const p of result.Parameters) {
       const key = p.Name.split('/').pop();
       cachedParams[key] = p.Value;
     }
     return cachedParams;
   }

   module.exports = { loadParams };
   ```

2. Em cada service/adapter que usa `process.env.CHAVE_SENSIVEL`, substitua por:
   ```js
   const { loadParams } = require('../config/env');
   // No início da função:
   const params = await loadParams();
   const apiKey = params.ASAAS_API_KEY;
   ```

3. Atualize `.env.example` removendo segredos, mantendo apenas:
   ```
   IS_LOCAL=true
   STAGE=dev
   AWS_REGION=sa-east-1
   DYNAMODB_TABLE_NAME=horizons-dev-table
   S3_BUCKET_NAME=horizons-dev-fotos
   ```

4. Adicione `@aws-sdk/client-ssm` ao `package.json`.

5. No `template.yaml`, adicione policy à Lambda:
   ```yaml
   - SSMParameterReadPolicy:
       ParameterName: horizons/*
   ```

Altere SOMENTE: `apps/api/src/config/env.js`, `apps/api/.env.example`, `apps/api/package.json`, `template.yaml`. Não refatore, renomeie ou mexa em mais nada.
```
