const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { gerarPresignedUrl, deletarFotosCategoria } = require('../services/portfolioService');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('../config/logger');

const router = Router();
const s3 = new S3Client({});
const BUCKET = process.env.S3_BUCKET_NAME;
const PK_TENANT = 'TENANT#1';

// ─────────────────────────────────────────────────────────────
// CATEGORIAS
// ─────────────────────────────────────────────────────────────

// POST /categorias — Criar categoria
router.post('/categorias', async (req, res) => {
  try {
    const { nome, texto, visivel, ordem } = req.body;

    if (!nome || nome.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'nome é obrigatório' });
    }
    if (nome.length > 100) {
      return res.status(400).json({ success: false, message: 'nome deve ter no máximo 100 caracteres' });
    }
    if (texto && texto.length > 500) {
      return res.status(400).json({ success: false, message: 'texto deve ter no máximo 500 caracteres' });
    }

    const id = uuidv4();
    const ordemVal = ordem !== undefined ? Number(ordem) : 0;
    const ordemPadded = String(ordemVal).padStart(5, '0');
    const now = new Date().toISOString();

    const item = {
      PK: PK_TENANT,
      SK: `CATPORTFOLIO#${ordemPadded}#${id}`,
      id,
      nome: nome.trim(),
      texto: texto ? texto.trim() : '',
      visivel: visivel !== undefined ? Boolean(visivel) : true,
      ordem: ordemVal,
      criadoEm: now,
      atualizadoEm: now,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    logger.info({ action: 'portfolio_categoria_created', id, nome: item.nome });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    logger.error({ action: 'portfolio_categoria_create_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /categorias — Listar categorias ordenadas por ordem
router.get('/categorias', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': PK_TENANT,
        ':sk': 'CATPORTFOLIO#',
      },
    }));

    const categorias = (result.Items || []).sort((a, b) => a.ordem - b.ordem);
    res.json({ success: true, data: categorias });
  } catch (error) {
    logger.error({ action: 'portfolio_categorias_list_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /categorias/:id — Atualizar categoria
router.put('/categorias/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, texto, visivel, ordem } = req.body;

    // Find existing category
    const existing = await findCategoriaById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
    }

    if (nome && nome.length > 100) {
      return res.status(400).json({ success: false, message: 'nome deve ter no máximo 100 caracteres' });
    }
    if (texto && texto.length > 500) {
      return res.status(400).json({ success: false, message: 'texto deve ter no máximo 500 caracteres' });
    }

    const ordemChanged = ordem !== undefined && Number(ordem) !== existing.ordem;

    if (ordemChanged) {
      // SK contains ordem, so we need to delete and recreate
      const newOrdemVal = Number(ordem);
      const newOrdemPadded = String(newOrdemVal).padStart(5, '0');
      const newSK = `CATPORTFOLIO#${newOrdemPadded}#${id}`;

      // Delete old record
      await dynamo.send(new DeleteCommand({
        TableName: TABLE,
        Key: { PK: PK_TENANT, SK: existing.SK },
      }));

      // Create new record with updated values
      const updated = {
        ...existing,
        SK: newSK,
        nome: nome !== undefined ? nome.trim() : existing.nome,
        texto: texto !== undefined ? texto.trim() : existing.texto,
        visivel: visivel !== undefined ? Boolean(visivel) : existing.visivel,
        ordem: newOrdemVal,
        atualizadoEm: new Date().toISOString(),
      };

      await dynamo.send(new PutCommand({ TableName: TABLE, Item: updated }));
      res.json({ success: true, data: updated });
    } else {
      // Update in place
      const updateParts = [];
      const exprNames = {};
      const exprValues = {};

      if (nome !== undefined) {
        updateParts.push('#nome = :nome');
        exprNames['#nome'] = 'nome';
        exprValues[':nome'] = nome.trim();
      }
      if (texto !== undefined) {
        updateParts.push('#texto = :texto');
        exprNames['#texto'] = 'texto';
        exprValues[':texto'] = texto.trim();
      }
      if (visivel !== undefined) {
        updateParts.push('#visivel = :visivel');
        exprNames['#visivel'] = 'visivel';
        exprValues[':visivel'] = Boolean(visivel);
      }

      updateParts.push('#atualizadoEm = :atualizadoEm');
      exprNames['#atualizadoEm'] = 'atualizadoEm';
      exprValues[':atualizadoEm'] = new Date().toISOString();

      const result = await dynamo.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: PK_TENANT, SK: existing.SK },
        UpdateExpression: `SET ${updateParts.join(', ')}`,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ReturnValues: 'ALL_NEW',
      }));

      res.json({ success: true, data: result.Attributes });
    }
  } catch (error) {
    logger.error({ action: 'portfolio_categoria_update_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /categorias/:id — Deletar categoria e suas fotos
router.delete('/categorias/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await findCategoriaById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
    }

    // Delete all photos in the category
    await deletarFotosCategoria(id);

    // Delete the category itself
    await dynamo.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: PK_TENANT, SK: existing.SK },
    }));

    logger.info({ action: 'portfolio_categoria_deleted', id });
    res.json({ success: true, data: { message: 'Categoria e fotos excluídas com sucesso' } });
  } catch (error) {
    logger.error({ action: 'portfolio_categoria_delete_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /categorias/ordem — Reordenar categorias em batch
router.patch('/categorias/ordem', async (req, res) => {
  try {
    const { categorias } = req.body;

    if (!Array.isArray(categorias) || categorias.length === 0) {
      return res.status(400).json({ success: false, message: 'Array de categorias é obrigatório' });
    }

    for (const item of categorias) {
      if (!item.id || item.ordem === undefined) {
        return res.status(400).json({ success: false, message: 'Cada item deve ter id e ordem' });
      }

      const existing = await findCategoriaById(item.id);
      if (!existing) continue;

      const newOrdemVal = Number(item.ordem);
      const newOrdemPadded = String(newOrdemVal).padStart(5, '0');
      const newSK = `CATPORTFOLIO#${newOrdemPadded}#${item.id}`;

      // Delete old, create new with updated SK
      await dynamo.send(new DeleteCommand({
        TableName: TABLE,
        Key: { PK: PK_TENANT, SK: existing.SK },
      }));

      await dynamo.send(new PutCommand({
        TableName: TABLE,
        Item: {
          ...existing,
          SK: newSK,
          ordem: newOrdemVal,
          atualizadoEm: new Date().toISOString(),
        },
      }));
    }

    res.json({ success: true, data: { message: 'Categorias reordenadas com sucesso' } });
  } catch (error) {
    logger.error({ action: 'portfolio_categorias_reorder_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /categorias/:id/visibilidade — Toggle visibilidade
router.patch('/categorias/:id/visibilidade', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await findCategoriaById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
    }

    const newVisivel = !existing.visivel;

    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: PK_TENANT, SK: existing.SK },
      UpdateExpression: 'SET #visivel = :visivel, #atualizadoEm = :atualizadoEm',
      ExpressionAttributeNames: {
        '#visivel': 'visivel',
        '#atualizadoEm': 'atualizadoEm',
      },
      ExpressionAttributeValues: {
        ':visivel': newVisivel,
        ':atualizadoEm': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    }));

    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    logger.error({ action: 'portfolio_visibilidade_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// FOTOS
// ─────────────────────────────────────────────────────────────

// POST /fotos/upload — Gerar presigned URL para upload
router.post('/fotos/upload', async (req, res) => {
  try {
    const { categoria_id, filename, content_type, size } = req.body;

    if (!categoria_id || !filename || !content_type) {
      return res.status(400).json({ success: false, message: 'categoria_id, filename e content_type são obrigatórios' });
    }

    // Validate content type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(content_type)) {
      return res.status(400).json({ success: false, message: 'content_type deve ser image/jpeg, image/png ou image/webp' });
    }

    // Validate file size (50MB max)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (size && Number(size) > MAX_SIZE) {
      return res.status(400).json({ success: false, message: 'Arquivo deve ter no máximo 50MB' });
    }

    // Verify category exists
    const categoria = await findCategoriaById(categoria_id);
    if (!categoria) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
    }

    const foto_id = uuidv4();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `portfolio/${categoria_id}/${foto_id}/original/${sanitizedFilename}`;
    const expiresIn = 600;

    const upload_url = await gerarPresignedUrl(key, content_type, expiresIn);

    logger.info({ action: 'portfolio_upload_url_generated', foto_id, categoria_id });
    res.json({
      success: true,
      data: {
        upload_url,
        foto_id,
        key,
        expires_in: expiresIn,
      },
    });
  } catch (error) {
    logger.error({ action: 'portfolio_upload_url_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /fotos/confirmar — Confirmar upload e criar registro no DDB
router.post('/fotos/confirmar', async (req, res) => {
  try {
    const { foto_id, categoria_id, key, titulo, descricao, ordem } = req.body;

    if (!foto_id || !categoria_id || !key) {
      return res.status(400).json({ success: false, message: 'foto_id, categoria_id e key são obrigatórios' });
    }

    const now = new Date().toISOString();
    const ordemVal = ordem !== undefined ? Number(ordem) : 0;

    const item = {
      PK: PK_TENANT,
      SK: `FOTOPORT#${categoria_id}#${foto_id}`,
      id: foto_id,
      categoria_id,
      s3_key: key,
      titulo: titulo ? titulo.trim() : '',
      descricao: descricao ? descricao.trim() : '',
      ordem: ordemVal,
      status: 'processando',
      criadoEm: now,
      atualizadoEm: now,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    logger.info({ action: 'portfolio_foto_confirmed', foto_id, categoria_id });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    logger.error({ action: 'portfolio_foto_confirm_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /categorias/:catId/fotos — Listar fotos de uma categoria
router.get('/categorias/:catId/fotos', async (req, res) => {
  try {
    const { catId } = req.params;
    const { status } = req.query;

    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': PK_TENANT,
        ':sk': `FOTOPORT#${catId}#`,
      },
    }));

    let fotos = result.Items || [];

    // Filter by status if specified
    if (status) {
      fotos = fotos.filter(f => f.status === status);
    }

    // Sort by ordem
    fotos.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    res.json({ success: true, data: fotos });
  } catch (error) {
    logger.error({ action: 'portfolio_fotos_list_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /categorias/:catId/fotos/ordem — Reordenar fotos em batch
router.patch('/categorias/:catId/fotos/ordem', async (req, res) => {
  try {
    const { catId } = req.params;
    const { fotos } = req.body;

    if (!Array.isArray(fotos) || fotos.length === 0) {
      return res.status(400).json({ success: false, message: 'Array de fotos é obrigatório' });
    }

    for (const item of fotos) {
      if (!item.id || item.ordem === undefined) {
        return res.status(400).json({ success: false, message: 'Cada item deve ter id e ordem' });
      }

      await dynamo.send(new UpdateCommand({
        TableName: TABLE,
        Key: {
          PK: PK_TENANT,
          SK: `FOTOPORT#${catId}#${item.id}`,
        },
        UpdateExpression: 'SET #ordem = :ordem, #atualizadoEm = :atualizadoEm',
        ExpressionAttributeNames: {
          '#ordem': 'ordem',
          '#atualizadoEm': 'atualizadoEm',
        },
        ExpressionAttributeValues: {
          ':ordem': Number(item.ordem),
          ':atualizadoEm': new Date().toISOString(),
        },
      }));
    }

    res.json({ success: true, data: { message: 'Fotos reordenadas com sucesso' } });
  } catch (error) {
    logger.error({ action: 'portfolio_fotos_reorder_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /fotos/:fotoId — Deletar foto do DDB e S3
router.delete('/fotos/:fotoId', async (req, res) => {
  try {
    const { fotoId } = req.params;

    // Find the photo - need to scan FOTOPORT entries to find by fotoId
    const foto = await findFotoById(fotoId);
    if (!foto) {
      return res.status(404).json({ success: false, message: 'Foto não encontrada' });
    }

    // Delete from S3
    if (foto.s3_key) {
      await s3.send(new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: foto.s3_key,
      }));
    }

    // Delete from DynamoDB
    await dynamo.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: foto.PK, SK: foto.SK },
    }));

    logger.info({ action: 'portfolio_foto_deleted', fotoId });
    res.json({ success: true, data: { message: 'Foto excluída com sucesso' } });
  } catch (error) {
    logger.error({ action: 'portfolio_foto_delete_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Find a category by its ID (scanning CATPORTFOLIO# prefix)
 */
async function findCategoriaById(id) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': PK_TENANT,
      ':sk': 'CATPORTFOLIO#',
    },
  }));

  return (result.Items || []).find(item => item.id === id) || null;
}

/**
 * Find a photo by its ID (scanning FOTOPORT# prefix)
 */
async function findFotoById(fotoId) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': PK_TENANT,
      ':sk': 'FOTOPORT#',
    },
  }));

  return (result.Items || []).find(item => item.id === fotoId) || null;
}

module.exports = router;
