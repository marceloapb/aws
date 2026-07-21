const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, UpdateCommand, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { notificarNovoOrcamento } = require('../services/notificationService');

const router = Router();
const TENANT = process.env.TENANT_ID || 'default';

router.get('/', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `CLIENTE#${req.clienteId}`, ':sk': 'ORCAMENTO#' },
    }));
    const items = (result.Items || []).sort((a, b) => (b.created || '').localeCompare(a.created || ''));
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:token', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'token_acesso = :token',
      ExpressionAttributeValues: { ':pk': 'ORCAMENTO', ':token': req.params.token },
    }));
    if (!result.Items || result.Items.length === 0) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
    res.json({ success: true, data: result.Items[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /client/orcamentos - Solicitar novo orçamento (formulário expandido)
router.post('/', async (req, res) => {
  try {
    const {
      // Seus Dados
      nome_completo,
      email,
      telefone,
      // Como chegou
      origem,
      // O Evento
      nome_evento,
      data_evento,
      horario_inicio,
      horario_fim,
      // Pacote selecionado
      pacote_id,
      // Serviços selecionados
      servicos_selecionados,
      // Local do Evento
      local_nome,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      // Detalhes Finais
      observacoes,
      // CPF (from form)
      cpf,
    } = req.body;

    // Validação mínima - nome do evento é obrigatório
    if (!nome_evento || !nome_evento.trim()) {
      return res.status(400).json({ success: false, message: 'Nome do evento é obrigatório' });
    }

    const id = require('crypto').randomUUID();
    const clienteId = req.clienteId;

    // Montar endereço completo para campo legado
    const enderecoParts = [logradouro, numero, complemento, bairro, cidade, uf].filter(Boolean);
    const localCompleto = local_nome
      ? `${local_nome}${enderecoParts.length ? ' - ' + enderecoParts.join(', ') : ''}`
      : enderecoParts.join(', ') || null;

    const item = {
      id,
      // Dados do solicitante
      nome_completo: nome_completo || null,
      email: email || null,
      telefone: telefone || null,
      cpf: cpf || null,
      // Origem
      origem: origem || null,
      // Evento
      tipo_evento: nome_evento.trim(),
      nome_evento: nome_evento.trim(),
      data_evento: data_evento || null,
      horario_inicio: horario_inicio || null,
      horario_fim: horario_fim || null,
      // Pacote
      pacote_id: pacote_id || null,
      // Serviços
      servicos_selecionados: Array.isArray(servicos_selecionados) ? servicos_selecionados : [],
      // Local (estruturado)
      local: localCompleto,
      local_nome: local_nome || null,
      endereco: {
        cep: cep || null,
        logradouro: logradouro || null,
        numero: numero || null,
        complemento: complemento || null,
        bairro: bairro || null,
        cidade: cidade || null,
        uf: uf || null,
      },
      // Observações
      observacoes: observacoes || null,
      // Metadata
      status: 'solicitado',
      origem_canal: 'portal_cliente',
      PK: `CLIENTE#${clienteId}`,
      SK: `ORCAMENTO#${id}`,
      GSI1PK: 'ORCAMENTO',
      GSI1SK: `ORCAMENTO#${id}`,
      created: new Date().toISOString(),
      cliente_id: clienteId,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    // Notificar admin sobre novo orçamento
    try {
      const configResult = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'CONFIG#' },
      }));
      const config = {};
      for (const c of (configResult.Items || [])) {
        config[c.chave] = c.valor;
      }
      const adminEmail = config.email || null;
      const adminWhatsapp = config.phone || config.whatsappBusiness || null;
      const clienteNome = nome_completo || email || 'Cliente';
      await notificarNovoOrcamento(adminEmail, adminWhatsapp, TENANT, clienteNome, nome_evento.trim());
    } catch (notifErr) {
      // Notificação falhou mas orçamento já foi salvo - não bloquear
      console.error('Erro ao notificar:', notifErr.message);
    }

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/aprovar', async (req, res) => {
  try {
    // Verificar ownership
    const check = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: { ':pk': `CLIENTE#${req.clienteId}`, ':sk': `ORCAMENTO#${req.params.id}` },
    }));
    if (!check.Items || check.Items.length === 0) return res.status(403).json({ success: false, message: 'Acesso negado' });
    const orcamento = check.Items[0];
    if (orcamento.status !== 'enviado') return res.status(400).json({ success: false, message: 'Orçamento não pode ser aprovado neste status' });

    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: orcamento.PK, SK: orcamento.SK },
      UpdateExpression: 'SET #s = :s, aprovado_em = :a',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'aprovado', ':a': new Date().toISOString() },
    }));
    res.json({ success: true, message: 'Orçamento aprovado' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
