# ORC-13: PDF da Proposta Enviada ao Cliente

## Metadados
- **ID:** ORC-13
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Baixo
- **Dependência:** ORC-03, ORC-04, ORC-10

## Contexto
O admin quer enviar um PDF profissional da proposta ao cliente (por email, WhatsApp ou download). Inclui: logo, dados da empresa, opções com valores, condições de pagamento, validade.

## Escopo
- Backend: Lambda `gerarPDFProposta`
- S3: armazenar PDF gerado
- Frontend admin: botão "Gerar PDF" no detalhe

## Fora de Escopo (NÃO TOCAR)
- Envio automático por email (futuro)
- Template customizável pelo admin (futuro)
- Portal do cliente

## Spec Técnica

### Conteúdo do PDF
1. Header: logo + dados da empresa (nome, CNPJ, telefone, email)
2. Dados do cliente: nome, telefone, email
3. Título: "Proposta Comercial — {tipo_evento}"
4. Opções: card por opção com itens e valor
5. Condições de pagamento: tabela comparativa
6. Eventos: data, local, horários
7. Validade: "Esta proposta é válida até {data}"
8. Footer: assinatura digital / marca d'água

### Lambda — gerarPDFProposta
- Usar: @react-pdf/renderer (ou pdfkit)
- Input: orcamento_id
- Output: URL do PDF no S3 (presigned, 7 dias)
- Salvar URL no ORCAMENTO: `pdf_url`, `pdf_gerado_em`

### Frontend — OrcamentoDetalhe.jsx
- Botão "📄 Gerar PDF" (apenas se status >= pronto_enviar)
- Loading durante geração
- Após: link "Baixar PDF" + botão "Compartilhar"

## Critérios de Aceite
- [ ] PDF gerado com logo e dados da empresa
- [ ] Opções listadas com valores
- [ ] Condições de pagamento tabeladas
- [ ] Eventos com data/local
- [ ] Validade exibida
- [ ] URL presigned funcional (7 dias)
- [ ] Botão só aparece se status >= pronto_enviar

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-13: PDF da Proposta.

1. Lambda gerarPDFProposta:
   - Buscar orçamento completo
   - Gerar PDF com pdfkit: header, cliente, opções, pagamento, eventos, validade
   - Upload para S3 prefix pdfs/propostas/
   - Retornar presigned URL (7 dias)

2. Em OrcamentoDetalhe.jsx:
   - Botão "Gerar PDF" se status >= pronto_enviar
   - Loading state
   - Link download após geração

3. IAM: s3:PutObject no prefix, s3:GetObject para presigned.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
