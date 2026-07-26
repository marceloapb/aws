const { Router } = require('express');
const { enviarTemplate, enviarNotificacaoOrcamento, enviarNotificacaoAlbum } = require('../services/whatsappService');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router();

// POST /api/admin/whatsapp/enviar-template
router.post('/enviar-template', async (req, res) => {
  try {
    const { numero, template, parametros } = req.body;
    if (!numero || !template) return res.status(400).json({ success: false, message: 'numero e template são obrigatórios' });
    const resultado = await enviarTemplate(numero, template, parametros || []);
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/whatsapp/notificar-orcamento
router.post('/notificar-orcamento', async (req, res) => {
  try {
    const { orcamento_id } = req.body;

    const orcResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'ORCAMENTO', ':sk': `ORCAMENTO#${orcamento_id}` },
    }));
    const orcamento = orcResult.Items?.[0];
    if (!orcamento) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });

    const cliResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${orcamento.cliente_id}` },
    }));
    const cliente = cliResult.Items?.[0];

    if (!cliente?.whatsapp_numero) return res.status(400).json({ success: false, message: 'Cliente sem WhatsApp cadastrado' });

    const link = `${process.env.FRONTEND_URL}/orcamento/${orcamento.token_acesso}`;
    const resultado = await enviarNotificacaoOrcamento(cliente.whatsapp_numero, cliente.nome, orcamento.valor_total, link);

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/whatsapp/notificar-album
router.post('/notificar-album', async (req, res) => {
  try {
    const { album_id } = req.body;

    const albumResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${album_id}` },
    }));
    const album = albumResult.Items?.[0];
    if (!album) return res.status(404).json({ success: false, message: 'Álbum não encontrado' });

    const cliResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${album.cliente_id}` },
    }));
    const cliente = cliResult.Items?.[0];

    if (!cliente?.whatsapp_numero) return res.status(400).json({ success: false, message: 'Cliente sem WhatsApp cadastrado' });

    const link = `${process.env.FRONTEND_URL}/album/${album.slug || album.id}`;
    const resultado = await enviarNotificacaoAlbum(cliente.whatsapp_numero, cliente.nome, album.titulo, link);

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/admin/whatsapp/config - Status da configuração do WhatsApp
router.get('/config', async (req, res) => {
  try {
    const { loadParams } = require('../config/env');
    const params = await loadParams();
    const connected = !!(params.WHATSAPP_ACCESS_TOKEN && params.WHATSAPP_PHONE_NUMBER_ID);

    let phoneNumber = '';
    let verifyToken = params.WHATSAPP_VERIFY_TOKEN || '';

    if (connected) {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${params.WHATSAPP_PHONE_NUMBER_ID}?access_token=${params.WHATSAPP_ACCESS_TOKEN}`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (response.ok) {
          const data = await response.json();
          phoneNumber = data.display_phone_number || '';
        }
      } catch {}
    }

    res.json({
      success: true,
      data: {
        connected,
        status: connected ? 'connected' : 'disconnected',
        phoneNumber,
        phoneNumberId: params.WHATSAPP_PHONE_NUMBER_ID || '',
        verifyToken,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/whatsapp/reconnect - Reconectar/verificar conexão WhatsApp
router.post('/reconnect', async (req, res) => {
  try {
    const { loadParams } = require('../config/env');
    const params = await loadParams();

    if (!params.WHATSAPP_ACCESS_TOKEN || !params.WHATSAPP_PHONE_NUMBER_ID) {
      return res.json({ success: false, message: 'Token ou Phone Number ID não configurados.' });
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${params.WHATSAPP_PHONE_NUMBER_ID}?access_token=${params.WHATSAPP_ACCESS_TOKEN}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await response.json();

    if (response.ok && data.id) {
      res.json({
        success: true,
        message: 'Reconectado com sucesso',
        data: {
          connected: true,
          status: 'connected',
          phoneNumber: data.display_phone_number || '',
          qualityRating: data.quality_rating || '',
        },
      });
    } else {
      const errorMsg = data.error?.message || 'Erro desconhecido';
      res.json({ success: false, message: `Falha ao reconectar: ${errorMsg}` });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/whatsapp/envios - Histórico de envios
router.get('/envios', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'WA_ENVIO' },
      ScanIndexForward: false,
      Limit: 100,
    }));
    res.json({ success: true, data: result.Items || [] });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
});

// GET /api/admin/whatsapp/templates - Templates da Meta (Graph API)
router.get('/templates', async (req, res) => {
  try {
    const { loadParams } = require('../config/env');
    const params = await loadParams();
    const token = params.WHATSAPP_ACCESS_TOKEN;
    const wabaId = params.WHATSAPP_WABA_ID || '2163797757810981';

    if (!token) return res.json({ success: true, data: [] });

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${wabaId}/message_templates?limit=50&fields=name,status,category,language,components,id`,
      { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }
    );
    const result = await response.json();

    if (!response.ok) {
      return res.status(400).json({ success: false, message: result.error?.message || 'Erro ao buscar templates da Meta' });
    }

    // Mapear para formato do frontend
    const templates = (result.data || []).map(t => {
      const bodyComp = t.components?.find(c => c.type === 'BODY');
      const footerComp = t.components?.find(c => c.type === 'FOOTER');
      const buttonsComp = t.components?.find(c => c.type === 'BUTTONS');

      // Extrair variáveis do body
      const varMatches = bodyComp?.text?.match(/\{\{\d+\}\}/g) || [];
      const variaveis = varMatches.map((v, i) => ({
        indice: i + 1,
        descricao: '',
        exemplo: bodyComp?.example?.body_text?.[0]?.[i] || '',
      }));

      return {
        id: t.id,
        nome: t.name,
        status: t.status === 'APPROVED' ? 'aprovado' : t.status === 'PENDING' ? 'pendente' : t.status === 'REJECTED' ? 'rejeitado' : t.status?.toLowerCase(),
        categoria: t.category?.toLowerCase(),
        idioma: t.language,
        corpo: bodyComp?.text || '(gerado automaticamente pela Meta)',
        footer: footerComp?.text || '',
        botoes: buttonsComp?.buttons || [],
        variaveis,
        meta_id: t.id,
      };
    });

    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('[WHATSAPP] Erro ao buscar templates:', error.message);
    res.json({ success: true, data: [] });
  }
});

// POST /api/admin/whatsapp/templates - Criar template na Meta
router.post('/templates', async (req, res) => {
  try {
    const { loadParams } = require('../config/env');
    const params = await loadParams();
    const token = params.WHATSAPP_ACCESS_TOKEN;
    const wabaId = params.WHATSAPP_WABA_ID || '2163797757810981';

    if (!token) return res.status(400).json({ success: false, message: 'Token WhatsApp não configurado' });

    const { nome, categoria, idioma, corpo, variaveis, header } = req.body;

    if (!nome || !corpo) {
      return res.status(400).json({ success: false, message: 'Nome e corpo são obrigatórios' });
    }

    // Montar components
    const components = [];

    // Header (opcional)
    if (header) {
      components.push({ type: 'HEADER', format: 'TEXT', text: header });
    }

    // Body
    const bodyComponent = { type: 'BODY', text: corpo };

    // Extrair variáveis do corpo para example
    const varMatches = corpo.match(/\{\{\d+\}\}/g) || [];
    if (varMatches.length > 0) {
      const examples = variaveis?.map(v => v.exemplo || 'exemplo') || varMatches.map(() => 'exemplo');
      bodyComponent.example = { body_text: [examples] };
    }
    components.push(bodyComponent);

    const payload = {
      name: nome,
      language: idioma || 'pt_BR',
      category: (categoria || 'UTILITY').toUpperCase(),
      components,
    };

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${wabaId}/message_templates`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      }
    );
    const result = await response.json();

    if (!response.ok) {
      const errMsg = result.error?.error_user_msg || result.error?.message || 'Erro ao criar template';
      return res.status(400).json({ success: false, message: errMsg });
    }

    res.json({ success: true, data: { id: result.id, status: result.status, category: result.category } });
  } catch (error) {
    console.error('[WHATSAPP] Erro ao criar template:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/whatsapp/templates/:name - Deletar template na Meta
router.delete('/templates/:name', async (req, res) => {
  try {
    const { loadParams } = require('../config/env');
    const params = await loadParams();
    const token = params.WHATSAPP_ACCESS_TOKEN;
    const wabaId = params.WHATSAPP_WABA_ID || '2163797757810981';

    if (!token) return res.status(400).json({ success: false, message: 'Token WhatsApp não configurado' });

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${wabaId}/message_templates?name=${req.params.name}`,
      { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }
    );
    const result = await response.json();

    if (!response.ok) {
      return res.status(400).json({ success: false, message: result.error?.message || 'Erro ao deletar template' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/whatsapp/conversas - Conversas recentes
router.get('/conversas', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'WA_CONVERSA' },
      ScanIndexForward: false,
      Limit: 50,
    }));
    res.json({ success: true, data: result.Items || [] });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
});

// GET /api/admin/whatsapp/custos - Custos do mês
router.get('/custos', async (req, res) => {
  try {
    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :mes)',
      ExpressionAttributeValues: { ':pk': 'WA_ENVIO', ':mes': `WA_ENVIO#${mesAtual}` },
    }));

    const envios = result.Items || [];
    const totalMes = envios.length;

    let custoTotal = 0;
    let templates = 0;
    let textoLivre = 0;
    const porTipoMap = {};

    for (const e of envios) {
      const tipo = e.categoria || e.tipo || 'utility';
      const custo = tipo === 'marketing' ? 0.0625 : 0.035;
      custoTotal += custo;
      if (e.templateNome) templates++; else textoLivre++;
      if (!porTipoMap[tipo]) porTipoMap[tipo] = { tipo, qtd: 0, custoUnitario: custo, total: 0 };
      porTipoMap[tipo].qtd++;
      porTipoMap[tipo].total += custo;
    }

    const porDia = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const diaStr = d.toISOString().slice(0, 10);
      const qtd = envios.filter(e => e.data?.startsWith(diaStr)).length;
      porDia.push({ dia: diaStr.slice(5), qtd });
    }

    res.json({
      success: true,
      data: { totalMes, custoTotal, mediaDia: totalMes / 30, templates, textoLivre, porDia, porTipo: Object.values(porTipoMap), budget: 50 },
    });
  } catch (error) {
    res.json({ success: true, data: { totalMes: 0, custoTotal: 0, mediaDia: 0, templates: 0, textoLivre: 0, porDia: [], porTipo: [], budget: 50 } });
  }
});

module.exports = router;
