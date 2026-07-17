# Módulo Álbuns / Entrega — Specs

## Dependências entre specs:

- **Fase 1 (P0):** ALB-01 → ALB-02 → ALB-03 → ALB-04 (modelo → upload → processamento → trava)
- **Fase 2 (P1):** ALB-05 → ALB-06 → ALB-07 → ALB-08 → ALB-09 (galerias → organização → publicação → seleção → download)
- **Fase 3 (P2):** ALB-10 → ALB-11 | ALB-12, ALB-13 (expiração → prorrogação | lightbox, watermark)
- **Fase 4 (P3):** ALB-14, ALB-15 (independentes)

## Lista de Specs

| ID | Arquivo | Prioridade | Título |
|---|---|---|---|
| ALB-01 | [ALB-01-modelo-dados.md](./ALB-01-modelo-dados.md) | P0 | Modelo de dados DynamoDB |
| ALB-02 | [ALB-02-upload-presigned.md](./ALB-02-upload-presigned.md) | P0 | Upload via presigned URL |
| ALB-03 | [ALB-03-processamento-versoes.md](./ALB-03-processamento-versoes.md) | P0 | Processamento 3 versões |
| ALB-04 | [ALB-04-trava-70.md](./ALB-04-trava-70.md) | P0 | Trava dos 70% |
| ALB-05 | [ALB-05-crud-galerias.md](./ALB-05-crud-galerias.md) | P1 | CRUD de Galerias |
| ALB-06 | [ALB-06-organizacao-fotos.md](./ALB-06-organizacao-fotos.md) | P1 | Organização de fotos |
| ALB-07 | [ALB-07-publicacao-album.md](./ALB-07-publicacao-album.md) | P1 | Publicação do álbum |
| ALB-08 | [ALB-08-selecao-cliente.md](./ALB-08-selecao-cliente.md) | P1 | Seleção de fotos pelo cliente |
| ALB-09 | [ALB-09-download-controle.md](./ALB-09-download-controle.md) | P1 | Download granular |
| ALB-10 | [ALB-10-expiracao.md](./ALB-10-expiracao.md) | P2 | Expiração do álbum |
| ALB-11 | [ALB-11-prorrogacao-paga.md](./ALB-11-prorrogacao-paga.md) | P2 | Prorrogação paga |
| ALB-12 | [ALB-12-lightbox.md](./ALB-12-lightbox.md) | P2 | Lightbox/Visualizador |
| ALB-13 | [ALB-13-watermark.md](./ALB-13-watermark.md) | P2 | Watermark automático |
| ALB-14 | [ALB-14-comentarios-fotos.md](./ALB-14-comentarios-fotos.md) | P3 | Comentários nas fotos |
| ALB-15 | [ALB-15-estatisticas.md](./ALB-15-estatisticas.md) | P3 | Estatísticas do álbum |

## Arquivos existentes no frontend:
- `Albuns.jsx` (17 KB) — listagem
- `AlbumDetalhe.jsx` (5.5 KB) — detalhe
