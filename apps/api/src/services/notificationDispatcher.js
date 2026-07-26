// ══════════════════════════════════════════════════════════════
// SERVICES/NOTIFICATION-DISPATCHER.JS — Processamento de eventos → notificações
// ══════════════════════════════════════════════════════════════

const crypto = require('crypto');
const { QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamo, TABLE } = require('../config/dynamodb');
const { verificarDedup, marcarProcessado } = require('./dedupService');

const TENANT = process.env.TENANT_ID || 'default';

/**
 * Processa um evento e dispara notificações conforme regras ativas
 * @param {Object} evento - Evento recebido do EventBridge ou chamada direta
 * @returns {Promise<Object>} Resultado do processamento
 */
async function processarEvento(evento) {
  const { evento_id, tipo_evento, tenant_id, dados = {} } = evento;

  // 1) Verificar idempotência
  const jaDuplicado = await verificarDedup(evento_id);
  if (jaDuplicado) {
    return { success: true, ignorado: true, motivo: 'evento_duplicado' };
  }

  // Marcar como processado (race condition safe)
  const marcou = await marcarProcessado(evento_id);
  if (!marcou) {
    return { success: true, ignorado: true, motivo: 'evento_duplicado_concorrente' };
  }

  // 2) Buscar regras de notificação ativas para o tipo_evento
  // Normalizar: tipo_evento pode ser 'orcamento_criado' ou 'orcamento.criado'
  const tipoComPonto = tipo_evento.replace(/_/g, '.');
  const tipoComUnderscore = tipo_evento.replace(/\./g, '_');

  const regrasResult = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    FilterExpression: '#status = :ativa AND (contains(tipos_evento, :tipo1) OR contains(tipos_evento, :tipo2))',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':pk': `TENANT#${tenant_id || TENANT}`,
      ':sk': 'REGRA_NTF#',
      ':ativa': 'ativa',
      ':tipo1': tipoComPonto,
      ':tipo2': tipoComUnderscore,
    },
  }));

  const regras = regrasResult.Items || [];
  if (regras.length === 0) {
    return { success: true, ignorado: true, motivo: 'sem_regras_ativas' };
  }

  // 3) Para cada regra, despachar para os canais configurados
  const resultados = [];

  for (const regra of regras) {
    const canais = regra.canais || [];

    for (const canal of canais) {
      const entregaId = crypto.randomUUID();
      const now = new Date().toISOString();
      let status = 'enviado';
      let erro = null;

      try {
        await despacharCanal(canal, regra, evento, dados);
      } catch (err) {
        status = 'erro';
        erro = err.message;
      }

      // 4) Registrar log de entrega
      const logItem = {
        PK: `TENANT#${tenant_id || TENANT}`,
        SK: `LOG_NTF#${now}#${entregaId}`,
        GSI1PK: `TENANT#${tenant_id || TENANT}`,
        GSI1SK: `CANAL#${canal}#${now}`,
        id: entregaId,
        evento_id,
        tipo_evento,
        regra_id: regra.id,
        canal,
        status,
        erro,
        destinatario: regra.destinatario,
        created: now,
      };

      await dynamo.send(new PutCommand({ TableName: TABLE, Item: logItem }));
      resultados.push({ canal, status, entrega_id: entregaId, erro });
    }
  }

  return { success: true, evento_id, regras_aplicadas: regras.length, resultados };
}

/**
 * Despacha a notificação para o canal específico
 */
async function despacharCanal(canal, regra, evento, dados) {
  switch (canal) {
    case 'inapp': {
      const notifId = crypto.randomUUID();
      const now = new Date().toISOString();
      await dynamo.send(new PutCommand({
        TableName: TABLE,
        Item: {
          PK: `TENANT#${evento.tenant_id || TENANT}`,
          SK: `NTF#${notifId}`,
          GSI1PK: `TENANT#${evento.tenant_id || TENANT}`,
          GSI1SK: `NTF#${now}`,
          id: notifId,
          tipo: evento.tipo_evento,
          titulo: regra.titulo_template || evento.tipo_evento,
          mensagem: regra.mensagem_template || JSON.stringify(dados),
          lida: false,
          dados,
          evento_id: evento.evento_id,
          created: now,
        },
      }));
      break;
    }

    case 'email': {
      const { enviarEmail } = require('../adapters/notificacoes/emailAdapter');
      await enviarEmail({
        destinatario: regra.email_destinatario || dados.email,
        titulo: regra.titulo_template || evento.tipo_evento,
        corpo: regra.mensagem_template || '',
        templateData: { ...dados, tipo_evento: evento.tipo_evento },
      });
      break;
    }

    case 'whatsapp': {
      const { enviarWhatsApp } = require('../adapters/notificacoes/whatsappAdapter');
      const titulo = regra.titulo_template || evento.tipo_evento;
      const mensagem = regra.mensagem_template || dados.descricao || evento.tipo_evento;

      // Resolver destinatário: regra > dados > config admin
      let numero = regra.whatsapp_destinatario || dados.whatsapp;
      if (!numero) {
        // Buscar número admin das configs
        try {
          const configResult = await dynamo.send(new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: 'PK = :pk AND SK = :sk',
            ExpressionAttributeValues: { ':pk': `TENANT#${evento.tenant_id || TENANT}`, ':sk': 'CONFIG#whatsappBusiness' },
          }));
          numero = configResult.Items?.[0]?.valor || '';
        } catch {}
      }

      if (!numero) {
        throw new Error('Número WhatsApp do destinatário não configurado');
      }

      await enviarWhatsApp({
        numero,
        template: regra.whatsapp_template || 'notificacao_geral',
        parametros: [titulo, mensagem],
      });
      break;
    }

    default:
      throw new Error(`Canal desconhecido: ${canal}`);
  }
}

module.exports = { processarEvento };
