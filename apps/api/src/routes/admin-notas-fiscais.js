const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({});
const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;

// GET /admin/notas-fiscais - Listar todas (com filtro)
router.get('/', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { status, mes } = req.query;
    logger.info({ action: 'nf_list', photographerId, status, mes });

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'NF#'
      }
    }));

    let items = result.Items || [];

    if (status) {
      items = items.filter(item => item.status === status);
    }
    if (mes) {
      items = items.filter(item => item.emitidaEm && item.emitidaEm.startsWith(mes));
    }

    // Totais
    const totalValor = items.reduce((sum, item) => sum + (item.valor || 0), 0);

    res.json({
      success: true,
      data: {
        total: items.length,
        totalValor,
        notas: items
      }
    });
  } catch (error) {
    logger.error({ action: 'nf_list_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao listar notas fiscais' });
  }
});

// GET /admin/notas-fiscais/contrato/:contratoId - NFs de um contrato
router.get('/contrato/:contratoId', async (req, res) => {
  try {
    const { contratoId } = req.params;
    logger.info({ action: 'nf_by_contrato', contratoId });

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1sk)',
      ExpressionAttributeValues: {
        ':gsi1pk': `CONTRACT#${contratoId}`,
        ':gsi1sk': 'NF#'
      }
    }));

    res.json({ success: true, data: result.Items || [] });
  } catch (error) {
    logger.error({ action: 'nf_by_contrato_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao listar NFs do contrato' });
  }
});

// GET /admin/notas-fiscais/:id - Detalhe
router.get('/:id', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;

    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `NF#${id}` }
    }));

    if (!result.Item) {
      return res.status(404).json({ success: false, error: 'Nota fiscal não encontrada' });
    }

    res.json({ success: true, data: result.Item });
  } catch (error) {
    logger.error({ action: 'nf_get_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao buscar nota fiscal' });
  }
});

// POST /admin/notas-fiscais - Registrar NF
router.post('/', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { contratoId, clienteId, clienteNome, numero, valor, descricaoServico, emitidaEm } = req.body;

    if (!contratoId) {
      return res.status(400).json({ success: false, error: 'contratoId é obrigatório' });
    }
    if (!valor || valor <= 0) {
      return res.status(400).json({ success: false, error: 'valor é obrigatório e deve ser > 0' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const status = numero ? 'emitida' : 'pendente';

    const item = {
      PK: `PHOTOGRAPHER#${photographerId}`,
      SK: `NF#${id}`,
      GSI1PK: `CONTRACT#${contratoId}`,
      GSI1SK: `NF#${emitidaEm || now}`,
      id,
      photographerId,
      contratoId,
      clienteId: clienteId || '',
      clienteNome: clienteNome || '',
      numero: numero || '',
      valor: Number(valor),
      status,
      arquivoS3Key: null,
      descricaoServico: descricaoServico || '',
      emitidaEm: emitidaEm || null,
      criadoEm: now,
      atualizadoEm: now
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    logger.info({ action: 'nf_create', photographerId, id, contratoId, status });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    logger.error({ action: 'nf_create_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao registrar nota fiscal' });
  }
});

// PUT /admin/notas-fiscais/:id - Atualizar
router.put('/:id', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;
    const { numero, valor, status, descricaoServico, emitidaEm } = req.body;

    const updateExpressions = [];
    const expressionValues = {};
    const expressionNames = {};

    if (numero !== undefined) { updateExpressions.push('numero = :numero'); expressionValues[':numero'] = numero; }
    if (valor !== undefined) { updateExpressions.push('valor = :valor'); expressionValues[':valor'] = Number(valor); }
    if (status) {
      const statusValidos = ['pendente', 'emitida', 'cancelada'];
      if (!statusValidos.includes(status)) {
        return res.status(400).json({ success: false, error: `Status inválido. Aceitos: ${statusValidos.join(', ')}` });
      }
      updateExpressions.push('#status = :status');
      expressionValues[':status'] = status;
      expressionNames['#status'] = 'status';
    }
    if (descricaoServico !== undefined) { updateExpressions.push('descricaoServico = :desc'); expressionValues[':desc'] = descricaoServico; }
    if (emitidaEm !== undefined) { updateExpressions.push('emitidaEm = :emitidaEm'); expressionValues[':emitidaEm'] = emitidaEm; }

    updateExpressions.push('atualizadoEm = :now');
    expressionValues[':now'] = new Date().toISOString();

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `NF#${id}` },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionValues,
      ...(Object.keys(expressionNames).length > 0 && { ExpressionAttributeNames: expressionNames }),
      ReturnValues: 'ALL_NEW'
    }));

    logger.info({ action: 'nf_update', photographerId, id });
    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    logger.error({ action: 'nf_update_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao atualizar nota fiscal' });
  }
});

// PATCH /admin/notas-fiscais/:id/upload - Gerar presigned URL
router.patch('/:id/upload', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;

    const key = `notas-fiscais/${photographerId}/${id}.pdf`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: 'application/pdf'
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // Salvar referência do arquivo
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `NF#${id}` },
      UpdateExpression: 'SET arquivoS3Key = :key, atualizadoEm = :now',
      ExpressionAttributeValues: {
        ':key': key,
        ':now': new Date().toISOString()
      }
    }));

    logger.info({ action: 'nf_upload_url', photographerId, id, key });
    res.json({ success: true, data: { uploadUrl, key } });
  } catch (error) {
    logger.error({ action: 'nf_upload_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao gerar URL de upload' });
  }
});

// DELETE /admin/notas-fiscais/:id - Cancelar (soft)
router.delete('/:id', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `NF#${id}` },
      UpdateExpression: 'SET #status = :status, atualizadoEm = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'cancelada',
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }));

    logger.info({ action: 'nf_cancel', photographerId, id });
    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    logger.error({ action: 'nf_cancel_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao cancelar nota fiscal' });
  }
});

module.exports = router;
