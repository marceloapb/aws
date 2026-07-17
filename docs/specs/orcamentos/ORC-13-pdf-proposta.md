# ORC-13: PDF da Proposta Enviada ao Cliente

## Metadados
- **ID:** ORC-13
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Baixo
- **Dependência:** ORC-10

## Contexto
Alguns clientes querem compartilhar a proposta offline (WhatsApp, imprimir, mostrar para cônjuge). PDF resolve isso com layout profissional.

## Escopo
- Backend: Lambda `gerarPDFProposta` — NOVO
- API: GET /admin/orcamentos/:id/pdf
- S3: armazenar PDF gerado
- Lib: @react-pdf/renderer ou puppeteer-core (Lambda layer)

## Fora de Escopo (NÃO TOCAR)
- Layout do portal (ORC-10)
- Contrato PDF (módulo Contratos)
- Email (ORC-12)

## Spec Técnica

### Fluxo
1. Admin clica "Gerar PDF" no detalhe do orçamento
2. POST /admin/orcamentos/:id/pdf
3. Lambda gera PDF com dados do orçamento
4. Upload para S3: `pdfs/{tenant_id}/proposta_{orc_id}.pdf`
5. Retorna presigned URL (expira 7 dias)

### Conteúdo do PDF
- Cabeçalho: logo + dados do fotógrafo
- Título: "Proposta Comercial"
- Dados do cliente
- Opções (uma por página/seção)
- Condições de pagamento
- Validade
- Rodapé: contatos

### Lambda
- Runtime: Node.js 20
- Layer: puppeteer-core + chromium (ou @react-pdf/renderer se mais leve)
- Memory: 1024MB (para renderização)
- Timeout: 30s

## Critérios de Aceite
- [ ] PDF gerado com layout profissional
- [ ] Contém todas opções e valores
- [ ] Logo do fotógrafo inclusa
- [ ] Presigned URL retornada
- [ ] URL expira em 7 dias
- [ ] PDF armazenado no S3
- [ ] Botão no detalhe do admin

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-13: PDF da Proposta.

1. Lambda gerarPDFProposta: renderizar HTML → PDF com chromium/puppeteer-core.
2. Upload para S3 com key pdfs/{tenant}/proposta_{id}.pdf.
3. Retornar presigned URL (7 dias).
4. Em OrcamentoDetalhe.jsx: botão "Gerar PDF" com loading + download.
5. SAM: Lambda com memory 1024, timeout 30, layer chromium.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
