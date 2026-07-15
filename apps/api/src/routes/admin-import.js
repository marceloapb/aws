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

// Utilitário para batch write em chunks de 25
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
    let unprocessed = params;

    while (retries < 3) {
      const result = await docClient.send(new BatchWriteCommand(unprocessed));
      if (!result.UnprocessedItems || Object.keys(result.UnprocessedItems).length === 0) break;
      unprocessed = { RequestItems: result.UnprocessedItems };
      retries++;
      await new Promise(r => setTimeout(r, 100 * Math.pow(2, retries)));
    }
  }
}

// POST /admin/import/clientes
router.post('/clientes', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { csv } = req.body;

    if (!csv) return res.status(400).json({ success: false, error: 'Campo csv é obrigatório' });

    const { validated, errors } = parseClientes(csv);

    if (validated.length === 0 && errors.length > 0) {
      return res.status(400).json({ success: false, data: { total: 0, importados: 0, erros: errors } });
    }

    const now = new Date().toISOString();
    const items = validated.map(record => ({
      PK: `PHOTOGRAPHER#${photographerId}`,
      SK: `CLIENT#${uuidv4()}`,
      id: uuidv4(),
      photographerId,
      nome: record.nome,
      email: record.email || '',
      telefone: record.telefone || '',
      documento: record.documento || '',
      endereco: record.endereco || '',
      criadoEm: now,
      atualizadoEm: now,
      origem: 'import_csv'
    }));

    await batchWrite(items);

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

    if (!csv) return res.status(400).json({ success: false, error: 'Campo csv é obrigatório' });

    const { validated, errors } = parseCatalogo(csv);

    if (validated.length === 0 && errors.length > 0) {
      return res.status(400).json({ success: false, data: { total: 0, importados: 0, erros: errors } });
    }

    const now = new Date().toISOString();
    const items = validated.map(record => ({
      PK: `PHOTOGRAPHER#${photographerId}`,
      SK: `CATALOGO#${uuidv4()}`,
      GSI1PK: `PHOTOGRAPHER#${photographerId}`,
      GSI1SK: 'CATALOGO#ACTIVE',
      id: uuidv4(),
      photographerId,
      nome: record.nome,
      tipo: record.tipo || 'custom',
      preco: parseFloat(record.preco) || 0,
      descricao: record.descricao || '',
      quantidadeFotos: parseInt(record.quantidadeFotos) || 0,
      duracaoHoras: parseFloat(record.duracaoHoras) || 0,
      itensInclusos: [],
      ativo: true,
      criadoEm: now,
      atualizadoEm: now,
      origem: 'import_csv'
    }));

    await batchWrite(items);

    logger.info({ action: 'import_catalogo', photographerId, importados: items.length, erros: errors.length });
    res.json({ success: true, data: { total: validated.length + errors.length, importados: items.length, erros: errors } });
  } catch (error) {
    logger.error({ action: 'import_catalogo_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao importar catálogo' });
  }
});

// POST /admin/import/equipamentos
router.post('/equipamentos', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { csv } = req.body;

    if (!csv) return res.status(400).json({ success: false, error: 'Campo csv é obrigatório' });

    const { validated, errors } = parseEquipamentos(csv);

    if (validated.length === 0 && errors.length > 0) {
      return res.status(400).json({ success: false, data: { total: 0, importados: 0, erros: errors } });
    }

    const now = new Date().toISOString();
    const items = validated.map(record => ({
      PK: `PHOTOGRAPHER#${photographerId}`,
      SK: `EQUIPMENT#${uuidv4()}`,
      id: uuidv4(),
      photographerId,
      nome: record.nome,
      tipo: record.tipo || '',
      marca: record.marca || '',
      modelo: record.modelo || '',
      numeroSerie: record.numero_serie || '',
      status: 'disponivel',
      criadoEm: now,
      atualizadoEm: now,
      origem: 'import_csv'
    }));

    await batchWrite(items);

    logger.info({ action: 'import_equipamentos', photographerId, importados: items.length, erros: errors.length });
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
    return res.status(400).json({ success: false, error: `Entidade inválida. Valores aceitos: ${Object.keys(TEMPLATES).join(', ')}` });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=template-${entity}.csv`);
  res.send(template);
});

module.exports = router;
