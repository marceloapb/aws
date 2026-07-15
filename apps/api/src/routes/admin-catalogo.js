const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

const TIPOS_VALIDOS = ['ensaio', 'casamento', 'evento', 'corporativo', 'custom'];

// GET /admin/catalogo - Listar todos os pacotes
router.get('/', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    logger.info({ action: 'catalogo_list', photographerId });

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'CATALOGO#'
      }
    }));

    res.json({ success: true, data: result.Items || [] });
  } catch (error) {
    logger.error({ action: 'catalogo_list_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao listar catálogo' });
  }
});

// GET /admin/catalogo/:id - Buscar por ID
router.get('/:id', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;
    logger.info({ action: 'catalogo_get', photographerId, id });

    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `PHOTOGRAPHER#${photographerId}`,
        SK: `CATALOGO#${id}`
      }
    }));

    if (!result.Item) {
      return res.status(404).json({ success: false, error: 'Pacote não encontrado' });
    }

    res.json({ success: true, data: result.Item });
  } catch (error) {
    logger.error({ action: 'catalogo_get_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao buscar pacote' });
  }
});

// POST /admin/catalogo - Criar novo pacote
router.post('/', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { nome, descricao, tipo, preco, itensInclusos, quantidadeFotos, duracaoHoras } = req.body;

    // Validação
    if (!nome || nome.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
    }
    if (nome.length > 100) {
      return res.status(400).json({ success: false, error: 'Nome deve ter no máximo 100 caracteres' });
    }
    if (preco === undefined || preco === null || preco < 0) {
      return res.status(400).json({ success: false, error: 'Preço é obrigatório e deve ser >= 0' });
    }
    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ success: false, error: `Tipo inválido. Valores aceitos: ${TIPOS_VALIDOS.join(', ')}` });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const item = {
      PK: `PHOTOGRAPHER#${photographerId}`,
      SK: `CATALOGO#${id}`,
      GSI1PK: `PHOTOGRAPHER#${photographerId}`,
      GSI1SK: 'CATALOGO#ACTIVE',
      id,
      photographerId,
      nome: nome.trim(),
      descricao: descricao || '',
      tipo: tipo || 'custom',
      preco: Number(preco),
      itensInclusos: itensInclusos || [],
      quantidadeFotos: quantidadeFotos || 0,
      duracaoHoras: duracaoHoras || 0,
      ativo: true,
      criadoEm: now,
      atualizadoEm: now
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));

    logger.info({ action: 'catalogo_create', photographerId, id });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    logger.error({ action: 'catalogo_create_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao criar pacote' });
  }
});

// PUT /admin/catalogo/:id - Atualizar pacote
router.put('/:id', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;
    const { nome, descricao, tipo, preco, itensInclusos, quantidadeFotos, duracaoHoras } = req.body;

    if (nome && nome.length > 100) {
      return res.status(400).json({ success: false, error: 'Nome deve ter no máximo 100 caracteres' });
    }
    if (preco !== undefined && preco < 0) {
      return res.status(400).json({ success: false, error: 'Preço deve ser >= 0' });
    }
    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ success: false, error: `Tipo inválido. Valores aceitos: ${TIPOS_VALIDOS.join(', ')}` });
    }

    const updateExpressions = [];
    const expressionValues = {};
    const expressionNames = {};

    if (nome) { updateExpressions.push('#nome = :nome'); expressionValues[':nome'] = nome.trim(); expressionNames['#nome'] = 'nome'; }
    if (descricao !== undefined) { updateExpressions.push('descricao = :descricao'); expressionValues[':descricao'] = descricao; }
    if (tipo) { updateExpressions.push('tipo = :tipo'); expressionValues[':tipo'] = tipo; }
    if (preco !== undefined) { updateExpressions.push('preco = :preco'); expressionValues[':preco'] = Number(preco); }
    if (itensInclusos) { updateExpressions.push('itensInclusos = :itens'); expressionValues[':itens'] = itensInclusos; }
    if (quantidadeFotos !== undefined) { updateExpressions.push('quantidadeFotos = :qtdFotos'); expressionValues[':qtdFotos'] = quantidadeFotos; }
    if (duracaoHoras !== undefined) { updateExpressions.push('duracaoHoras = :duracao'); expressionValues[':duracao'] = duracaoHoras; }

    updateExpressions.push('atualizadoEm = :now');
    expressionValues[':now'] = new Date().toISOString();

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `PHOTOGRAPHER#${photographerId}`,
        SK: `CATALOGO#${id}`
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionValues,
      ...(Object.keys(expressionNames).length > 0 && { ExpressionAttributeNames: expressionNames }),
      ReturnValues: 'ALL_NEW'
    }));

    logger.info({ action: 'catalogo_update', photographerId, id });
    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    logger.error({ action: 'catalogo_update_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao atualizar pacote' });
  }
});

// PATCH /admin/catalogo/:id/toggle - Ativar/Desativar
router.patch('/:id/toggle', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;

    // Buscar item atual
    const current = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `CATALOGO#${id}` }
    }));

    if (!current.Item) {
      return res.status(404).json({ success: false, error: 'Pacote não encontrado' });
    }

    const novoStatus = !current.Item.ativo;
    const gsi1sk = novoStatus ? 'CATALOGO#ACTIVE' : 'CATALOGO#INACTIVE';

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `CATALOGO#${id}` },
      UpdateExpression: 'SET ativo = :ativo, GSI1SK = :gsi1sk, atualizadoEm = :now',
      ExpressionAttributeValues: {
        ':ativo': novoStatus,
        ':gsi1sk': gsi1sk,
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }));

    logger.info({ action: 'catalogo_toggle', photographerId, id, ativo: novoStatus });
    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    logger.error({ action: 'catalogo_toggle_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao alterar status do pacote' });
  }
});

// DELETE /admin/catalogo/:id - Soft delete
router.delete('/:id', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `CATALOGO#${id}` },
      UpdateExpression: 'SET ativo = :ativo, GSI1SK = :gsi1sk, atualizadoEm = :now',
      ExpressionAttributeValues: {
        ':ativo': false,
        ':gsi1sk': 'CATALOGO#INACTIVE',
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }));

    logger.info({ action: 'catalogo_delete', photographerId, id });
    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    logger.error({ action: 'catalogo_delete_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao remover pacote' });
  }
});

module.exports = router;
