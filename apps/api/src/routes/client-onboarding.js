const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const logger = require('../config/logger');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

function validarTelefone(tel) {
  if (!tel) return false;
  const limpo = tel.replace(/\D/g, '');
  return limpo.length === 10 || limpo.length === 11;
}

// GET /client/onboarding/status
router.get('/status', async (req, res) => {
  try {
    const clienteId = req.clienteId;

    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `CLIENT#${clienteId}`, SK: 'PROFILE' },
      ProjectionExpression: 'perfil_completo, nome_completo, telefone, tipo_pessoa'
    }));

    const item = result.Item || {};
    const camposFaltando = [];
    if (!item.nome_completo) camposFaltando.push('nome_completo');
    if (!item.telefone) camposFaltando.push('telefone');
    if (!item.tipo_pessoa) camposFaltando.push('tipo_pessoa');

    res.json({
      success: true,
      perfil_completo: item.perfil_completo === true,
      campos_faltando: camposFaltando
    });
  } catch (error) {
    logger.error({ action: 'onboarding_status_error', error: error.message });
    res.status(500).json({ success: false, message: 'Erro ao verificar status' });
  }
});

// POST /client/onboarding/complete
router.post('/complete', async (req, res) => {
  try {
    const clienteId = req.clienteId;
    const clienteEmail = req.clienteEmail;
    const { nome_completo, telefone, tipo_pessoa } = req.body;

    // Validações
    if (!nome_completo || nome_completo.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Nome completo é obrigatório (mínimo 3 caracteres)' });
    }
    if (!telefone || !validarTelefone(telefone)) {
      return res.status(400).json({ success: false, message: 'Telefone inválido (deve ter 10 ou 11 dígitos)' });
    }
    if (!tipo_pessoa || !['PF', 'PJ'].includes(tipo_pessoa)) {
      return res.status(400).json({ success: false, message: 'Tipo de pessoa é obrigatório (PF ou PJ)' });
    }

    const telefoneLimpo = telefone.replace(/\D/g, '');
    const now = new Date().toISOString();

    // Atualizar perfil do cliente
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `CLIENT#${clienteId}`, SK: 'PROFILE' },
      UpdateExpression: 'SET nome_completo = :nome, telefone = :tel, tipo_pessoa = :tipo, perfil_completo = :completo, atualizadoEm = :now, email = :email',
      ExpressionAttributeValues: {
        ':nome': nome_completo.trim(),
        ':tel': telefoneLimpo,
        ':tipo': tipo_pessoa,
        ':completo': true,
        ':now': now,
        ':email': clienteEmail
      }
    }));

    logger.info({ action: 'onboarding_complete', clienteId });
    res.json({ success: true, perfil_completo: true });
  } catch (error) {
    logger.error({ action: 'onboarding_complete_error', error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Erro ao completar cadastro' });
  }
});

// POST /client/onboarding/complete-address — Dados complementares (endereço, Instagram, etc.)
router.post('/complete-address', async (req, res) => {
  try {
    const clienteId = req.clienteId;
    const { cep, logradouro, numero, complemento, bairro, cidade, uf, instagram, observacoes } = req.body;
    const now = new Date().toISOString();

    const updateExpressions = ['perfil_completo = :completo', 'atualizadoEm = :now'];
    const expressionValues = { ':completo': true, ':now': now };
    const expressionNames = {};

    // Endereço
    if (cep || logradouro || cidade) {
      updateExpressions.push('endereco = :endereco');
      expressionValues[':endereco'] = {
        cep: cep || '',
        logradouro: logradouro || '',
        numero: numero || '',
        complemento: complemento || '',
        bairro: bairro || '',
        cidade: cidade || '',
        uf: uf || '',
      };
    }

    if (instagram) {
      updateExpressions.push('#instagram = :instagram');
      expressionValues[':instagram'] = instagram.replace('@', '');
      expressionNames['#instagram'] = 'instagram';
    }

    if (observacoes) {
      updateExpressions.push('observacoes = :obs');
      expressionValues[':obs'] = observacoes;
    }

    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `CLIENT#${clienteId}`, SK: 'PROFILE' },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionValues,
      ...(Object.keys(expressionNames).length > 0 && { ExpressionAttributeNames: expressionNames }),
    }));

    logger.info({ action: 'onboarding_complete_address', clienteId });
    res.json({ success: true, perfil_completo: true });
  } catch (error) {
    logger.error({ action: 'onboarding_complete_address_error', error: error.message });
    res.status(500).json({ success: false, message: 'Erro ao salvar dados complementares' });
  }
});

module.exports = router;
