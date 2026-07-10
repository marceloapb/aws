# SPEC-16 — Catálogo: CRUD de Itens, Pacotes e Categorias

| Campo | Valor |
|-------|-------|
| ID | GAP-02 / SPEC-16 |
| Tipo | Feature |
| Prioridade | P1 |
| Impacto | Alto |
| Esforço | Baixo |

## CONTEXTO

§5 do MVP-1 define Item (3 tipos: servico_principal, produto, extra), Pacote (receita de itens com desconto) e Categoria (organizacional). Alimenta o cálculo do valor sugerido do orçamento.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/catalogo/create-item.js`
- `src/functions/catalogo/get-item.js`
- `src/functions/catalogo/list-items.js`
- `src/functions/catalogo/update-item.js`
- `src/functions/catalogo/create-pacote.js`
- `src/functions/catalogo/get-pacote.js`
- `src/functions/catalogo/list-pacotes.js`
- `src/functions/catalogo/update-pacote.js`
- `src/functions/catalogo/create-categoria.js`
- `src/functions/catalogo/list-categorias.js`
- `src/functions/catalogo/update-categoria.js`
- `template.yaml` — 11 rotas HTTP API + role

## FORA DE ESCOPO (NÃO TOCAR)

- Lista de Preços PDF (frontend)
- Cálculo de horas extras (módulo orçamento)
- Upload de imagem de item
- Qualquer arquivo fora do listado

## SPEC TÉCNICA

### Modelo DynamoDB

**Item:**
```
PK: TENANT#1
SK: ITEM#<ulid>
GSI1PK: TENANT#1|CATALOGO
GSI1SK: TIPO#<tipo>#<nome>
```
Campos: id, nome, tipo (enum: servico_principal|produto|extra), categoria_id, valor_base, descricao, ativo, exibir_ao_cliente, duracao_base (se servico_principal), valor_hora_adicional (se servico_principal), created_at, updated_at

**Pacote:**
```
PK: TENANT#1
SK: PACOTE#<ulid>
GSI1PK: TENANT#1|CATALOGO
GSI1SK: PACOTE#<nome>
```
Campos: id, nome, itens_incluidos[{item_id, qtd}], desconto_tipo (pct|fixo), desconto_valor, exibir_ao_cliente, ativo, created_at, updated_at

**Categoria:**
```
PK: TENANT#1
SK: CAT#<ulid>
```
Campos: id, nome, ativo, created_at, updated_at

### Regras

- Desativar em vez de deletar (`ativo = false`). Soft-delete.
- List default: FilterExpression `ativo = true`
- Query param `?all=true` para admin ver inativos
- GSI1 permite listar por tipo ordenado por nome
- Create Pacote: valida que todos item_ids existem (BatchGetItem)
- Create Item: valida que categoria_id existe

### IAM

Role `CatalogoFunctionRole`:
- `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:UpdateItem`, `dynamodb:Query` — tabela principal + GSI1
- `dynamodb:BatchGetItem` — tabela principal (para validação de pacote)

## CRITÉRIOS DE ACEITE

1. CRUD completo funciona para Item, Pacote e Categoria
2. Item desativado não aparece no list default
3. Pacote valida que itens referenciados existem
4. Categoria pode ser desativada
5. Rotas protegidas por grupo `admin`
6. List por tipo retorna ordenado por nome via GSI1

## PROMPT PRONTO PARA O KIRO CLI

```
Criar handlers CRUD do Catálogo (Item, Pacote, Categoria) conforme spec SPEC-16.
Arquivos em src/functions/catalogo/, DynamoDB single-table com PK/SK definidos,
GSI1 por tipo, soft-delete.

Alterar SOMENTE:
- template.yaml (rotas e role)
- src/functions/catalogo/*.js (11 handlers)

NÃO refatorar, renomear ou mexer em mais nada.
```
