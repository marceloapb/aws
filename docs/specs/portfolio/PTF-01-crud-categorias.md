# PTF-01 — CRUD Categorias de Portfólio (API + DynamoDB)

**TIPO:** Feature  
**PRIORIDADE:** P1  
**IMPACTO:** Alto — sem categorias, nenhum outro item funciona  
**ESFORÇO:** Baixo  

## CONTEXTO

O portfólio é organizado por categorias (Casamento, Ensaio, Gestante, etc.). O ADM cria, edita, reordena e exclui categorias. Cada categoria tem nome, texto descritivo, flag de visibilidade e ordem de exibição. Entidade de referência: `CATEGORIA_PORTFOLIO` (§15).

## ESCOPO (arquivos e recursos)

- `src/functions/portfolio/categorias/criar.js` — handler POST
- `src/functions/portfolio/categorias/listar.js` — handler GET
- `src/functions/portfolio/categorias/atualizar.js` — handler PUT
- `src/functions/portfolio/categorias/excluir.js` — handler DELETE
- `template.yaml` — novos recursos (tabela DynamoDB, 4 Lambdas, rotas API Gateway)

## FORA DE ESCOPO (NÃO TOCAR)

- Módulo de fotos (PTF-02/03/04)
- API pública de leitura (PTF-05)
- Qualquer outro módulo existente
- Frontend

## SPEC TÉCNICA

**DynamoDB (single-table `MbfTable`):**
- PK: `TENANT#<tenant_id>`
- SK: `CATPORTFOLIO#<ordem_zero_padded>#<id>`
- Atributos: `id` (ULID), `nome`, `texto`, `visivel` (bool), `ordem` (int), `created_at`, `updated_at`
- GSI1PK: `TENANT#<tenant_id>` / GSI1SK: `CATPORTFOLIO#<id>` (busca por ID direto)

**Rotas API Gateway (HTTP API, prefixo `/admin`):**
| Método | Rota | Authorizer |
|--------|------|------------|
| POST | `/admin/portfolio/categorias` | Cognito JWT (grupo admin) |
| GET | `/admin/portfolio/categorias` | Cognito JWT (grupo admin) |
| PUT | `/admin/portfolio/categorias/{id}` | Cognito JWT (grupo admin) |
| DELETE | `/admin/portfolio/categorias/{id}` | Cognito JWT (grupo admin) |

**Lambda (Node.js 20, arm64, 256MB, 10s timeout):**
- Cada handler: responsabilidade única, stateless.
- Validação de input: `nome` obrigatório (max 100 chars), `texto` opcional (max 500), `visivel` default `true`, `ordem` inteiro ≥ 0.
- Resposta padrão: `{ success: true, data: {...} }` / `{ success: false, error: "msg" }`.
- tenant_id extraído do JWT claims (hardcoded `1` por enquanto no token).

**IAM (uma role por Lambda):**
- `dynamodb:PutItem` / `dynamodb:Query` / `dynamodb:UpdateItem` / `dynamodb:DeleteItem` — restrito à tabela `MbfTable` e ao prefixo de PK `TENANT#*`.

**Idempotência:** PUT é idempotente por natureza (upsert com condição de existência). DELETE retorna 200 se já deletado.

## CRITÉRIOS DE ACEITE

1. POST cria categoria e retorna o objeto com ID.
2. GET lista todas as categorias do tenant, ordenadas por `ordem`.
3. PUT atualiza nome/texto/visivel/ordem; retorna 404 se ID não existe.
4. DELETE remove a categoria; retorna 404 se ID não existe.
5. Validação rejeita payload inválido com 400.
6. Sem role com `*` em Action ou Resource.

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente o CRUD de categorias de portfólio conforme a spec PTF-01. Crie os 4 handlers Lambda em src/functions/portfolio/categorias/ (criar.js, listar.js, atualizar.js, excluir.js). Use DynamoDB single-table MbfTable com PK=TENANT#<tenant_id>, SK=CATPORTFOLIO#<ordem>#<id>. Adicione os recursos no template.yaml (4 funções Lambda arm64 Node.js 20, 4 rotas no HttpApi com authorizer Cognito JWT grupo admin, policy IAM mínima por função). Validação de input no handler. Resposta padrão { success, data/error }. tenant_id=1 fixo no claim por enquanto. ALTERE SOMENTE os arquivos listados; não refatore, renomeie ou mexa em mais nada.
```
