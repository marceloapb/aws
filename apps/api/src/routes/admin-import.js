const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { parseClientes, parseCatalogo, parseEquipamentos, TEMPLATES } = require('../services/csvParserService');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

async function batchWrite(items) {
  const chunks = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    const params = {
      RequestItems: {
        [TABLE_NAME]: chunk.map(item => ({
          PutRequest: { Item: item }
        }))
      }
    };

    let retries = 0;
    let response = await docClient.send(new BatchWriteCommand(params));

    while (response.UnprocessedItems && Object.keys(response.UnprocessedItems).length > 0 && retries < 3) {
      retries++;
      await new Promise(resolve => setTimeout(resolve, 100 * retries));
      response = await docClient.send(new BatchWriteCommand({ RequestItems: response.UnprocessedItems }));
    }
  }
}

// POST /admin/import/clientes
router.post('/clientes', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { csv } = req.body;

    if (!csv) {
      return res.status(400).json({ success: false, error: 'Campo csv eh obrigatorio no body' });
    }

    const { validated, errors } = parseClientes(csv);
    const now = new Date().toISOString();

    const items = validated.map(record => ({
      PK: `PHOTOGRAPHER#${photographerId}`,
      SK: `CLIENT#${uuidv4()}`,
      id: uuidv4(),
      photographerId,
      nome: record.nome.trim(),
      email: record.email.trim().toLowerCase(),
      telefone: record.telefone || '',
      documento: record.documento || '',
      endereco: record.endereco || '',
      criadoEm: now,
      atualizadoEm: now
    }));

    if (items.length > 0) {
      await batchWrite(items);
    }

    logger.info({ action: 'import_clientes', photographerId, total: validated.length + errors.length, importados: items.length, erros: errors.length });
    res.json({ success: true, data: { total: validated.length + errors.length, importados: items.length, erros: errors } });
  } catch (error) {
    logger.error({ action: 'import_clientes_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao importar clientes' });
  }
});

// POST /admin/import/catalogo
router.post('/catalogo', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { csv } = req.body;

    if (!csv) {
      return res.status(400).json({ success: false, error: 'Campo csv eh obrigatorio no body' });
    }

    const { validated, errors } = parseCatalogo(csv);
    const now = new Date().toISOString();

    const items = validated.map(record => ({
      PK: `PHOTOGRAPHER#${photographerId}`,
      SK: `CATALOGO#${uuidv4()}`,
      GSI1PK: `PHOTOGRAPHER#${photographerId}`,
      GSI1SK: 'CATALOGO#ACTIVE',
      id: uuidv4(),
      photographerId,
      nome: record.nome.trim(),
      tipo: (record.tipo || 'custom').toLowerCase(),
      preco: Number(record.preco),
      descricao: record.descricao || '',
      quantidadeFotos: Number(record.quantidadeFotos) || 0,
      duracaoHoras: Number(record.duracaoHoras) || 0,
      ativo: true,
      criadoEm: now,
      atualizadoEm: now
    }));

    if (items.length > 0) {
      await batchWrite(items);
    }

    logger.info({ action: 'import_catalogo', photographerId, total: validated.length + errors.length, importados: items.length, erros: errors.length });
    res.json({ success: true, data: { total: validated.length + errors.length, importados: items.length, erros: errors } });
  } catch (error) {
    logger.error({ action: 'import_catalogo_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao importar catalogo' });
  }
});

// POST /admin/import/equipamentos
router.post('/equipamentos', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { csv } = req.body;

    if (!csv) {
      return res.status(400).json({ success: false, error: 'Campo csv eh obrigatorio no body' });
    }

    const { validated, errors } = parseEquipamentos(csv);
    const now = new Date().toISOString();

    const items = validated.map(record => ({
      PK: `PHOTOGRAPHER#${photographerId}`,
      SK: `EQUIPMENT#${uuidv4()}`,
      id: uuidv4(),
      photographerId,
      nome: record.nome.trim(),
      tipo: record.tipo.trim(),
      marca: record.marca || '',
      modelo: record.modelo || '',
      numeroSerie: record.numero_serie || '',
      ativo: true,
      criadoEm: now,
      atualizadoEm: now
    }));

    if (items.length > 0) {
      await batchWrite(items);
    }

    logger.info({ action: 'import_equipamentos', photographerId, total: validated.length + errors.length, importados: items.length, erros: errors.length });
    res.json({ success: true, data: { total: validated.length + errors.length, importados: items.length, erros: errors } });
  } catch (error) {
    logger.error({ action: 'import_equipamentos_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao importar equipamentos' });
  }
});

// GET /admin/import/templates/:entity
router.get('/templates/:entity', (req, res) => {
  const { entity } = req.params;
  const template = TEMPLATES[entity];

  if (!template) {
    return res.status(404).json({ success: false, error: 'Template nao encontrado para: ' + entity + '. Disponiveis: ' + Object.keys(TEMPLATES).join(', ') });
  }

  logger.info({ action: 'import_template_download', entity });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=template-' + entity + '.csv');
  res.send(template);
});

module.exports = router;
