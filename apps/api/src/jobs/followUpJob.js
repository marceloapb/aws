const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

// Prazos configuráveis (em dias)
const PRAZOS = {
  cobranca_atrasada: 0,       // no dia do vencimento
  solicitar_feedback: 7,      // 7 dias após entrega do álbum
  preparar_evento: 3          // 3 dias antes do evento
};

/**
 * Verifica se já existe pendência ativa para a mesma referência
 */
async function pendenciaJaExiste(photographerId, tipo, referenciaId) {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `PHOTOGRAPHER#${photographerId}`,
      ':sk': 'PENDENCIA#'
    }
  }));

  const existente = (result.Items || []).find(
    p => p.tipo === tipo && p.referenciaId === referenciaId && p.status !== 'concluida' && p.status !== 'cancelada'
  );

  return !!existente;
}

/**
 * Cria uma pendência automática
 */
async function criarPendencia(photographerId, { tipo, titulo, descricao, referenciaId, prioridade }) {
  const id = uuidv4();
  const now = new Date().toISOString();

  const item = {
    PK: `PHOTOGRAPHER#${photographerId}`,
    SK: `PENDENCIA#${id}`,
    id,
    photographerId,
    tipo,
    titulo,
    descricao,
    referenciaId,
    prioridade: prioridade || 'media',
    status: 'pendente',
    origem: 'automatico',
    autoGerada: true,
    criadoEm: now,
    atualizadoEm: now
  };

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return id;
}

/**
 * Check 1: Cobranças atrasadas
 */
async function checkCobrancasAtrasadas(photographerId, hoje) {
  let created = 0;
  let skipped = 0;

  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `PHOTOGRAPHER#${photographerId}`,
      ':sk': 'COBRANCA#'
    }
  }));

  const atrasadas = (result.Items || []).filter(
    c => c.status === 'pendente' && c.vencimento && c.vencimento < hoje
  );

  for (const cobranca of atrasadas) {
    const referenciaId = cobranca.id || cobranca.SK;
    const existe = await pendenciaJaExiste(photographerId, 'cobranca_atrasada', referenciaId);

    if (existe) {
      skipped++;
    } else {
      await criarPendencia(photographerId, {
        tipo: 'cobranca_atrasada',
        titulo: `Cobrança atrasada: R$ ${(cobranca.valor || 0).toFixed(2)}`,
        descricao: `Vencimento: ${cobranca.vencimento}. Cliente: ${cobranca.clienteNome || 'N/A'}`,
        referenciaId,
        prioridade: 'alta'
      });
      created++;
    }
  }

  return { created, skipped };
}

/**
 * Check 2: Álbuns entregues sem feedback
 */
async function checkFeedbackPendente(photographerId, hoje) {
  let created = 0;
  let skipped = 0;

  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `PHOTOGRAPHER#${photographerId}`,
      ':sk': 'ALBUM#'
    }
  }));

  const limitDate = new Date(Date.now() - PRAZOS.solicitar_feedback * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const albumsElegíveis = (result.Items || []).filter(
    a => a.status === 'entregue' && a.entregueEm && a.entregueEm.slice(0, 10) < limitDate
  );

  for (const album of albumsElegíveis) {
    const referenciaId = album.id || album.SK;
    const existe = await pendenciaJaExiste(photographerId, 'solicitar_feedback', referenciaId);

    if (existe) {
      skipped++;
    } else {
      await criarPendencia(photographerId, {
        tipo: 'solicitar_feedback',
        titulo: `Solicitar feedback: ${album.titulo || album.nome || 'Álbum'}`,
        descricao: `Álbum entregue em ${album.entregueEm}. Sem feedback há mais de ${PRAZOS.solicitar_feedback} dias.`,
        referenciaId,
        prioridade: 'media'
      });
      created++;
    }
  }

  return { created, skipped };
}

/**
 * Check 3: Eventos próximos (preparação)
 */
async function checkEventosProximos(photographerId, hoje) {
  let created = 0;
  let skipped = 0;

  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `PHOTOGRAPHER#${photographerId}`,
      ':sk': 'AGENDA#'
    }
  }));

  const limiteFuturo = new Date(Date.now() + PRAZOS.preparar_evento * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const eventosProximos = (result.Items || []).filter(
    e => e.dataEvento && e.dataEvento >= hoje && e.dataEvento <= limiteFuturo && e.status !== 'cancelado'
  );

  for (const evento of eventosProximos) {
    const referenciaId = evento.id || evento.SK;
    const existe = await pendenciaJaExiste(photographerId, 'preparar_evento', referenciaId);

    if (existe) {
      skipped++;
    } else {
      await criarPendencia(photographerId, {
        tipo: 'preparar_evento',
        titulo: `Preparar: ${evento.titulo || evento.tipo || 'Evento'} em ${evento.dataEvento}`,
        descricao: `Evento em ${PRAZOS.preparar_evento} dias ou menos. Verificar equipamentos e checklist.`,
        referenciaId,
        prioridade: 'alta'
      });
      created++;
    }
  }

  return { created, skipped };
}

/**
 * Handler principal — executado diariamente via EventBridge
 */
exports.handler = async (event) => {
  logger.info({ action: 'followup_job_start', event });
  const hoje = new Date().toISOString().slice(0, 10);

  let totalCreated = 0;
  let totalSkipped = 0;

  try {
    // Buscar todos os fotógrafos (usando Scan com filtro no SK = PROFILE)
    const photographersResult = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':sk': 'PROFILE#' }
    }));

    const photographers = photographersResult.Items || [];
    logger.info({ action: 'followup_photographers_found', count: photographers.length });

    for (const photographer of photographers) {
      const photographerId = photographer.PK.replace('PHOTOGRAPHER#', '');

      const [cobrancas, feedbacks, eventos] = await Promise.all([
        checkCobrancasAtrasadas(photographerId, hoje),
        checkFeedbackPendente(photographerId, hoje),
        checkEventosProximos(photographerId, hoje)
      ]);

      totalCreated += cobrancas.created + feedbacks.created + eventos.created;
      totalSkipped += cobrancas.skipped + feedbacks.skipped + eventos.skipped;

      logger.info({
        action: 'followup_photographer_done',
        photographerId,
        cobrancas,
        feedbacks,
        eventos
      });
    }

    logger.info({ action: 'followup_job_complete', totalCreated, totalSkipped });
    return { statusCode: 200, body: { created: totalCreated, skipped: totalSkipped } };
  } catch (error) {
    logger.error({ action: 'followup_job_error', error: error.message, stack: error.stack });
    throw error;
  }
};
