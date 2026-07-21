# SPEC MD-02 — PATCH /clients/me

**ID:** MD-02
**TIPO:** Feature
**TÍTULO:** Endpoint self-service de edição do perfil do cliente
**PRIORIDADE:** P1
**IMPACTO:** Alto — botão "Editar Dados" no mockup
**ESFORÇO:** Médio — validação de campos + update parcial

## CONTEXTO

O cliente pode editar: nome, telefone, instagram, comoConheceu, endereco (completo). NÃO pode editar: email (vem do Cognito), cpf (imutável após cadastro), classificacao (definido pelo admin).

## ESCOPO

- `src/functions/clients/me-update/index.mjs` (NOVO)
- `infra/cloudformation.yml` (adicionar Lambda + rota)

## FORA DE ESCOPO (NÃO TOCAR)

- `src/functions/clients/update/` (endpoint admin)
- Lógica de Cognito / troca de email
- Upload de avatar (spec separada MD-03)

## SPEC TÉCNICA

**Lambda:** `ClientMeUpdateFunction`
**Rota:** `PATCH /clients/me`
**Authorizer:** Cognito JWT (escopo `client`)

**Campos editáveis (whitelist):**
- `nome` (string, 2-100 chars)
- `telefone` (string, formato brasileiro)
- `instagram` (string | null, max 30 chars)
- `comoConheceu` (string | null, max 100 chars)
- `endereco.cep` (string, 8 dígitos)
- `endereco.cidade` (string)
- `endereco.uf` (string, 2 chars)
- `endereco.logradouro` (string)
- `endereco.bairro` (string)

**Lógica:**
1. Extrair `sub` do JWT
2. Parsear body, filtrar apenas campos da whitelist
3. Validar tipos e limites
4. DynamoDB UpdateItem com `ConditionExpression: attribute_exists(PK)` (garante que perfil existe)
5. Setar `updatedAt = new Date().toISOString()`
6. Retornar 200 com item atualizado

**IAM Role:** `ClientMeUpdateRole`
- `dynamodb:UpdateItem` em `arn:aws:dynamodb:us-east-1:*:table/MbfTable`

## CRITÉRIOS DE ACEITE

- [ ] Aceita update parcial (enviar só `nome` funciona)
- [ ] Rejeita campos proibidos (email, cpf) com 400
- [ ] Retorna 400 com detalhes de validação
- [ ] Retorna 404/ConditionalCheckFailed se perfil não existe
- [ ] Atualiza `updatedAt`
- [ ] Idempotente (mesmo PATCH 2x = mesmo resultado)

## PROMPT PRONTO PARA O KIRO CLI

```
Crie src/functions/clients/me-update/index.mjs que implementa PATCH /clients/me.
Extraia sub do JWT. Parsear body JSON. Filtrar apenas campos permitidos: nome, telefone, instagram, comoConheceu, endereco (cep, cidade, uf, logradouro, bairro).
Validar tipos e limites. Rejeitar com 400 se campos proibidos (email, cpf, classificacao) forem enviados.
DynamoDB UpdateItem com PK=CLIENT#{sub}, SK=PROFILE, ConditionExpression attribute_exists(PK). Setar updatedAt.
Retornar 200 com o item atualizado. 404 se ConditionCheckFailed.
Adicione no cloudformation.yml: Lambda ClientMeUpdateFunction, role ClientMeUpdateRole (dynamodb:UpdateItem), rota PATCH /clients/me com Cognito authorizer.
Altere SOMENTE: src/functions/clients/me-update/index.mjs (novo) e infra/cloudformation.yml. Não refatore, renomeie ou mexa em mais nada.
```
