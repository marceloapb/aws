const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const router = Router();

const TENANT_ID = process.env.TENANT_ID || 'default';

// GET /api/admin/contratos/modelos
router.get('/', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT_ID}`, ':sk': 'MODELO_CONTRATO#' },
    }));
    res.json({ success: true, data: result.Items || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/contratos/modelos/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT_ID}`, ':sk': `MODELO_CONTRATO#${req.params.id}` },
    }));
    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ success: false, message: 'Modelo não encontrado' });
    }
    res.json({ success: true, data: result.Items[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/contratos/modelos
router.post('/', async (req, res) => {
  try {
    const { nome, tipo_evento, corpo_html, ativo = true } = req.body;
    if (!nome) return res.status(400).json({ success: false, message: 'Nome é obrigatório' });

    const id = crypto.randomUUID();
    const item = {
      id,
      PK: `TENANT#${TENANT_ID}`,
      SK: `MODELO_CONTRATO#${id}`,
      GSI1PK: 'MODELO_CONTRATO',
      GSI1SK: `MODELO_CONTRATO#${id}`,
      nome,
      tipo_evento: tipo_evento || [], // agora é array de tipos
      corpo_html: corpo_html || '',
      ativo: ativo !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/contratos/modelos/:id
router.put('/:id', async (req, res) => {
  try {
    const { nome, tipo_evento, corpo_html, ativo } = req.body;
    const updates = {};
    if (nome !== undefined) updates.nome = nome;
    if (tipo_evento !== undefined) updates.tipo_evento = tipo_evento;
    if (corpo_html !== undefined) updates.corpo_html = corpo_html;
    if (ativo !== undefined) updates.ativo = ativo;
    updates.updated_at = new Date().toISOString();

    const keys = Object.keys(updates);
    const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
    const vals = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));

    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT_ID}`, SK: `MODELO_CONTRATO#${req.params.id}` },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
      ReturnValues: 'ALL_NEW',
    }));

    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/contratos/modelos/:id
router.delete('/:id', async (req, res) => {
  try {
    await dynamo.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT_ID}`, SK: `MODELO_CONTRATO#${req.params.id}` },
    }));
    res.json({ success: true, message: 'Modelo excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/contratos/modelos/importar
// Recebe texto de um contrato existente e usa IA para gerar o modelo HTML
router.post('/importar', async (req, res) => {
  try {
    const { texto_contrato, nome_modelo } = req.body;
    if (!texto_contrato) {
      return res.status(400).json({ success: false, message: 'texto_contrato é obrigatório' });
    }

    const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
    const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
    const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'amazon.nova-micro-v1:0';

    const prompt = `Você é um assistente especializado em contratos de fotografia profissional.

Recebi o texto de um contrato existente e preciso que você o transforme em um modelo HTML reutilizável.

INSTRUÇÕES:
1. Analise o contrato fornecido e identifique sua estrutura, cláusulas, e estilo visual
2. Gere um HTML completo e bem formatado que reproduza fielmente o layout e estrutura do contrato original
3. Substitua dados específicos de clientes/eventos por variáveis no formato {{nome_variavel}}
4. Use as seguintes variáveis padrão onde aplicável:
   - {{nome_cliente}} - Nome completo do cliente
   - {{cpf_cliente}} - CPF/CNPJ do cliente
   - {{email_cliente}} - E-mail do cliente
   - {{endereco_cliente}} - Endereço do cliente
   - {{valor_total}} - Valor total do contrato
   - {{data_evento}} - Data do evento
   - {{local}} - Local do evento
   - {{itens_descricao}} - Descrição dos itens/serviços
   - {{condicoes_pagamento}} - Condições de pagamento
   - {{data_hoje}} - Data de geração do contrato
5. Mantenha o mesmo tom, linguagem e estrutura de cláusulas do original
6. Use CSS inline para manter o estilo (cores, fontes, espaçamentos)
7. O HTML deve ser profissional, responsivo e adequado para PDF

CONTRATO ORIGINAL:
${texto_contrato}

Responda APENAS com o HTML do modelo, sem explicações ou markdown. O HTML deve começar com <div> e ser autocontido com estilos inline.`;

    const command = new ConverseCommand({
      modelId: MODEL_ID,
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 4000, temperature: 0.3, topP: 0.9 },
    });

    const response = await bedrock.send(command);
    let corpoHtml = response.output.message.content[0].text.trim();

    // Limpar possíveis wrappers de markdown
    if (corpoHtml.startsWith('```html')) {
      corpoHtml = corpoHtml.replace(/^```html\n?/, '').replace(/\n?```$/, '');
    } else if (corpoHtml.startsWith('```')) {
      corpoHtml = corpoHtml.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    // Identificar os tipos de evento mencionados no contrato
    const tiposDetectados = [];
    const tiposMap = {
      'casamento': 'Casamento',
      'aniversário': 'Aniversário',
      'aniversario': 'Aniversário',
      'corporativo': 'Corporativo',
      'empresa': 'Corporativo',
      'formatura': 'Formatura',
      'ensaio': 'Ensaio',
      'newborn': 'Ensaio',
      'gestante': 'Ensaio',
    };
    const textoLower = texto_contrato.toLowerCase();
    for (const [keyword, tipo] of Object.entries(tiposMap)) {
      if (textoLower.includes(keyword) && !tiposDetectados.includes(tipo)) {
        tiposDetectados.push(tipo);
      }
    }
    if (tiposDetectados.length === 0) tiposDetectados.push('Outro');

    // Salvar o modelo automaticamente
    const id = crypto.randomUUID();
    const item = {
      id,
      PK: `TENANT#${TENANT_ID}`,
      SK: `MODELO_CONTRATO#${id}`,
      GSI1PK: 'MODELO_CONTRATO',
      GSI1SK: `MODELO_CONTRATO#${id}`,
      nome: nome_modelo || 'Modelo Importado',
      tipo_evento: tiposDetectados,
      corpo_html: corpoHtml,
      ativo: true,
      importado: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    res.status(201).json({
      success: true,
      data: item,
      tipos_detectados: tiposDetectados,
    });
  } catch (error) {
    console.error('[MODELOS] Erro ao importar contrato:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
