const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const logger = require('../config/logger');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

// Buscar feedback por token
async function findByToken(token) {
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'tokenAcesso = :token AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':token': token,
      ':sk': 'FEEDBACK#'
    }
  }));
  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
}

// GET /client/feedback/:token - Ver dados do pedido
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const feedback = await findByToken(token);

    if (!feedback) {
      return res.status(404).json({ success: false, error: 'Solicitação de feedback não encontrada' });
    }

    if (feedback.respondidoEm) {
      return res.status(410).json({ success: false, error: 'Este feedback já foi respondido' });
    }

    res.json({
      success: true,
      data: {
        clienteNome: feedback.clienteNome,
        eventoId: feedback.eventoId,
        criadoEm: feedback.criadoEm
      }
    });
  } catch (error) {
    logger.error({ action: 'client_feedback_get_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao buscar feedback' });
  }
});

// POST /client/feedback/:token - Submeter avaliação
router.post('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { nota, comentario } = req.body;

    if (!nota || nota < 1 || nota > 5) {
      return res.status(400).json({ success: false, error: 'Nota é obrigatória e deve ser entre 1 e 5' });
    }

    const feedback = await findByToken(token);

    if (!feedback) {
      return res.status(404).json({ success: false, error: 'Solicitação de feedback não encontrada' });
    }

    if (feedback.respondidoEm) {
      return res.status(410).json({ success: false, error: 'Este feedback já foi respondido' });
    }

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: feedback.PK, SK: feedback.SK },
      UpdateExpression: 'SET nota = :nota, comentario = :comentario, respondidoEm = :now',
      ExpressionAttributeValues: {
        ':nota': Number(nota),
        ':comentario': comentario || '',
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }));

    logger.info({ action: 'client_feedback_submit', feedbackId: feedback.id, nota });
    res.json({ success: true, data: { message: 'Obrigado pela sua avaliação!' } });
  } catch (error) {
    logger.error({ action: 'client_feedback_submit_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao submeter feedback' });
  }
});

module.exports = router;
