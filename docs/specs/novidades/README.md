# Módulo Novidades (Blog) — Specs

Specs de implementação do módulo de Novidades (blog) do site do fotógrafo.

## Ordem de Execução

| # | Spec | Dependência |
|---|------|-------------|
| 1 | NVD-01 — CRUD de Posts (backend) | Nenhuma (fundação) |
| 2 | NVD-02 — Upload de Imagens no Post | NVD-01 (post deve existir) |
| 3 | NVD-03 — Editor Rich Text (frontend) | NVD-01 + NVD-02 (API + upload prontos) |
| 4 | NVD-04 — Listagem Pública + Leitura | NVD-01 (precisa de posts publicados) |
| 5 | NVD-05 — Slug + SEO mínimo | NVD-01 + NVD-04 (CRUD + rota pública) |
| 6 | NVD-06 — Paginação + Busca | NVD-04 (listagem pública existe) |
| 7 | NVD-07 — Agendamento de Publicação | NVD-01 (CRUD existe) |

## Stack

- Lambda Node.js 20 (arm64)
- API Gateway HTTP API
- DynamoDB single-table (MbfTable)
- S3 + CloudFront (reusa infra do Portfólio)
- SAM (template.yaml)
- IAM com privilégio mínimo
- EventBridge Scheduler (agendamento)

## Arquitetura

- **DynamoDB**: PK=`TENANT#<id>`, SK com prefixo `NOVIDADE#<id>`
- **GSIs**: GSI-SLUG (busca por URL amigável), GSI-PUBLICADOS (listagem ordenada por data)
- **S3**: bucket `mbf-media-${Stage}`, prefixo `1/novidades/{post_id}/`
- **Processamento de imagem**: reusa o mesmo padrão do portfólio (web 1200px + thumb 400px)
- **Servir imagens**: CloudFront com OAC (mesmo do portfólio)
- **Editor**: TipTap (lib rica, extensível, output HTML serializado)
