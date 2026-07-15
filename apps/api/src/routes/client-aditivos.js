const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const logger = require('../config/logger');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

// Buscar aditivo por token
async function findByToken(token) {
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'tokenAceite = :token AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':token': token,
      ':sk': 'ADITIVO#'
    }
  }));
  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
}

// GET /client/aditivos/:token - Ver detalhes
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const aditivo = await findByToken(token);

    if (!aditivo) {
      return res.status(404).json({ success: false, error: 'Aditivo não encontrado' });
    }

    if (aditivo.status !== 'pendente') {
      return res.status(410).json({ success: false, error: 'Este aditivo já foi respondido', status: aditivo.status });
    }

    res.json({
      success: true,
      data: {
        tipo: aditivo.tipo,
        descricao: aditivo.descricao,
        valorAnterior: aditivo.valorAnterior,
        valorNovo: aditivo.valorNovo,
        diferencaValor: aditivo.diferencaValor,
        criadoEm: aditivo.criadoEm
      }
    });
  } catch (error) {
    logger.error({ action: 'client_aditivo_get_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao buscar aditivo' });
  }
});

// POST /client/aditivos/:token/aceitar
router.post('/:token/aceitar', async (req, res) => {
  try {
    const { token } = req.params;
    const aditivo = await findByToken(token);

    if (!aditivo) {
      return res.status(404).json({ success: false, error: 'Aditivo não encontrado' });
    }

    if (aditivo.status !== 'pendente') {
      return res.status(410).json({ success: false, error: 'Este aditivo já foi respondido' });
    }

    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: aditivo.PK, SK: aditivo.SK },
      UpdateExpression: 'SET #status = :status, aceitoEm = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'aceito',
        ':now': new Date().toISOString()
      }
    }));

    logger.info({ action: 'client_aditivo_aceitar', aditivoId: aditivo.id });
    res.json({ success: true, data: { message: 'Aditivo aceito com sucesso' } });
  } catch (error) {
    logger.error({ action: 'client_aditivo_aceitar_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao aceitar aditivo' });
  }
});

// POST /client/aditivos/:token/recusar
router.post('/:token/recusar', async (req, res) => {
  try {
    const { token } = req.params;
    const { motivo } = req.body;
    const aditivo = await findByToken(token);

    if (!aditivo) {
      return res.status(404).json({ success: false, error: 'Aditivo não encontrado' });
    }

    if (aditivo.status !== 'pendente') {
      return res.status(410).json({ success: false, error: 'Este aditivo já foi respondido' });
    }

    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: aditivo.PK, SK: aditivo.SK },
      UpdateExpression: 'SET #status = :status, motivoRecusa = :motivo, respondidoEm = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'recusado',
        ':motivo': motivo || '',
        ':now': new Date().toISOString()
      }
    }));

    logger.info({ action: 'client_aditivo_recusar', aditivoId: aditivo.id });
    res.json({ success: true, data: { message: 'Aditivo recusado' } });
  } catch (error) {
    logger.error({ action: 'client_aditivo_recusar_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao recusar aditivo' });
  }
});

module.exports = router;
