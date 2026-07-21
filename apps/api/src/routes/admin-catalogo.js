const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { calcularValorBase, resolverValorBase } = require('../services/catalogoPrecificacaoService');
const { generateUploadUrl, CONTEXT_RULES } = require('../services/mediaUploadService');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const s3 = new S3Client({});
const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET = process.env.S3_BUCKET_NAME;

// Registrar contexto catalogo_exemplo no mediaUploadService
if (!CONTEXT_RULES.catalogo_exemplo) {
  CONTEXT_RULES.catalogo_exemplo = {
    bucket: 'private',
    maxBytes: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    suffix: true,
  };
}

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

/**
 * Busca a categoria pelo ID para verificar tem_fornecedor
 */
async function getCategoriaById(photographerId, categoriaId) {
  if (!categoriaId) return null;
  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `CAT_CATALOGO#${categoriaId}` }
  }));
  return result.Item || null;
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

    // Para itens com dados de precificação, incluir valor_base_calculado
    const item = result.Item;
    if (item.preco_custo != null) {
      item.valor_base_calculado = calcularValorBase(item);
    }

    res.json({ success: true, data: item });
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
      // ===== Criar categoria =====
      const { nome, cor, tem_fornecedor } = req.body;
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
        tem_fornecedor: tem_fornecedor === true,
        criadoEm: now,
        atualizadoEm: now
      };

    } else if (tipo === 'pacote' || tipo === 'pacotes') {
      // ===== Criar pacote =====
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
      // ===== Criar item do catálogo =====
      const {
        nome, descricao, tipo: tipoItem, valor_base, valor_hora_adicional,
        duracao_base, categoria_id, exibir_ao_cliente,
        // Campos de fornecedor/precificação (SPEC-CAT-001)
        fornecedor_nome, fornecedor_link, nome_no_fornecedor,
        preco_custo, frete, outros_custos, margem_percentual,
        valor_base_override, fotos_exemplo
      } = req.body;

      if (!nome || nome.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
      }

      // Verificar se a categoria exige fornecedor
      let categoriaTelFornecedor = false;
      if (categoria_id && tipoItem === 'produto') {
        const categoria = await getCategoriaById(photographerId, categoria_id);
        if (categoria && categoria.tem_fornecedor) {
          categoriaTelFornecedor = true;
          // Validar campos obrigatórios de fornecedor
          if (!fornecedor_nome || fornecedor_nome.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Nome do fornecedor é obrigatório para esta categoria' });
          }
          if (preco_custo == null || preco_custo < 0) {
            return res.status(400).json({ success: false, error: 'Preço de custo é obrigatório' });
          }
          if (margem_percentual == null || margem_percentual < 0) {
            return res.status(400).json({ success: false, error: 'Margem percentual é obrigatória' });
          }
        }
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
        categoria_id: categoria_id || null,
        exibir_ao_cliente: exibir_ao_cliente !== false,
        ativo: true,
        criadoEm: now,
        atualizadoEm: now
      };

      // Campos de serviço principal
      if (tipoItem === 'servico_principal') {
        item.duracao_base = Number(duracao_base) || 0;
        item.valor_hora_adicional = Number(valor_hora_adicional) || 0;
        item.valor_base = Number(valor_base) || 0;
      }

      // Campos de fornecedor/precificação (apenas para produto com fornecedor)
      if (categoriaTelFornecedor) {
        item.fornecedor_nome = fornecedor_nome.trim();
        item.fornecedor_link = fornecedor_link || null;
        item.nome_no_fornecedor = nome_no_fornecedor || null;
        item.preco_custo = Number(preco_custo);
        item.frete = Number(frete) || 0;
        item.outros_custos = Number(outros_custos) || 0;
        item.margem_percentual = Number(margem_percentual);
        item.valor_base_override = valor_base_override != null ? Number(valor_base_override) : null;
        item.fotos_exemplo = Array.isArray(fotos_exemplo) ? fotos_exemplo.slice(0, 5) : [];

        // Calcular valor_base
        item.valor_base_calculado = calcularValorBase(item);
        item.valor_base = resolverValorBase(item);
      } else if (tipoItem === 'produto' || tipoItem === 'adicional') {
        item.valor_base = Number(valor_base) || 0;
      }
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

    const body = req.body;

    // Para itens: validação de fornecedor
    if (tipo === 'itens' || !tipo || tipo === 'item') {
      const tipoItem = body.tipo || existing.Item.tipo;
      const categoriaId = body.categoria_id !== undefined ? body.categoria_id : existing.Item.categoria_id;

      if (categoriaId && tipoItem === 'produto') {
        const categoria = await getCategoriaById(photographerId, categoriaId);
        if (categoria && categoria.tem_fornecedor) {
          const fornecedorNome = body.fornecedor_nome !== undefined ? body.fornecedor_nome : existing.Item.fornecedor_nome;
          const precoCusto = body.preco_custo !== undefined ? body.preco_custo : existing.Item.preco_custo;
          const margemPercentual = body.margem_percentual !== undefined ? body.margem_percentual : existing.Item.margem_percentual;

          if (!fornecedorNome || (typeof fornecedorNome === 'string' && fornecedorNome.trim().length === 0)) {
            return res.status(400).json({ success: false, error: 'Nome do fornecedor é obrigatório para esta categoria' });
          }
          if (precoCusto == null || precoCusto < 0) {
            return res.status(400).json({ success: false, error: 'Preço de custo é obrigatório' });
          }
          if (margemPercentual == null || margemPercentual < 0) {
            return res.status(400).json({ success: false, error: 'Margem percentual é obrigatória' });
          }

          // Recalcular valor_base
          const itemParaCalculo = {
            preco_custo: body.preco_custo !== undefined ? Number(body.preco_custo) : existing.Item.preco_custo,
            frete: body.frete !== undefined ? Number(body.frete) : (existing.Item.frete || 0),
            outros_custos: body.outros_custos !== undefined ? Number(body.outros_custos) : (existing.Item.outros_custos || 0),
            margem_percentual: body.margem_percentual !== undefined ? Number(body.margem_percentual) : existing.Item.margem_percentual,
            valor_base_override: body.valor_base_override !== undefined ? body.valor_base_override : existing.Item.valor_base_override,
          };

          body.valor_base_calculado = calcularValorBase(itemParaCalculo);
          body.valor_base = resolverValorBase(itemParaCalculo);
        }
      }
    }

    // Construir UpdateExpression dinâmico
    const updateExpressions = [];
    const expressionValues = {};
    const expressionNames = {};
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
      const statusSuffix = body.ativo ? 'ACTIVE' : 'INACTIVE';
      const gsi1sk = `${skPrefix.replace(/#$/, '')}#${statusSuffix}`;
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
          ':gsi1sk': `${skPrefix.replace(/#$/, '')}#INACTIVE`,
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

// ========== POST /items/:id/fotos-exemplo/presigned - Upload presigned URL ==========
router.post('/items/:id/fotos-exemplo/presigned', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;
    const { content_type, filename } = req.body;

    if (!content_type || !filename) {
      return res.status(400).json({ success: false, error: 'content_type e filename são obrigatórios' });
    }

    // Verificar se item existe
    const existing = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `ITEM_CATALOGO#${id}` }
    }));

    if (!existing.Item) {
      return res.status(404).json({ success: false, error: 'Item não encontrado' });
    }

    // Verificar máx 5 fotos
    const fotosAtuais = existing.Item.fotos_exemplo || [];
    if (fotosAtuais.length >= 5) {
      return res.status(400).json({ success: false, error: 'Máximo de 5 fotos de exemplo atingido' });
    }

    // Gerar presigned URL
    const result = await generateUploadUrl({
      tenant_id: photographerId,
      contexto: 'catalogo_exemplo',
      entidade_id: id,
      filename,
      content_type,
      size_bytes: 10 * 1024 * 1024, // max permitido
    });

    const fotoId = uuidv4();

    logger.info({ action: 'catalogo_foto_presigned', photographerId, itemId: id, fotoId });
    res.json({
      success: true,
      data: {
        upload_url: result.upload_url,
        foto_id: fotoId,
        key: result.key,
        media_id: result.media_id,
      }
    });
  } catch (error) {
    logger.error({ action: 'catalogo_foto_presigned_error', error: error.message });
    res.status(500).json({ success: false, error: error.message || 'Erro ao gerar URL de upload' });
  }
});

// ========== DELETE /items/:id/fotos-exemplo/:fotoId - Remover foto ==========
router.delete('/items/:id/fotos-exemplo/:fotoId', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id, fotoId } = req.params;

    // Buscar item
    const existing = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `ITEM_CATALOGO#${id}` }
    }));

    if (!existing.Item) {
      return res.status(404).json({ success: false, error: 'Item não encontrado' });
    }

    const fotosAtuais = existing.Item.fotos_exemplo || [];
    const foto = fotosAtuais.find(f => f.id === fotoId);

    if (!foto) {
      return res.status(404).json({ success: false, error: 'Foto não encontrada' });
    }

    // Remover do S3
    if (foto.key) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: foto.key }));
      } catch (s3Err) {
        logger.warn({ action: 'catalogo_foto_s3_delete_warn', error: s3Err.message, key: foto.key });
      }
    }

    // Atualizar array no DynamoDB
    const novasFotos = fotosAtuais.filter(f => f.id !== fotoId);
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `ITEM_CATALOGO#${id}` },
      UpdateExpression: 'SET fotos_exemplo = :fotos, atualizadoEm = :now',
      ExpressionAttributeValues: {
        ':fotos': novasFotos,
        ':now': new Date().toISOString()
      }
    }));

    logger.info({ action: 'catalogo_foto_delete', photographerId, itemId: id, fotoId });
    res.json({ success: true, message: 'Foto removida' });
  } catch (error) {
    logger.error({ action: 'catalogo_foto_delete_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao remover foto' });
  }
});

module.exports = router;
