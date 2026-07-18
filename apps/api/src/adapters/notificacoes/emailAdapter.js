// ══════════════════════════════════════════════════════════════
// ADAPTERS/NOTIFICACOES/EMAIL-ADAPTER.JS — Envio de email via SES
// ══════════════════════════════════════════════════════════════

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({});
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@mbfoto.com.br';

/**
 * Envia email via SES com template interpolation
 * @param {Object} opts
 * @param {string} opts.destinatario - Email do destinatário
 * @param {string} opts.titulo - Assunto do email
 * @param {string} opts.corpo - Corpo HTML com placeholders {{variavel}}
 * @param {Object} opts.templateData - Dados para substituição nos placeholders
 * @returns {Promise<Object>}
 */
async function enviarEmail({ destinatario, titulo, corpo, templateData = {} }) {
  if (!destinatario) {
    throw new Error('destinatario é obrigatório para envio de email');
  }

  // Interpolar variáveis no título e corpo
  const tituloFinal = interpolar(titulo, templateData);
  const corpoFinal = interpolar(corpo, templateData);

  // Montar HTML completo
  const html = montarHtml(tituloFinal, corpoFinal);

  const command = new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: Array.isArray(destinatario) ? destinatario : [destinatario],
    },
    Message: {
      Subject: { Data: tituloFinal, Charset: 'UTF-8' },
      Body: {
        Html: { Data: html, Charset: 'UTF-8' },
        Text: { Data: stripHtml(corpoFinal) || tituloFinal, Charset: 'UTF-8' },
      },
    },
  });

  const response = await ses.send(command);

  return {
    success: true,
    messageId: response.MessageId,
    destinatario,
  };
}

/**
 * Substitui {{variavel}} por valores do templateData
 */
function interpolar(texto, dados) {
  if (!texto) return '';
  return texto.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return dados[key] !== undefined ? String(dados[key]) : match;
  });
}

/**
 * Monta HTML com layout padrão
 */
function montarHtml(titulo, corpo) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;">
  <div style="background:#EA580C;padding:15px 20px;border-radius:8px 8px 0 0;">
    <h2 style="color:white;margin:0;font-size:18px;">📸 MBFoto</h2>
  </div>
  <div style="background:white;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    <h3 style="margin:0 0 10px;color:#111827;">${titulo}</h3>
    <div style="color:#4b5563;line-height:1.6;">${corpo}</div>
  </div>
  <p style="color:#9ca3af;font-size:12px;margin-top:10px;text-align:center;">
    Você recebeu este email pois está cadastrado no sistema MBFoto.
  </p>
</body>
</html>`;
}

/**
 * Remove tags HTML para versão texto
 */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

module.exports = { enviarEmail };
