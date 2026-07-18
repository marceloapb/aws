const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const router = Router();

// === Validation Helpers ===

function validarCpfCnpj(valor) {
  if (!valor) return true; // optional
  const digits = valor.replace(/\D/g, '');
  if (digits.length === 11) return validarCPF(digits);
  if (digits.length === 14) return validarCNPJ(digits);
  return false;
}

function validarCPF(cpf) {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(cpf[10]);
}

function validarCNPJ(cnpj) {
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) soma += parseInt(cnpj[i]) * pesos1[i];
  let resto = soma % 11;
  const dig1 = resto < 2 ? 0 : 11 - resto;
  if (parseInt(cnpj[12]) !== dig1) return false;
  soma = 0;
  for (let i = 0; i < 13; i++) soma += parseInt(cnpj[i]) * pesos2[i];
  resto = soma % 11;
  const dig2 = resto < 2 ? 0 : 11 - resto;
  return parseInt(cnpj[13]) === dig2;
}

function validarTelefone(tel) {
  if (!tel) return true; // optional
  const digits = tel.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

// === Helper: query all items with a given PK prefix ===
async function queryByPK(pk, skPrefix) {
  const params = {
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk' + (skPrefix ? ' AND begins_with(SK, :sk)' : ''),
    ExpressionAttributeValues: { ':pk': pk },
  };
  if (skPrefix) params.ExpressionAttributeValues[':sk'] = skPrefix;
  const result = await dynamo.send(new QueryCommand(params));
  return result.Items || [];
}

async function queryByGSI2(gsi2pk, gsi2skPrefix) {
  const params = {
    TableName: TABLE,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :pk' + (gsi2skPrefix ? ' AND begins_with(GSI2SK, :sk)' : ''),
    ExpressionAttributeValues: { ':pk': gsi2pk },
  };
  if (gsi2skPrefix) params.ExpressionAttributeValues[':sk'] = gsi2skPrefix;
  const result = await dynamo.send(new QueryCommand(params));
  return result.Items || [];
}

async function queryByGSI1(gsi1pk, gsi1skPrefix) {
  const params = {
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk' + (gsi1skPrefix ? ' AND begins_with(GSI1SK, :sk)' : ''),
    ExpressionAttributeValues: { ':pk': gsi1pk },
  };
  if (gsi1skPrefix) params.ExpressionAttributeValues[':sk'] = gsi1skPrefix;
  const result = await dynamo.send(new QueryCommand(params));
  return result.Items || [];
}



// =============================================
// GET /dashboard — Client dashboard data
// =============================================
router.get('/dashboard', async (req, res) => {
  try {
    const clienteId = req.user.sub;
    const gsi2pk = `CLIENTE#${clienteId}`;

    // Gather all client-related entities via GSI2
    const allItems = await queryByGSI2(gsi2pk);

    const orcamentos = allItems.filter(i => (i.SK || '').startsWith('ORC') || (i.SK || '').startsWith('ORCAMENTO'));
    const contratos = allItems.filter(i => (i.SK || '').startsWith('CT') || (i.SK || '').startsWith('CONTRATO'));
    const albuns = allItems.filter(i => (i.SK || '').startsWith('ALBUM'));
    const cobrancas = allItems.filter(i => (i.SK || '').startsWith('COBRANCA'));

    // Also try direct PK query for client entities
    const clienteItems = await queryByPK(`CLIENTE#${clienteId}`);
    const orcFromPK = clienteItems.filter(i => (i.SK || '').startsWith('ORCAMENTO'));
    const ctFromPK = clienteItems.filter(i => (i.SK || '').startsWith('CONTRATO'));
    const albFromPK = clienteItems.filter(i => (i.SK || '').startsWith('ALBUM'));

    // Merge (deduplicate by SK)
    const mergeUnique = (a, b) => {
      const map = new Map();
      [...a, ...b].forEach(item => map.set(item.SK, item));
      return Array.from(map.values());
    };
    const allOrc = mergeUnique(orcamentos, orcFromPK);
    const allCt = mergeUnique(contratos, ctFromPK);
    const allAlb = mergeUnique(albuns, albFromPK);
    const allCob = cobrancas;

    // Próximo evento: find orcamento with future data_evento
    const now = new Date().toISOString();
    const futuros = allOrc
      .filter(o => o.data_evento && o.data_evento >= now)
      .sort((a, b) => (a.data_evento || '').localeCompare(b.data_evento || ''));
    const proximo_evento = futuros.length > 0 ? {
      id: futuros[0].id || futuros[0].orcamento_id,
      data_evento: futuros[0].data_evento,
      tipo_evento: futuros[0].tipo_evento,
      local: futuros[0].local || futuros[0].local_evento,
    } : null;

    // Timeline step
    let timeline_step = 'orcamento';
    if (allCt.some(c => c.status === 'assinado')) {
      const hasAlbumAtivo = allAlb.some(a => a.status === 'ativo' || a.status === 'entregue');
      const hasFeedback = allItems.some(i => (i.SK || '').startsWith('FEEDBACK'));
      if (hasFeedback) timeline_step = 'feedback';
      else if (hasAlbumAtivo) timeline_step = 'entrega';
      else if (futuros.length === 0 && allOrc.some(o => o.status === 'aprovado')) timeline_step = 'edicao';
      else if (futuros.length > 0) timeline_step = 'evento';
      else timeline_step = 'contrato';
    } else if (allCt.length > 0) {
      timeline_step = 'contrato';
    }

    // Pendências
    const pendencias = [];
    const ctPendentes = allCt.filter(c => c.status === 'enviado' || c.status === 'aguardando');
    if (ctPendentes.length > 0) pendencias.push({ tipo: 'assinar_contrato', quantidade: ctPendentes.length, mensagem: 'Contrato(s) aguardando assinatura' });

    const cobPendentes = allCob.filter(c => c.status === 'pendente' || c.status === 'vencido' || c.status === 'atrasada');
    if (cobPendentes.length > 0) pendencias.push({ tipo: 'pagamento', quantidade: cobPendentes.length, mensagem: 'Pagamento(s) pendente(s)' });

    const orcPendentes = allOrc.filter(o => o.status === 'enviado');
    if (orcPendentes.length > 0) pendencias.push({ tipo: 'responder_orcamento', quantidade: orcPendentes.length, mensagem: 'Orçamento(s) aguardando resposta' });

    // Resumo
    const pagamentos_pendentes = cobPendentes.length;
    const resumo = {
      orcamentos: allOrc.length,
      contratos: allCt.length,
      albuns: allAlb.length,
      pagamentos_pendentes,
    };

    res.json({
      success: true,
      data: { proximo_evento, timeline_step, pendencias, resumo },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});



// =============================================
// GET /eventos — List client events
// =============================================
router.get('/eventos', async (req, res) => {
  try {
    const clienteId = req.user.sub;

    // Query orcamentos for this client
    const orcamentos = await queryByPK(`CLIENTE#${clienteId}`, 'ORCAMENTO#');
    const clienteItems = await queryByGSI2(`CLIENTE#${clienteId}`);
    const contratos = clienteItems.filter(i => (i.SK || '').startsWith('CT') || (i.SK || '').startsWith('CONTRATO'));
    const albuns = clienteItems.filter(i => (i.SK || '').startsWith('ALBUM'));
    const cobrancas = clienteItems.filter(i => (i.SK || '').startsWith('COBRANCA'));

    const eventos = orcamentos.map(orc => {
      const orcId = orc.id || orc.orcamento_id;
      const contrato = contratos.find(c => c.orcamento_id === orcId);
      const album = albuns.find(a => a.orcamento_id === orcId);

      // Calculate payment percentage
      const orcCobrancas = cobrancas.filter(c => c.orcamento_id === orcId || c.contrato_id === (contrato && contrato.id));
      const totalCob = orcCobrancas.reduce((sum, c) => sum + (c.valor || 0), 0);
      const totalPago = orcCobrancas.filter(c => c.status === 'pago').reduce((sum, c) => sum + (c.valor || 0), 0);
      const pagamento_percentual = totalCob > 0 ? Math.round((totalPago / totalCob) * 100) : 0;

      // Determine status_geral
      let status_geral = 'orcando';
      if (album && (album.status === 'ativo' || album.status === 'entregue')) status_geral = 'entregue';
      else if (contrato && contrato.status === 'assinado' && orc.data_evento && orc.data_evento < new Date().toISOString()) status_geral = 'realizado';
      else if (contrato && contrato.status === 'assinado') status_geral = 'contratado';

      return {
        id: orcId,
        tipo_evento: orc.tipo_evento,
        data_evento: orc.data_evento,
        local: orc.local || orc.local_evento,
        status_geral,
        contrato_status: contrato ? contrato.status : null,
        album_status: album ? album.status : null,
        pagamento_percentual,
      };
    });

    eventos.sort((a, b) => (b.data_evento || '').localeCompare(a.data_evento || ''));
    res.json({ success: true, data: eventos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================
// GET /eventos/:id — Event detail
// =============================================
router.get('/eventos/:id', async (req, res) => {
  try {
    const clienteId = req.user.sub;
    const eventoId = req.params.id;

    // Fetch orcamento and validate ownership
    const orcResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: { ':pk': `CLIENTE#${clienteId}`, ':sk': `ORCAMENTO#${eventoId}` },
    }));

    if (!orcResult.Items || orcResult.Items.length === 0) {
      return res.status(404).json({ success: false, message: 'Evento não encontrado' });
    }
    const orcamento = orcResult.Items[0];

    // Validate ownership
    if (orcamento.cliente_id && orcamento.cliente_id !== clienteId) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    // Fetch related entities via GSI2
    const clienteItems = await queryByGSI2(`CLIENTE#${clienteId}`);
    const contratos = clienteItems.filter(i => ((i.SK || '').startsWith('CT') || (i.SK || '').startsWith('CONTRATO')) && i.orcamento_id === eventoId);
    const albuns = clienteItems.filter(i => (i.SK || '').startsWith('ALBUM') && i.orcamento_id === eventoId);
    const cobrancas = clienteItems.filter(i => (i.SK || '').startsWith('COBRANCA') && (i.orcamento_id === eventoId || (contratos[0] && i.contrato_id === contratos[0].id)));

    // Fetch orcamento options (if stored as sub-items)
    const opcoes = await queryByPK(`ORCAMENTO#${eventoId}`, 'OPCAO#');

    res.json({
      success: true,
      data: {
        orcamento,
        opcoes,
        contrato: contratos[0] || null,
        cobrancas,
        album: albuns[0] || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});



// =============================================
// GET /perfil — Get client profile
// =============================================
router.get('/perfil', async (req, res) => {
  try {
    const clienteId = req.user.sub;

    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: { ':pk': `CLIENTE#${clienteId}`, ':sk': `PERFIL#${clienteId}` },
    }));

    // Try alternative SK pattern
    let perfil = result.Items && result.Items[0];
    if (!perfil) {
      const alt = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: { ':pk': `CLIENTE#${clienteId}`, ':sk': 'METADATA' },
      }));
      perfil = alt.Items && alt.Items[0];
    }

    if (!perfil) {
      // Return basic profile from JWT
      return res.json({
        success: true,
        data: {
          nome: req.user.name || '',
          email: req.user.email || '',
          telefone: '',
          cpf_cnpj: '',
          endereco: '',
        },
      });
    }

    res.json({
      success: true,
      data: {
        nome: perfil.nome || perfil.name || '',
        email: perfil.email || req.user.email || '',
        telefone: perfil.telefone || '',
        cpf_cnpj: perfil.cpf_cnpj || perfil.cpf || perfil.cnpj || '',
        endereco: perfil.endereco || '',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================
// PUT /perfil — Update client profile
// =============================================
router.put('/perfil', async (req, res) => {
  try {
    const clienteId = req.user.sub;
    const { nome, telefone, cpf_cnpj, endereco } = req.body;

    // Validations
    if (!nome || nome.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
    }

    if (telefone && !validarTelefone(telefone)) {
      return res.status(400).json({ success: false, message: 'Telefone inválido. Use formato com 10 ou 11 dígitos' });
    }

    if (cpf_cnpj && !validarCpfCnpj(cpf_cnpj)) {
      return res.status(400).json({ success: false, message: 'CPF/CNPJ inválido' });
    }

    const now = new Date().toISOString();
    const updateExpr = 'SET #nome = :nome, telefone = :tel, cpf_cnpj = :doc, endereco = :end, updated_at = :upd';
    const exprNames = { '#nome': 'nome' };
    const exprValues = {
      ':nome': nome.trim(),
      ':tel': telefone || '',
      ':doc': cpf_cnpj || '',
      ':end': endereco || '',
      ':upd': now,
    };

    // Try to update existing profile
    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `CLIENTE#${clienteId}`, SK: `PERFIL#${clienteId}` },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
    }));

    res.json({
      success: true,
      data: {
        nome: nome.trim(),
        email: req.user.email,
        telefone: telefone || '',
        cpf_cnpj: cpf_cnpj || '',
        endereco: endereco || '',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});



// =============================================
// POST /feedback — Submit feedback for an orcamento
// =============================================
router.post('/feedback', async (req, res) => {
  try {
    const clienteId = req.user.sub;
    const { orcamento_id, nota, texto, autoriza_publico } = req.body;

    // Validations
    if (!orcamento_id) {
      return res.status(400).json({ success: false, message: 'orcamento_id é obrigatório' });
    }
    if (!nota || nota < 1 || nota > 5) {
      return res.status(400).json({ success: false, message: 'Nota é obrigatória e deve ser entre 1 e 5' });
    }
    if (!texto || texto.trim().length < 20) {
      return res.status(400).json({ success: false, message: 'Texto é obrigatório e deve ter no mínimo 20 caracteres' });
    }

    // Validate orcamento belongs to client
    const orcResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: { ':pk': `CLIENTE#${clienteId}`, ':sk': `ORCAMENTO#${orcamento_id}` },
    }));
    if (!orcResult.Items || orcResult.Items.length === 0) {
      return res.status(403).json({ success: false, message: 'Orçamento não encontrado ou acesso negado' });
    }

    // Check for duplicate feedback
    const existingFeedback = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'orcamento_id = :oid AND cliente_id = :cid',
      ExpressionAttributeValues: { ':pk': 'FEEDBACK', ':oid': orcamento_id, ':cid': clienteId },
    }));
    if (existingFeedback.Items && existingFeedback.Items.length > 0) {
      return res.status(409).json({ success: false, message: 'Feedback já enviado para este orçamento' });
    }

    // Create feedback
    const feedbackId = randomUUID();
    const now = new Date().toISOString();

    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: 'TENANT#1',
        SK: `FEEDBACK#${feedbackId}`,
        GSI1PK: 'FEEDBACK',
        GSI1SK: `FEEDBACK#${now}`,
        GSI2PK: `CLIENTE#${clienteId}`,
        GSI2SK: `FEEDBACK#${feedbackId}`,
        id: feedbackId,
        orcamento_id,
        cliente_id: clienteId,
        cliente_nome: req.user.name || '',
        cliente_email: req.user.email || '',
        nota: Number(nota),
        texto: texto.trim(),
        autoriza_publico: autoriza_publico === true,
        created_at: now,
        updated_at: now,
      },
      ConditionExpression: 'attribute_not_exists(PK)',
    }));

    res.status(201).json({
      success: true,
      data: { id: feedbackId, message: 'Feedback enviado com sucesso' },
    });
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return res.status(409).json({ success: false, message: 'Feedback já existe' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});



// =============================================
// GET /aditivos — List addendums for client's contracts
// =============================================
router.get('/aditivos', async (req, res) => {
  try {
    const clienteId = req.user.sub;

    // Get client's contracts
    const contratos = await queryByPK(`CLIENTE#${clienteId}`, 'CONTRATO#');
    // Also check GSI2 for contracts
    const gsi2Items = await queryByGSI2(`CLIENTE#${clienteId}`);
    const ctFromGSI = gsi2Items.filter(i => (i.SK || '').startsWith('CT') || (i.SK || '').startsWith('CONTRATO'));

    // Merge contracts
    const allContratos = new Map();
    [...contratos, ...ctFromGSI].forEach(c => allContratos.set(c.id || c.contrato_id, c));

    // For each contract, query its aditivos
    const aditivos = [];
    for (const [contratoId] of allContratos) {
      if (!contratoId) continue;
      const adItems = await queryByPK(`CONTRATO#${contratoId}`, 'ADITIVO#');
      aditivos.push(...adItems);
    }

    // Also try GSI1 query for aditivos belonging to this client
    const gsi1Aditivos = await queryByGSI1('ADITIVO');
    const clienteAditivos = gsi1Aditivos.filter(a => a.cliente_id === clienteId);
    
    // Merge
    const aditivoMap = new Map();
    [...aditivos, ...clienteAditivos].forEach(a => aditivoMap.set(a.id || a.SK, a));
    const result = Array.from(aditivoMap.values()).sort((a, b) => (b.created_at || b.criadoEm || '').localeCompare(a.created_at || a.criadoEm || ''));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================
// PATCH /aditivos/:id/aceitar — Accept addendum
// =============================================
router.patch('/aditivos/:id/aceitar', async (req, res) => {
  try {
    const clienteId = req.user.sub;
    const aditivoId = req.params.id;

    // Find the aditivo - try GSI1
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: { ':pk': 'ADITIVO', ':id': aditivoId },
    }));

    let aditivo = result.Items && result.Items[0];
    if (!aditivo) {
      return res.status(404).json({ success: false, message: 'Aditivo não encontrado' });
    }

    // Validate ownership
    if (aditivo.cliente_id && aditivo.cliente_id !== clienteId) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    if (aditivo.status !== 'pendente') {
      return res.status(400).json({ success: false, message: 'Aditivo já foi respondido' });
    }

    const now = new Date().toISOString();
    const ip = req.headers['x-forwarded-for'] || req.ip || '';
    const user_agent = req.headers['user-agent'] || '';

    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: aditivo.PK, SK: aditivo.SK },
      UpdateExpression: 'SET #status = :status, aceito_em = :now, aceite_ip = :ip, aceite_user_agent = :ua, updated_at = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'aceito',
        ':now': now,
        ':ip': ip,
        ':ua': user_agent,
      },
    }));

    res.json({ success: true, data: { message: 'Aditivo aceito com sucesso' } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================
// PATCH /aditivos/:id/recusar — Reject addendum
// =============================================
router.patch('/aditivos/:id/recusar', async (req, res) => {
  try {
    const clienteId = req.user.sub;
    const aditivoId = req.params.id;
    const { motivo } = req.body;

    // Validate motivo
    if (!motivo || motivo.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Motivo é obrigatório e deve ter no mínimo 10 caracteres' });
    }

    // Find the aditivo
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: { ':pk': 'ADITIVO', ':id': aditivoId },
    }));

    let aditivo = result.Items && result.Items[0];
    if (!aditivo) {
      return res.status(404).json({ success: false, message: 'Aditivo não encontrado' });
    }

    // Validate ownership
    if (aditivo.cliente_id && aditivo.cliente_id !== clienteId) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    if (aditivo.status !== 'pendente') {
      return res.status(400).json({ success: false, message: 'Aditivo já foi respondido' });
    }

    const now = new Date().toISOString();

    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: aditivo.PK, SK: aditivo.SK },
      UpdateExpression: 'SET #status = :status, motivo_recusa = :motivo, recusado_em = :now, updated_at = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'recusado',
        ':motivo': motivo.trim(),
        ':now': now,
      },
    }));

    res.json({ success: true, data: { message: 'Aditivo recusado' } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
