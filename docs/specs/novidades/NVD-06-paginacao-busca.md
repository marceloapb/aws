# NVD-06 — Paginação + Busca

**TIPO:** Melhoria  
**PRIORIDADE:** P2  
**IMPACTO:** Médio — usabilidade com volume  
**ESFORÇO:** Baixo  

## CONTEXTO

Quando o blog crescer, a listagem pública e a listagem admin precisam de paginação robusta e busca por título. A paginação já existe no NVD-04 (cursor-based). Esta spec adiciona: componente visual de paginação, busca textual no admin, e busca simples no público.

## ESCOPO

- `src/components/Pagination.jsx` — componente reutilizável
- `src/functions/novidades/buscar-texto.js` — handler GET (admin, busca por título)
- Ajuste em `src/functions/novidades/publico/listar.js` — aceitar query `?q=` para filtro
- `template.yaml` — 1 Lambda nova, 1 rota

## FORA DE ESCOPO (NÃO TOCAR)

- Full-text search (Elasticsearch/OpenSearch — overkill para blog pequeno)
- CRUD de posts
- Outros módulos

## SPEC TÉCNICA

**Busca admin (`GET /admin/novidades/busca?q=ensaio`):**
- Scan na tabela com FilterExpression `contains(titulo, :q)` (case-insensitive via lowercase comparação).
- Para volume pequeno (< 500 posts), Scan é aceitável. Se escalar, migrar para GSI com atributo `titulo_lower`.
- Retorna array de posts (id, titulo, status, publicado_em).

**Busca pública (ajuste no listar.js):**
- Se query param `q` presente: Scan com filter `contains(titulo, :q) AND status = publicado`.
- Se ausente: Query normal pelo GSI-PUBLICADOS.
- Limitado a 20 resultados.

**Componente Pagination.jsx:**
- Props: `hasNext`, `hasPrev`, `onNext()`, `onPrev()`, `loading`.
- Visual: botões "← Anteriores" / "Próximos →" com estado disabled.
- Sem números de página (cursor-based não tem total).

**IAM:** buscar-texto: `dynamodb:Scan` (tabela MbfTable, PK restrito a `TENANT#1`).

## CRITÉRIOS DE ACEITE

1. Busca por título retorna resultados parciais (substring).
2. Busca pública filtra apenas publicados.
3. Componente de paginação funcional com cursor.
4. Scan não estoura timeout (< 5s para 500 posts).
5. Busca vazia retorna listagem normal.

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente paginação e busca para Novidades conforme spec NVD-06. Crie src/functions/novidades/buscar-texto.js (GET /admin/novidades/busca?q=, Scan com FilterExpression contains(titulo,:q), retorna posts do tenant). Ajuste src/functions/novidades/publico/listar.js para aceitar ?q= (Scan filtrado status=publicado + contains titulo). Crie src/components/Pagination.jsx (props: hasNext, hasPrev, onNext, onPrev, loading; botões Anteriores/Próximos). No template.yaml: 1 Lambda arm64, 1 rota GET admin com Cognito JWT admin, policy dynamodb:Scan na MbfTable. ALTERE SOMENTE os arquivos listados; não refatore, renomeie ou mexa em mais nada.
```
