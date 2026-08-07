// ══════════════════════════════════════════════════════════════
// JOBS/CONTRATO-EXPIRACAO-JOB.JS
// Job agendado para expirar contratos pendentes e enviar lembretes
// Executa diariamente via EventBridge Schedule
// ══════════════════════════════════════════════════════════════

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const logger = require('../config/logger');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

// Configurações
const HORAS_PARA_EXPIRAR = 72; // Link expira após 72h
const HORAS_PARA_LEMBRETE = 48; // Envia lembrete após 48h sem assinatura

/**
 * Handler principal — executado diariamente via EventBridge
 * 1. Expira contratos cujo link ultrapassou o prazo
 * 2. Envia lembretes para contratos prestes a expirar
 */
exports.handler = async (event) => {
  logger.info({ action: 'contrato_expiracao_job_start', event });

  const now = new Date();
  let expirados = 0;
  let lembretes = 0;

  try {
    // Buscar todos os contratos com status 'enviado'
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: '#s = :statusEnviado OR #s = :statusPendente',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':pk': 'CONTRATO',
        ':statusEnviado': 'enviado',
        ':statusPendente': 'pendente_assinatura',
      },
    }));

    const contratos = result.Items || [];
    logger.info({ action: 'contratos_pendentes_encontrados', count: contratos.length });

    for (const contrato of contratos) {
      const enviadoEm = contrato.enviado_em ? new Date(contrato.enviado_em) : null;
      if (!enviadoEm) continue;

      const horasDesdeEnvio = (now.getTime() - enviadoEm.getTime()) / (1000 * 60 * 60);

      // Expirar contratos que ultrapassaram o prazo
      if (horasDesdeEnvio >= HORAS_PARA_EXPIRAR) {
        await expirarContrato(contrato);
        expirados++;
        continue;
      }

      // Enviar lembrete para contratos prestes a expirar
      if (horasDesdeEnvio >= HORAS_PARA_LEMBRETE && !contrato.lembrete_enviado) {
        await marcarLembreteEnviado(contrato);
        lembretes++;
      }
    }

    logger.info({
      action: 'contrato_expiracao_job_complete',
      expirados,
      lembretes,
      totalAnalisados: contratos.length,
    });

    return {
      statusCode: 200,
      body: { expirados, lembretes },
    };
  } catch (error) {
    logger.error({
      action: 'contrato_expiracao_job_error',
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Marca contrato como expirado e notifica cliente + admin
 */
async function expirarContrato(contrato) {
  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: contrato.PK, SK: contrato.SK },
    UpdateExpression: 'SET #s = :s, expirado_em = :e',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':s': 'expirado',
      ':e': new Date().toISOString(),
    },
  }));

  // Notificar que contrato expirou (admin + cliente via dispatcher)
  try {
    const { processarEvento } = require('../services/notificationDispatcher');
    const crypto = require('crypto');
    await processarEvento({
      evento_id: crypto.randomUUID(),
      tipo_evento: 'contrato_expirado',
      tenant_id: process.env.TENANT_ID || '1',
      dados: {
        cliente_id: contrato.cliente_id,
        cliente_nome: contrato.cliente_nome || '',
        tipo_evento: contrato.tipo_evento || contrato.evento_nome || 'evento',
        contrato_id: contrato.id,
      },
    });
    logger.info({ action: 'contrato_expirado_notificacao_enviada', contratoId: contrato.id });
  } catch (notifErr) {
    logger.error({ action: 'contrato_expirado_notificacao_erro', contratoId: contrato.id, error: notifErr.message });
  }

  logger.info({
    action: 'contrato_expirado',
    contratoId: contrato.id,
    clienteId: contrato.cliente_id,
    enviadoEm: contrato.enviado_em,
  });
}

/**
 * Marca que lembrete foi enviado e ENVIA notificação real ao cliente
 */
async function marcarLembreteEnviado(contrato) {
  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: contrato.PK, SK: contrato.SK },
    UpdateExpression: 'SET lembrete_enviado = :l, lembrete_em = :le',
    ExpressionAttributeValues: {
      ':l': true,
      ':le': new Date().toISOString(),
    },
  }));

  // Enviar notificação real ao cliente (WhatsApp + Email via dispatcher)
  try {
    const { processarEvento } = require('../services/notificationDispatcher');
    const crypto = require('crypto');
    await processarEvento({
      evento_id: crypto.randomUUID(),
      tipo_evento: 'contrato_expirando',
      tenant_id: process.env.TENANT_ID || '1',
      dados: {
        cliente_id: contrato.cliente_id,
        cliente_nome: contrato.cliente_nome || '',
        tipo_evento: contrato.tipo_evento || contrato.evento_nome || 'evento',
        horas_restantes: String(Math.round(HORAS_PARA_EXPIRAR - ((new Date().getTime() - new Date(contrato.enviado_em).getTime()) / (1000 * 60 * 60)))),
        contrato_id: contrato.id,
      },
    });
    logger.info({ action: 'contrato_lembrete_notificacao_enviada', contratoId: contrato.id });
  } catch (notifErr) {
    logger.error({ action: 'contrato_lembrete_notificacao_erro', contratoId: contrato.id, error: notifErr.message });
  }

  logger.info({
    action: 'contrato_lembrete_marcado',
    contratoId: contrato.id,
    clienteId: contrato.cliente_id,
  });
}
