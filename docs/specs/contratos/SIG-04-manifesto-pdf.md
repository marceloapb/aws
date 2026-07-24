# SIG-04: Manifesto PDF (Prova Técnica de Assinatura)

## Metadados
- **ID:** SIG-04
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Crítico
- **Esforço:** Médio
- **Dependência:** SIG-01, SIG-02, SIG-03, CT-06


## Contexto
O Manifesto PDF é um documento separado do contrato principal que serve como **prova técnica completa** do processo de assinatura eletrônica. Contém: audit log cronológico, dados do OTP, hash do documento original, metadados técnicos e referência legal. É o documento que seria apresentado em caso de disputa judicial.

## Escopo
- `apps/api/src/services/manifestoService.js` — NOVO
- `apps/api/src/handlers/contratos/gerarManifesto.js` — NOVO
- S3: armazenamento junto ao PDF do contrato
- Trigger: evento 'contrato.pdf_gerado'

## Fora de Escopo (NÃO TOCAR)
- PDF do contrato em si (CT-06)
- Selo visual (SIG-01 — já está no PDF principal)
- Object Lock (SIG-06 — trata imutabilidade)


## Spec Técnica

### Estrutura do Manifesto PDF
```
┌─────────────────────────────────────────────────────────┐
│         MANIFESTO DE ASSINATURA ELETRÔNICA              │
│                                                         │
│  Documento: Contrato ct_001                             │
│  Gerado em: 18/07/2026 15:31:00 (UTC-3)                │
│  Código de Verificação: SIG-ct_001-20260718153000-a3f2  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. IDENTIFICAÇÃO DO DOCUMENTO                          │
│  ─────────────────────────────────                      │
│  Contrato ID: ct_001                                    │
│  Modelo: Contrato Padrão Casamento                      │
│  Tenant: MB Foto (t123)                                 │
│  Cliente: Ana Carolina Silva                            │
│  Orçamento vinculado: orc_001                           │
│  Criado em: 17/07/2026 10:00:00                         │
│  Assinado em: 18/07/2026 15:30:00                       │
│                                                         │
│  2. DADOS DO SIGNATÁRIO                                 │
│  ─────────────────────────────────                      │
│  Nome informado: Ana Carolina Silva                     │
│  CPF: ***.456.789-**                                    │
│  IP: 189.44.120.55                                      │
│  User Agent: Mozilla/5.0 (iPhone; CPU...)               │
│  Geolocalização: São Paulo, SP, BR                      │
│                                                         │
│  3. VERIFICAÇÃO OTP                                     │
│  ─────────────────────────────────                      │
│  Canal: WhatsApp                                        │
│  Telefone: ***887766                                    │
│  Enviado em: 18/07/2026 15:28:00                        │
│  Verificado em: 18/07/2026 15:29:45                     │
│  Tentativas: 1 de 3                                     │
│                                                         │
│  4. TRILHA DE AUDITORIA (CRONOLÓGICA)                   │
│  ─────────────────────────────────                      │
│  15:20:00 — contrato.link_aberto (IP: 189.44.120.55)   │
│  15:20:05 — contrato.leitura_iniciada                   │
│  15:25:30 — contrato.leitura_completa (45s leitura)     │
│  15:26:00 — contrato.identidade_informada               │
│  15:28:00 — contrato.otp_solicitado (whatsapp)          │
│  15:29:45 — contrato.otp_verificado (1 tentativa)       │
│  15:30:00 — contrato.aceite_confirmado                  │
│  15:30:05 — contrato.pdf_gerado                         │
│                                                         │
│  5. INTEGRIDADE DO DOCUMENTO                            │
│  ─────────────────────────────────                      │
│  Hash SHA-256 do contrato HTML:                         │
│  a7f3b2c9d1e4f6... (64 chars)                           │
│  Hash SHA-256 do PDF gerado:                            │
│  b8c4d3e5f2a1... (64 chars)                             │
│                                                         │
│  6. FUNDAMENTAÇÃO LEGAL                                 │
│  ─────────────────────────────────                      │
│  • Art. 107, Código Civil — Forma livre para            │
│    declaração de vontade                                │
│  • MP 2.200-2/2001, Art. 10, §2º — Validade de         │
│    documentos eletrônicos                               │
│  • Lei 13.709/2018 (LGPD) — Tratamento de dados        │
│    para execução de contrato                            │
│  • Marco Civil da Internet (Lei 12.965/2014)            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Este manifesto é prova técnica da assinatura           │
│  eletrônica e deve ser armazenado por 5 anos.           │
└─────────────────────────────────────────────────────────┘
```


### Serviço — manifestoService.js
```js
const crypto = require('crypto')
const { listarAuditLog } = require('./auditLogService')
const { gerarCodigoVerificacao } = require('./seloAssinatura')

async function montarManifesto(contratoId) {
  const contrato = await getContrato(contratoId)
  const aceite = await getAceite(contratoId)
  const otp = await getOTPVerificado(contratoId)
  const auditLog = await listarAuditLog(contratoId, { ordem: 'asc' })
  const tenant = await getTenant(contrato.tenant_id)

  // Hash do conteúdo HTML original
  const hashHTML = crypto
    .createHash('sha256')
    .update(contrato.corpo_html_renderizado)
    .digest('hex')

  // Hash do PDF (se já gerado)
  let hashPDF = null
  if (contrato.pdf_s3_key) {
    const pdfBuffer = await getS3Object(contrato.pdf_s3_key)
    hashPDF = crypto.createHash('sha256').update(pdfBuffer).digest('hex')
  }

  return {
    contrato,
    aceite,
    otp,
    auditLog,
    tenant,
    hashHTML,
    hashPDF,
    codigo_verificacao: gerarCodigoVerificacao(contratoId, aceite.data_aceite),
    gerado_em: new Date().toISOString()
  }
}

function gerarHTMLManifesto(dados) {
  const { contrato, aceite, otp, auditLog, tenant, hashHTML, hashPDF } = dados

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Manifesto de Assinatura</title></head>
    <body style="font-family: 'Courier New', monospace; font-size: 11px; padding: 40px;">
      <h1 style="text-align: center; border-bottom: 2px solid #333;">
        MANIFESTO DE ASSINATURA ELETRÔNICA
      </h1>

      <section>
        <h2>1. IDENTIFICAÇÃO DO DOCUMENTO</h2>
        <p><strong>Contrato ID:</strong> ${contrato.id}</p>
        <p><strong>Modelo:</strong> ${contrato.modelo_id}</p>
        <p><strong>Tenant:</strong> ${tenant.nome} (${contrato.tenant_id})</p>
        <p><strong>Cliente:</strong> ${aceite.nome_informado}</p>
        <p><strong>Orçamento:</strong> ${contrato.orcamento_id}</p>
        <p><strong>Criado em:</strong> ${formatarDT(contrato.created_at)}</p>
        <p><strong>Assinado em:</strong> ${formatarDT(aceite.data_aceite)}</p>
      </section>

      <section>
        <h2>2. DADOS DO SIGNATÁRIO</h2>
        <p><strong>Nome:</strong> ${aceite.nome_informado}</p>
        <p><strong>CPF:</strong> ${mascararCPF(aceite.cpf_informado)}</p>
        <p><strong>IP:</strong> ${aceite.ip_address}</p>
        <p><strong>User Agent:</strong> ${aceite.user_agent}</p>
      </section>

      <section>
        <h2>3. VERIFICAÇÃO OTP</h2>
        <p><strong>Canal:</strong> ${otp.canal}</p>
        <p><strong>Telefone:</strong> ***${otp.telefone.slice(-6)}</p>
        <p><strong>Enviado em:</strong> ${formatarDT(otp.created_at)}</p>
        <p><strong>Verificado em:</strong> ${formatarDT(otp.verificado_em)}</p>
        <p><strong>Tentativas:</strong> ${otp.tentativas} de ${otp.max_tentativas}</p>
      </section>

      <section>
        <h2>4. TRILHA DE AUDITORIA</h2>
        <table border="1" cellpadding="4" cellspacing="0" style="width: 100%;">
          <tr><th>Hora</th><th>Evento</th><th>IP</th><th>Detalhes</th></tr>
          ${auditLog.map(e => `
            <tr>
              <td>${formatarHora(e.timestamp)}</td>
              <td>${e.evento}</td>
              <td>${e.ip_address || '-'}</td>
              <td>${JSON.stringify(e.detalhes || {})}</td>
            </tr>
          `).join('')}
        </table>
      </section>

      <section>
        <h2>5. INTEGRIDADE DO DOCUMENTO</h2>
        <p><strong>Hash SHA-256 (HTML):</strong> ${hashHTML}</p>
        <p><strong>Hash SHA-256 (PDF):</strong> ${hashPDF || 'N/A'}</p>
      </section>

      <section>
        <h2>6. FUNDAMENTAÇÃO LEGAL</h2>
        <ul>
          <li>Art. 107, Código Civil — forma livre para declaração de vontade</li>
          <li>MP 2.200-2/2001, Art. 10, §2º — validade de documentos eletrônicos</li>
          <li>Lei 13.709/2018 (LGPD) — tratamento para execução de contrato</li>
          <li>Marco Civil da Internet (Lei 12.965/2014) — registro de conexão</li>
        </ul>
      </section>

      <footer style="margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 9px;">
        Manifesto gerado automaticamente em ${formatarDT(dados.gerado_em)}.
        Código: ${dados.codigo_verificacao}.
        Retenção: 5 anos.
      </footer>
    </body>
    </html>
  `
}

module.exports = { montarManifesto, gerarHTMLManifesto }
```


### Handler — gerarManifesto.js
```js
const { montarManifesto, gerarHTMLManifesto } = require('../services/manifestoService')
const { htmlToPdf } = require('../services/pdfGenerator')
const { putObject } = require('../config/s3')

async function handler(evento) {
  const { tenant_id, contrato_id, s3_key } = evento.detail

  // Montar dados do manifesto
  const dados = await montarManifesto(contrato_id)

  // Gerar HTML e converter para PDF
  const html = gerarHTMLManifesto(dados)
  const pdfBuffer = await htmlToPdf(html, {
    header: { nome: 'MANIFESTO — Prova de Assinatura Eletrônica' },
    footer: { texto: `Manifesto ${contrato_id} — Confidencial` },
    margin: { top: 60, bottom: 60, left: 40, right: 40 }
  })

  // Upload S3
  const manifestoKey = `tenants/${tenant_id}/contratos/${contrato_id}-manifesto.pdf`
  await putObject({
    Bucket: process.env.CONTRATOS_BUCKET,
    Key: manifestoKey,
    Body: pdfBuffer,
    ContentType: 'application/pdf'
  })

  // Atualizar contrato com referência ao manifesto
  await atualizarContrato(contrato_id, { manifesto_s3_key: manifestoKey })

  // Emitir evento
  await emitirEvento('contrato.manifesto_gerado', {
    tenant_id,
    contrato_id,
    manifesto_key: manifestoKey
  })
}

module.exports = { handler }
```

### Trigger
```
Evento: 'contrato.pdf_gerado'
→ Lambda gerarManifesto
→ Gera manifesto PDF separado
→ Upload S3 com key: tenants/{tid}/contratos/{cid}-manifesto.pdf
```

### API — GET /admin/contratos/:id/manifesto
```
→ Gera URL assinada S3 (5min) para download
→ Apenas admin pode acessar (não expor ao cliente)
```

### Armazenamento S3
```
tenants/{tenant_id}/contratos/
├── {contrato_id}.pdf            ← Contrato principal (CT-06)
└── {contrato_id}-manifesto.pdf  ← Manifesto técnico (SIG-04)
```


### Regras
- Manifesto gerado APENAS após PDF principal (depende do hash do PDF)
- Documento separado do contrato (nunca merge num só PDF)
- Acesso restrito ao admin (cliente não vê manifesto)
- Contém audit log completo cronológico
- Hashes SHA-256 do HTML e do PDF para prova de integridade
- Retenção 5 anos (mesmo lifecycle do contrato)
- Fonte monospace para facilitar leitura técnica/jurídica
- Se falhar geração: retry via SQS (não bloqueia fluxo principal)

## Critérios de Aceite
- [ ] Manifesto PDF gerado após evento 'contrato.pdf_gerado'
- [ ] Contém todas as 6 seções (identificação, signatário, OTP, audit, hash, legal)
- [ ] Hash SHA-256 do HTML e do PDF incluídos
- [ ] Audit log completo em ordem cronológica
- [ ] Upload S3 com key {contrato_id}-manifesto.pdf
- [ ] Referência salva no contrato (manifesto_s3_key)
- [ ] Endpoint admin para download (URL assinada)
- [ ] Acesso restrito (apenas admin)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SIG-04: Manifesto PDF.

1. Crie services/manifestoService.js: montar dados + gerar HTML do manifesto.
2. Crie handlers/contratos/gerarManifesto.js: trigger 'contrato.pdf_gerado'.
3. Montar 6 seções: identificação, signatário, OTP, audit log, hashes, legal.
4. Hash SHA-256 do HTML + PDF do contrato.
5. Upload S3: {contrato_id}-manifesto.pdf.
6. Salvar manifesto_s3_key no contrato.
7. GET /admin/contratos/:id/manifesto — URL assinada S3.
8. SAM: Lambda trigger para evento pdf_gerado.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
