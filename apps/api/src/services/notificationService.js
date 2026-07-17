/**
 * Serviço de Notificações Multi-Canal
 * Dispara notificações via email (SES), WhatsApp e in-app (DynamoDB)
 */

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { v4: uuid } = require('uuid');

const ses = new SESClient({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME || 'mbf-backend-v3-table';

/**
 * Dispara notificação em todos os canais configurados
 * @param {Object} opts
 * @param {string} opts.tipo - orcamento_solicitado, contrato_assinado, pagamento_recebido, album_publicado, etc
 * @param {string} opts.titulo - Título curto da notificação
 * @param {string} opts.mensagem - Mensagem completa
 * @param {string} opts.destinatario_id - sub do Cognito (admin ou cliente)
 * @param {string} opts.destinatario_email - email para SES
 * @param {string} opts.destinatario_whatsapp - telefone para WhatsApp
 * @param {Object} opts.dados - dados extras (orcamento_id, valor, etc)
 * @param {string[]} opts.canais - ['email', 'whatsapp', 'in_app'] (default: todos)
 */
async function notificar({
  tipo, titulo, mensagem, destinatario_id, destinatario_email, destinatario_whatsapp,
  dados = {}, canais = ['email', 'whatsapp', 'in_app']
}) {
  const resultados = {};
  const now = new Date().toISOString();

  // 1. IN-APP — salvar no DynamoDB
  if (canais.includes('in_app')) {
    try {
      const notifId = uuid();
      await ddb.send(new PutCommand({
        TableName: TABLE,
        Item: {
          PK: `TENANT#${destinatario_id || 'default'}`,
          SK: `NOTIF#${notifId}`,
          GSI1PK: `NOTIF#${destinatario_id || 'default'}`,
          GSI1SK: `NOTIF#${now}`,
          id: notifId,
          tipo,
          titulo,
          mensagem,
          lida: false,
          dados,
          created: now,
        },
      }));
      resultados.in_app = { success: true, id: notifId };
    } catch (err) {
      resultados.in_app = { success: false, error: err.message };
    }
  }

  // 2. EMAIL — via SES
  if (canais.includes('email') && destinatario_email) {
    try {
      const fromEmail = process.env.SES_FROM_EMAIL || 'noreply@mbfoto.com.br';
      await ses.send(new SendEmailCommand({
        Source: fromEmail,
        Destination: { ToAddresses: [destinatario_email] },
        Message: {
          Subject: { Data: `[MBFoto] ${titulo}` },
          Body: {
            Html: {
              Data: `
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                  <div style="background:#EA580C;padding:15px 20px;border-radius:8px 8px 0 0;">
                    <h2 style="color:white;margin:0;font-size:18px;">📸 MBFoto</h2>
                  </div>
                  <div style="background:white;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                    <h3 style="margin:0 0 10px;">${titulo}</h3>
                    <p style="color:#4b5563;line-height:1.6;">${mensagem}</p>
                    ${dados.link ? `<a href="${dados.link}" style="display:inline-block;margin-top:15px;padding:10px 20px;background:#EA580C;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Ver no sistema</a>` : ''}
                  </div>
                  <p style="color:#9ca3af;font-size:12px;margin-top:10px;text-align:center;">Você recebeu este email pois está cadastrado no sistema MBFoto.</p>
                </div>
              `,
            },
            Text: { Data: `${titulo}\n\n${mensagem}` },
          },
        },
      }));
      resultados.email = { success: true };
    } catch (err) {
      resultados.email = { success: false, error: err.message };
    }
  }

  // 3. WHATSAPP — via lib/whatsapp/client
  if (canais.includes('whatsapp') && destinatario_whatsapp) {
    try {
      const whatsapp = require('../lib/whatsapp/client');
      await whatsapp.enviarTemplate({
        telefone: destinatario_whatsapp,
        template_name: tipo === 'orcamento_solicitado' ? 'novo_orcamento' : 'notificacao_geral',
        parameters: [{ text: titulo }, { text: mensagem }],
      });
      resultados.whatsapp = { success: true };
    } catch (err) {
      resultados.whatsapp = { success: false, error: err.message };
    }
  }

  return resultados;
}

/**
 * Atalhos para tipos comuns de notificação
 */
async function notificarNovoOrcamento(adminEmail, adminWhatsapp, adminId, clienteNome, tipoEvento) {
  return notificar({
    tipo: 'orcamento_solicitado',
    titulo: 'Nova solicitação de orçamento!',
    mensagem: `${clienteNome} solicitou orçamento para ${tipoEvento}. Acesse o sistema para montar a proposta.`,
    destinatario_id: adminId,
    destinatario_email: adminEmail,
    destinatario_whatsapp: adminWhatsapp,
    dados: { link: 'https://www.mbfoto.com.br/admin/orcamentos' },
  });
}

async function notificarContratoAssinado(adminEmail, adminWhatsapp, adminId, clienteNome) {
  return notificar({
    tipo: 'contrato_assinado',
    titulo: 'Contrato assinado! 🎉',
    mensagem: `${clienteNome} assinou o contrato. Verifique os próximos passos.`,
    destinatario_id: adminId,
    destinatario_email: adminEmail,
    destinatario_whatsapp: adminWhatsapp,
    dados: { link: 'https://www.mbfoto.com.br/admin/contratos' },
  });
}

async function notificarPagamentoRecebido(adminEmail, adminWhatsapp, adminId, clienteNome, valor) {
  return notificar({
    tipo: 'pagamento_recebido',
    titulo: 'Pagamento confirmado! 💰',
    mensagem: `${clienteNome} pagou R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Saldo atualizado.`,
    destinatario_id: adminId,
    destinatario_email: adminEmail,
    destinatario_whatsapp: adminWhatsapp,
    dados: { link: 'https://www.mbfoto.com.br/admin/financeiro' },
  });
}

module.exports = {
  notificar,
  notificarNovoOrcamento,
  notificarContratoAssinado,
  notificarPagamentoRecebido,
};
