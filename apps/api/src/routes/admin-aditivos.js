const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const emailService = require('../services/emailService');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

const TIPOS_VALIDOS = ['acrescimo', 'reducao', 'alteracao_data', 'upgrade_pacote'];

// GET /admin/aditivos - Listar todos
router.get('/', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    logger.info({ action: 'aditivos_list', photographerId });

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'ADITIVO#'
      }
    }));

    res.json({ success: true, data: result.Items || [] });
  } catch (error) {
    logger.error({ action: 'aditivos_list_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao listar aditivos' });
  }
});

// GET /admin/aditivos/contrato/:contratoId - Listar por contrato
router.get('/contrato/:contratoId', async (req, res) => {
  try {
    const { contratoId } = req.params;
    logger.info({ action: 'aditivos_by_contrato', contratoId });

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1sk)',
      ExpressionAttributeValues: {
        ':gsi1pk': `CONTRACT#${contratoId}`,
        ':gsi1sk': 'ADITIVO#'
      }
    }));

    res.json({ success: true, data: result.Items || [] });
  } catch (error) {
    logger.error({ action: 'aditivos_by_contrato_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao listar aditivos do contrato' });
  }
});

// POST /admin/aditivos - Criar aditivo
router.post('/', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { contratoId, clienteId, tipo, descricao, valorAnterior, valorNovo } = req.body;

    if (!contratoId || !clienteId || !tipo) {
      return res.status(400).json({ success: false, error: 'contratoId, clienteId e tipo são obrigatórios' });
    }
    if (!TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ success: false, error: `Tipo inválido. Aceitos: ${TIPOS_VALIDOS.join(', ')}` });
    }

    const id = uuidv4();
    const tokenAceite = uuidv4();
    const now = new Date().toISOString();
    const diferencaValor = (valorNovo || 0) - (valorAnterior || 0);

    const item = {
      PK: `PHOTOGRAPHER#${photographerId}`,
      SK: `ADITIVO#${id}`,
      GSI1PK: `CONTRACT#${contratoId}`,
      GSI1SK: `ADITIVO#${now}`,
      id,
      photographerId,
      contratoId,
      clienteId,
      tipo,
      descricao: descricao || '',
      valorAnterior: valorAnterior || 0,
      valorNovo: valorNovo || 0,
      diferencaValor,
      status: 'pendente',
      tokenAceite,
      aceitoEm: null,
      criadoEm: now
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    logger.info({ action: 'aditivo_create', photographerId, id, contratoId, tipo });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    logger.error({ action: 'aditivo_create_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao criar aditivo' });
  }
});

// POST /admin/aditivos/:id/enviar - Enviar para aceite do cliente
router.post('/:id/enviar', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;
    const { clienteEmail, clienteNome } = req.body;

    const current = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `ADITIVO#${id}` }
    }));

    if (!current.Item) {
      return res.status(404).json({ success: false, error: 'Aditivo não encontrado' });
    }

    if (current.Item.status !== 'pendente') {
      return res.status(400).json({ success: false, error: 'Só é possível enviar aditivos com status pendente' });
    }

    const aditivoUrl = `${process.env.FRONTEND_URL}/aditivos/${current.Item.tokenAceite}`;

    try {
      await emailService.sendEmail({
        to: clienteEmail,
        subject: 'Aditivo contratual - Ação necessária',
        html: `<p>Olá ${clienteNome || 'Cliente'},</p><p>Há um aditivo contratual pendente de aprovação.</p><p><strong>Tipo:</strong> ${current.Item.tipo}</p><p><strong>Diferença de valor:</strong> R$ ${current.Item.diferencaValor.toFixed(2)}</p><p><a href="${aditivoUrl}">Clique aqui para revisar e responder</a></p>`
      });
    } catch (emailError) {
      logger.warn({ action: 'aditivo_email_error', error: emailError.message });
    }

    logger.info({ action: 'aditivo_enviar', photographerId, id });
    res.json({ success: true, data: { message: 'Aditivo enviado para o cliente', url: aditivoUrl } });
  } catch (error) {
    logger.error({ action: 'aditivo_enviar_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao enviar aditivo' });
  }
});

// DELETE /admin/aditivos/:id - Cancelar (só se pendente)
router.delete('/:id', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;

    const current = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `ADITIVO#${id}` }
    }));

    if (!current.Item) {
      return res.status(404).json({ success: false, error: 'Aditivo não encontrado' });
    }

    if (current.Item.status !== 'pendente') {
      return res.status(400).json({ success: false, error: 'Só é possível cancelar aditivos com status pendente' });
    }

    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `ADITIVO#${id}` },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': 'cancelado' }
    }));

    logger.info({ action: 'aditivo_cancel', photographerId, id });
    res.json({ success: true, data: { message: 'Aditivo cancelado' } });
  } catch (error) {
    logger.error({ action: 'aditivo_cancel_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao cancelar aditivo' });
  }
});

module.exports = router;
