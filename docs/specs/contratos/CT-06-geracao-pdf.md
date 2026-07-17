# CT-06: Geração PDF (Prova Legal)

## Metadados
- **ID:** CT-06
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** CT-05

## Contexto
Após o aceite eletrônico, o sistema gera um PDF do contrato com: corpo completo, dados do aceite (nome, CPF, IP, data/hora), e armazena no S3. Serve como prova legal da assinatura.

## Escopo
- `apps/backend/src/handlers/contratos/gerarPDF.js` — NOVO
- `apps/backend/src/services/pdfGenerator.js` — NOVO
- S3: bucket de contratos
- Trigger: evento 'contrato.assinado'

## Fora de Escopo (NÃO TOCAR)
- Aceite (CT-05 — já emite evento)
- Visualização (CT-04)
- Envio por email (CT-08)

## Spec Técnica

### Trigger
```
Evento: 'contrato.assinado'
Payload: { tenant_id, contrato_id, cliente_id }
→ Lambda gerarPDFContrato
```

### Fluxo
```js
async function gerarPDFContrato(tenantId, contratoId) {
  const contrato = await getContrato(tenantId, contratoId)
  const aceite = await getAceite(contratoId)
  const tenant = await getTenant(tenantId)
  
  // Montar HTML completo (contrato + rodapé de aceite)
  const htmlCompleto = `
    ${contrato.corpo_html_renderizado}
    <hr/>
    <div class="aceite-info">
      <h3>REGISTRO DE ACEITE ELETRÔNICO</h3>
      <p><strong>Aceito por:</strong> ${aceite.nome_informado}</p>
      <p><strong>CPF:</strong> ${aceite.cpf_informado}</p>
      <p><strong>Data/Hora:</strong> ${formatarDataHora(aceite.data_aceite)}</p>
      <p><strong>IP:</strong> ${aceite.ip_address}</p>
      <p><strong>Dispositivo:</strong> ${aceite.user_agent}</p>
      <p><em>Este documento foi aceito eletronicamente e possui validade jurídica conforme Art. 107 do Código Civil e MP 2.200-2/2001.</em></p>
    </div>
  `
  
  // Gerar PDF
  const pdfBuffer = await htmlToPdf(htmlCompleto, {
    header: { logo: tenant.logo_url, nome: tenant.nome },
    footer: { texto: `Contrato ${contratoId} — Gerado em ${formatarDataHora(new Date())}` },
    margin: { top: 80, bottom: 60, left: 50, right: 50 }
  })
  
  // Upload S3
  const s3Key = `tenants/${tenantId}/contratos/${contratoId}.pdf`
  await s3.putObject({
    Bucket: CONTRATOS_BUCKET,
    Key: s3Key,
    Body: pdfBuffer,
    ContentType: 'application/pdf'
  })
  
  // Atualizar contrato com referência ao PDF
  await atualizarContrato(contratoId, { pdf_s3_key: s3Key })
  
  // Emitir evento para envio por email
  await emitirEvento('contrato.pdf_gerado', { tenant_id: tenantId, contrato_id: contratoId, s3_key: s3Key })
}
```

### Geração HTML → PDF
```js
// Usar Puppeteer em Lambda Layer ou html-pdf-node
const puppeteer = require('puppeteer-core')
const chromium = require('@sparticuz/chromium')

async function htmlToPdf(html, options) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless
  })
  
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  
  const pdf = await page.pdf({
    format: 'A4',
    margin: options.margin,
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:10px; text-align:center; width:100%;">${options.header.nome}</div>`,
    footerTemplate: `<div style="font-size:8px; text-align:center; width:100%;">${options.footer.texto}</div>`
  })
  
  await browser.close()
  return pdf
}
```

### Lambda Layer
- `@sparticuz/chromium` (Chromium headless para Lambda)
- Lambda com 1024MB RAM, timeout 60s
- Layer compartilhada com outros módulos que geram PDF

### API — GET /admin/contratos/:id/pdf
```
→ Gera URL assinada S3 (5min) e retorna
→ Admin ou cliente podem baixar
```

### Regras
- PDF gerado APENAS após aceite (nunca antes)
- Contém dados legais do aceite (IP, data, CPF)
- Referência legal: Art. 107 CC + MP 2.200-2/2001
- S3: lifecycle para manter por 5 anos (compliance)
- Se geração falha: retry (SQS)

## Critérios de Aceite
- [ ] PDF gerado após evento 'contrato.assinado'
- [ ] Contém corpo do contrato + dados de aceite
- [ ] Logo do fotógrafo no header
- [ ] Upload S3 com key correta
- [ ] URL assinada para download
- [ ] Lambda com Chromium funciona
- [ ] Evento 'contrato.pdf_gerado' emitido

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CT-06: Geração PDF.

1. Crie handlers/contratos/gerarPDF.js: trigger evento 'contrato.assinado'.
2. Crie services/pdfGenerator.js: HTML → PDF com Puppeteer.
3. Lambda Layer com @sparticuz/chromium.
4. Upload S3, atualizar contrato com pdf_s3_key.
5. API: GET /admin/contratos/{id}/pdf (URL assinada).
6. Emitir 'contrato.pdf_gerado'.
7. SAM: Lambda 1024MB, 60s timeout, layer.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
