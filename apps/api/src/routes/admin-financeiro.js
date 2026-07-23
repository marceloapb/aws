const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const logger = require('../config/logger');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

// GET /admin/financeiro/resumo - Dashboard financeiro consolidado
router.get('/resumo', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    logger.info({ action: 'financeiro_resumo', photographerId });

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'COBRANCA#'
      }
    }));

    const cobrancas = result.Items || [];
    const hoje = new Date().toISOString().slice(0, 10);
    const mesAtual = new Date().toISOString().slice(0, 7);

    let receitaTotal = 0;
    let receitaMesAtual = 0;
    let inadimplencia = 0;
    let aReceber = 0;
    let totalCancelado = 0;
    const contratosUnicos = new Set();
    const porMetodo = {};

    cobrancas.forEach(c => {
      const valor = c.valor || 0;

      if (c.status === 'pago') {
        receitaTotal += valor;
        contratosUnicos.add(c.contratoId);
        const dataPago = c.pago_em || c.pagoEm || '';
        if (dataPago.startsWith(mesAtual)) {
          receitaMesAtual += valor;
        }
        // Agrupar por método
        const metodo = c.metodoPagamento || c.meio_pagamento || 'outros';
        porMetodo[metodo] = (porMetodo[metodo] || 0) + valor;
      } else if (c.status === 'cancelado' || c.status === 'cancelada') {
        totalCancelado += valor;
      } else if (c.vencimento && c.vencimento < hoje && c.status !== 'pago') {
        inadimplencia += valor;
      } else if ((c.vencimento || c.data_vencimento) && (c.vencimento || c.data_vencimento) >= hoje && c.status === 'pendente') {
        aReceber += valor;
      }
    });

    const qtdPagos = cobrancas.filter(c => c.status === 'pago').length;
    const ticketMedio = qtdPagos > 0 ? parseFloat((receitaTotal / contratosUnicos.size).toFixed(2)) : 0;

    res.json({
      success: true,
      data: {
        receitaTotal: parseFloat(receitaTotal.toFixed(2)),
        receitaMesAtual: parseFloat(receitaMesAtual.toFixed(2)),
        inadimplencia: parseFloat(inadimplencia.toFixed(2)),
        aReceber: parseFloat(aReceber.toFixed(2)),
        totalCancelado: parseFloat(totalCancelado.toFixed(2)),
        ticketMedio,
        qtdContratos: contratosUnicos.size,
        totalCobrancas: cobrancas.length,
        porMetodo
      }
    });
  } catch (error) {
    logger.error({ action: 'financeiro_resumo_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao gerar resumo financeiro' });
  }
});

// GET /admin/financeiro/mensal?ano=2026 - Receita mês a mês
router.get('/mensal', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const ano = req.query.ano || new Date().getFullYear().toString();
    logger.info({ action: 'financeiro_mensal', photographerId, ano });

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'COBRANCA#'
      }
    }));

    const cobrancas = result.Items || [];
    const meses = {};

    // Inicializar 12 meses
    for (let m = 1; m <= 12; m++) {
      const mesKey = `${ano}-${String(m).padStart(2, '0')}`;
      meses[mesKey] = { mes: mesKey, receita: 0, aReceber: 0, inadimplencia: 0, quantidade: 0 };
    }

    const hoje = new Date().toISOString().slice(0, 10);

    cobrancas.forEach(c => {
      const dataPagamento = c.pago_em || c.pagoEm || c.data_vencimento || c.vencimento || '';
      if (!dataPagamento.startsWith(ano)) return;

      const mesKey = dataPagamento.slice(0, 7);
      if (!meses[mesKey]) return;

      const valor = c.valor || 0;

      if (c.status === 'pago') {
        meses[mesKey].receita += valor;
        meses[mesKey].quantidade++;
      } else if ((c.vencimento || c.data_vencimento) && (c.vencimento || c.data_vencimento) < hoje) {
        meses[mesKey].inadimplencia += valor;
      } else {
        meses[mesKey].aReceber += valor;
      }
    });

    // Formatar valores
    const resultado = Object.values(meses).map(m => ({
      ...m,
      receita: parseFloat(m.receita.toFixed(2)),
      aReceber: parseFloat(m.aReceber.toFixed(2)),
      inadimplencia: parseFloat(m.inadimplencia.toFixed(2))
    }));

    res.json({ success: true, data: { ano, meses: resultado } });
  } catch (error) {
    logger.error({ action: 'financeiro_mensal_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao gerar relatório mensal' });
  }
});

// GET /admin/financeiro/inadimplentes - Cobranças vencidas
router.get('/inadimplentes', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    logger.info({ action: 'financeiro_inadimplentes', photographerId });

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'COBRANCA#'
      }
    }));

    const hoje = new Date().toISOString().slice(0, 10);
    const inadimplentes = (result.Items || [])
      .filter(c => c.vencimento && c.vencimento < hoje && c.status !== 'pago' && c.status !== 'cancelado')
      .sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));

    // Enriquecer com dados do cliente
    const enriched = await Promise.all(inadimplentes.map(async (cobranca) => {
      let cliente = null;
      if (cobranca.clienteId) {
        try {
          const clienteResult = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `CLIENT#${cobranca.clienteId}` }
          }));
          cliente = clienteResult.Item ? {
            nome: clienteResult.Item.nome,
            email: clienteResult.Item.email,
            telefone: clienteResult.Item.telefone
          } : null;
        } catch (e) { /* ignore */ }
      }
      return { ...cobranca, cliente };
    }));

    const totalInadimplencia = enriched.reduce((sum, c) => sum + (c.valor || 0), 0);

    res.json({
      success: true,
      data: {
        total: enriched.length,
        totalValor: parseFloat(totalInadimplencia.toFixed(2)),
        inadimplentes: enriched
      }
    });
  } catch (error) {
    logger.error({ action: 'financeiro_inadimplentes_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao listar inadimplentes' });
  }
});

module.exports = router;
