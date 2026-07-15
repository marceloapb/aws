const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const emailService = require('../services/emailService');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

// GET /admin/feedback - Listar todos com NPS
router.get('/', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    logger.info({ action: 'feedback_list', photographerId });

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'FEEDBACK#'
      }
    }));

    const feedbacks = result.Items || [];
    const respondidos = feedbacks.filter(f => f.nota !== null && f.nota !== undefined);
    const mediaNotas = respondidos.length > 0
      ? (respondidos.reduce((sum, f) => sum + f.nota, 0) / respondidos.length).toFixed(1)
      : null;

    res.json({
      success: true,
      data: {
        mediaNotas: mediaNotas ? parseFloat(mediaNotas) : null,
        totalRespostas: respondidos.length,
        totalPendentes: feedbacks.length - respondidos.length,
        feedbacks
      }
    });
  } catch (error) {
    logger.error({ action: 'feedback_list_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao listar feedbacks' });
  }
});

// GET /admin/feedback/:id - Detalhe
router.get('/:id', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;

    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `FEEDBACK#${id}` }
    }));

    if (!result.Item) {
      return res.status(404).json({ success: false, error: 'Feedback não encontrado' });
    }

    res.json({ success: true, data: result.Item });
  } catch (error) {
    logger.error({ action: 'feedback_get_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao buscar feedback' });
  }
});

// POST /admin/feedback/solicitar - Gerar solicitação
router.post('/solicitar', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { clienteId, clienteNome, clienteEmail, eventoId } = req.body;

    if (!clienteId || !clienteNome || !clienteEmail) {
      return res.status(400).json({ success: false, error: 'clienteId, clienteNome e clienteEmail são obrigatórios' });
    }

    const id = uuidv4();
    const tokenAcesso = uuidv4();
    const now = new Date().toISOString();

    const item = {
      PK: `PHOTOGRAPHER#${photographerId}`,
      SK: `FEEDBACK#${id}`,
      GSI1PK: `CLIENT#${clienteId}`,
      GSI1SK: `FEEDBACK#${now}`,
      id,
      photographerId,
      clienteId,
      clienteNome,
      clienteEmail,
      eventoId: eventoId || null,
      nota: null,
      comentario: null,
      autorizado: false,
      tokenAcesso,
      respondidoEm: null,
      criadoEm: now
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    // Enviar email com link
    const feedbackUrl = `${process.env.FRONTEND_URL}/feedback/${tokenAcesso}`;
    try {
      await emailService.sendEmail({
        to: clienteEmail,
        subject: 'Queremos saber sua opinião!',
        html: `<p>Olá ${clienteNome},</p><p>Gostaríamos de saber como foi sua experiência conosco.</p><p><a href="${feedbackUrl}">Clique aqui para avaliar</a></p><p>Obrigado!</p>`
      });
    } catch (emailError) {
      logger.warn({ action: 'feedback_email_error', error: emailError.message });
    }

    logger.info({ action: 'feedback_solicitar', photographerId, id, clienteId });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    logger.error({ action: 'feedback_solicitar_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao solicitar feedback' });
  }
});

// PATCH /admin/feedback/:id/autorizar - Toggle autorização
router.patch('/:id/autorizar', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;

    const current = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `FEEDBACK#${id}` }
    }));

    if (!current.Item) {
      return res.status(404).json({ success: false, error: 'Feedback não encontrado' });
    }

    const novoStatus = !current.Item.autorizado;

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `FEEDBACK#${id}` },
      UpdateExpression: 'SET autorizado = :autorizado',
      ExpressionAttributeValues: { ':autorizado': novoStatus },
      ReturnValues: 'ALL_NEW'
    }));

    logger.info({ action: 'feedback_autorizar', photographerId, id, autorizado: novoStatus });
    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    logger.error({ action: 'feedback_autorizar_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao autorizar feedback' });
  }
});

module.exports = router;
