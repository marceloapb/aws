// ══════════════════════════════════════════════════════════════
// SERVICES/SELO-ASSINATURA-SERVICE.JS
// SIG-01: Selo Visual de Assinatura com QR Code e código de verificação
// ══════════════════════════════════════════════════════════════

const crypto = require('crypto');
let QRCode;
try {
  QRCode = require('qrcode');
} catch {
  QRCode = null; // qrcode package optional
}
const { env } = require('../config/env');

/**
 * Gera código de verificação único para o contrato
 * Formato: SIG-{contratoId}-{timestamp14}-{hash8}
 */
function gerarCodigoVerificacao(contratoId, dataAceite) {
  const payload = `${contratoId}-${dataAceite}`;
  const hash = crypto.createHash('sha256').update(payload).digest('hex').slice(0, 8);
  const ts = (dataAceite || new Date().toISOString()).replace(/[-:T.Z]/g, '').slice(0, 14);
  return `SIG-${contratoId.slice(0, 8)}-${ts}-${hash}`;
}

/**
 * Mascara CPF: 123.456.789-00 → ***.456.789-**
 */
function mascararCPF(cpf) {
  if (!cpf) return '***.***.***-**';
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length < 11) return '***.***.***-**';
  return `***.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-**`;
}

/**
 * Formata data/hora para pt-BR
 */
function formatarDataHoraBR(isoDate) {
  if (!isoDate) return 'N/A';
  try {
    return new Date(isoDate).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return isoDate;
  }
}

/**
 * Gera o HTML do selo visual de assinatura
 * Inclui QR Code para verificação online
 */
async function gerarSeloHTML(aceite, contratoId) {
  const codigo = gerarCodigoVerificacao(contratoId, aceite.data || aceite.data_aceite || aceite.assinadoEm);
  const frontendUrl = env.FRONTEND_URL || 'https://www.marcelobloisefotografia.com.br';
  const urlVerificacao = `${frontendUrl}/verificar/${codigo}`;

  let qrDataUrl = '';
  try {
    if (QRCode) {
      qrDataUrl = await QRCode.toDataURL(urlVerificacao, { width: 100, margin: 1 });
    }
  } catch {
    // Se QRCode falhar, prosseguir sem QR
  }

  return `
    <div style="
      border: 2px solid #1a5c2e;
      border-radius: 12px;
      padding: 20px;
      margin: 30px 0;
      background: #ecfdf5;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      page-break-inside: avoid;
    ">
      <div style="font-size: 14px; font-weight: bold; color: #1a5c2e; margin-bottom: 12px;">
        &#x2705; DOCUMENTO ASSINADO ELETRONICAMENTE
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="vertical-align: top; width: 70%;">
            <p style="margin: 4px 0;"><strong>Signatário:</strong> ${aceite.signatario || aceite.nome_informado || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>CPF:</strong> ${mascararCPF(aceite.cpf || aceite.cpf_informado)}</p>
            <p style="margin: 4px 0;"><strong>Data/Hora:</strong> ${formatarDataHoraBR(aceite.data || aceite.data_aceite || aceite.assinadoEm)}</p>
            <p style="margin: 4px 0;"><strong>IP:</strong> ${aceite.ip || aceite.ip_address || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>Autenticação:</strong> OTP via ${aceite.canal || aceite.autenticacao || 'WhatsApp'}</p>
            <p style="margin: 4px 0;"><strong>Código:</strong> ${codigo}</p>
          </td>
          <td style="vertical-align: top; text-align: center; width: 30%;">
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" style="width: 100px; height: 100px;" />` : ''}
            <p style="font-size: 9px; margin-top: 4px; color: #666;">Verifique a autenticidade</p>
          </td>
        </tr>
      </table>
      <div style="margin-top: 10px; font-size: 9px; color: #666; border-top: 1px solid #a7f3d0; padding-top: 8px;">
        Validade jurídica conforme Art. 107 do Código Civil, MP 2.200-2/2001 e Lei 14.063/2020.
        Verifique em: ${urlVerificacao}
      </div>
    </div>
  `;
}

module.exports = { gerarSeloHTML, gerarCodigoVerificacao, mascararCPF, formatarDataHoraBR };
