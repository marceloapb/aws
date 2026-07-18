# NVD-04 — Listagem Pública + Leitura

**TIPO:** Feature  
**PRIORIDADE:** P1  
**IMPACTO:** Alto — superfície visível ao visitante  
**ESFORÇO:** Baixo  

## CONTEXTO

O site público exibe a listagem de posts publicados (cards com capa, título, resumo, data) e permite leitura completa de um post via slug na URL. Sem autenticação.

## ESCOPO

- `src/functions/novidades/publico/listar.js` — GET listagem paginada
- `src/functions/novidades/publico/ler.js` — GET post por slug
- `template.yaml` — 2 Lambdas, 2 rotas públicas

## FORA DE ESCOPO (NÃO TOCAR)

- CRUD admin (NVD-01)
- Upload (NVD-02)
- Editor (NVD-03)
- Qualquer outro módulo

## SPEC TÉCNICA

**Rotas (sem authorizer):**
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/public/novidades` | Lista posts publicados (paginado) |
| GET | `/public/novidades/{slug}` | Lê post completo por slug |

**Listar:**
- Query GSI-PUBLICADOS: PK=`TENANT#1#STATUS#publicado`, SK desc (mais recentes primeiro).
- Paginação: `limit` (default 10, max 20) + `lastKey` (cursor).
- Retorno por item: `{ titulo, slug, resumo, capa_url, publicado_em }`.
- URLs de capa com prefixo `CDN_BASE_URL`.
- Header `Cache-Control: public, max-age=300`.

**Ler por slug:**
- Query GSI-SLUG: PK=`TENANT#1`, SK=`SLUG#<slug>`.
- Se não encontrado: 404.
- Retorno: `{ titulo, corpo_html, capa_url, publicado_em, resumo }`.
- Sem dados internos (id, autor_id, status) na resposta pública.
- Header `Cache-Control: public, max-age=600`.

**IAM:** `dynamodb:Query` — tabela MbfTable + GSIs.

## CRITÉRIOS DE ACEITE

1. Listagem retorna só posts publicados, ordenados por data desc.
2. Paginação funcional com cursor.
3. Leitura por slug retorna post completo.
4. Slug inexistente retorna 404.
5. Sem autenticação necessária.
6. Sem dados sensíveis na resposta.
7. Cache-Control presente.

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente a listagem pública e leitura de posts conforme spec NVD-04. Crie src/functions/novidades/publico/listar.js (GET /public/novidades, query GSI-PUBLICADOS PK=TENANT#1#STATUS#publicado SK desc, paginação limit+lastKey, retorna titulo/slug/resumo/capa_url/publicado_em, Cache-Control 300s) e src/functions/novidades/publico/ler.js (GET /public/novidades/{slug}, query GSI-SLUG, retorna post completo sem dados internos, 404 se não existe, Cache-Control 600s). No template.yaml: 2 Lambdas arm64, 2 rotas públicas sem authorizer, policy dynamodb:Query. ALTERE SOMENTE os arquivos listados; não refatore, renomeie ou mexa em mais nada.
```
