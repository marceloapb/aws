# SPEC MD-01 — GET /clients/me

**ID:** MD-01
**TIPO:** Feature
**TÍTULO:** Endpoint self-service de leitura do perfil do cliente
**PRIORIDADE:** P1
**IMPACTO:** Alto — habilita a tela "Meus Dados" no frontend
**ESFORÇO:** Baixo — reutiliza lógica existente em `clients/get`

## CONTEXTO

O cliente autenticado via Cognito precisa visualizar seus dados (nome, email, telefone, CPF, Instagram, endereço, avatarUrl, classificação). O `sub` do JWT identifica o cliente — nenhum parâmetro de path é aceito.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/clients/me-get/index.mjs` (NOVO)
- `infra/cloudformation.yml` (adicionar Lambda + rota)

## FORA DE ESCOPO (NÃO TOCAR)

- `src/functions/clients/get/` (endpoint admin, não alterar)
- `src/functions/clients/update/` (endpoint admin)
- Qualquer outro handler existente

## SPEC TÉCNICA

**Lambda:** `ClientMeGetFunction`
**Runtime:** Node.js 20.x
**Handler:** `src/functions/clients/me-get/index.handler`

**API Gateway (HTTP API):**
- Método: `GET`
- Rota: `/clients/me`
- Authorizer: Cognito JWT (escopo `client`)

**Lógica:**
1. Extrair `sub` de `event.requestContext.authorizer.jwt.claims.sub`
2. DynamoDB GetItem: `PK = CLIENT#<sub>`, `SK = PROFILE`
3. Se item existe → retornar 200 com body (projetar apenas campos permitidos)
4. Se não existe → retornar 404 `{ error: "PROFILE_NOT_FOUND" }`

**DynamoDB — Estrutura do item:**

```json
{
  "PK": "CLIENT#<cognitoSub>",
  "SK": "PROFILE",
  "nome": "teste",
  "email": "contato@bloise.com.br",
  "telefone": "(11) 99471-5161",
  "cpf": "713.395.860-02",
  "classificacao": "PESSOA_FISICA",
  "instagram": null,
  "comoConheceu": null,
  "avatarKey": "avatars/<sub>/1721000000.webp",
  "endereco": {
    "cep": "02021-010",
    "cidade": "São Paulo",
    "uf": "SP",
    "logradouro": "RUA JOSE MARGARIDO, 158",
    "bairro": "SANTANA"
  },
  "createdAt": "2026-07-01T10:00:00Z",
  "updatedAt": "2026-07-20T14:00:00Z"
}
```

**Response 200:**

```json
{
  "nome": "teste",
  "email": "contato@bloise.com.br",
  "telefone": "(11) 99471-5161",
  "cpf": "***.***.860-02",
  "classificacao": "PESSOA_FISICA",
  "instagram": null,
  "comoConheceu": null,
  "avatarUrl": "https://cdn.mbfsystems.com/avatars/<sub>/thumb.webp",
  "endereco": { "cep": "...", "cidade": "...", "uf": "...", "logradouro": "...", "bairro": "..." }
}
```

**IAM Role:** `ClientMeGetRole`
- `dynamodb:GetItem` em `arn:aws:dynamodb:us-east-1:*:table/MbfTable` (condição `ForAllValues:StringLike` no leading key `CLIENT#`)

## CRITÉRIOS DE ACEITE

- [ ] Retorna 200 com dados corretos para token válido
- [ ] Retorna 401 sem token / token expirado
- [ ] Retorna 404 se perfil não existe
- [ ] Não aceita query param `clientId` (ignora)
- [ ] Campo `cpf` retorna mascarado para o frontend (ex: `***.***.860-02`)

## PROMPT PRONTO PARA O KIRO CLI

```
Crie o handler em src/functions/clients/me-get/index.mjs que implementa GET /clients/me.
Extraia o sub do JWT em event.requestContext.authorizer.jwt.claims.sub.
Faça GetItem no DynamoDB com PK=CLIENT#{sub}, SK=PROFILE.
Retorne 200 com os campos: nome, email, telefone, cpf (mascarado), classificacao, instagram, comoConheceu, avatarUrl (construído a partir de avatarKey + CDN_DOMAIN env var), endereco.
Retorne 404 se item não existir.
Adicione no cloudformation.yml: Lambda ClientMeGetFunction, role ClientMeGetRole (dynamodb:GetItem apenas), rota GET /clients/me com Cognito authorizer.
Altere SOMENTE: src/functions/clients/me-get/index.mjs (novo) e infra/cloudformation.yml. Não refatore, renomeie ou mexa em mais nada.
```
