const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { gerarContrato, enviarParaAssinatura, assinarComoContratado } = require('../services/contratoService');
const { registrarEvento, avancarStatusAutomatico } = require('../services/clienteHistoricoService');
const { notificarContratoAssinado } = require('../services/notificationService');

const router = Router();

// GET /api/admin/contratos
router.get('/', async (req, res) => {
  try {
    const { status, cliente_id, page = 1, limit = 50 } = req.query;

    let items = [];
    if (cliente_id) {
      const result = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `CLIENTE#${cliente_id}`, ':sk': 'CONTRATO#' },
      }));
      items = result.Items || [];
    } else {
      const params = {
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'CONTRATO' },
      };
      if (status) {
        params.FilterExpression = '#s = :status';
        params.ExpressionAttributeNames = { '#s': 'status' };
        params.ExpressionAttributeValues[':status'] = status;
      }
      const result = await dynamo.send(new QueryCommand(params));
      items = result.Items || [];
    }
    if (status && cliente_id) items = items.filter(c => c.status === status);

    const total = items.length;
    const start = (Number(page) - 1) * Number(limit);
    const pageItems = items.slice(start, start + Number(limit));

    // Enrich with client names and orcamento data
    const { GetCommand } = require('@aws-sdk/lib-dynamodb');
    const data = await Promise.all(pageItems.map(async (c) => {
      // Get client name
      if (c.cliente_id && !c.cliente_nome) {
        try {
          const cli = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { PK: `CLIENT#${c.cliente_id}`, SK: 'PROFILE' } }));
          if (cli.Item) c.cliente_nome = cli.Item.nome || cli.Item.nome_completo || '';
        } catch {}
      }
      // Get valor_total and tipo_evento from orcamento
      if (c.orcamento_id && (!c.valor_total || !c.tipo_evento)) {
        try {
          const orc = await dynamo.send(new QueryCommand({
            TableName: TABLE, IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
            ExpressionAttributeValues: { ':pk': 'ORCAMENTO', ':sk': `ORCAMENTO#${c.orcamento_id}` },
          }));
          if (orc.Items?.[0]) {
            c.valor_total = c.valor_total || orc.Items[0].valor_total || null;
            c.tipo_evento = c.tipo_evento || orc.Items[0].tipo_evento || orc.Items[0].nome_evento || '';
          }
        } catch {}
      }
      c.gerado_em = c.gerado_em || c.created || null;
      return c;
    }));

    res.json({ success: true, data, pagination: { page: Number(page), totalPages: Math.ceil(total / Number(limit)), totalItems: total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/contratos/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'CONTRATO', ':sk': `CONTRATO#${req.params.id}` },
    }));
    if (!result.Items || result.Items.length === 0) return res.status(404).json({ success: false, message: 'Contrato não encontrado' });
    const contrato = result.Items[0];

    // Enrich with client name
    if (contrato.cliente_id && !contrato.cliente_nome) {
      try {
        const { GetCommand } = require('@aws-sdk/lib-dynamodb');
        const cli = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { PK: `CLIENT#${contrato.cliente_id}`, SK: 'PROFILE' } }));
        if (cli.Item) contrato.cliente_nome = cli.Item.nome || cli.Item.nome_completo || '';
        if (!contrato.cliente_nome) {
          const TENANT = process.env.TENANT_ID || '1';
          const cli2 = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { PK: `TENANT#${TENANT}`, SK: `CLIENTE#${contrato.cliente_id}` } }));
          if (cli2.Item) contrato.cliente_nome = cli2.Item.nome || '';
        }
      } catch {}
    }

    // Enrich with valor_total from orcamento
    if (!contrato.valor_total && contrato.orcamento_id) {
      try {
        const orcResult = await dynamo.send(new QueryCommand({
          TableName: TABLE, IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
          ExpressionAttributeValues: { ':pk': 'ORCAMENTO', ':sk': `ORCAMENTO#${contrato.orcamento_id}` },
        }));
        if (orcResult.Items?.[0]) contrato.valor_total = orcResult.Items[0].valor_total || null;
      } catch {}
    }

    // Enrich with modelo_nome
    if (contrato.modelo_id && !contrato.modelo_nome) {
      try {
        const TENANT = req.tenantId || process.env.TENANT_ID || '1';
        const { GetCommand } = require('@aws-sdk/lib-dynamodb');
        const mod = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { PK: `TENANT#${TENANT}`, SK: `MODELO_CONTRATO#${contrato.modelo_id}` } }));
        if (mod.Item) contrato.modelo_nome = mod.Item.nome || '';
      } catch {}
    }

    res.json({ success: true, data: contrato });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Contrato não encontrado' });
  }
});

// POST /api/admin/contratos/gerar
router.post('/gerar', async (req, res) => {
  try {
    const { orcamento_id, modelo_id } = req.body;
    if (!orcamento_id) return res.status(400).json({ success: false, message: 'orcamento_id é obrigatório' });
    const contrato = await gerarContrato(orcamento_id, modelo_id, req.tenantId);
    res.status(201).json({ success: true, data: contrato });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/contratos/:id/enviar
router.post('/:id/enviar', async (req, res) => {
  try {
    const resultado = await enviarParaAssinatura(req.params.id);

    // Disparar evento contrato_enviado para regras de notificação
    try {
      const found = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
        ExpressionAttributeValues: { ':pk': 'CONTRATO', ':sk': `CONTRATO#${req.params.id}` },
      }));
      const contrato = found.Items?.[0];
      if (contrato?.cliente_id) {
        await registrarEvento({
          cliente_id: contrato.cliente_id,
          tipo: 'contrato_enviado',
          descricao: `Contrato enviado para assinatura`,
          metadata: { contrato_id: req.params.id },
        });
      }
    } catch (evtErr) {
      console.error('[CONTRATO] Erro ao registrar evento contrato_enviado:', evtErr.message);
    }

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/contratos/:id
router.put('/:id', async (req, res) => {
  try {
    const found = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'CONTRATO', ':sk': `CONTRATO#${req.params.id}` },
    }));
    if (!found.Items || found.Items.length === 0) return res.status(404).json({ success: false, message: 'Contrato não encontrado' });
    const contrato = found.Items[0];

    const updates = req.body;
    const keys = Object.keys(updates);
    const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
    const vals = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));
    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: contrato.PK, SK: contrato.SK },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
      ReturnValues: 'ALL_NEW',
    }));

    // Registrar no histórico quando contrato é assinado
    if (updates.status === 'assinado' && contrato.status !== 'assinado') {
      const clienteId = contrato.cliente_id || (contrato.PK?.startsWith('CLIENTE#') ? contrato.PK.replace('CLIENTE#', '') : null);
      if (clienteId) {
        try {
          await registrarEvento({
            cliente_id: clienteId,
            tipo: 'contrato_assinado',
            descricao: `Contrato assinado`,
            metadata: { contrato_id: req.params.id },
          });
          await avancarStatusAutomatico(clienteId, 'contrato_assinado');
        } catch (histErr) {
          console.error('[CONTRATO] Erro ao registrar histórico assinatura:', histErr.message);
        }
      }
      // Notificar admin via WhatsApp + email
      try {
        const { QueryCommand: QCmd } = require('@aws-sdk/lib-dynamodb');
        const TENANT = req.tenantId || process.env.TENANT_ID || '1';
        const configResult = await dynamo.send(new QCmd({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'CONFIG#' },
        }));
        const configs = {};
        (configResult.Items || []).forEach(item => { configs[item.chave] = item.valor; });
        const adminEmail = configs.email || process.env.SES_FROM_EMAIL;
        const adminWhatsapp = configs.whatsappBusiness || configs.phone || '';
        const adminId = TENANT;
        const clienteNome = contrato.cliente_nome || 'Cliente';
        await notificarContratoAssinado(adminEmail, adminWhatsapp, adminId, clienteNome);
      } catch (notifErr) {
        console.error('[CONTRATO] Erro ao notificar assinatura:', notifErr.message);
      }
    }

    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/contratos/:id/pdf — Download contrato como PDF
router.post('/:id/pdf', async (req, res) => {
  try {
    const { gerarContratoPDF } = require('../services/contratoPdfService');
    const htmlBuffer = await gerarContratoPDF(req.params.id);
    res.json({ success: true, html: htmlBuffer.toString('utf-8') });
  } catch (error) {
    console.error('[PDF] Erro:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/contratos/:id/assinar-contratado
router.post('/:id/assinar-contratado', async (req, res) => {
  try {
    // Buscar nome fantasia das configurações da empresa
    const TENANT = req.tenantId || process.env.TENANT_ID || '1';
    let nomeContratado = req.user?.email || 'Admin';
    try {
      // Buscar configs — tenta no tenant do usuário E em default
      const tenants = TENANT === '1' ? ['1'] : [TENANT, '1'];
      let configs = {};
      for (const t of tenants) {
        const cfgResult = await dynamo.send(new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: { ':pk': `TENANT#${t}`, ':sk': 'CONFIG#' },
        }));
        for (const item of (cfgResult.Items || [])) {
          if (item.chave && item.valor && !configs[item.chave]) {
            configs[item.chave] = item.valor;
          }
        }
        // Se já encontrou tradeName ou businessName, para
        if (configs.tradeName || configs.businessName) break;
      }
      nomeContratado = configs.tradeName || configs.businessName || nomeContratado;
    } catch (e) { /* fallback para email */ }

    const resultado = await assinarComoContratado(req.params.id, {
      nome: nomeContratado,
      ip: req.headers['x-forwarded-for'] || req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/admin/contratos/:id/manifesto — SIG-04: Download manifesto via URL assinada S3
router.get('/:id/manifesto', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'CONTRATO', ':sk': `CONTRATO#${req.params.id}` },
    }));
    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ success: false, message: 'Contrato não encontrado' });
    }
    const contrato = result.Items[0];

    if (contrato.status !== 'assinado') {
      return res.status(400).json({ success: false, message: 'Contrato ainda não foi assinado.' });
    }

    // Se manifesto já existe no S3, gerar URL assinada
    if (contrato.manifesto_s3_key) {
      const { gerarUrlAssinada } = require('../services/integrityService');
      const url = await gerarUrlAssinada(contrato.manifesto_s3_key, 300); // 5 min
      return res.json({
        success: true,
        data: {
          url,
          s3_key: contrato.manifesto_s3_key,
          hash: contrato.manifesto_hash || null,
          gerado_em: contrato.manifesto_gerado_em || null,
          retain_until: contrato.manifesto_retain_until || null,
          expira_url_em: new Date(Date.now() + 300 * 1000).toISOString(),
        },
      });
    }

    // Se manifesto ainda não foi gerado, gerar agora (fallback manual)
    const { gerarManifestoParaContrato } = require('../functions/contratos/gerarManifesto');
    const resultado = await gerarManifestoParaContrato(req.params.id);

    const { gerarUrlAssinada } = require('../services/integrityService');
    const url = await gerarUrlAssinada(resultado.s3Key, 300);

    res.json({
      success: true,
      data: {
        url,
        s3_key: resultado.s3Key,
        hash: resultado.hash,
        gerado_em: new Date().toISOString(),
        retain_until: resultado.retain_until,
        expira_url_em: new Date(Date.now() + 300 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('[MANIFESTO] Erro:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/admin/contratos/:id/audit-log — SIG-03: Endpoint dedicado para consulta de audit log
router.get('/:id/audit-log', async (req, res) => {
  try {
    const { listarAuditLog } = require('../services/auditLogService');
    const { limite = 100, ordem = 'asc' } = req.query;

    // Verificar se contrato existe
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'CONTRATO', ':sk': `CONTRATO#${req.params.id}` },
    }));
    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ success: false, message: 'Contrato não encontrado' });
    }

    const logs = await listarAuditLog(req.params.id, {
      limite: Math.min(Number(limite), 500),
      ordem: ordem === 'desc' ? 'desc' : 'asc',
    });

    res.json({
      success: true,
      data: {
        contrato_id: req.params.id,
        total: logs.length,
        eventos: logs.map(log => ({
          id: log.id,
          evento: log.evento,
          timestamp: log.timestamp || log.created_at,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          detalhes: log.detalhes || {},
          cliente_id: log.cliente_id,
        })),
      },
    });
  } catch (error) {
    console.error('[AUDIT-LOG] Erro:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/contratos/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'CONTRATO', ':sk': `CONTRATO#${req.params.id}` },
    }));
    if (!result.Items || result.Items.length === 0) return res.status(404).json({ success: false, message: 'Contrato não encontrado' });
    const contrato = result.Items[0];
    const { DeleteCommand } = require('@aws-sdk/lib-dynamodb');
    await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: contrato.PK, SK: contrato.SK } }));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
