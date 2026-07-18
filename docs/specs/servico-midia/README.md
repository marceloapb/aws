# Serviço de Mídia (S3) — Specs Atômicas

Módulo transversal de storage. Upload, processamento, versionamento e CDN.

## Decisões Estruturais
- 2 buckets: `mbf-media-private` (álbuns) + `mbf-media-public` (portfólio/novidades/perfil)
- Chave S3: `{tenant_id}/{contexto}/{entidade_id}/{foto_id}-{versao}.ext`
- Upload via presigned PUT (zero banda no server)
- Processamento: S3 Event → SQS → Lambda (Sharp: resize + WebP)
- Versões por contexto: Álbum (original+web+thumb) | Portfólio (web+thumb) | Novidades (web+thumb) | Perfil (thumb)
- Privado: presigned GET (TTL 15min) | Público: CloudFront
- Lifecycle: 90d carência → Glacier → 1y exclusão (configurável)
- Formatos aceitos: JPEG, PNG, WebP. Máx 50MB. Vídeo fora de escopo.

## Tabela de Specs

| ID | Tipo | Título | Prioridade | Impacto | Esforço |
|----|------|--------|------------|---------|--------|
| MID-01 | Feature | Buckets S3 + CloudFront (infra base) | P0 | Alto | Médio |
| MID-02 | Feature | Presigned URL de Upload (por contexto) | P0 | Alto | Médio |
| MID-03 | Feature | Processamento Assíncrono (Sharp + SQS) | P0 | Alto | Alto |
| MID-04 | Feature | Registro de Mídia (DynamoDB) | P0 | Alto | Baixo |
| MID-05 | Feature | Presigned URL de Leitura (privado) | P1 | Alto | Baixo |
| MID-06 | Feature | Servir Mídia Pública (CDN) | P1 | Alto | Baixo |
| MID-07 | Feature | Lifecycle (Carência → Glacier → Exclusão) | P2 | Médio | Médio |
| MID-08 | Feature | Métricas de Storage (por álbum/tenant) | P2 | Médio | Baixo |
| MID-09 | Melhoria | DLQ + Retry + Alerta (resiliência) | P1 | Alto | Baixo |

## Ordem de Execução
- **Fase 1 (P0 — infra):** MID-01 → MID-04 → MID-02 → MID-03
- **Fase 2 (P1 — acesso):** MID-05 + MID-06 + MID-09 (paralelas)
- **Fase 3 (P2 — otimização):** MID-07 → MID-08
