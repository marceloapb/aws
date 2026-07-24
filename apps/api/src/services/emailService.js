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
  // Buscar nome do remetente da config
  let fromAddress = FROM_EMAIL;
  try {
    const { buscarConfigEmail } = require('./emailTemplateService');
    const config = await buscarConfigEmail();
    if (config.remetente_nome) {
      fromAddress = `${config.remetente_nome} <${FROM_EMAIL}>`;
    }
  } catch {}

  const command = new SendEmailCommand({
    Source: fromAddress,
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

/**
 * Enviar e-mail usando template dinâmico
 * @param {string} tipo - Tipo do template (contrato_assinatura, orcamento_novo, etc)
 * @param {string} para - E-mail destinatário
 * @param {Object} variaveis - Variáveis para substituição no template
 */
async function enviarEmailComTemplate(tipo, para, variaveis = {}) {
  const { renderizarTemplate } = require('./emailTemplateService');
  const rendered = await renderizarTemplate(tipo, variaveis);

  if (!rendered) {
    // Template desativado - não enviar
    return { success: false, motivo: 'template_desativado' };
  }

  return enviarEmail({
    para,
    assunto: rendered.assunto,
    html: rendered.html,
    texto: rendered.texto,
  });
}

async function enviarEmailOrcamento(cliente, orcamento, link) {
  return enviarEmailComTemplate('orcamento_novo', cliente.email, {
    cliente_nome: cliente.nome,
    tipo_evento: orcamento.tipo_evento,
    valor_total: orcamento.valor_total?.toFixed(2),
    data_evento: orcamento.data_evento || '',
    link_orcamento: link,
  });
}

async function enviarEmailAlbum(cliente, album, link) {
  return enviarEmailComTemplate('album_publicado', cliente.email, {
    cliente_nome: cliente.nome,
    album_titulo: album.titulo,
    qtd_fotos: String(album.total_fotos || album.qtd_fotos || ''),
    link_album: link,
    data_expiracao: album.data_expiracao || '30 dias',
  });
}

async function enviarEmailContrato(cliente, link) {
  return enviarEmailComTemplate('contrato_assinatura', cliente.email, {
    cliente_nome: cliente.nome,
    tipo_evento: cliente.tipo_evento || '',
    data_evento: cliente.data_evento || '',
    link_assinatura: link,
  });
}

async function enviarEmailBoasVindas(cliente, linkPortal) {
  return enviarEmailComTemplate('boas_vindas', cliente.email, {
    cliente_nome: cliente.nome,
    email_cliente: cliente.email,
    link_portal: linkPortal || 'https://www.mbfoto.com.br/login',
  });
}

async function enviarEmailLembretePagamento(cliente, { valor, data_vencimento, link_pagamento }) {
  return enviarEmailComTemplate('lembrete_pagamento', cliente.email, {
    cliente_nome: cliente.nome,
    valor: valor,
    data_vencimento: data_vencimento,
    link_pagamento: link_pagamento || 'https://www.mbfoto.com.br/login',
  });
}

async function enviarEmailFollowup(cliente, { tipo_evento, data_evento, link_feedback }) {
  return enviarEmailComTemplate('followup', cliente.email, {
    cliente_nome: cliente.nome,
    tipo_evento: tipo_evento || '',
    data_evento: data_evento || '',
    link_feedback: link_feedback || 'https://www.mbfoto.com.br/login',
  });
}

async function enviarEmailNotificacao(cliente, { titulo, mensagem, link }) {
  return enviarEmailComTemplate('notificacao_geral', cliente.email, {
    cliente_nome: cliente.nome,
    titulo: titulo || '',
    mensagem: mensagem || '',
    link: link || 'https://www.mbfoto.com.br/login',
  });
}

module.exports = {
  enviarEmail,
  enviarEmailComTemplate,
  enviarEmailOrcamento,
  enviarEmailAlbum,
  enviarEmailContrato,
  enviarEmailBoasVindas,
  enviarEmailLembretePagamento,
  enviarEmailFollowup,
  enviarEmailNotificacao,
};
