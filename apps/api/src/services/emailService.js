// ══════════════════════════════════════════════════════════════
// SERVICES/EMAIL-SERVICE.JS — Envio de emails via AWS SES
// ══════════════════════════════════════════════════════════════

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { env } = require('../config/env');

const ses = new SESClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const FROM_EMAIL = env.SES_FROM_EMAIL || 'noreply@horizons.com.br';

async function enviarEmail({ para, assunto, html, texto }) {
  const command = new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: { ToAddresses: Array.isArray(para) ? para : [para] },
    Message: {
      Subject: { Data: assunto, Charset: 'UTF-8' },
      Body: {
        ...(html && { Html: { Data: html, Charset: 'UTF-8' } }),
        ...(texto && { Text: { Data: texto, Charset: 'UTF-8' } }),
      },
    },
  });

  const response = await ses.send(command);
  return { success: true, messageId: response.MessageId };
}

async function enviarEmailOrcamento(cliente, orcamento, link) {
  return enviarEmail({
    para: cliente.email,
    assunto: `Seu orçamento está pronto - ${orcamento.tipo_evento}`,
    html: `<h2>Olá ${cliente.nome}!</h2>
      <p>Seu orçamento para <strong>${orcamento.tipo_evento}</strong> está pronto.</p>
      <p>Valor: <strong>R$ ${orcamento.valor_total?.toFixed(2)}</strong></p>
      <p><a href="${link}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Ver Orçamento</a></p>`,
  });
}

async function enviarEmailAlbum(cliente, album, link) {
  return enviarEmail({
    para: cliente.email,
    assunto: `Suas fotos estão prontas! - ${album.titulo}`,
    html: `<h2>Olá ${cliente.nome}!</h2>
      <p>Seu álbum <strong>${album.titulo}</strong> está pronto para visualização.</p>
      <p><a href="${link}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Ver Álbum</a></p>
      <p><small>Este link expira em 30 dias.</small></p>`,
  });
}

async function enviarEmailContrato(cliente, link) {
  return enviarEmail({
    para: cliente.email,
    assunto: 'Contrato para assinatura digital',
    html: `<h2>Olá ${cliente.nome}!</h2>
      <p>Seu contrato está pronto para assinatura digital.</p>
      <p><a href="${link}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Assinar Contrato</a></p>`,
  });
}

module.exports = { enviarEmail, enviarEmailOrcamento, enviarEmailAlbum, enviarEmailContrato };
