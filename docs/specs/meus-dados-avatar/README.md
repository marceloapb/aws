# SPEC — Página "Meus Dados" (Self-Service do Cliente)

## RESUMO EXECUTIVO

A feature "Meus Dados" permite que o cliente autenticado visualize, edite seu perfil e faça upload de foto (avatar). O repo já possui `src/functions/clients/{create,get,list,update}` para uso admin. Agora precisamos de endpoints **self-service** (`/clients/me`) onde o cliente autenticado opera apenas sobre seus próprios dados via `sub` do JWT. O avatar usa presigned URL para upload direto ao S3 (sem tráfego binário na Lambda/API Gateway).

## TABELA PRIORIZADA

| ID | Tipo | Título | Prioridade | Impacto | Esforço |
|----|------|--------|------------|---------|--------|
| MD-01 | Feature | GET /clients/me (leitura self-service) | P1 | Alto | Baixo |
| MD-02 | Feature | PATCH /clients/me (edição self-service) | P1 | Alto | Médio |
| MD-03 | Feature | GET /clients/me/avatar-url (presigned upload) | P1 | Alto | Médio |
| MD-04 | Melhoria | Thumbnail automático via S3 Event | P2 | Médio | Médio |

## ORDEM DE EXECUÇÃO

| Fase | Specs | Dependência |
|------|-------|-------------|
| 1 | MD-01 | Nenhuma — base para a tela funcionar |
| 2 | MD-02, MD-03 | MD-01 (confirma estrutura DynamoDB) |
| 3 | MD-04 | MD-03 (precisa do bucket/prefixo configurado) |

## ESTRUTURA DE DIRETÓRIOS (após implementação)

```
src/functions/clients/
├── create/index.mjs          (existente)
├── get/index.mjs             (existente - admin)
├── list/index.mjs            (existente - admin)
├── update/index.mjs          (existente - admin)
├── me-get/index.mjs          (NOVO - MD-01)
├── me-update/index.mjs       (NOVO - MD-02)
├── me-avatar-url/index.mjs   (NOVO - MD-03)
├── avatar-resize/index.mjs   (NOVO - MD-04)
└── package.json
```
