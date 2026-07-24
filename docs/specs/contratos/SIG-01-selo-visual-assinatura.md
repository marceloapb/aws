# SIG-01: Selo Visual de Assinatura

## Metadados
- **ID:** SIG-01
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** CT-05, CT-06

## Contexto
Após o aceite eletrônico, o PDF gerado deve conter um **selo visual** (stamp) que comprova graficamente a assinatura. O selo contém: nome do signatário, CPF parcial, data/hora, código de verificação e QR Code para validação online. Isso aumenta a percepção de legitimidade do documento e facilita auditoria visual rápida.

## Escopo
- `apps/api/src/services/seloAssinatura.js` — NOVO
- `apps/api/src/services/pdfGenerator.js` — ALTERAR (incluir selo no PDF)
- Template HTML do selo (inline no serviço)

## Fora de Escopo (NÃO TOCAR)
- Fluxo de aceite (CT-05)
- Geração básica do PDF (CT-06 — apenas adicionar selo)
- Assinatura digital ICP-Brasil
- QR Code dinâmico com API externa

## Spec Técnica

### Componentes do Selo
```
┌─────────────────────────────────────────────────┐
│  ✓ DOCUMENTO ASSINADO ELETRONICAMENTE           │
│                                                 │
│  Signatário: Ana Carolina Silva                 │
│  CPF: ***.456.789-**                            │
│  Data/Hora: 18/07/2026 às 15:30:00 (UTC-3)     │
│  IP: 189.44.120.55                              │
│  Código: SIG-ct_001-20260718153000-a3f2         │
│                                                 │
│  [QR CODE]  Verifique em:                       │
│             app.mbfotos.com.br/verificar/SIG-xx │
│                                                 │
│  Validade jurídica: Art. 107 CC + MP 2.200-2    │
└─────────────────────────────────────────────────┘
```

### Serviço — seloAssinatura.js
```js
const crypto = require('crypto')
const QRCode = require('qrcode')

function gerarCodigoVerificacao(contratoId, dataAceite) {
  const payload = `${contratoId}-${dataAceite}`
  const hash = crypto.createHash('sha256').update(payload).digest('hex').slice(0, 8)
  return `SIG-${contratoId}-${dataAceite.replace(/[-:T]/g, '').slice(0, 14)}-${hash}`
}

function mascararCPF(cpf) {
  // 123.456.789-00 → ***.456.789-**
  const limpo = cpf.replace(/\D/g, '')
  return `***.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-**`
}

async function gerarSeloHTML(aceite, contratoId) {
  const codigo = gerarCodigoVerificacao(contratoId, aceite.data_aceite)
  const urlVerificacao = `https://app.mbfotos.com.br/verificar/${codigo}`
  const qrDataUrl = await QRCode.toDataURL(urlVerificacao, { width: 100, margin: 1 })

  return `
    <div class="selo-assinatura" style="
      border: 2px solid #1a5c2e;
      border-radius: 8px;
      padding: 20px;
      margin-top: 40px;
      background: #f0fdf4;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      page-break-inside: avoid;
    ">
      <div style="font-size: 14px; font-weight: bold; color: #1a5c2e; margin-bottom: 12px;">
        ✓ DOCUMENTO ASSINADO ELETRONICAMENTE
      </div>
      <table style="width: 100%;">
        <tr>
          <td style="vertical-align: top; width: 70%;">
            <p><strong>Signatário:</strong> ${aceite.nome_informado}</p>
            <p><strong>CPF:</strong> ${mascararCPF(aceite.cpf_informado)}</p>
            <p><strong>Data/Hora:</strong> ${formatarDataHoraBR(aceite.data_aceite)}</p>
            <p><strong>IP:</strong> ${aceite.ip_address}</p>
            <p><strong>Código de verificação:</strong> ${codigo}</p>
          </td>
          <td style="vertical-align: top; text-align: center; width: 30%;">
            <img src="${qrDataUrl}" alt="QR Code" style="width: 100px; height: 100px;" />
            <p style="font-size: 9px; margin-top: 4px;">Verifique a autenticidade</p>
          </td>
        </tr>
      </table>
      <div style="margin-top: 10px; font-size: 9px; color: #666; border-top: 1px solid #ccc; padding-top: 8px;">
        Validade jurídica conforme Art. 107 do Código Civil e MP 2.200-2/2001.
        Verifique em: ${urlVerificacao}
      </div>
    </div>
  `
}

function formatarDataHoraBR(isoDate) {
  const d = new Date(isoDate)
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

module.exports = { gerarSeloHTML, gerarCodigoVerificacao, mascararCPF }
```

### Integração com pdfGenerator.js
```js
// No gerarPDFContrato, após montar htmlCompleto:
const { gerarSeloHTML } = require('./seloAssinatura')

const seloHTML = await gerarSeloHTML(aceite, contratoId)
const htmlComSelo = `${htmlCompleto}${seloHTML}`

// Usar htmlComSelo no page.setContent()
```

### Código de Verificação
- Formato: `SIG-{contratoId}-{timestamp14}-{hash8}`
- Hash: SHA-256 do `contratoId + dataAceite`, primeiros 8 chars
- Único por contrato/aceite
- Salvar no DynamoDB junto ao ACEITE_CONTRATO

### Armazenamento
```json
// Adicionar ao ACEITE_CONTRATO:
{
  "codigo_verificacao": "SIG-ct_001-20260718153000-a3f2b1c9",
  "url_verificacao": "https://app.mbfotos.com.br/verificar/SIG-ct_001-20260718153000-a3f2b1c9"
}
```

### Endpoint de Verificação (público)
```
GET /public/verificar/:codigo

Response:
{
  "valido": true,
  "contrato_id": "ct_001",
  "signatario": "Ana Carolina Silva",
  "cpf_parcial": "***.456.789-**",
  "data_aceite": "2026-07-18T15:30:00Z",
  "status_contrato": "assinado"
}
```

### Regras
- Selo SEMPRE na última página do PDF, após dados de aceite
- CPF SEMPRE mascarado (nunca expor completo no selo)
- QR Code aponta para URL de verificação pública
- Código de verificação é imutável após geração
- Cor verde escuro (#1a5c2e) para remeter a "validado"
- `page-break-inside: avoid` para não cortar o selo entre páginas

## Critérios de Aceite
- [ ] Selo visual aparece no PDF após dados de aceite
- [ ] CPF mascarado no formato `***.XXX.XXX-**`
- [ ] QR Code funcional apontando para URL de verificação
- [ ] Código de verificação único por contrato
- [ ] Endpoint público de verificação retorna dados corretos
- [ ] Selo não quebra entre páginas
- [ ] Código salvo no ACEITE_CONTRATO

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SIG-01: Selo Visual de Assinatura.

1. Crie services/seloAssinatura.js: geração do selo HTML com QR Code.
2. Altere services/pdfGenerator.js: incluir selo após dados de aceite.
3. Gere código de verificação (SHA-256, 8 chars).
4. Mascare CPF no formato ***.XXX.XXX-**.
5. Salve codigo_verificacao no ACEITE_CONTRATO.
6. Crie rota GET /public/verificar/:codigo.
7. Dependência: npm install qrcode.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
