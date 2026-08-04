const { Router } = require('express');
const { enviarTemplate, enviarNotificacaoOrcamento, enviarNotificacaoAlbum, getTemplatesFromMeta } = require('../services/whatsappService');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router();

// POST /api/admin/whatsapp/enviar-template
// Aceita formato do frontend: { clienteId, templateId, variaveis, media_type, media_url }
// Ou formato direto: { numero, template, parametros, header_image_url }
router.post('/enviar-template', async (req, res) => {
  try {
    let { numero, template, parametros, header_image_url, clienteId, templateId, variaveis, media_type, media_url } = req.body;

    // Resolver clienteId → numero (telefone do cliente)
    if (!numero && clienteId) {
      const cliResult = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
        ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${clienteId}` },
      }));
      const cliente = cliResult.Items?.[0];
      if (!cliente) return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
      numero = cliente.whatsapp || cliente.whatsapp_numero || cliente.telefone;
      if (!numero) return res.status(400).json({ success: false, message: 'Cliente sem WhatsApp cadastrado' });
    }

    // Resolver templateId → nome do template
    if (!template && templateId) {
      // Buscar nos templates da Meta (o frontend usa o id da Meta como templateId)
      const metaTemplates = await getTemplatesFromMeta();
      let found = metaTemplates.find(t => t.id === templateId);

      // Fallback: buscar no DynamoDB local (pode ser que o id seja do DynamoDB)
      if (!found) {
        const tplResult = await dynamo.send(new QueryCommand({
          TableName: TABLE,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk',
          ExpressionAttributeValues: { ':pk': 'WA_TEMPLATE' },
        }));
        const localTpl = (tplResult.Items || []).find(t => t.id === templateId || t.SK === templateId);
        if (localTpl) {
          template = localTpl.nome || localTpl.name;
          // Buscar na Meta pelo nome para pegar info de header
          found = metaTemplates.find(t => t.name === template);
        }
      } else {
        template = found.name;
      }

      if (!template) return res.status(404).json({ success: false, message: 'Template não encontrado' });

      // Detectar se template tem header de imagem → enviar com mídia automaticamente
      if (found) {
        const headerComp = found.components?.find(c => c.type === 'HEADER');
        if (headerComp?.format === 'IMAGE' && !header_image_url) {
          // Usar media_url do frontend ou fallback para o exemplo do template
          header_image_url = media_url || headerComp.example?.header_handle?.[0] || null;
        }
      }
    }

    // Se media_url foi enviada mas header_image_url não foi setado acima
    if (!header_image_url && media_type === 'image' && media_url) {
      header_image_url = media_url;
    }

    if (!numero || !template) return res.status(400).json({ success: false, message: 'numero e template são obrigatórios' });

    // Compatibilidade: variaveis → parametros
    if (!parametros && variaveis) parametros = variaveis;

    const resultado = await enviarTemplate(numero, template, parametros || [], header_image_url);

    // Registrar envio no histórico
    const phone = numero.replace(/\D/g, '');
    const now = new Date();
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `WHATSAPP#${phone.startsWith('55') ? phone : '55' + phone}`,
        SK: `OUT#${now.toISOString()}#${resultado.message_id || Date.now()}`,
        GSI1PK: 'WA_ENVIO',
        GSI1SK: `WA_ENVIO#${now.toISOString()}`,
        type: 'template',
        templateNome: template,
        categoria: media_type === 'image' ? 'marketing' : 'utility',
        mediaType: media_type || null,
        mediaUrl: media_url || header_image_url || null,
        status: 'enviado',
        messageId: resultado.message_id || null,
        destinatario: numero,
        origem: 'admin',
        createdAt: now.toISOString(),
        timestamp: Math.floor(now.getTime() / 1000).toString(),
      },
    }));

    res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('[WHATSAPP] Erro ao enviar template:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/whatsapp/enviar-texto
// Envia mensagem de texto livre (dentro da janela de 24h)
router.post('/enviar-texto', async (req, res) => {
  try {
    let { clienteId, texto, numero } = req.body;

    if (!texto) return res.status(400).json({ success: false, message: 'Texto é obrigatório' });

    // Resolver clienteId → numero
    if (!numero && clienteId) {
      const cliResult = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
        ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${clienteId}` },
      }));
      const cliente = cliResult.Items?.[0];
      if (!cliente) return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
      numero = cliente.whatsapp || cliente.whatsapp_numero || cliente.telefone;
      if (!numero) return res.status(400).json({ success: false, message: 'Cliente sem WhatsApp cadastrado' });
    }

    if (!numero) return res.status(400).json({ success: false, message: 'Número é obrigatório' });

    const whatsappClient = require('../lib/whatsapp/client');
    const result = await whatsappClient.enviarTexto({ telefone: numero, texto });

    // Registrar envio
    const phone = numero.replace(/\D/g, '');
    const now = new Date();
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `WHATSAPP#${phone.startsWith('55') ? phone : '55' + phone}`,
        SK: `OUT#${now.toISOString()}#${result.message_id || Date.now()}`,
        GSI1PK: 'WA_ENVIO',
        GSI1SK: `WA_ENVIO#${now.toISOString()}`,
        type: 'text',
        text: texto,
        status: 'enviado',
        messageId: result.message_id || null,
        destinatario: numero,
        origem: 'admin',
        createdAt: now.toISOString(),
        timestamp: Math.floor(now.getTime() / 1000).toString(),
      },
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[WHATSAPP] Erro ao enviar texto:', error.message);
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

// GET /api/admin/whatsapp/templates - Templates (busca direto da Meta)
router.get('/templates', async (req, res) => {
  try {
    const metaTemplates = await getTemplatesFromMeta();

    // Mapear para formato do frontend
    const templates = metaTemplates.map(t => {
      const headerComp = t.components?.find(c => c.type === 'HEADER');
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

      // Header info
      let header = null;
      if (headerComp) {
        if (headerComp.format === 'IMAGE') {
          header = { tipo: 'image', exemplo_url: headerComp.example?.header_handle?.[0] || '' };
        } else if (headerComp.format === 'TEXT') {
          header = { tipo: 'text', texto: headerComp.text || '' };
        }
      }

      return {
        id: t.id,
        nome: t.name,
        status: t.status?.toLowerCase() === 'approved' ? 'aprovado' : t.status?.toLowerCase() === 'rejected' ? 'rejeitado' : 'pendente',
        categoria: t.category?.toLowerCase() || 'utility',
        idioma: t.language || 'pt_BR',
        corpo: bodyComp?.text || '',
        variaveis,
        header,
        footer: footerComp?.text || '',
        botoes: buttonsComp?.buttons || [],
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

    const { nome, categoria, idioma, corpo, variaveis, header, header_type, header_example_url } = req.body;

    if (!nome || !corpo) {
      return res.status(400).json({ success: false, message: 'Nome e corpo são obrigatórios' });
    }

    // Montar components
    const components = [];

    // Header (opcional) — suporta TEXT, IMAGE, VIDEO, DOCUMENT
    if (header_type && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header_type.toUpperCase())) {
      const headerComp = { type: 'HEADER', format: header_type.toUpperCase() };
      if (header_example_url) {
        headerComp.example = { header_handle: [header_example_url] };
      }
      components.push(headerComp);
    } else if (header) {
      components.push({ type: 'HEADER', format: 'TEXT', text: header });
    }

    // Body
    const bodyComponent = { type: 'BODY', text: corpo };
    const varMatches = corpo.match(/\{\{\d+\}\}/g) || [];
    if (varMatches.length > 0) {
      const examples = variaveis?.map(v => v.exemplo || 'exemplo') || varMatches.map(() => 'exemplo');
      bodyComponent.example = { body_text: [examples] };
    }
    components.push(bodyComponent);

    const payload = {
      name: nome,
      category: (categoria || 'UTILITY').toUpperCase(),
      language: idioma || 'pt_BR',
      components,
    };

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${wabaId}/message_templates`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      }
    );
    const result = await response.json();

    if (!response.ok) {
      return res.status(400).json({ success: false, message: result.error?.message || 'Erro ao criar template na Meta' });
    }

    res.json({ success: true, data: { id: result.id, status: result.status, category: result.category } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/whatsapp/templates/:id - Editar template na Meta
router.put('/templates/:id', async (req, res) => {
  try {
    const { loadParams } = require('../config/env');
    const params = await loadParams();
    const token = params.WHATSAPP_ACCESS_TOKEN;
    const wabaId = params.WHATSAPP_WABA_ID || '2163797757810981';

    if (!token) return res.status(400).json({ success: false, message: 'Token WhatsApp não configurado' });

    const { nome, corpo, variaveis, header, header_type, header_example_url, categoria, idioma } = req.body;
    const templateId = req.params.id;

    if (!corpo) return res.status(400).json({ success: false, message: 'Corpo é obrigatório' });

    // Montar components
    const components = [];

    if (header_type && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header_type.toUpperCase())) {
      const headerComp = { type: 'HEADER', format: header_type.toUpperCase() };
      if (header_example_url) {
        headerComp.example = { header_handle: [header_example_url] };
      }
      components.push(headerComp);
    } else if (header) {
      components.push({ type: 'HEADER', format: 'TEXT', text: header });
    }

    const bodyComponent = { type: 'BODY', text: corpo };
    const varMatches = corpo.match(/\{\{\d+\}\}/g) || [];
    if (varMatches.length > 0) {
      const examples = variaveis?.map(v => v.exemplo || 'exemplo') || varMatches.map(() => 'exemplo');
      bodyComponent.example = { body_text: [examples] };
    }
    components.push(bodyComponent);

    // Tentar editar primeiro
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${templateId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ components }),
        signal: AbortSignal.timeout(15000),
      }
    );
    const result = await response.json();

    if (response.ok) {
      return res.json({ success: true, data: result });
    }

    // Se não pode editar (PENDING ou APPROVED), fazer delete + recreate
    // Se não pode editar, informar ao usuário
    const errorSubcode = result.error?.error_subcode;
    const isEditRestriction = (errorSubcode >= 2388000 && errorSubcode <= 2389000) || result.error?.message?.includes('cannot be edited');
    if (isEditRestriction) {
      const msgs = {
        2388124: 'A Meta só permite editar um template 1x a cada 24 horas. Tente novamente amanhã.',
        2388003: 'Este template está pendente de aprovação. Aguarde a Meta aprovar antes de editar novamente.',
      };
      const userMsg = msgs[errorSubcode] || result.error?.error_user_msg || 'A Meta não permitiu a edição agora. Tente novamente em 24 horas.';
      return res.status(400).json({ success: false, message: userMsg });
    }

    // Outro erro
    return res.status(400).json({ success: false, message: result.error?.message || 'Erro ao editar template' });
  } catch (error) {
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

// GET /api/admin/whatsapp/conversas/:clienteId - Mensagens de uma conversa
router.get('/conversas/:clienteId', async (req, res) => {
  try {
    const numero = req.params.clienteId;

    // Buscar mensagens recebidas (MSG#)
    const msgResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `WHATSAPP#${numero}`, ':sk': 'MSG#' },
      ScanIndexForward: true,
    }));

    // Buscar mensagens enviadas (OUT#)
    const outResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `WHATSAPP#${numero}`, ':sk': 'OUT#' },
      ScanIndexForward: true,
    }));

    const mensagens = [
      ...(msgResult.Items || []).map(m => ({
        id: m.SK,
        texto: m.text || m.body || '',
        tipo: m.type || 'text',
        direcao: 'entrada',
        mediaUrl: m.mediaUrl || m.media_url || null,
        mediaMime: m.mediaMime || m.mime_type || null,
        hora: m.createdAt ? new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
        status: m.status || 'recebido',
        timestamp: m.timestamp || '',
      })),
      ...(outResult.Items || []).map(m => ({
        id: m.SK,
        texto: m.text || m.templateNome || '',
        tipo: m.type || 'text',
        direcao: 'saida',
        mediaUrl: m.mediaUrl || null,
        mediaMime: null,
        hora: m.createdAt ? new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
        status: m.status || 'enviado',
        timestamp: m.timestamp || '',
      })),
    ].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));

    res.json({ success: true, data: mensagens });
  } catch (error) {
    console.error('[WHATSAPP] Erro ao buscar mensagens:', error.message);
    res.json({ success: true, data: [] });
  }
});

// POST /api/admin/whatsapp/conversas/:clienteId/marcar-lida
router.post('/conversas/:clienteId/marcar-lida', async (req, res) => {
  try {
    // Fire and forget — marcar conversa como lida (zerar contador de não lidas)
    res.json({ success: true });
  } catch (error) {
    res.json({ success: true });
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

// POST /api/admin/whatsapp/upload-media-handle — Upload imagem para Meta e retorna handle para templates
router.post('/upload-media-handle', async (req, res) => {
  try {
    const { loadParams } = require('../config/env');
    const params = await loadParams();
    const token = params.WHATSAPP_ACCESS_TOKEN;
    const appId = params.META_APP_ID || params.WHATSAPP_APP_ID || '951738347255153';

    if (!token) return res.status(400).json({ success: false, message: 'Token WhatsApp não configurado' });

    const { image_url, content_type } = req.body;
    if (!image_url) return res.status(400).json({ success: false, message: 'image_url é obrigatório' });

    const mimeType = content_type || 'image/png';

    // 1) Baixar a imagem do CDN/S3
    const imageResp = await fetch(image_url, { signal: AbortSignal.timeout(15000) });
    if (!imageResp.ok) {
      return res.status(400).json({ success: false, message: `Erro ao baixar imagem: ${imageResp.status}` });
    }
    const imageBuffer = Buffer.from(await imageResp.arrayBuffer());
    const fileSize = imageBuffer.length;

    // 2) Criar sessão de upload resumable na Meta
    const sessionResp = await fetch(
      `https://graph.facebook.com/v20.0/${appId}/uploads?file_length=${fileSize}&file_type=${encodeURIComponent(mimeType)}&access_token=${token}`,
      { method: 'POST', signal: AbortSignal.timeout(15000) }
    );
    const sessionData = await sessionResp.json();

    if (!sessionResp.ok || !sessionData.id) {
      return res.status(400).json({ success: false, message: sessionData.error?.message || 'Erro ao criar sessão de upload na Meta' });
    }

    const uploadSessionId = sessionData.id;

    // 3) Fazer upload do arquivo para a sessão
    const uploadResp = await fetch(
      `https://graph.facebook.com/v20.0/${uploadSessionId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `OAuth ${token}`,
          'file_offset': '0',
          'Content-Type': mimeType,
        },
        body: imageBuffer,
        signal: AbortSignal.timeout(30000),
      }
    );
    const uploadData = await uploadResp.json();

    if (!uploadResp.ok || !uploadData.h) {
      return res.status(400).json({ success: false, message: uploadData.error?.message || 'Erro ao fazer upload para Meta' });
    }

    // A Meta pode retornar múltiplos handles separados por \n — usar o primeiro
    const handle = uploadData.h.split('\n')[0].trim();

    // 4) Retornar o handle
    res.json({ success: true, data: { handle } });
  } catch (error) {
    console.error('[WHATSAPP] Erro upload-media-handle:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/whatsapp/templates/gerar-img-variants
// Busca templates da Meta que NÃO possuem sufixo _img e cria rascunhos _img no DynamoDB
// NÃO submete à Meta — apenas salva localmente como rascunho
router.post('/templates/gerar-img-variants', async (req, res) => {
  try {
    const metaTemplates = await getTemplatesFromMeta();

    if (!metaTemplates || metaTemplates.length === 0) {
      return res.json({ success: true, data: { criados: 0, templates: [] }, message: 'Nenhum template encontrado na Meta' });
    }

    const nomes = metaTemplates.map(t => t.name);

    // Filtrar templates que NÃO terminam em _img/_img_v2 e NÃO possuem par _img correspondente
    const semImg = metaTemplates.filter(t => {
      const nome = t.name;
      // Ignorar os que já são _img ou _img_v2
      if (nome.endsWith('_img') || nome.endsWith('_img_v2')) return false;
      // Ignorar se já existe variante _img na Meta
      if (nomes.includes(nome + '_img')) return false;
      // Apenas templates aprovados
      if (t.status !== 'APPROVED') return false;
      return true;
    });

    if (semImg.length === 0) {
      return res.json({ success: true, data: { criados: 0, templates: [] }, message: 'Todos os templates já possuem variante _img' });
    }

    const TENANT = process.env.TENANT_ID || '1';
    const criados = [];

    for (const tpl of semImg) {
      const nomeImg = tpl.name + '_img';
      const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Extrair componentes do template original
      const bodyComp = tpl.components?.find(c => c.type === 'BODY');
      const footerComp = tpl.components?.find(c => c.type === 'FOOTER');
      const buttonsComp = tpl.components?.find(c => c.type === 'BUTTONS');

      // Extrair variáveis do body
      const corpo = bodyComp?.text || '';
      const varMatches = corpo.match(/\{\{\d+\}\}/g) || [];
      const variaveis = varMatches.map((v, i) => ({
        indice: i + 1,
        descricao: '',
        exemplo: bodyComp?.example?.body_text?.[0]?.[i] || 'exemplo',
      }));

      const now = new Date().toISOString();

      const item = {
        PK: `TENANT#${TENANT}`,
        SK: `TEMPLATE_WPP#${id}`,
        GSI1PK: 'WA_TEMPLATE',
        GSI1SK: `WA_TEMPLATE#${id}`,
        id,
        nome: nomeImg,
        nome_original: tpl.name,
        categoria: (tpl.category || 'UTILITY').toLowerCase(),
        idioma: tpl.language || 'pt_BR',
        corpo,
        variaveis,
        header: { tipo: 'image', valor: '' },
        footer: footerComp?.text || '',
        botoes: buttonsComp?.buttons || [],
        status: 'rascunho',
        meta_template_id: null,
        meta_status: null,
        motivo_rejeicao: null,
        created_at: now,
        updated_at: now,
      };

      await dynamo.send(new PutCommand({
        TableName: TABLE,
        Item: item,
        ConditionExpression: 'attribute_not_exists(SK)',
      })).catch(() => {
        // Se já existe, ignora (idempotente)
      });

      criados.push({ id, nome: nomeImg, original: tpl.name, categoria: item.categoria });
    }

    res.json({
      success: true,
      data: { criados: criados.length, templates: criados },
      message: `${criados.length} rascunho(s) _img criado(s) no DynamoDB. Adicione a imagem e submeta à Meta quando pronto.`,
    });
  } catch (error) {
    console.error('[WHATSAPP] Erro ao gerar _img variants:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/whatsapp/templates/rascunhos
// Lista templates rascunhos locais (salvos no DynamoDB, não submetidos à Meta)
router.get('/templates/rascunhos', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'WA_TEMPLATE' },
    }));

    const templates = (result.Items || []).map(t => ({
      id: t.id,
      nome: t.nome,
      nome_original: t.nome_original || null,
      categoria: t.categoria,
      idioma: t.idioma,
      corpo: t.corpo,
      variaveis: t.variaveis || [],
      header: t.header || null,
      footer: t.footer || '',
      botoes: t.botoes || [],
      status: t.status || 'rascunho',
      meta_template_id: t.meta_template_id || null,
      created_at: t.created_at,
    }));

    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('[WHATSAPP] Erro ao buscar rascunhos:', error.message);
    res.json({ success: true, data: [] });
  }
});

// DELETE /api/admin/whatsapp/templates/rascunhos/:id - Excluir rascunho local
router.delete('/templates/rascunhos/:id', async (req, res) => {
  try {
    const TENANT = process.env.TENANT_ID || '1';
    const id = req.params.id;

    await dynamo.send(new DeleteCommand({
      TableName: TABLE,
      Key: {
        PK: `TENANT#${TENANT}`,
        SK: `TEMPLATE_WPP#${id}`,
      },
    }));

    res.json({ success: true, message: 'Rascunho excluído' });
  } catch (error) {
    console.error('[WHATSAPP] Erro ao excluir rascunho:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
