# BACKLOG P3 — Watermark Automático (ex-ALB-13)

## Status: BACKLOG — aguardando decisão do PO

## Motivo do rebaixamento
Não existe menção a watermark no doc mestre (§11), na arquitetura (§1), nem no modelo de dados consolidado. A spec ALB-13 foi criada sem fonte de verdade.

## Se for aprovado pelo PO:
- Definir: watermark por álbum ou global?
- Definir: aplica em qual versão? (thumb, web, original?)
- Definir: texto ou imagem? Configurável?
- Criar entidade CONFIG_WATERMARK no modelo de dados
- Integrar com ALB-03 (processamento de versões)

## Spec original
O arquivo `ALB-13-watermark-automatico.md` permanece como referência,
mas NÃO deve ser implementado sem validação explícita do PO.
