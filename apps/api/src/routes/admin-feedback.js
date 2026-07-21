const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const emailService = require('../services/emailService');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

// GET /admin/feedback - Listar todos os feedbacks
// Frontend espera: { success: true, data: [...feedbacks], resumo: { total_orcamentos, ... } }
router.get('/', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    logger.info({ action: 'feedback_list', photographerId });

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'FEEDBACK#'
      }
    }));

    const feedbacks = (result.Items || []).map(item => ({
      id: item.id,
      cliente_nome: item.clienteNome || item.cliente_nome,
      cliente_email: item.clienteEmail || item.cliente_email,
      evento: item.eventoNome || item.evento || '',
      nota: item.nota,
      texto: item.comentario || item.texto || '',
      autoriza_publico: item.autorizado || item.autoriza_publico || false,
      aprovado: item.aprovado || false,
      publicado: item.publicado || false,
      lembrete_enviado: item.lembrete_enviado || false,
      created_at: item.criadoEm || item.created_at,
      respondido_em: item.respondidoEm || item.respondido_em
    }));

    // Buscar total de orçamentos para cálculo de taxa de recusa
    let totalOrcamentos = 0;
    try {
      const orcResult = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `PHOTOGRAPHER#${photographerId}`,
          ':sk': 'ORCAMENTO#'
        },
        Select: 'COUNT'
      }));
      totalOrcamentos = orcResult.Count || 0;
    } catch (e) {
      logger.warn({ action: 'feedback_orcamentos_count_error', error: e.message });
    }

    res.json({
      success: true,
      data: feedbacks,
      resumo: {
        total_orcamentos: totalOrcamentos
      }
    });
  } catch (error) {
    logger.error({ action: 'feedback_list_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao listar feedbacks' });
  }
});

// GET /admin/feedback/recusas - Listar pesquisas de recusa
router.get('/recusas', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    logger.info({ action: 'feedback_recusas_list', photographerId });

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'RECUSA#'
      }
    }));

    const recusas = (result.Items || []).map(item => ({
      id: item.id,
      cliente_nome: item.clienteNome || item.cliente_nome,
      orcamento_id: item.orcamentoId || item.orcamento_id,
      orcamento_ref: item.orcamentoRef || item.orcamento_ref,
      motivos: item.motivos || [],
      comentario: item.comentario || '',
      created_at: item.criadoEm || item.created_at
    }));

    res.json({ success: true, data: recusas });
  } catch (error) {
    logger.error({ action: 'feedback_recusas_list_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao listar recusas' });
  }
});

// POST /admin/feedback/recusas/enviar - Enviar pesquisa de recusa
router.post('/recusas/enviar', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { orcamento_id, motivos, comentario } = req.body;

    if (!orcamento_id) {
      return res.status(400).json({ success: false, error: 'orcamento_id é obrigatório' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    // Buscar dados do orçamento para pegar nome do cliente
    let clienteNome = '';
    let orcamentoRef = '';
    try {
      const orcResult = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `ORCAMENTO#${orcamento_id}` }
      }));
      if (orcResult.Item) {
        clienteNome = orcResult.Item.clienteNome || orcResult.Item.cliente_nome || '';
        orcamentoRef = orcResult.Item.referencia || orcResult.Item.ref || orcamento_id;
      }
    } catch (e) {
      logger.warn({ action: 'recusa_orcamento_lookup_error', error: e.message });
    }

    const item = {
      PK: `PHOTOGRAPHER#${photographerId}`,
      SK: `RECUSA#${id}`,
      id,
      photographerId,
      orcamentoId: orcamento_id,
      orcamentoRef,
      clienteNome,
      motivos: motivos || [],
      comentario: comentario || '',
      criadoEm: now
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    logger.info({ action: 'feedback_recusa_enviar', photographerId, id, orcamento_id });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    logger.error({ action: 'feedback_recusa_enviar_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao enviar pesquisa de recusa' });
  }
});

// GET /admin/feedback/export/:tipo - Exportar dados em CSV
router.get('/export/:tipo', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { tipo } = req.params;
    logger.info({ action: 'feedback_export', photographerId, tipo });

    let items = [];
    let csvHeader = '';
    let csvRows = [];

    if (tipo === 'feedbacks' || tipo === 'depoimentos') {
      const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `PHOTOGRAPHER#${photographerId}`,
          ':sk': 'FEEDBACK#'
        }
      }));
      items = result.Items || [];

      if (tipo === 'depoimentos') {
        items = items.filter(i => i.autorizado || i.autoriza_publico);
      }

      csvHeader = 'ID,Cliente,Email,Nota,Comentario,Autorizado,Data';
      csvRows = items.map(i =>
        `"${i.id}","${i.clienteNome || ''}","${i.clienteEmail || ''}","${i.nota || ''}","${(i.comentario || '').replace(/"/g, '""')}","${i.autorizado ? 'Sim' : 'Não'}","${i.criadoEm || ''}"`
      );
    } else if (tipo === 'recusas') {
      const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `PHOTOGRAPHER#${photographerId}`,
          ':sk': 'RECUSA#'
        }
      }));
      items = result.Items || [];

      csvHeader = 'ID,Cliente,Orcamento,Motivos,Comentario,Data';
      csvRows = items.map(i =>
        `"${i.id}","${i.clienteNome || ''}","${i.orcamentoRef || i.orcamentoId || ''}","${(i.motivos || []).join('; ')}","${(i.comentario || '').replace(/"/g, '""')}","${i.criadoEm || ''}"`
      );
    } else {
      return res.status(400).json({ success: false, error: 'Tipo inválido. Use: feedbacks, depoimentos ou recusas' });
    }

    const csv = [csvHeader, ...csvRows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${tipo}_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error({ action: 'feedback_export_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao exportar dados' });
  }
});

// GET /admin/feedback/:id - Detalhe de um feedback
router.get('/:id', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;

    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `FEEDBACK#${id}` }
    }));

    if (!result.Item) {
      return res.status(404).json({ success: false, error: 'Feedback não encontrado' });
    }

    res.json({ success: true, data: result.Item });
  } catch (error) {
    logger.error({ action: 'feedback_get_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao buscar feedback' });
  }
});

// POST /admin/feedback/solicitar - Gerar solicitação de feedback
router.post('/solicitar', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { cliente_id, evento_id } = req.body;

    if (!cliente_id) {
      return res.status(400).json({ success: false, error: 'cliente_id é obrigatório' });
    }

    // Buscar dados do cliente
    let clienteNome = '';
    let clienteEmail = '';
    try {
      const cliResult = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `CLIENT#${cliente_id}` }
      }));
      if (cliResult.Item) {
        clienteNome = cliResult.Item.nome || cliResult.Item.name || '';
        clienteEmail = cliResult.Item.email || '';
      }
    } catch (e) {
      logger.warn({ action: 'feedback_solicitar_cliente_lookup', error: e.message });
    }

    const id = uuidv4();
    const tokenAcesso = uuidv4();
    const now = new Date().toISOString();

    const item = {
      PK: `PHOTOGRAPHER#${photographerId}`,
      SK: `FEEDBACK#${id}`,
      GSI1PK: `CLIENT#${cliente_id}`,
      GSI1SK: `FEEDBACK#${now}`,
      id,
      photographerId,
      clienteId: cliente_id,
      clienteNome,
      clienteEmail,
      eventoId: evento_id || null,
      nota: null,
      comentario: null,
      autorizado: false,
      aprovado: false,
      publicado: false,
      lembrete_enviado: false,
      tokenAcesso,
      respondidoEm: null,
      criadoEm: now
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    // Enviar email com link
    if (clienteEmail) {
      const feedbackUrl = `${process.env.FRONTEND_URL}/feedback/${tokenAcesso}`;
      try {
        await emailService.sendEmail({
          to: clienteEmail,
          subject: 'Queremos saber sua opinião!',
          html: `<p>Olá ${clienteNome},</p><p>Gostaríamos de saber como foi sua experiência conosco.</p><p><a href="${feedbackUrl}">Clique aqui para avaliar</a></p><p>Obrigado!</p>`
        });
      } catch (emailError) {
        logger.warn({ action: 'feedback_email_error', error: emailError.message });
      }
    }

    logger.info({ action: 'feedback_solicitar', photographerId, id, cliente_id });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    logger.error({ action: 'feedback_solicitar_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao solicitar feedback' });
  }
});

// PUT /admin/feedback/:id/aprovar - Aprovar/publicar depoimento
router.put('/:id/aprovar', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;
    const { publicado } = req.body || {};

    const current = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `FEEDBACK#${id}` }
    }));

    if (!current.Item) {
      return res.status(404).json({ success: false, error: 'Feedback não encontrado' });
    }

    // Se publicado foi enviado no body, usa esse valor; senão, marca como aprovado=true
    const updateExpression = publicado !== undefined
      ? 'SET aprovado = :aprovado, publicado = :publicado'
      : 'SET aprovado = :aprovado';

    const expressionValues = publicado !== undefined
      ? { ':aprovado': true, ':publicado': publicado }
      : { ':aprovado': true };

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `FEEDBACK#${id}` },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: 'ALL_NEW'
    }));

    logger.info({ action: 'feedback_aprovar', photographerId, id });
    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    logger.error({ action: 'feedback_aprovar_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao aprovar feedback' });
  }
});

// POST /admin/feedback/:id/lembrete - Enviar lembrete para cliente
router.post('/:id/lembrete', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;

    const current = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `FEEDBACK#${id}` }
    }));

    if (!current.Item) {
      return res.status(404).json({ success: false, error: 'Feedback não encontrado' });
    }

    const item = current.Item;

    // Enviar email de lembrete
    if (item.clienteEmail) {
      const feedbackUrl = `${process.env.FRONTEND_URL}/feedback/${item.tokenAcesso}`;
      try {
        await emailService.sendEmail({
          to: item.clienteEmail,
          subject: 'Lembrete: Queremos saber sua opinião!',
          html: `<p>Olá ${item.clienteNome || ''},</p><p>Ainda não recebemos sua avaliação. Sua opinião é muito importante para nós!</p><p><a href="${feedbackUrl}">Clique aqui para avaliar</a></p><p>Obrigado!</p>`
        });
      } catch (emailError) {
        logger.warn({ action: 'feedback_lembrete_email_error', error: emailError.message });
      }
    }

    // Marcar lembrete como enviado
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `FEEDBACK#${id}` },
      UpdateExpression: 'SET lembrete_enviado = :val, lembrete_enviado_em = :data',
      ExpressionAttributeValues: {
        ':val': true,
        ':data': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }));

    logger.info({ action: 'feedback_lembrete', photographerId, id });
    res.json({ success: true, message: 'Lembrete enviado com sucesso' });
  } catch (error) {
    logger.error({ action: 'feedback_lembrete_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao enviar lembrete' });
  }
});

// PATCH /admin/feedback/:id/autorizar - Toggle autorização (mantido para compatibilidade)
router.patch('/:id/autorizar', async (req, res) => {
  try {
    const photographerId = req.user.sub;
    const { id } = req.params;

    const current = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `FEEDBACK#${id}` }
    }));

    if (!current.Item) {
      return res.status(404).json({ success: false, error: 'Feedback não encontrado' });
    }

    const novoStatus = !current.Item.autorizado;

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `FEEDBACK#${id}` },
      UpdateExpression: 'SET autorizado = :autorizado',
      ExpressionAttributeValues: { ':autorizado': novoStatus },
      ReturnValues: 'ALL_NEW'
    }));

    logger.info({ action: 'feedback_autorizar', photographerId, id, autorizado: novoStatus });
    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    logger.error({ action: 'feedback_autorizar_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao autorizar feedback' });
  }
});

module.exports = router;
