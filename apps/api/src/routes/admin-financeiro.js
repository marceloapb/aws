const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getPeriodoRange(periodo, periodoInicio, periodoFim) {
  const now = new Date();
  let inicio, fim;

  if (periodoInicio && periodoFim) {
    inicio = periodoInicio;
    fim = periodoFim;
  } else if (periodo === 'Trimestre') {
    const trimStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    inicio = trimStart.toISOString().slice(0, 10);
    fim = now.toISOString().slice(0, 10);
  } else if (periodo === 'Ano') {
    inicio = `${now.getFullYear()}-01-01`;
    fim = now.toISOString().slice(0, 10);
  } else {
    // Default: Este mês
    inicio = `${now.toISOString().slice(0, 7)}-01`;
    fim = now.toISOString().slice(0, 10);
  }
  return { inicio, fim };
}


function isInRange(dateStr, inicio, fim) {
  if (!dateStr) return false;
  return dateStr >= inicio && dateStr <= fim;
}

// ─── GET /admin/financeiro/resumo ───────────────────────────────────────────────
router.get('/resumo', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { periodo, periodo_inicio, periodo_fim } = req.query;
    const range = getPeriodoRange(periodo, periodo_inicio, periodo_fim);
    logger.info({ action: 'financeiro_resumo', photographerId, range });

    // Fetch cobranças
    const cobResult = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'COBRANCA#'
      }
    }));
    const cobrancas = cobResult.Items || [];

    // Fetch despesas
    const despResult = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'DESPESA#'
      }
    }));
    const despesas = despResult.Items || [];


    const hoje = new Date().toISOString().slice(0, 10);

    let receitaMesAtual = 0;
    let aReceber = 0;
    let recebido = 0;
    let totalCobrancas = 0;
    let inadimplenciaValor = 0;
    const clienteReceita = {};

    cobrancas.forEach(c => {
      const valor = c.valor || 0;
      const vencimento = c.vencimento || c.data_vencimento || '';
      const dataPago = c.pago_em || c.pagoEm || '';
      const status = c.status || '';

      if (status === 'pago') {
        recebido += valor;
        totalCobrancas++;
        if (isInRange(dataPago || vencimento, range.inicio, range.fim)) {
          receitaMesAtual += valor;
        }
        // Track por cliente
        const cId = c.clienteId || c.cliente_id || 'unknown';
        const cNome = c.cliente_nome || c.clienteNome || cId;
        if (!clienteReceita[cId]) clienteReceita[cId] = { nome: cNome, receita: 0 };
        clienteReceita[cId].receita += valor;
      } else if (status === 'cancelado' || status === 'cancelada') {
        // skip
      } else if (vencimento && vencimento < hoje) {
        inadimplenciaValor += valor;
      } else if (vencimento >= hoje && (status === 'pendente' || status === 'em_aberto')) {
        aReceber += valor;
      }
    });

    // Inadimplência como percentual
    const totalEmitido = recebido + aReceber + inadimplenciaValor;
    const inadimplencia = totalEmitido > 0
      ? parseFloat(((inadimplenciaValor / totalEmitido) * 100).toFixed(1))
      : 0;


    // Ticket médio
    const ticketMedio = totalCobrancas > 0
      ? parseFloat((recebido / totalCobrancas).toFixed(2))
      : 0;

    // Despesas do período
    const despesasMes = despesas
      .filter(d => d.tipo !== 'entrada' && isInRange(d.data, range.inicio, range.fim))
      .reduce((sum, d) => sum + (d.valor || 0), 0);

    // Evolução últimos 6 meses
    const evolucao = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mesKey = d.toISOString().slice(0, 7);
      const mesLabel = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

      const entradas = cobrancas
        .filter(c => c.status === 'pago' && (c.pago_em || c.pagoEm || c.vencimento || '').startsWith(mesKey))
        .reduce((s, c) => s + (c.valor || 0), 0);

      const saidas = despesas
        .filter(dd => dd.tipo !== 'entrada' && (dd.data || '').startsWith(mesKey))
        .reduce((s, dd) => s + (dd.valor || 0), 0);

      evolucao.push({ mes: mesLabel, entradas, saidas });
    }

    // Top clientes
    const top_clientes = Object.values(clienteReceita)
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);


    // Retornar flat (o frontend faz setResumo(await r.json()))
    res.json({
      receitaMesAtual: parseFloat(receitaMesAtual.toFixed(2)),
      receita_mes: parseFloat(receitaMesAtual.toFixed(2)),
      aReceber: parseFloat(aReceber.toFixed(2)),
      a_receber: parseFloat(aReceber.toFixed(2)),
      receitaTotal: parseFloat(recebido.toFixed(2)),
      recebido: parseFloat(recebido.toFixed(2)),
      inadimplencia,
      inadimplencia_pct: inadimplencia,
      ticketMedio,
      ticket_medio: ticketMedio,
      despesas_mes: parseFloat(despesasMes.toFixed(2)),
      evolucao,
      top_clientes
    });
  } catch (error) {
    logger.error({ action: 'financeiro_resumo_error', error: error.message });
    res.status(500).json({ error: 'Erro ao gerar resumo financeiro' });
  }
});


// ─── GET /admin/financeiro/despesas ─────────────────────────────────────────────
router.get('/despesas', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { periodo, periodo_inicio, periodo_fim } = req.query;
    const range = getPeriodoRange(periodo, periodo_inicio, periodo_fim);

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'DESPESA#'
      }
    }));

    const despesas = (result.Items || [])
      .filter(d => isInRange(d.data, range.inicio, range.fim))
      .map(d => ({
        id: d.despesaId || d.SK.replace('DESPESA#', ''),
        descricao: d.descricao,
        valor: d.valor || 0,
        categoria: d.categoria || 'Outros',
        data: d.data,
        tipo: d.tipo || 'saida',
        recorrente: d.recorrente || false,
        evento_id: d.evento_id || d.eventoId || '',
        evento_nome: d.evento_nome || d.eventoNome || ''
      }))
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    res.json(despesas);
  } catch (error) {
    logger.error({ action: 'financeiro_despesas_error', error: error.message });
    res.status(500).json({ error: 'Erro ao listar despesas' });
  }
});


// ─── POST /admin/financeiro/despesas ────────────────────────────────────────────
router.post('/despesas', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { descricao, valor, categoria, data, evento_id, recorrente, recorrencia, tipo } = req.body;
    const despesaId = uuidv4();

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `PHOTOGRAPHER#${photographerId}`,
        SK: `DESPESA#${despesaId}`,
        despesaId,
        descricao: descricao || '',
        valor: parseFloat(valor) || 0,
        categoria: categoria || 'Outros',
        data: data || new Date().toISOString().slice(0, 10),
        tipo: tipo || 'saida',
        recorrente: recorrente || false,
        recorrencia: recorrente ? (recorrencia || 'mensal') : null,
        evento_id: evento_id || '',
        criadoEm: new Date().toISOString()
      }
    }));

    res.status(201).json({ id: despesaId, success: true });
  } catch (error) {
    logger.error({ action: 'financeiro_criar_despesa_error', error: error.message });
    res.status(500).json({ error: 'Erro ao criar despesa' });
  }
});


// ─── DELETE /admin/financeiro/despesas/:id ───────────────────────────────────────
router.delete('/despesas/:id', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;

    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `PHOTOGRAPHER#${photographerId}`,
        SK: `DESPESA#${id}`
      }
    }));

    res.json({ success: true });
  } catch (error) {
    logger.error({ action: 'financeiro_delete_despesa_error', error: error.message });
    res.status(500).json({ error: 'Erro ao excluir despesa' });
  }
});


// ─── GET /admin/financeiro/categorias ───────────────────────────────────────────
router.get('/categorias', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `PHOTOGRAPHER#${photographerId}`, ':sk': 'CAT_DESPESA#' },
    }));
    res.json(result.Items || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /admin/financeiro/categorias ──────────────────────────────────────────
router.post('/categorias', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { nome, cor } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
    const id = uuidv4();
    const item = {
      PK: `PHOTOGRAPHER#${photographerId}`,
      SK: `CAT_DESPESA#${id}`,
      id, nome, cor: cor || '#6B7280',
      criadoEm: new Date().toISOString(),
    };
    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── DELETE /admin/financeiro/categorias/:id ─────────────────────────────────────
router.delete('/categorias/:id', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `CAT_DESPESA#${req.params.id}` },
    }));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /admin/financeiro/fluxo-caixa ──────────────────────────────────────────
router.get('/fluxo-caixa', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { periodo_inicio, periodo_fim, periodo } = req.query;
    const range = getPeriodoRange(periodo, periodo_inicio, periodo_fim);

    // Fetch cobranças pagas
    const cobResult = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'COBRANCA#'
      }
    }));

    // Fetch despesas
    const despResult = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'DESPESA#'
      }
    }));

    const cobrancas = cobResult.Items || [];
    const despesas = despResult.Items || [];


    // Build movimentações
    const movimentacoes = [];

    cobrancas.forEach(c => {
      if (c.status !== 'pago') return;
      const data = c.pago_em || c.pagoEm || c.vencimento || '';
      if (!isInRange(data, range.inicio, range.fim)) return;
      movimentacoes.push({
        data,
        descricao: `Pagamento - ${c.cliente_nome || c.clienteNome || 'Cliente'}`,
        tipo: 'entrada',
        valor: c.valor || 0
      });
    });

    // Entradas manuais (tipo=entrada em despesas)
    despesas.forEach(d => {
      if (!isInRange(d.data, range.inicio, range.fim)) return;
      if (d.tipo === 'entrada') {
        movimentacoes.push({
          data: d.data,
          descricao: d.descricao || 'Entrada manual',
          tipo: 'entrada',
          valor: d.valor || 0
        });
      } else {
        movimentacoes.push({
          data: d.data,
          descricao: d.descricao || 'Despesa',
          tipo: 'saida',
          valor: d.valor || 0
        });
      }
    });

    // Sort by date
    movimentacoes.sort((a, b) => (a.data || '').localeCompare(b.data || ''));


    // Calculate saldo acumulado
    let saldo = 0;
    movimentacoes.forEach(m => {
      if (m.tipo === 'entrada') saldo += m.valor;
      else saldo -= m.valor;
      m.saldo_acumulado = parseFloat(saldo.toFixed(2));
    });

    const total_entradas = movimentacoes.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.valor, 0);
    const total_saidas = movimentacoes.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.valor, 0);

    // Build grafico - agrupar por semana ou dia
    const graficoMap = {};
    movimentacoes.forEach(m => {
      const key = m.data ? m.data.slice(0, 10) : 'sem-data';
      if (!graficoMap[key]) graficoMap[key] = { label: key.slice(5), entradas: 0, saidas: 0 };
      if (m.tipo === 'entrada') graficoMap[key].entradas += m.valor;
      else graficoMap[key].saidas += m.valor;
    });
    const grafico = Object.values(graficoMap);

    // Projeção: cobranças pendentes
    const hoje = new Date().toISOString().slice(0, 10);
    const entradasPrevistas = cobrancas
      .filter(c => (c.status === 'pendente' || c.status === 'em_aberto') && (c.vencimento || '') >= hoje)
      .reduce((s, c) => s + (c.valor || 0), 0);

    res.json({
      total_entradas: parseFloat(total_entradas.toFixed(2)),
      total_saidas: parseFloat(total_saidas.toFixed(2)),
      movimentacoes,
      grafico,
      projecao: {
        entradas_previstas: parseFloat(entradasPrevistas.toFixed(2)),
        saldo_projetado: parseFloat((saldo + entradasPrevistas).toFixed(2))
      }
    });
  } catch (error) {
    logger.error({ action: 'financeiro_fluxo_error', error: error.message });
    res.status(500).json({ error: 'Erro ao gerar fluxo de caixa' });
  }
});


// ─── GET /admin/financeiro/rentabilidade ────────────────────────────────────────
router.get('/rentabilidade', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { periodo, periodo_inicio, periodo_fim } = req.query;
    const range = getPeriodoRange(periodo, periodo_inicio, periodo_fim);

    // Fetch cobranças pagas (receita por evento)
    const cobResult = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'COBRANCA#'
      }
    }));

    // Fetch despesas vinculadas a eventos
    const despResult = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'DESPESA#'
      }
    }));

    const cobrancas = cobResult.Items || [];
    const despesas = despResult.Items || [];


    // Agrupar receita por evento
    const eventosMap = {};

    cobrancas.forEach(c => {
      if (c.status !== 'pago') return;
      const dataPago = c.pago_em || c.pagoEm || c.vencimento || '';
      if (!isInRange(dataPago, range.inicio, range.fim)) return;
      const eventoId = c.evento_id || c.eventoId || 'sem-evento';
      if (!eventosMap[eventoId]) {
        eventosMap[eventoId] = {
          evento_nome: c.evento_nome || c.eventoNome || 'Sem evento',
          cliente_nome: c.cliente_nome || c.clienteNome || '',
          receita_bruta: 0,
          despesas: 0
        };
      }
      eventosMap[eventoId].receita_bruta += c.valor || 0;
    });

    // Agrupar despesas por evento
    despesas.forEach(d => {
      if (d.tipo === 'entrada') return;
      if (!isInRange(d.data, range.inicio, range.fim)) return;
      const eventoId = d.evento_id || d.eventoId || 'sem-evento';
      if (!eventosMap[eventoId]) {
        eventosMap[eventoId] = {
          evento_nome: d.evento_nome || d.eventoNome || 'Sem evento',
          cliente_nome: '',
          receita_bruta: 0,
          despesas: 0
        };
      }
      eventosMap[eventoId].despesas += d.valor || 0;
    });

    const rentabilidade = Object.values(eventosMap).map(e => ({
      ...e,
      receita_bruta: parseFloat(e.receita_bruta.toFixed(2)),
      despesas: parseFloat(e.despesas.toFixed(2)),
      margem: parseFloat((e.receita_bruta - e.despesas).toFixed(2))
    })).sort((a, b) => b.margem - a.margem);

    res.json(rentabilidade);
  } catch (error) {
    logger.error({ action: 'financeiro_rentabilidade_error', error: error.message });
    res.status(500).json({ error: 'Erro ao gerar rentabilidade' });
  }
});


// ─── GET /admin/financeiro/exportar ─────────────────────────────────────────────
router.get('/exportar', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { tipo, periodo, periodo_inicio, periodo_fim } = req.query;
    const range = getPeriodoRange(periodo, periodo_inicio, periodo_fim);

    // Fetch cobranças
    const cobResult = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'COBRANCA#'
      }
    }));

    const cobrancas = (cobResult.Items || []).filter(c => {
      const data = c.pago_em || c.pagoEm || c.vencimento || '';
      return isInRange(data, range.inicio, range.fim);
    });

    if (tipo === 'csv') {
      const header = 'Cliente,Valor,Status,Vencimento,Meio\n';
      const rows = cobrancas.map(c =>
        `"${c.cliente_nome || ''}",${c.valor || 0},"${c.status || ''}","${c.vencimento || ''}","${c.meio_pagamento || c.metodoPagamento || ''}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=financeiro_${range.inicio}_${range.fim}.csv`);
      res.send(header + rows);
    } else {
      // Simple text-based report for PDF placeholder
      const lines = [`Relatório Financeiro - ${range.inicio} a ${range.fim}`, ''];
      lines.push(`Total cobranças: ${cobrancas.length}`);
      const totalPago = cobrancas.filter(c => c.status === 'pago').reduce((s, c) => s + (c.valor || 0), 0);
      lines.push(`Total recebido: R$ ${totalPago.toFixed(2)}`);
      lines.push('');
      lines.push('Cliente | Valor | Status | Vencimento');
      cobrancas.forEach(c => {
        lines.push(`${c.cliente_nome || '-'} | R$ ${(c.valor || 0).toFixed(2)} | ${c.status || '-'} | ${c.vencimento || '-'}`);
      });

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename=financeiro_${range.inicio}_${range.fim}.txt`);
      res.send(lines.join('\n'));
    }
  } catch (error) {
    logger.error({ action: 'financeiro_exportar_error', error: error.message });
    res.status(500).json({ error: 'Erro ao exportar' });
  }
});


// ─── GET /admin/financeiro/mensal ───────────────────────────────────────────────
router.get('/mensal', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const ano = req.query.ano || new Date().getFullYear().toString();

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
      if (c.status === 'pago') { meses[mesKey].receita += valor; meses[mesKey].quantidade++; }
      else if ((c.vencimento || c.data_vencimento) && (c.vencimento || c.data_vencimento) < hoje) { meses[mesKey].inadimplencia += valor; }
      else { meses[mesKey].aReceber += valor; }
    });

    const resultado = Object.values(meses).map(m => ({
      ...m, receita: parseFloat(m.receita.toFixed(2)), aReceber: parseFloat(m.aReceber.toFixed(2)), inadimplencia: parseFloat(m.inadimplencia.toFixed(2))
    }));
    res.json({ success: true, data: { ano, meses: resultado } });
  } catch (error) {
    logger.error({ action: 'financeiro_mensal_error', error: error.message });
    res.status(500).json({ error: 'Erro ao gerar relatório mensal' });
  }
});


// ─── GET /admin/financeiro/inadimplentes ────────────────────────────────────────
router.get('/inadimplentes', async (req, res) => {
  try {
    const photographerId = req.user.sub;

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
      .filter(c => c.vencimento && c.vencimento < hoje && c.status !== 'pago' && c.status !== 'cancelado' && c.status !== 'cancelada')
      .sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));

    const enriched = await Promise.all(inadimplentes.map(async (cobranca) => {
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
    }));

    const totalInadimplencia = enriched.reduce((sum, c) => sum + (c.valor || 0), 0);
    res.json({ success: true, data: { total: enriched.length, totalValor: parseFloat(totalInadimplencia.toFixed(2)), inadimplentes: enriched } });
  } catch (error) {
    logger.error({ action: 'financeiro_inadimplentes_error', error: error.message });
    res.status(500).json({ error: 'Erro ao listar inadimplentes' });
  }
});

module.exports = router;
