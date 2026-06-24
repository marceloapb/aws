# ✅ Checklist de Validação Pós-Implementação

Use este checklist após executar cada spec no Kiro CLI.

---

## SPEC-06 — template.yaml SAM

- [ ] `cd apps/api && sam validate` → sem erros
- [ ] `sam build` → compila com sucesso
- [ ] Arquivo `template.yaml` existe em `apps/api/`
- [ ] Arquivo `samconfig.toml` existe em `apps/api/`
- [ ] Template define: ApiFunction, HorizonsTable, FotosBucket, UserPool

---

## SPEC-02 — Express → Lambda Handler

- [ ] Arquivo `apps/api/src/handler.js` existe
- [ ] `handler.js` exporta `exports.handler`
- [ ] `app.js` NÃO contém `app.listen()`
- [ ] `app.js` exporta `module.exports = app`
- [ ] `index.js` só roda listen se `IS_LOCAL=true`
- [ ] `@vendia/serverless-express` está no `package.json`
- [ ] `sam local invoke ApiFunction` → responde (se SAM instalado)

---

## SPEC-04 — Remover Dockerfile

- [ ] `apps/api/Dockerfile` NÃO existe mais
- [ ] `scripts/deploy.sh` usa `sam build && sam deploy`

---

## SPEC-03 — Remover Rate Limiter

- [ ] `apps/api/src/middlewares/rateLimiter.js` NÃO existe
- [ ] `app.js` NÃO importa rateLimiter
- [ ] `express-rate-limit` NÃO está no `package.json`
- [ ] `template.yaml` tem `ThrottlingBurstLimit` e `ThrottlingRateLimit`

---

## SPEC-07 — Segredos SSM

- [ ] `apps/api/src/config/env.js` usa `@aws-sdk/client-ssm`
- [ ] `env.js` tem cache (`cachedParams`)
- [ ] `env.js` tem fallback para `.env` quando `IS_LOCAL=true`
- [ ] `.env.example` NÃO contém API keys reais
- [ ] `@aws-sdk/client-ssm` está no `package.json`
- [ ] `template.yaml` tem `SSMParameterReadPolicy`

---

## SPEC-01 — PocketBase → DynamoDB

- [ ] `apps/api/src/config/pocketbase.js` NÃO existe
- [ ] `apps/api/src/config/dynamodb.js` existe
- [ ] Zero referências a `pb.collection` no código
- [ ] `pocketbase` NÃO está no `package.json`
- [ ] Rotas usam `GetCommand`, `PutCommand`, `QueryCommand`, etc.
- [ ] `@aws-sdk/lib-dynamodb` está no `package.json`
- [ ] `@aws-sdk/client-dynamodb` está no `package.json`

---

## SPEC-08 — Auth Cognito

- [ ] `adminAuth.js` extrai claims de `requestContext.authorizer.jwt.claims`
- [ ] `clientAuth.js` popula `req.user` com `sub` e `email`
- [ ] `authMiddleware.js` NÃO existe (deletado)
- [ ] `client-auth.js` usa `SignUpCommand`, `InitiateAuthCommand`
- [ ] `template.yaml` tem `Auth.Authorizers.CognitoAuthorizer`
- [ ] `@aws-sdk/client-cognito-identity-provider` está no `package.json`

---

## SPEC-05 — Jobs → EventBridge + Lambda

- [ ] Cada job em `src/jobs/` exporta `exports.handler`
- [ ] `template.yaml` define 5 funções Lambda com Schedule events
- [ ] `app.js` NÃO importa/inicializa jobs
- [ ] `node-cron` / `node-schedule` NÃO está no `package.json`

---

## SPEC-10 — Upload Presigned URL

- [ ] `apps/api/src/middlewares/upload.js` NÃO existe
- [ ] `s3Service.js` tem método `generateUploadUrl()`
- [ ] `admin-fotos.js` tem rota `POST /upload-url`
- [ ] `app.js` NÃO importa middleware de upload
- [ ] `@aws-sdk/s3-request-presigner` está no `package.json`
- [ ] `uuid` está no `package.json`

---

## SPEC-09 — Webhooks SQS + DLQ

- [ ] `webhooks.js` envia para SQS e retorna 200 imediatamente
- [ ] `apps/api/src/handlers/webhookConsumer.js` existe
- [ ] `apps/api/src/services/webhookProcessorService.js` existe
- [ ] `webhookProcessorService.js` verifica idempotency key
- [ ] `template.yaml` define `WebhookQueue`, `WebhookDLQ`, `WebhookConsumerFunction`
- [ ] `@aws-sdk/client-sqs` está no `package.json`

---

## SPEC-11 — CloudFront Signed URLs

- [ ] `s3Service.js` tem método `generateViewUrl()`
- [ ] `client-albuns.js` retorna `signedUrl` por foto
- [ ] `template.yaml` define `FotosCDN` e `FotosOAC`
- [ ] `@aws-sdk/cloudfront-signer` está no `package.json`
- [ ] Env vars `CLOUDFRONT_DOMAIN`, `CF_KEY_PAIR_ID` no template

---

## SPEC-12 — Frontend CI/CD

- [ ] `.github/workflows/deploy-frontend.yml` existe
- [ ] Workflow trigger: push em `main` com path `apps/web/**`
- [ ] Steps: checkout → setup-node → build → s3 sync → CF invalidation
- [ ] `template.yaml` define `WebBucket` e `WebCDN`

---

## SPEC-13 — Logs Estruturados

- [ ] `apps/api/src/config/logger.js` existe
- [ ] Logger emite JSON com `level`, `message`, `timestamp`, `requestId`
- [ ] `handler.js` chama `logger.setRequestId(context.awsRequestId)`
- [ ] `errorHandler.js` usa `logger.error()` em vez de `console.error`
- [ ] `template.yaml` tem `Tracing: Active` nos Globals

---

## 🎯 Validação Final (após todas as specs)

- [ ] `cd apps/api && npm install` → sem erros
- [ ] `sam validate` → sem erros
- [ ] `sam build` → compila com sucesso
- [ ] `sam local start-api` → API responde localmente
- [ ] Zero referências a: `pocketbase`, `Dockerfile`, `app.listen`, `node-cron`, `express-rate-limit`
- [ ] `grep -r "process.env." --include="*.js" apps/api/src/` → apenas vars não-sensíveis (IS_LOCAL, STAGE, AWS_REGION, TABLE_NAME, BUCKET_NAME)
- [ ] `sam deploy --guided` → stack criada com sucesso na AWS

---

## 🚀 Pós-Deploy (Console AWS)

- [ ] Criar parâmetros SSM em `/horizons/prod/` (todas as API keys)
- [ ] Criar usuário admin no Cognito User Pool
- [ ] Adicionar usuário ao grupo `admin`
- [ ] Criar key pair para CloudFront signing
- [ ] Configurar GitHub Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- [ ] Configurar GitHub Vars: `WEB_BUCKET_NAME`, `CF_DISTRIBUTION_ID`
- [ ] Testar endpoint: `curl https://<api-url>/health`
- [ ] Testar auth: signup → login → access protected route
- [ ] Testar upload: gerar presigned URL → PUT imagem → verificar S3
