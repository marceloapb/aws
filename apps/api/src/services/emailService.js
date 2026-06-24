// ══════════════════════════════════════════════════════════════
// SERVICES/EMAIL-SERVICE.JS — Envio de emails via AWS SES
// ══════════════════════════════════════════════════════════════

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { env } from '../config/env.js';

const ses = new SESClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const FROM_EMAIL = env.SES_FROM_EMAIL || 'noreply@horizons.com.br';

export async function enviarEmail({ para, assunto, html, texto }) {
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
  return { success: true, message_id: response.MessageId };
}

export async function enviarEmailOrcamento(cliente, orcamento, link) {
  return enviarEmail({
    para: cliente.email,
    assunto: `Seu orçamento está pronto - ${orcamento.tipo_evento}`,
    html: `
      <h2>Olá ${cliente.nome}!</h2>
      <p>Seu orçamento para <strong>${orcamento.tipo_evento}</strong> está pronto.</p>
      <p>Valor: <strong>R$ ${orcamento.valor_total?.toFixed(2)}</strong></p>
      <p><a href="${link}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Ver Orçamento</a></p>
    `,
  });
}

export async function enviarEmailAlbum(cliente, album, link) {
  return enviarEmail({
    para: cliente.email,
    assunto: `Suas fotos estão prontas! - ${album.titulo}`,
    html: `
      <h2>Olá ${cliente.nome}!</h2>
      <p>Seu álbum <strong>${album.titulo}</strong> está pronto para visualização.</p>
      <p><a href="${link}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Ver Álbum</a></p>
      <p><small>Este link expira em 30 dias.</small></p>
    `,
  });
}

export async function enviarEmailContrato(cliente, link) {
  return enviarEmail({
    para: cliente.email,
    assunto: 'Contrato para assinatura digital',
    html: `
      <h2>Olá ${cliente.nome}!</h2>
      <p>Seu contrato está pronto para assinatura digital.</p>
      <p><a href="${link}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Assinar Contrato</a></p>
    `,
  });
}

export async function enviarEmailAvaliacao(cliente, link) {
  return enviarEmail({
    para: cliente.email,
    assunto: 'Como foi sua experiência? Avalie nosso trabalho!',
    html: `
      <h2>Olá ${cliente.nome}!</h2>
      <p>Gostaríamos de saber como foi sua experiência conosco.</p>
      <p><a href="${link}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Avaliar</a></p>
    `,
  });
}

export default { enviarEmail, enviarEmailOrcamento, enviarEmailAlbum, enviarEmailContrato, enviarEmailAvaliacao };
