# BACKLOG P3 — Estatísticas do Álbum (ex-ALB-15)

## Status: BACKLOG — aguardando decisão do PO

## Motivo do rebaixamento
Não existe menção a "estatísticas do álbum" no doc mestre (§11). Métricas de engajamento existem no módulo Instagram (§19 Insights), não no álbum. A spec ALB-15 foi criada sem fonte de verdade formal.

## Se for aprovado pelo PO:
- Definir quais métricas: views, downloads, tempo na página, fotos mais vistas?
- Definir se é real-time ou batch (custo)
- Avaliar se CloudFront access logs + Athena é suficiente vs. custom tracking
- Criar entidade ALBUM_STATS no modelo de dados

## Spec original
O arquivo `ALB-15-estatisticas-album.md` permanece como referência,
mas NÃO deve ser implementado sem validação explícita do PO.
