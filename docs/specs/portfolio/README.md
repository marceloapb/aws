# Módulo Portfólio — Specs

Specs de implementação do módulo de Portfólio público do fotógrafo.

## Ordem de Execução

| # | Spec | Dependência |
|---|------|-------------|
| 1 | PTF-01 — CRUD Categorias | Nenhuma (fundação) |
| 2 | PTF-02 — Upload (presigned URL) | PTF-01 (categoria deve existir) |
| 3 | PTF-03 — Processamento (web+thumb) | PTF-02 (precisa de objeto no S3) |
| 4 | PTF-04 — Gestão de fotos (listar/reordenar/excluir) | PTF-02/03 (precisa de fotos) |
| 5 | PTF-05 — API pública | PTF-01 + PTF-03 (dados prontos) |
| 6 | PTF-06 — CloudFront | PTF-03 (precisa de objetos web/thumb no S3) |
| 7 | PTF-08 — Toggle visibilidade | PTF-01 + PTF-05 (end-to-end) |
| 8 | PTF-07 — Drag-and-drop | PTF-04 (endpoint de reordenar existe) |

## Stack

- Lambda Node.js 20 (arm64)
- API Gateway HTTP API
- DynamoDB single-table (MbfTable)
- S3 + CloudFront (OAC)
- SAM (template.yaml)
- IAM com privilégio mínimo

## Arquitetura

- **DynamoDB**: PK=`TENANT#<id>`, SK com prefixos `CATPORTFOLIO#` e `FOTOPORT#`
- **S3**: bucket `mbf-media-${Stage}`, prefixo `1/portfolio/{cat_id}/{foto_id}/`
- **Processamento**: Lambda trigger S3 → sharp → web (1200px) + thumb (400px) → apaga original
- **Servir fotos**: CloudFront com OAC (público, sem URLs assinadas)
- **Diferença do Álbum**: portfólio NÃO persiste original em alta resolução
