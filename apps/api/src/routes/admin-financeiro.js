const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const logger = require('../config/logger');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

// Utilitário: buscar todas as cobranças do fotógrafo
async function getCobrancas(photographerId) {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `PHOTOGRAPHER#${photographerId}`,
      ':sk': 'COBRANCA#'
    }
  }));
  return result.Items || [];
}

// GET /admin/financeiro/resumo - Dashboard financeiro
router.get('/resumo', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    logger.info({ action: 'financeiro_resumo', photographerId });

    const cobrancas = await getCobrancas(photographerId);
    const hoje = new Date().toISOString().split('T')[0];
    const mesAtual = hoje.substring(0, 7); // YYYY-MM

    const pagas = cobrancas.filter(c => c.status === 'pago');
    const pendentes = cobrancas.filter(c => c.status === 'pendente');
    const atrasadas = cobrancas.filter(c => (c.status === 'pendente' || c.status === 'atrasado') && c.vencimento && c.vencimento < hoje);
    const aReceber = cobrancas.filter(c => c.status === 'pendente' && c.vencimento && c.vencimento >= hoje);
    const canceladas = cobrancas.filter(c => c.status === 'cancelado');

    const receitaTotal = pagas.reduce((sum, c) => sum + (c.valor || 0), 0);
    const receitaMesAtual = pagas
      .filter(c => (c.pagoEm || c.vencimento || '').startsWith(mesAtual))
      .reduce((sum, c) => sum + (c.valor || 0), 0);
    const inadimplencia = atrasadas.reduce((sum, c) => sum + (c.valor || 0), 0);
    const valorAReceber = aReceber.reduce((sum, c) => sum + (c.valor || 0), 0);

    const contratosDistintos = [...new Set(pagas.map(c => c.contratoId).filter(Boolean))];
    const ticketMedio = contratosDistintos.length > 0 ? receitaTotal / contratosDistintos.length : 0;

    // Agrupar por método de pagamento
    const porMetodo = {};
    pagas.forEach(c => {
      const metodo = c.metodoPagamento || c.metodo || 'nao_informado';
      porMetodo[metodo] = (porMetodo[metodo] || 0) + (c.valor || 0);
    });

    res.json({
      success: true,
      data: {
        receitaTotal,
        receitaMesAtual,
        inadimplencia,
        aReceber: valorAReceber,
        ticketMedio: Math.round(ticketMedio * 100) / 100,
        totalCobrancas: cobrancas.length,
        qtdPagas: pagas.length,
        qtdPendentes: pendentes.length,
        qtdAtrasadas: atrasadas.length,
        qtdCanceladas: canceladas.length,
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

    const cobrancas = await getCobrancas(photographerId);
    const pagas = cobrancas.filter(c => c.status === 'pago');

    // Inicializar 12 meses
    const meses = {};
    for (let m = 1; m <= 12; m++) {
      const mesKey = `${ano}-${String(m).padStart(2, '0')}`;
      meses[mesKey] = { mes: mesKey, receita: 0, quantidade: 0, inadimplencia: 0 };
    }

    // Agrupar receita por mês de pagamento
    pagas.forEach(c => {
      const dataPagamento = c.pagoEm || c.vencimento || '';
      const mesKey = dataPagamento.substring(0, 7);
      if (meses[mesKey]) {
        meses[mesKey].receita += (c.valor || 0);
        meses[mesKey].quantidade += 1;
      }
    });

    // Agrupar inadimplência por mês de vencimento
    const hoje = new Date().toISOString().split('T')[0];
    const atrasadas = cobrancas.filter(c => (c.status === 'pendente' || c.status === 'atrasado') && c.vencimento && c.vencimento < hoje);
    atrasadas.forEach(c => {
      const mesKey = (c.vencimento || '').substring(0, 7);
      if (meses[mesKey]) {
        meses[mesKey].inadimplencia += (c.valor || 0);
      }
    });

    res.json({
      success: true,
      data: {
        ano,
        meses: Object.values(meses)
      }
    });
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

    const cobrancas = await getCobrancas(photographerId);
    const hoje = new Date().toISOString().split('T')[0];

    const inadimplentes = cobrancas
      .filter(c => (c.status === 'pendente' || c.status === 'atrasado') && c.vencimento && c.vencimento < hoje)
      .sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));

    // Enriquecer com dados do cliente
    const enriched = await Promise.all(
      inadimplentes.map(async (cobranca) => {
        let cliente = null;
        if (cobranca.clienteId) {
          try {
            const clienteResult = await docClient.send(new GetCommand({
              TableName: TABLE_NAME,
              Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `CLIENT#${cobranca.clienteId}` }
            }));
            cliente = clienteResult.Item ? { nome: clienteResult.Item.nome, email: clienteResult.Item.email, telefone: clienteResult.Item.telefone } : null;
          } catch (e) { /* ignore */ }
        }
        return { ...cobranca, cliente };
      })
    );

    const totalInadimplencia = inadimplentes.reduce((sum, c) => sum + (c.valor || 0), 0);

    res.json({
      success: true,
      data: {
        total: inadimplentes.length,
        totalValor: totalInadimplencia,
        inadimplentes: enriched
      }
    });
  } catch (error) {
    logger.error({ action: 'financeiro_inadimplentes_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao listar inadimplentes' });
  }
});

module.exports = router;
