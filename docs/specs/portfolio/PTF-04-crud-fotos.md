# PTF-04 — CRUD Fotos do Portfólio (listar, reordenar, excluir)

**TIPO:** Feature  
**PRIORIDADE:** P1  
**IMPACTO:** Alto — ADM gerencia as fotos  
**ESFORÇO:** Baixo  

## CONTEXTO

Após upload e processamento, o ADM precisa listar fotos de uma categoria, reordená-las e excluir fotos indesejadas. O "criar" já está coberto pelo fluxo de upload+confirmar (PTF-02). Aqui é a gestão pós-upload.

## ESCOPO

- `src/functions/portfolio/fotos/listar.js` — GET fotos por categoria
- `src/functions/portfolio/fotos/reordenar.js` — PATCH batch de ordens
- `src/functions/portfolio/fotos/excluir.js` — DELETE foto + cleanup S3
- `template.yaml` — 3 Lambdas, 3 rotas

## FORA DE ESCOPO (NÃO TOCAR)

- Upload/processamento (PTF-02/03) — já feitos
- API pública (PTF-05)
- Frontend (drag-and-drop é PTF-07)
- Qualquer outro módulo

## SPEC TÉCNICA

**Rotas:**
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/admin/portfolio/categorias/{catId}/fotos` | Lista fotos da categoria, ordem crescente |
| PATCH | `/admin/portfolio/categorias/{catId}/fotos/ordem` | Recebe `[{id, ordem}]`, atualiza batch |
| DELETE | `/admin/portfolio/fotos/{fotoId}` | Exclui registro + objetos S3 |

**Listar:**
- Query DynamoDB: PK=`TENANT#1`, SK begins_with `FOTOPORT#<catId>#`.
- Retorna array ordenado por `ordem`. Inclui `status` para o frontend mostrar "processando".

**Reordenar:**
- Body: `{ ordens: [{id: "xxx", ordem: 0}, {id: "yyy", ordem: 1}, ...] }`
- TransactWriteItems: atualiza `ordem` (e reconstrói o SK se necessário — ou usar atributo `ordem` separado mantendo SK fixa baseada no ID).
- **Decisão:** manter SK fixa como `FOTOPORT#<catId>#<fotoId>` e usar atributo `ordem` para sort no query (evita reescrever SKs). O listar ordena pelo atributo.

**Excluir:**
- Busca o item, extrai paths S3.
- DeleteItem do DynamoDB.
- DeleteObjects (web.jpg + thumb.jpg) no S3 — fire-and-forget (se falhar, lifecycle limpa depois).

**IAM por Lambda:**
- listar: `dynamodb:Query`
- reordenar: `dynamodb:TransactWriteItems` (ou BatchWriteItem/UpdateItem)
- excluir: `dynamodb:DeleteItem` + `dynamodb:GetItem` + `s3:DeleteObject`

## CRITÉRIOS DE ACEITE

1. GET retorna fotos ordenadas com status (processando/pronta/erro).
2. PATCH atualiza ordens atomicamente (transação ou batch).
3. DELETE remove registro + arquivos S3.
4. DELETE de foto inexistente retorna 404.
5. Categorias sem fotos retornam `[]`.

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente a gestão de fotos do portfólio conforme spec PTF-04. Crie src/functions/portfolio/fotos/listar.js (GET Query DynamoDB por catId, ordena por atributo ordem), reordenar.js (PATCH recebe [{id,ordem}], atualiza batch/transact), excluir.js (DELETE GetItem → DeleteItem DDB → DeleteObjects S3 web.jpg+thumb.jpg). SK fixa: FOTOPORT#{catId}#{fotoId}. Ordenação pelo atributo "ordem". No template.yaml: 3 Lambdas arm64, rotas GET/PATCH/DELETE com Cognito JWT admin, policies IAM mínimas por função. ALTERE SOMENTE os arquivos listados; não refatore, renomeie ou mexa em mais nada.
```
