// ══════════════════════════════════════════════════════════════
// SERVICES/EMAIL-SERVICE.JS — Envio de emails via AWS SES
// ══════════════════════════════════════════════════════════════

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { env, features } from '../config/env.js';

const sesClient = new SESClient({
  region: env.SES_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function enviarEmail({ para, assunto, html, texto }) {
  if (!features.email) {
    console.warn('[EMAIL] Serviço de email não configurado. Pulando envio.');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const command = new SendEmailCommand({
      Source: `${env.SES_FROM_NAME} <${env.SES_FROM_EMAIL}>`,
      Destination: {
        ToAddresses: Array.isArray(para) ? para : [para],
      },
      Message: {
        Subject: { Data: assunto, Charset: 'UTF-8' },
        Body: {
          ...(html && { Html: { Data: html, Charset: 'UTF-8' } }),
          ...(texto && { Text: { Data: texto, Charset: 'UTF-8' } }),
        },
      },
    });

    const result = await sesClient.send(command);
    console.log(`[EMAIL] Enviado para ${para}: ${assunto}`);
    return { success: true, messageId: result.MessageId };
  } catch (error) {
    console.error(`[EMAIL] Erro ao enviar para ${para}:`, error.message);
    return { success: false, error: error.message };
  }
}

export async function enviarCodigoVerificacao(email, codigo) {
  return enviarEmail({
    para: email,
    assunto: 'Seu código de acesso — Horizons Fotografia',
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e40af;">Horizons Fotografia</h2>
        <p>Seu código de acesso é:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e40af;">${codigo}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Este código expira em 10 minutos.</p>
      </div>
    `,
  });
}

export async function enviarNotificacaoAlbum(email, nomeCliente, tituloAlbum, linkAlbum) {
  return enviarEmail({
    para: email,
    assunto: `Suas fotos estão prontas! — ${tituloAlbum}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e40af;">Horizons Fotografia</h2>
        <p>Olá, ${nomeCliente}!</p>
        <p>Suas fotos do álbum <strong>${tituloAlbum}</strong> estão prontas para visualização.</p>
        <a href="${linkAlbum}" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 20px 0;">Ver Minhas Fotos</a>
        <p style="color: #6b7280; font-size: 14px;">Este link tem validade limitada. Acesse o portal do cliente para acesso permanente.</p>
      </div>
    `,
  });
}

export async function enviarLinkContrato(email, nomeCliente, linkContrato) {
  return enviarEmail({
    para: email,
    assunto: 'Contrato para assinatura — Horizons Fotografia',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e40af;">Horizons Fotografia</h2>
        <p>Olá, ${nomeCliente}!</p>
        <p>Seu contrato está pronto para assinatura digital.</p>
        <a href="${linkContrato}" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 20px 0;">Assinar Contrato</a>
        <p style="color: #6b7280; font-size: 14px;">A assinatura é digital e tem validade jurídica.</p>
      </div>
    `,
  });
}
