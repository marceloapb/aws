# SPEC-08 — Autenticação PocketBase → Cognito

**ID:** 08  
**TIPO:** Melhoria  
**PRIORIDADE:** P1  
**IMPACTO:** Segurança/Serverless | **ESFORÇO:** Médio  

## CONTEXTO

`middlewares/adminAuth.js`, `clientAuth.js` e `authMiddleware.js` validam tokens do PocketBase. Com Cognito, o API Gateway valida JWT automaticamente — middleware vira desnecessário para rotas protegidas.

## ESCOPO

- `apps/api/src/middlewares/adminAuth.js` → refatorar para validar JWT Cognito
- `apps/api/src/middlewares/clientAuth.js` → idem
- `apps/api/src/routes/client-auth.js` → usar Cognito SDK para login/signup
- `template.yaml` → adicionar Cognito Authorizer no HTTP API

## FORA DE ESCOPO (NÃO TOCAR)

- Rotas de admin (mantêm lógica, só muda validação)
- Frontend auth flow (será spec separada)
- Outras rotas

## SPEC TÉCNICA

- HTTP API com JWT Authorizer apontando para Cognito User Pool
- Middleware simplificado: extrai `event.requestContext.authorizer.jwt.claims`
- Admin: grupo Cognito `admin`; Client: grupo `client`
- `client-auth.js`: endpoints `/signup`, `/login`, `/forgot-password` usando `@aws-sdk/client-cognito-identity-provider`

## CRITÉRIOS DE ACEITE

- Login/signup funcionando via Cognito
- Rotas protegidas rejeitam requests sem JWT válido (401)
- Admin e client diferenciados por grupo Cognito

## PROMPT PRONTO PARA O KIRO CLI

```
Migre autenticação de PocketBase para Amazon Cognito.

1. Refatore `apps/api/src/middlewares/adminAuth.js`:
   - Extraia claims do JWT via `req.apiGateway.event.requestContext.authorizer.jwt.claims`
   - Verifique se `cognito:groups` contém `admin`
   - Retorne 403 se não for admin

2. Refatore `apps/api/src/middlewares/clientAuth.js`:
   - Extraia claims do JWT
   - Popule `req.user = { id: claims.sub, email: claims.email }`

3. Refatore `apps/api/src/routes/client-auth.js`:
   - POST `/signup`: use `SignUpCommand` do Cognito
   - POST `/login`: use `InitiateAuthCommand` com `USER_PASSWORD_AUTH`
   - POST `/forgot-password`: use `ForgotPasswordCommand`
   - POST `/confirm-forgot-password`: use `ConfirmForgotPasswordCommand`

4. No `template.yaml`, adicione ao HttpApi:
   ```yaml
   Auth:
     DefaultAuthorizer: CognitoAuthorizer
     Authorizers:
       CognitoAuthorizer:
         AuthorizationScopes:
           - email
         IdentitySource: $request.header.Authorization
         JwtConfiguration:
           issuer: !Sub "https://cognito-idp.${AWS::Region}.amazonaws.com/${UserPool}"
           audience:
             - !Ref UserPoolClient
   ```

5. Adicione `@aws-sdk/client-cognito-identity-provider` ao `package.json`.

6. Delete `apps/api/src/middlewares/authMiddleware.js` (redundante com os dois acima).

Altere SOMENTE: `apps/api/src/middlewares/adminAuth.js`, `apps/api/src/middlewares/clientAuth.js`, `apps/api/src/middlewares/authMiddleware.js` (deletar), `apps/api/src/routes/client-auth.js`, `template.yaml`, `apps/api/package.json`. Não refatore, renomeie ou mexa em mais nada.
```
