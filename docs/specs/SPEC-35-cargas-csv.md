# SPEC-35 — Cargas CSV (Import/Export)

| Campo | Valor |
|-------|-------|
| ID | GAP-21 / SPEC-35 |
| Tipo | Feature |
| Prioridade | P3 |
| Impacto | Baixo |
| Esforço | Baixo |

## CONTEXTO

§30 do MVP-1 define import/export CSV para migração inicial de dados (clientes, catálogo, histórico).

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/csv/importar.js` — POST /admin/importar
- `src/functions/csv/exportar.js` — GET /admin/exportar
- `template.yaml` — rotas + role

## FORA DE ESCOPO (NÃO TOCAR)

- Migração de fotos (S3 manual)
- Importação em tempo real (streaming)
- Qualquer outro arquivo

## SPEC TÉCNICA

### Importar

- Recebe upload de CSV (via presigned URL do S3)
- Suporta entidades: clientes, itens_catalogo, orcamentos_historico
- Valida headers e tipos
- BatchWriteItem em lotes de 25
- Retorna: { importados, erros: [{linha, motivo}] }

### Exportar

- Query param: `?entidade=clientes|catalogo|orcamentos`
- Gera CSV em memória
- Retorna presigned URL para download

### IAM

Role `CsvFunctionRole`:
- DynamoDB: BatchWriteItem, Query
- S3: PutObject, GetObject em `exports/`

## CRITÉRIOS DE ACEITE

1. Import de CSV de clientes funciona
2. Import valida e retorna erros por linha
3. Export gera CSV correto para download
4. Lotes de 25 respeitam limite do DynamoDB

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar Cargas CSV conforme spec SPEC-35.
Handlers em src/functions/csv/, import com validação,
export com presigned URL.

Alterar SOMENTE:
- template.yaml (rotas, role)
- src/functions/csv/importar.js
- src/functions/csv/exportar.js

NÃO refatorar, renomear ou mexer em mais nada.
```
