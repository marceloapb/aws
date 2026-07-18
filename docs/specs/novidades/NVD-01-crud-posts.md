# NVD-01 — CRUD de Posts (Backend)

**TIPO:** Feature  
**PRIORIDADE:** P1  
**IMPACTO:** Alto — sem isso nada funciona  
**ESFORÇO:** Médio  

## CONTEXTO

O ADM cria, edita, lista e exclui posts do blog (Novidades). Cada post tem título, corpo HTML (output do editor rich text), resumo, imagem de capa, status (rascunho/publicado) e data de publicação. O slug é gerado automaticamente a partir do título.

## ESCOPO

- `src/functions/novidades/criar.js` — handler POST
- `src/functions/novidades/listar.js` — handler GET (admin, todos os status)
- `src/functions/novidades/buscar.js` — handler GET por ID
- `src/functions/novidades/atualizar.js` — handler PUT
- `src/functions/novidades/excluir.js` — handler DELETE
- `template.yaml` — 5 Lambdas, 5 rotas, GSIs

## FORA DE ESCOPO (NÃO TOCAR)

- Upload de imagens (NVD-02)
- Editor frontend (NVD-03)
- API pública (NVD-04)
- Qualquer outro módulo

## SPEC TÉCNICA

**DynamoDB (single-table `MbfTable`):**
- PK: `TENANT#<tenant_id>`
- SK: `NOVIDADE#<id>`
- Atributos: `id` (ULID), `titulo`, `slug`, `corpo_html`, `resumo` (max 300 chars), `capa_url`, `status` (rascunho|publicado), `publicado_em` (ISO), `criado_em`, `atualizado_em`, `autor_id`
- GSI-SLUG: PK=`TENANT#<tenant_id>`, SK=`SLUG#<slug>` — busca por URL amigável (unicidade)
- GSI-PUBLICADOS: PK=`TENANT#<tenant_id>#STATUS#publicado`, SK=`publicado_em` (desc) — listagem pública ordenada

**Slug:**
- Gerado via slugify do título (lowercase, sem acentos, hifens).
- Unicidade: antes de salvar, query GSI-SLUG. Se existe, appenda `-2`, `-3`, etc.
- Slug é imutável após criação (evita quebra de URLs).

**Rotas API Gateway (HTTP API, prefixo `/admin`):**
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/admin/novidades` | Cria post (status=rascunho) |
| GET | `/admin/novidades` | Lista todos (rascunho+publicado), paginado |
| GET | `/admin/novidades/{id}` | Busca por ID |
| PUT | `/admin/novidades/{id}` | Atualiza (título, corpo, resumo, capa, status) |
| DELETE | `/admin/novidades/{id}` | Exclui post |

**Lambda (Node.js 20, arm64, 256MB, 10s timeout):**
- Validação: `titulo` obrigatório (max 150 chars), `corpo_html` obrigatório, `resumo` (max 300), `status` ∈ [rascunho, publicado].
- Ao mudar status para `publicado`: preenche `publicado_em` com now() se vazio.
- Ao mudar status para `rascunho`: NÃO apaga `publicado_em` (histórico).
- Resposta padrão: `{ success: true, data: {...} }` / `{ success: false, error: "msg" }`.

**IAM (uma role por Lambda):**
- `dynamodb:PutItem`, `dynamodb:Query`, `dynamodb:GetItem`, `dynamodb:UpdateItem`, `dynamodb:DeleteItem` — restrito à tabela MbfTable e GSIs.

## CRITÉRIOS DE ACEITE

1. POST cria post com status=rascunho, gera slug único.
2. GET lista todos os posts do tenant com paginação (limit + lastKey).
3. GET por ID retorna o post completo.
4. PUT atualiza campos; ao publicar, preenche `publicado_em`.
5. DELETE remove o post.
6. Slug duplicado é resolvido com sufixo numérico.
7. Validação rejeita payload inválido com 400.

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente o CRUD de posts do blog (Novidades) conforme spec NVD-01. Crie 5 handlers em src/functions/novidades/ (criar.js, listar.js, buscar.js, atualizar.js, excluir.js). DynamoDB single-table MbfTable: PK=TENANT#<tid>, SK=NOVIDADE#<id>. Crie GSI-SLUG (PK=TENANT#<tid>, SK=SLUG#<slug>) e GSI-PUBLICADOS (PK=TENANT#<tid>#STATUS#publicado, SK=publicado_em). Slug gerado via slugify do título, com unicidade (sufixo -2, -3). Status: rascunho|publicado. Ao publicar, preenche publicado_em. No template.yaml: 5 Lambdas arm64 Node.js 20, 5 rotas com Cognito JWT admin, GSIs, policies IAM mínimas. ALTERE SOMENTE os arquivos listados; não refatore, renomeie ou mexa em mais nada.
```
