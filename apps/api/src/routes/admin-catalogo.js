const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

// ========== HELPERS ==========
function getTipoFromQuery(req) {
  return req.query.tipo || 'itens';
}

function getSKPrefix(tipo) {
  switch (tipo) {
    case 'categorias':
    case 'categoria':
      return 'CAT_CATALOGO#';
    case 'pacotes':
    case 'pacote':
      return 'PACOTE_CATALOGO#';
    default:
      return 'ITEM_CATALOGO#';
  }
}

// ========== GET / - Listar (itens, pacotes ou categorias) ==========
router.get('/', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const tipo = getTipoFromQuery(req);
    const skPrefix = getSKPrefix(tipo);

    logger.info({ action: 'catalogo_list', photographerId, tipo });

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': skPrefix
      }
    }));

    res.json({ success: true, data: result.Items || [] });
  } catch (error) {
    logger.error({ action: 'catalogo_list_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao listar catálogo' });
  }
});

// ========== GET /:id - Buscar por ID ==========
router.get('/:id', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;
    const tipo = getTipoFromQuery(req);
    const skPrefix = getSKPrefix(tipo);

    logger.info({ action: 'catalogo_get', photographerId, id, tipo });

    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `PHOTOGRAPHER#${photographerId}`,
        SK: `${skPrefix}${id}`
      }
    }));

    if (!result.Item) {
      return res.status(404).json({ success: false, error: 'Item não encontrado' });
    }

    res.json({ success: true, data: result.Item });
  } catch (error) {
    logger.error({ action: 'catalogo_get_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao buscar item' });
  }
});

// ========== POST / - Criar (item, pacote ou categoria) ==========
router.post('/', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const tipo = getTipoFromQuery(req);
    const skPrefix = getSKPrefix(tipo);
    const id = uuidv4();
    const now = new Date().toISOString();

    let item;

    if (tipo === 'categoria' || tipo === 'categorias') {
      // Criar categoria
      const { nome, cor } = req.body;
      if (!nome || nome.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
      }
      item = {
        PK: `PHOTOGRAPHER#${photographerId}`,
        SK: `${skPrefix}${id}`,
        GSI1PK: `PHOTOGRAPHER#${photographerId}`,
        GSI1SK: `CAT_CATALOGO#ACTIVE`,
        id,
        photographerId,
        nome: nome.trim(),
        cor: cor || '#EA580C',
        criadoEm: now,
        atualizadoEm: now
      };
    } else if (tipo === 'pacote' || tipo === 'pacotes') {
      // Criar pacote
      const { nome, descricao, itens, desconto_tipo, desconto_valor, exibir_ao_cliente } = req.body;
      if (!nome || nome.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
      }
      item = {
        PK: `PHOTOGRAPHER#${photographerId}`,
        SK: `${skPrefix}${id}`,
        GSI1PK: `PHOTOGRAPHER#${photographerId}`,
        GSI1SK: `PACOTE_CATALOGO#ACTIVE`,
        id,
        photographerId,
        nome: nome.trim(),
        descricao: descricao || '',
        itens: itens || [],
        desconto_tipo: desconto_tipo || 'percentual',
        desconto_valor: Number(desconto_valor) || 0,
        exibir_ao_cliente: exibir_ao_cliente !== false,
        ativo: true,
        criadoEm: now,
        atualizadoEm: now
      };
    } else {
      // Criar item do catálogo
      const { nome, descricao, tipo: tipoItem, valor_base, valor_hora_adicional, duracao_base, categoria_id, exibir_ao_cliente } = req.body;
      if (!nome || nome.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
      }
      item = {
        PK: `PHOTOGRAPHER#${photographerId}`,
        SK: `${skPrefix}${id}`,
        GSI1PK: `PHOTOGRAPHER#${photographerId}`,
        GSI1SK: `ITEM_CATALOGO#ACTIVE`,
        id,
        photographerId,
        nome: nome.trim(),
        descricao: descricao || '',
        tipo: tipoItem || 'servico_principal',
        valor_base: Number(valor_base) || 0,
        valor_hora_adicional: Number(valor_hora_adicional) || 0,
        duracao_base: Number(duracao_base) || 0,
        categoria_id: categoria_id || null,
        exibir_ao_cliente: exibir_ao_cliente !== false,
        ativo: true,
        criadoEm: now,
        atualizadoEm: now
      };
    }

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));

    logger.info({ action: 'catalogo_create', photographerId, id, tipo });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    logger.error({ action: 'catalogo_create_error', error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: 'Erro ao criar item' });
  }
});

// ========== PUT /:id - Atualizar ==========
router.put('/:id', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;
    const tipo = getTipoFromQuery(req);
    const skPrefix = getSKPrefix(tipo);
    const now = new Date().toISOString();

    // Verificar se existe
    const existing = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `${skPrefix}${id}` }
    }));

    if (!existing.Item) {
      return res.status(404).json({ success: false, error: 'Item não encontrado' });
    }

    const updateExpressions = [];
    const expressionValues = {};
    const expressionNames = {};

    // Campos dinâmicos baseados no body
    const body = req.body;
    const camposReservados = ['PK', 'SK', 'GSI1PK', 'id', 'photographerId', 'criadoEm'];

    Object.keys(body).forEach(key => {
      if (camposReservados.includes(key)) return;

      const safeKey = `#${key}`;
      const safeVal = `:${key}`;
      expressionNames[safeKey] = key;
      expressionValues[safeVal] = body[key];
      updateExpressions.push(`${safeKey} = ${safeVal}`);
    });

    // Sempre atualizar timestamp
    updateExpressions.push('#atualizadoEm = :atualizadoEm');
    expressionNames['#atualizadoEm'] = 'atualizadoEm';
    expressionValues[':atualizadoEm'] = now;

    // Atualizar GSI1SK se ativo mudou
    if (body.ativo !== undefined) {
      const gsi1sk = body.ativo
        ? `${skPrefix.replace('#', '')}ACTIVE`
        : `${skPrefix.replace('#', '')}INACTIVE`;
      updateExpressions.push('GSI1SK = :gsi1sk');
      expressionValues[':gsi1sk'] = gsi1sk;
    }

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `${skPrefix}${id}` },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionValues,
      ExpressionAttributeNames: expressionNames,
      ReturnValues: 'ALL_NEW'
    }));

    logger.info({ action: 'catalogo_update', photographerId, id, tipo });
    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    logger.error({ action: 'catalogo_update_error', error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: 'Erro ao atualizar item' });
  }
});

// ========== DELETE /:id - Excluir ==========
router.delete('/:id', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;
    const tipo = getTipoFromQuery(req);
    const skPrefix = getSKPrefix(tipo);

    // Verificar se existe
    const existing = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `${skPrefix}${id}` }
    }));

    if (!existing.Item) {
      return res.status(404).json({ success: false, error: 'Item não encontrado' });
    }

    // Para categorias: delete real. Para itens/pacotes: soft delete
    if (tipo === 'categoria' || tipo === 'categorias') {
      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `${skPrefix}${id}` }
      }));
    } else {
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `${skPrefix}${id}` },
        UpdateExpression: 'SET ativo = :ativo, GSI1SK = :gsi1sk, atualizadoEm = :now',
        ExpressionAttributeValues: {
          ':ativo': false,
          ':gsi1sk': `${skPrefix.replace('#', '')}INACTIVE`,
          ':now': new Date().toISOString()
        }
      }));
    }

    logger.info({ action: 'catalogo_delete', photographerId, id, tipo });
    res.json({ success: true, message: 'Removido com sucesso' });
  } catch (error) {
    logger.error({ action: 'catalogo_delete_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao remover item' });
  }
});

module.exports = router;
