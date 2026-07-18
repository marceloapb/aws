# ARC-01 — Autenticação Cliente (Cognito)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | ARC-01 |
| **Tipo** | Feature |
| **Prioridade** | P0 |
| **Impacto** | Alto — bloqueia todo acesso à área do cliente |
| **Esforço** | Médio |

## Contexto
O cliente acessa a área logada via Cognito User Pool. Cadastro com e-mail + senha (confirmação por código SES). Login retorna JWT usado em todas as rotas protegidas. Grupo `cliente` separado do grupo `admin`. Post-confirmation trigger cria registro DynamoDB.

## Escopo
- **Cognito:** User Pool com grupo `cliente`, e-mail como username, MFA opcional
- **Lambda trigger:** `postConfirmationCliente` — cria registro CLIENTE#<sub> no DynamoDB
- **Lambda:** `signupCliente` — custom signup com dados extras (nome, telefone)
- **Lambda:** `loginCliente` — wrapper opcional (ou direto Cognito hosted UI)
- **API Gateway:** authorizer JWT Cognito no grupo de rotas `/cliente/*`
- **SES:** template de confirmação de conta (branded)
- **DynamoDB:** entidade Cliente (PK: `CLIENTE#<sub>`, SK: `PROFILE`)

## Fora de Escopo (NÃO TOCAR)
- Autenticação admin (já existe, Cognito grupo `admin`)
- Recuperação de senha (built-in do Cognito, configurar apenas)
- OAuth social (Google/Facebook) — futuro, P3
- Área do admin

## Spec Técnica

### Cognito User Pool (SAM)
```yaml
ClienteUserPool:
  Type: AWS::Cognito::UserPool
  Properties:
    UserPoolName: mbf-clientes
    UsernameAttributes: [email]
    AutoVerifiedAttributes: [email]
    Schema:
      - Name: nome
        AttributeDataType: String
        Mutable: true
      - Name: telefone
        AttributeDataType: String
        Mutable: true
    LambdaConfig:
      PostConfirmation: !GetAtt PostConfirmationClienteFn.Arn
```

### Lambda postConfirmationCliente
- Trigger: PostConfirmation
- Cria item DynamoDB:
```json
{
  "PK": "CLIENTE#<cognito_sub>",
  "SK": "PROFILE",
  "nome": "<nome do atributo custom>",
  "email": "<email>",
  "telefone": "<telefone>",
  "created_at": "<ISO>",
  "status": "ativo"
}
```
- Adiciona user ao grupo `cliente`

### JWT Authorizer (HTTP API)
```yaml
ClienteAuthorizer:
  Type: AWS::ApiGatewayV2::Authorizer
  Properties:
    ApiId: !Ref HttpApi
    AuthorizerType: JWT
    IdentitySource: "$request.header.Authorization"
    JwtConfiguration:
      Audience: [!Ref ClienteUserPoolClient]
      Issuer: !Sub "https://cognito-idp.us-east-1.amazonaws.com/${ClienteUserPool}"
```

## Critérios de Aceite
- Cliente faz signup com e-mail + senha + nome + telefone
- Recebe e-mail de confirmação (SES branded)
- Após confirmar, registro existe no DynamoDB
- Login retorna access_token + id_token
- Token inválido/expirado → 401 nas rotas /cliente/*
- Admin não acessa rotas /cliente/* e vice-versa

## Prompt Pronto para o Kiro CLI
```
Implemente a spec ARC-01 (Autenticação Cliente via Cognito).

Crie:
1. template.yaml — recurso ClienteUserPool + ClienteUserPoolClient + ClienteUserPoolGroup
2. template.yaml — JWT Authorizer para rotas /cliente/*
3. src/functions/cliente/postConfirmationCliente/index.mjs — trigger cria DynamoDB + adiciona grupo
4. src/functions/cliente/signupCliente/index.mjs — signup com atributos custom (nome, telefone)

Cognito: email como username, auto-verify email, grupo "cliente".
Trigger: PostConfirmation → DynamoDB PK CLIENTE#<sub> SK PROFILE.
Authorizer: JWT, audience = client_id, issuer = pool URL.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
