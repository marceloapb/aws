# SPEC-14 — Identidade: Perfis ADM vs Cliente no Cognito

| Campo | Valor |
|-------|-------|
| ID | GAP-23 / SPEC-14 |
| Tipo | Feature |
| Prioridade | P1 |
| Impacto | Alto |
| Esforço | Baixo |

## CONTEXTO

O §4 do MVP-1 (sistema-mbf) define dois perfis: ADM (fotógrafo, único) e Cliente (com conta/senha). A SPEC-08 do repo aws cria o User Pool mas não separa os perfis. Sem isso, não há como proteger rotas ADM nem diferenciar permissões.

## ESCOPO (ARQUIVOS E RECURSOS)

- `template.yaml` — recurso CognitoUserPool (custom attributes + groups)
- `src/functions/auth/pre-signup.js` — trigger pre-sign-up
- `src/functions/auth/post-confirmation.js` — trigger post-confirmation
- `src/functions/auth/authorizer.js` — middleware de verificação de grupo

## FORA DE ESCOPO (NÃO TOCAR)

- Fluxo de login/signup do frontend
- Recovery de senha
- MFA
- Multi-tenant (futuro)
- Qualquer outro arquivo não listado acima

## SPEC TÉCNICA

### Cognito Groups
- `admin` — fotógrafo/dono
- `cliente` — clientes finais

### Custom Attribute
- `custom:role` (string) — redundância para token claims sem roundtrip ao Cognito

### Pre-sign-up Lambda
- Auto-confirma se `process.env.STAGE === 'dev'`
- Rejeita se email duplicado (query UserPool)
- Não altera fluxo de confirmação em prod

### Post-confirmation Lambda
- Adiciona o usuário ao grupo `cliente` por padrão via `adminAddUserToGroup`
- ADM criado manualmente via CLI/console (nunca self-service)

### Authorizer Lambda
- Extrai `cognito:groups` do JWT decoded
- Retorna IAM policy Allow se grupo tem permissão na rota
- Retorna 403 se grupo não autorizado
- Mapeamento de rotas:
  - `/admin/*` → requer grupo `admin`
  - `/client/*` → requer grupo `cliente`
  - `/public/*` → sem auth

### IAM
- Role `AuthTriggersRole`:
  - `cognito-idp:AdminAddUserToGroup` — apenas no User Pool específico (ARN exato)
  - `cognito-idp:ListUsers` — apenas no User Pool específico

## CRITÉRIOS DE ACEITE

1. Admin no grupo `admin` acessa rotas `/admin/*` → 200
2. Cliente no grupo `cliente` acessa `/client/*` → 200
3. Rota cruzada (cliente em `/admin/*`) → 403
4. Novo signup cai automaticamente no grupo `cliente`
5. ADM só pode ser criado via CLI

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar separação de perfis ADM/Cliente no Cognito conforme spec SPEC-14.
Criar grupos `admin` e `cliente`, triggers pre-sign-up e post-confirmation,
e authorizer Lambda que valida grupo.

Alterar SOMENTE:
- template.yaml (adicionar triggers, groups e role AuthTriggersRole)
- src/functions/auth/pre-signup.js
- src/functions/auth/post-confirmation.js
- src/functions/auth/authorizer.js

NÃO refatorar, renomear ou mexer em mais nada.
```
