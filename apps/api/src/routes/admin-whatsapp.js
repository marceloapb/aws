const { Router } = require('express');
const { enviarTemplate, enviarNotificacaoOrcamento, enviarNotificacaoAlbum, getTemplatesFromMeta } = require('../services/whatsappService');
const { getTemplateImageUrl, resolveTemplateImageUrl, saveTemplateImageUrl, isImageTemplate } = require('../services/whatsappTemplateCache');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router();

// ══════════════════════════════════════════════════════════════
// Helpers: Template Metadata (timestamp tracking no DynamoDB)
// Cada template da Meta tem um registro TPL_META#{nome} com updated_at
// ══════════════════════════════════════════════════════════════
const TENANT_ID = () => process.env.TENANT_ID || 'default';

async function saveTemplateMetadata(templateName, extra = {}) {
  const now = new Date().toISOString();
  await dynamo.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `TENANT#${TENANT_ID()}`,
      SK: `TPL_META#${templateName}`,
      template_name: templateName,
      updated_at: now,
      ...extra,
    },
  }));
  return now;
}

async function getAllTemplateMetadata() {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `TENANT#${TENANT_ID()}`, ':sk': 'TPL_META#' },
  }));
  const map = {};
  for (const item of (result.Items || [])) {
    map[item.template_name] = { updated_at: item.updated_at, created_at: item.created_at };
  }
  return map;
}

// ══════════════════════════════════════════════════════════════
// Estado em memória para job assíncrono "Recriar Todos"
// ══════════════════════════════════════════════════════════════
let recriarTodosJob = {
  running: false,
  progress: { total: 0, done: 0, current: '' },
  result: null,
  startedAt: null,
};

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

      // Detectar se template tem header de imagem → resolver URL via CDN
      if (found) {
        const headerComp = found.components?.find(c => c.type === 'HEADER');
        if (headerComp?.format === 'IMAGE' && !header_image_url) {
          // Usar media_url do frontend, ou resolver via mapeamento CDN
          // NUNCA usar header_handle da Meta (é referência interna, não URL pública)
          header_image_url = media_url || await resolveTemplateImageUrl(found.name);
        }
      }
    }

    // Se media_url foi enviada mas header_image_url não foi setado acima
    if (!header_image_url && media_type === 'image' && media_url) {
      header_image_url = media_url;
    }

    // Se template _img e ainda sem header_image_url, resolver via DynamoDB/CDN
    if (!header_image_url && template && isImageTemplate(template)) {
      header_image_url = await resolveTemplateImageUrl(template);
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

// GET /api/admin/whatsapp/templates - Templates (busca direto da Meta + metadata local)
router.get('/templates', async (req, res) => {
  try {
    const [metaTemplates, metadata] = await Promise.all([
      getTemplatesFromMeta().catch(() => []),
      getAllTemplateMetadata(),
    ]);

    // Buscar templates locais do DynamoDB (WA_TPL#)
    const localResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT_ID()}`, ':sk': 'WA_TPL#' },
    }));
    const localTemplates = localResult.Items || [];
    const localByName = {};
    for (const lt of localTemplates) { localByName[lt.name] = lt; }

    // Mapear templates da Meta
    const metaNames = new Set();
    const templates = metaTemplates.map(t => {
      metaNames.add(t.name);
      const headerComp = t.components?.find(c => c.type === 'HEADER');
      const bodyComp = t.components?.find(c => c.type === 'BODY');
      const footerComp = t.components?.find(c => c.type === 'FOOTER');
      const buttonsComp = t.components?.find(c => c.type === 'BUTTONS');

      const varMatches = bodyComp?.text?.match(/\{\{\d+\}\}/g) || [];
      const variaveis = varMatches.map((v, i) => ({
        indice: i + 1,
        descricao: '',
        exemplo: bodyComp?.example?.body_text?.[0]?.[i] || '',
      }));

      let header = null;
      if (headerComp) {
        if (headerComp.format === 'IMAGE') {
          header = { tipo: 'image', exemplo_url: headerComp.example?.header_handle?.[0] || '' };
        } else if (headerComp.format === 'TEXT') {
          header = { tipo: 'text', texto: headerComp.text || '' };
        }
      }

      const meta = metadata[t.name] || {};
      const local = localByName[t.name] || {};

      return {
        id: t.id,
        nome: t.name,
        status: t.status?.toLowerCase() === 'approved' ? 'aprovado' : t.status?.toLowerCase() === 'rejected' ? 'rejeitado' : 'pendente',
        categoria: t.category?.toLowerCase() || 'utility',
        idioma: t.language || 'pt_BR',
        corpo: bodyComp?.text || '',
        variaveis: local.variaveis || variaveis,
        header,
        footer: footerComp?.text || '',
        botoes: buttonsComp?.buttons || [],
        updated_at: meta.updated_at || local.updated_at || null,
        created_at: meta.created_at || local.created_at || null,
        header_image_key: local.header_image_key || null,
      };
    });

    // Adicionar templates locais que NÃO estão na Meta (rascunhos)
    for (const lt of localTemplates) {
      if (metaNames.has(lt.name)) continue;
      const varMatches = lt.body?.match(/\{\{\d+\}\}/g) || [];
      templates.push({
        id: null,
        nome: lt.name,
        status: lt.status || 'rascunho',
        categoria: lt.category?.toLowerCase() || 'utility',
        idioma: lt.language || 'pt_BR',
        corpo: lt.body || '',
        variaveis: lt.variaveis || varMatches.map((v, i) => ({ indice: i + 1, descricao: '', exemplo: '' })),
        header: lt.header_type === 'IMAGE' ? { tipo: 'image', exemplo_url: lt.header_image_url || '' } : null,
        footer: lt.footer || '',
        botoes: [],
        updated_at: lt.updated_at || null,
        created_at: lt.created_at || null,
        header_image_key: lt.header_image_key || null,
      });
    }

    // Ordenar por nome
    templates.sort((a, b) => a.nome.localeCompare(b.nome));

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

    const { nome, categoria, idioma, corpo, variaveis, header, header_type, header_example_url, header_image_key } = req.body;

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

    // Salvar timestamp no DynamoDB
    const now = await saveTemplateMetadata(nome, { created_at: new Date().toISOString() });

    // Se template tem header IMAGE, salvar a CDN URL no DynamoDB para uso no envio
    if (header_type?.toUpperCase() === 'IMAGE' && header_image_key) {
      const cdnUrl = header_image_key.startsWith('http')
        ? header_image_key
        : `https://d2112x4m4e89fv.cloudfront.net/${header_image_key}`;
      await saveTemplateImageUrl(nome, cdnUrl, header_image_key).catch(err => {
        console.warn(`[WHATSAPP] Aviso: não salvou imagem do template ${nome}: ${err.message}`);
      });
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
      // Atualizar timestamp no metadata local
      await saveTemplateMetadata(nome || `template_${templateId}`).catch(() => {});
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

    const TENANT = process.env.TENANT_ID || 'default';
    const criados = [];

    // Buscar rascunhos já existentes para evitar duplicação por nome
    const existentes = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'WA_TEMPLATE' },
    }));
    const nomesExistentes = (existentes.Items || []).map(t => t.nome);

    for (const tpl of semImg) {
      const nomeImg = tpl.name + '_img';

      // Pular se já existe rascunho com esse nome
      if (nomesExistentes.includes(nomeImg)) continue;

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
    const TENANT = process.env.TENANT_ID || 'default';
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

// POST /api/admin/whatsapp/templates/migrar
// Deleta templates antigos e cria os novos mbf_*_img na Meta (sem imagem — admin adiciona depois)
router.post('/templates/migrar', async (req, res) => {
  try {
    const { loadParams } = require('../config/env');
    const params = await loadParams();
    const token = params.WHATSAPP_ACCESS_TOKEN;
    const wabaId = params.WHATSAPP_WABA_ID || '2163797757810981';

    if (!token) return res.status(400).json({ success: false, message: 'Token WhatsApp não configurado' });

    // Templates antigos para deletar
    const TEMPLATES_ANTIGOS = [
      'notificacao_geral', 'notificacao_geral_img',
      'novo_orcamento', 'novo_orcamento_img',
      'lembrete_evento',
      'orcamento_pronto',
      'album_pronto', 'album_pronto_img_v2',
      'fotos_prontas',
      'pagamento_confirmado', 'pagamento_confirmado_img',
      'pagamento_vencido', 'pagamento_vencido_img',
      'contrato_assinatura', 'contrato_assinatura_img',
      'contrato_assinado_aviso', 'contrato_assinado_aviso_img',
      'evento_confirmado', 'evento_confirmado_img', 'evento_confirmado_img_v2',
      'feedback_solicitacao',
      'mbfoto_codigo_verificacao',
      'selecao_fotos_pronta_img',
      'contrato_lembrete_img',
      'lembrete_evento_img',
      'orcamento_pronto_img',
    ];

    // Templates novos para criar (todos com header IMAGE)
    const TEMPLATES_NOVOS = [
      { name: 'mbf_notificacao_geral_img', category: 'UTILITY', body: '*{{1}}*\n\n{{2}}', examples: ['Novo orçamento recebido', 'João solicitou orçamento para Casamento.'] },
      { name: 'mbf_novo_orcamento_img', category: 'UTILITY', body: '📋 *Nova Solicitação de Orçamento*\n\nCliente: *{{1}}*\nDetalhes: {{2}}', examples: ['Maria Silva', 'Ensaio Gestante - Data: 15/03/2026'] },
      { name: 'mbf_lembrete_evento_img', category: 'UTILITY', body: 'Olá *{{1}}*! 👋\n\nLembrando que sua sessão de *{{2}}* está marcada para o dia *{{3}}* às *{{4}}*.\n\nQualquer dúvida, é só responder aqui! 😊', examples: ['Maria', 'Ensaio Gestante', '15/03/2026', '14:00'] },
      { name: 'mbf_orcamento_pronto_img', category: 'UTILITY', body: 'Olá *{{1}}*! 👋\n\nSeu orçamento no valor de *{{2}}* está pronto para visualização.\n\nAcesse pelo link abaixo para conferir todos os detalhes:\n{{3}}', examples: ['João', 'R$ 3.500,00', 'https://www.marcelobloisefotografia.com.br/orcamento/abc123'] },
      { name: 'mbf_fotos_prontas_img', category: 'UTILITY', body: 'Olá *{{1}}*! 🎉\n\nSeu álbum *{{2}}* está disponível para visualização e download!\n\nSão *{{3}}* fotos que ficarão disponíveis por *{{4}} dias*.\n\nAcesse e aproveite! ❤️', examples: ['Maria', 'Casamento - Maria e João', '150', '30'] },
      { name: 'mbf_pagamento_confirmado_img', category: 'UTILITY', body: 'Olá *{{1}}*!\n\n✅ Confirmamos o recebimento do pagamento de *{{2}}*.\n\nStatus: *{{3}}*\n\nObrigado pela confiança! 🙏', examples: ['João', 'R$ 1.500,00', 'Confirmado'] },
      { name: 'mbf_pagamento_vencido_img', category: 'UTILITY', body: 'Olá *{{1}}*!\n\n⚠️ Identificamos que o pagamento de *{{2}}* está pendente.\n\n{{3}}\n\nSe já pagou, pode desconsiderar. Dúvidas? Responda aqui! 🙂', examples: ['João', 'R$ 1.000,00', 'Vencimento: 10/03/2026. Por favor, regularize.'] },
      { name: 'mbf_contrato_assinatura_img', category: 'UTILITY', body: 'Olá *{{1}}*! 👋\n\nSeu contrato está pronto para revisão e assinatura digital.\n\n{{2}}\n\nQualquer dúvida, é só responder! 😊', examples: ['Maria', 'Acesse o link enviado por e-mail para assinar.'] },
      { name: 'mbf_contrato_assinado_img', category: 'UTILITY', body: '🎉 *{{1}}*\n\n{{2}}', examples: ['Contrato Assinado!', 'Maria assinou o contrato para Ensaio Gestante.'] },
      { name: 'mbf_evento_confirmado_img', category: 'UTILITY', body: 'Olá *{{1}}*! 🎉\n\nSua sessão de *{{2}}* está confirmada!\n\n{{3}}\n\nNos vemos em breve! 📸', examples: ['Maria', 'Ensaio Gestante', 'Data: 15/03/2026 às 14:00.'] },
      { name: 'mbf_feedback_img', category: 'UTILITY', body: 'Olá *{{1}}*! 👋\n\nGostaríamos de saber sua opinião sobre o serviço.\n\n{{2}}\n\nSua opinião é muito importante! ❤️', examples: ['Maria', 'Deixe sua avaliação respondendo aqui.'] },
      { name: 'mbf_codigo_verificacao_img', category: 'AUTHENTICATION', body: '*{{1}}* é seu código de verificação.\n\nPara sua segurança, não compartilhe este código.', examples: ['482913'] },
      { name: 'mbf_lembrete_admin_img', category: 'UTILITY', body: '📅 *{{1}}*\n\n{{2}}', examples: ['Evento Amanhã: Ensaio Gestante', 'Maria Silva - 15/03/2026 às 14:00'] },
      { name: 'mbf_boas_vindas_img', category: 'UTILITY', body: 'Olá *{{1}}*! 👋\n\nBem-vindo(a) ao portal da Marcelo Bloise Fotografia!\n\nSua senha temporária: *{{2}}*\n\nNo primeiro acesso, você será solicitado(a) a criar uma nova senha.\n\nAcesse: www.marcelobloisefotografia.com.br/login', examples: ['Maria', 'Xk9mP2z'] },
      { name: 'mbf_album_pronto_img', category: 'UTILITY', body: 'Olá *{{1}}*! 🎉\n\nSeu álbum *{{2}}* está pronto!\n\n{{3}}\n\nEspero que goste! ❤️', examples: ['Maria', 'Ensaio Gestante', 'Acesse o link enviado por e-mail.'] },
    ];

    const resultados = { deletados: [], erros_delete: [], criados: [], erros_create: [] };

    // ── FASE 1: Deletar templates antigos ──
    for (const name of TEMPLATES_ANTIGOS) {
      try {
        const resp = await fetch(
          `https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=${name}`,
          { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }
        );
        const data = await resp.json();
        if (resp.ok || data.error?.code === 100) {
          resultados.deletados.push(name);
        } else {
          resultados.erros_delete.push({ name, error: data.error?.message || 'erro' });
        }
      } catch (err) {
        resultados.erros_delete.push({ name, error: err.message });
      }
    }

    // ── FASE 2: Criar templates novos (sem imagem — admin vai adicionar) ──
    for (const tpl of TEMPLATES_NOVOS) {
      try {
        const varMatches = tpl.body.match(/\{\{\d+\}\}/g) || [];
        const components = [
          { type: 'HEADER', format: 'IMAGE' },
          {
            type: 'BODY',
            text: tpl.body,
            ...(varMatches.length > 0 && { example: { body_text: [tpl.examples] } }),
          },
          { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
        ];

        const resp = await fetch(
          `https://graph.facebook.com/v21.0/${wabaId}/message_templates`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: tpl.name, category: tpl.category, language: 'pt_BR', components }),
            signal: AbortSignal.timeout(15000),
          }
        );
        const data = await resp.json();

        if (resp.ok) {
          resultados.criados.push({ name: tpl.name, id: data.id });
        } else {
          const msg = data.error?.message || '';
          if (msg.includes('already exists') || msg.includes('name already used')) {
            resultados.criados.push({ name: tpl.name, already_exists: true });
          } else {
            resultados.erros_create.push({ name: tpl.name, error: msg });
          }
        }
      } catch (err) {
        resultados.erros_create.push({ name: tpl.name, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Deletados: ${resultados.deletados.length} | Criados: ${resultados.criados.length} | Erros: ${resultados.erros_delete.length + resultados.erros_create.length}`,
      data: resultados,
      proximo_passo: 'Entre em cada template novo, suba a imagem de header e salve para submeter à Meta.',
    });
  } catch (error) {
    console.error('[WHATSAPP] Erro na migração de templates:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// TELA "IMAGENS DOS TEMPLATES" — Upload + recriação automática
// ══════════════════════════════════════════════════════════════

const TEMPLATE_DEFINITIONS = [
  { key: 'notificacao_geral', name: 'mbf_notificacao_geral_img', label: 'Notificação Geral', category: 'UTILITY', body: '*{{1}}*\n\n{{2}}', examples: ['Novo orçamento recebido', 'João solicitou orçamento para Casamento.'] },
  { key: 'novo_orcamento', name: 'mbf_novo_orcamento_img', label: 'Novo Orçamento', category: 'UTILITY', body: '📋 *Nova Solicitação de Orçamento*\n\nCliente: *{{1}}*\nDetalhes: {{2}}', examples: ['Maria Silva', 'Ensaio Gestante - Data: 15/03/2026'] },
  { key: 'lembrete_evento', name: 'mbf_lembrete_evento_img', label: 'Lembrete de Evento', category: 'UTILITY', body: 'Olá *{{1}}*! 👋\n\nLembrando que sua sessão de *{{2}}* está marcada para o dia *{{3}}* às *{{4}}*.\n\nQualquer dúvida, é só responder aqui! 😊', examples: ['Maria', 'Ensaio Gestante', '15/03/2026', '14:00'] },
  { key: 'orcamento_pronto', name: 'mbf_orcamento_pronto_img', label: 'Orçamento Pronto', category: 'UTILITY', body: 'Olá *{{1}}*! 👋\n\nSeu orçamento no valor de *{{2}}* está pronto para visualização.\n\nAcesse pelo link abaixo para conferir todos os detalhes:\n{{3}}', examples: ['João', 'R$ 3.500,00', 'https://www.marcelobloisefotografia.com.br/orcamento/abc123'] },
  { key: 'fotos_prontas', name: 'mbf_fotos_prontas_img', label: 'Fotos Prontas', category: 'UTILITY', body: 'Olá *{{1}}*! 🎉\n\nSeu álbum *{{2}}* está disponível para visualização e download!\n\nSão *{{3}}* fotos que ficarão disponíveis por *{{4}} dias*.\n\nAcesse e aproveite! ❤️', examples: ['Maria', 'Casamento - Maria e João', '150', '30'] },
  { key: 'pagamento_confirmado', name: 'mbf_pagamento_confirmado_img', label: 'Pagamento Confirmado', category: 'UTILITY', body: 'Olá *{{1}}*!\n\n✅ Confirmamos o recebimento do pagamento de *{{2}}*.\n\nStatus: *{{3}}*\n\nObrigado pela confiança! 🙏', examples: ['João', 'R$ 1.500,00', 'Confirmado'] },
  { key: 'pagamento_vencido', name: 'mbf_pagamento_vencido_img', label: 'Pagamento Vencido', category: 'UTILITY', body: 'Olá *{{1}}*!\n\n⚠️ Identificamos que o pagamento de *{{2}}* está pendente.\n\n{{3}}\n\nSe já pagou, pode desconsiderar. Dúvidas? Responda aqui! 🙂', examples: ['João', 'R$ 1.000,00', 'Vencimento: 10/03/2026. Por favor, regularize.'] },
  { key: 'contrato_assinatura', name: 'mbf_contrato_assinatura_img', label: 'Contrato p/ Assinatura', category: 'UTILITY', body: 'Olá *{{1}}*! 👋\n\nSeu contrato está pronto para revisão e assinatura digital.\n\n{{2}}\n\nQualquer dúvida, é só responder! 😊', examples: ['Maria', 'Acesse o link enviado por e-mail para assinar.'] },
  { key: 'contrato_assinado', name: 'mbf_contrato_assinado_img', label: 'Contrato Assinado', category: 'UTILITY', body: '🎉 *{{1}}*\n\n{{2}}', examples: ['Contrato Assinado!', 'Maria assinou o contrato para Ensaio Gestante.'] },
  { key: 'evento_confirmado', name: 'mbf_evento_confirmado_img', label: 'Evento Confirmado', category: 'UTILITY', body: 'Olá *{{1}}*! 🎉\n\nSua sessão de *{{2}}* está confirmada!\n\n{{3}}\n\nNos vemos em breve! 📸', examples: ['Maria', 'Ensaio Gestante', 'Data: 15/03/2026 às 14:00.'] },
  { key: 'feedback', name: 'mbf_feedback_img', label: 'Feedback / Avaliação', category: 'UTILITY', body: 'Olá *{{1}}*! 👋\n\nGostaríamos de saber sua opinião sobre o serviço.\n\n{{2}}\n\nSua opinião é muito importante! ❤️', examples: ['Maria', 'Deixe sua avaliação respondendo aqui.'] },
  { key: 'codigo_verificacao', name: 'mbf_codigo_verificacao_img', label: 'Código Verificação', category: 'AUTHENTICATION', body: '*{{1}}* é seu código de verificação.\n\nPara sua segurança, não compartilhe este código.', examples: ['482913'] },
  { key: 'lembrete_admin', name: 'mbf_lembrete_admin_img', label: 'Lembrete Admin', category: 'UTILITY', body: '📅 *{{1}}*\n\n{{2}}', examples: ['Evento Amanhã: Ensaio Gestante', 'Maria Silva - 15/03/2026 às 14:00'] },
  { key: 'boas_vindas', name: 'mbf_boas_vindas_img', label: 'Boas-Vindas', category: 'UTILITY', body: 'Olá *{{1}}*! 👋\n\nBem-vindo(a) ao portal da Marcelo Bloise Fotografia!\n\nSua senha temporária: *{{2}}*\n\nNo primeiro acesso, você será solicitado(a) a criar uma nova senha.\n\nAcesse: www.marcelobloisefotografia.com.br/login', examples: ['Maria', 'Xk9mP2z'] },
  { key: 'album_pronto', name: 'mbf_album_pronto_img', label: 'Álbum Pronto', category: 'UTILITY', body: 'Olá *{{1}}*! 🎉\n\nSeu álbum *{{2}}* está pronto!\n\n{{3}}\n\nEspero que goste! ❤️', examples: ['Maria', 'Ensaio Gestante', 'Acesse o link enviado por e-mail.'] },
];

// GET /api/admin/whatsapp/template-images
router.get('/template-images', async (req, res) => {
  try {
    const TENANT = process.env.TENANT_ID || 'default';
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'TPL_IMG#' },
    }));
    const saved = {};
    for (const item of (result.Items || [])) saved[item.template_name] = { image_url: item.image_url, s3_key: item.s3_key, updated_at: item.updated_at };

    const templates = TEMPLATE_DEFINITIONS.map(tpl => ({
      ...tpl, image_url: saved[tpl.name]?.image_url || null, s3_key: saved[tpl.name]?.s3_key || null,
      has_image: !!saved[tpl.name]?.image_url, updated_at: saved[tpl.name]?.updated_at || null,
    }));
    res.json({ success: true, data: { templates, total: templates.length, com_imagem: templates.filter(t => t.has_image).length, pronto: templates.every(t => t.has_image) } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// POST /api/admin/whatsapp/template-images/:key
router.post('/template-images/:key', async (req, res) => {
  try {
    const tpl = TEMPLATE_DEFINITIONS.find(t => t.key === req.params.key);
    if (!tpl) return res.status(404).json({ success: false, message: 'Template não encontrado' });
    const { s3_key } = req.body;
    if (!s3_key) return res.status(400).json({ success: false, message: 's3_key é obrigatório' });
    const image_url = `https://d2112x4m4e89fv.cloudfront.net/${s3_key}`;
    const TENANT = process.env.TENANT_ID || 'default';
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: { PK: `TENANT#${TENANT}`, SK: `TPL_IMG#${tpl.name}`, template_name: tpl.name, template_key: req.params.key, image_url, s3_key, updated_at: new Date().toISOString() } }));
    res.json({ success: true, data: { template_name: tpl.name, image_url } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// POST /api/admin/whatsapp/template-images/recriar-todos
// VERSÃO ASSÍNCRONA: retorna imediatamente e processa em background
router.post('/template-images/recriar-todos', async (req, res) => {
  try {
    // Não permitir iniciar se já está rodando
    if (recriarTodosJob.running) {
      return res.status(409).json({
        success: false,
        message: 'Já existe uma recriação em andamento. Acompanhe pelo status.',
        data: { running: true, progress: recriarTodosJob.progress },
      });
    }

    const { loadParams } = require('../config/env');
    const params = await loadParams();
    const token = params.WHATSAPP_ACCESS_TOKEN;
    const wabaId = params.WHATSAPP_WABA_ID || '2163797757810981';
    const appId = params.META_APP_ID || params.WHATSAPP_APP_ID || '951738347255153';
    const TENANT = process.env.TENANT_ID || 'default';
    if (!token) return res.status(400).json({ success: false, message: 'Token WhatsApp não configurado' });

    // Buscar imagens salvas (validação síncrona rápida)
    const imgResult = await dynamo.send(new QueryCommand({ TableName: TABLE, KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)', ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'TPL_IMG#' } }));
    const saved = {};
    for (const item of (imgResult.Items || [])) saved[item.template_name] = item.image_url;
    const semImagem = TEMPLATE_DEFINITIONS.filter(t => !saved[t.name]);
    if (semImagem.length > 0) return res.status(400).json({ success: false, message: `Faltam imagens: ${semImagem.map(t => t.label).join(', ')}` });

    // Iniciar job assíncrono
    recriarTodosJob = {
      running: true,
      progress: { total: TEMPLATE_DEFINITIONS.length, done: 0, current: 'Iniciando...' },
      result: null,
      startedAt: new Date().toISOString(),
    };

    // Responder imediatamente
    res.json({ success: true, message: 'Recriação iniciada em background. Use GET /template-images/recriar-status para acompanhar.', data: { started: true } });

    // ── Executar em background (fire and forget) ──
    (async () => {
      const resultados = { deletados: [], criados: [], erros: [] };
      try {
        // Fase 1: Deletar antigos
        const ANTIGOS = ['notificacao_geral','notificacao_geral_img','novo_orcamento','novo_orcamento_img','lembrete_evento','lembrete_evento_img','orcamento_pronto','orcamento_pronto_img','album_pronto','album_pronto_img_v2','fotos_prontas','pagamento_confirmado','pagamento_confirmado_img','pagamento_vencido','pagamento_vencido_img','contrato_assinatura','contrato_assinatura_img','contrato_assinado_aviso','contrato_assinado_aviso_img','evento_confirmado','evento_confirmado_img','evento_confirmado_img_v2','feedback_solicitacao','mbfoto_codigo_verificacao','selecao_fotos_pronta_img','contrato_lembrete_img'];
        recriarTodosJob.progress.current = 'Deletando templates antigos...';
        for (const name of ANTIGOS) {
          try { await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=${name}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }); resultados.deletados.push(name); } catch {}
        }

        // Fase 2: Criar novos com imagem (sequencial com delay para evitar rate limit)
        for (let i = 0; i < TEMPLATE_DEFINITIONS.length; i++) {
          const tpl = TEMPLATE_DEFINITIONS[i];
          recriarTodosJob.progress.current = `Criando ${tpl.label} (${i + 1}/${TEMPLATE_DEFINITIONS.length})...`;
          try {
            const imageUrl = saved[tpl.name];
            const imgResp = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
            if (!imgResp.ok) { resultados.erros.push({ name: tpl.name, label: tpl.label, error: 'Erro ao baixar imagem' }); recriarTodosJob.progress.done = i + 1; continue; }
            const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
            const mimeType = imgResp.headers.get('content-type') || 'image/png';

            const sessResp = await fetch(`https://graph.facebook.com/v21.0/${appId}/uploads?file_length=${imgBuffer.length}&file_type=${encodeURIComponent(mimeType)}&access_token=${token}`, { method: 'POST', signal: AbortSignal.timeout(15000) });
            const sessData = await sessResp.json();
            if (!sessData.id) { resultados.erros.push({ name: tpl.name, label: tpl.label, error: sessData.error?.message || 'Erro sessão upload' }); recriarTodosJob.progress.done = i + 1; continue; }

            const upResp = await fetch(`https://graph.facebook.com/v21.0/${sessData.id}`, { method: 'POST', headers: { 'Authorization': `OAuth ${token}`, 'file_offset': '0', 'Content-Type': mimeType }, body: imgBuffer, signal: AbortSignal.timeout(30000) });
            const upData = await upResp.json();
            if (!upData.h) { resultados.erros.push({ name: tpl.name, label: tpl.label, error: 'Erro upload imagem Meta' }); recriarTodosJob.progress.done = i + 1; continue; }
            const handle = upData.h.split('\n')[0].trim();

            const varMatches = tpl.body.match(/\{\{\d+\}\}/g) || [];
            const components = [
              { type: 'HEADER', format: 'IMAGE', example: { header_handle: [handle] } },
              { type: 'BODY', text: tpl.body, ...(varMatches.length > 0 && { example: { body_text: [tpl.examples] } }) },
              { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
            ];

            const createResp = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ name: tpl.name, category: tpl.category, language: 'pt_BR', components }), signal: AbortSignal.timeout(15000) });
            const createData = await createResp.json();
            if (createResp.ok) {
              resultados.criados.push({ name: tpl.name, label: tpl.label, id: createData.id });
              // Salvar timestamp de criação
              await saveTemplateMetadata(tpl.name, { created_at: new Date().toISOString() }).catch(() => {});
            } else {
              const msg = createData.error?.message || '';
              resultados.erros.push({ name: tpl.name, label: tpl.label, error: msg.includes('already exists') ? 'Já existe' : msg });
            }
          } catch (err) { resultados.erros.push({ name: tpl.name, label: tpl.label, error: err.message }); }
          recriarTodosJob.progress.done = i + 1;

          // Pequeno delay entre criações para evitar rate limiting da Meta
          if (i < TEMPLATE_DEFINITIONS.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        recriarTodosJob.result = { success: true, message: `Criados: ${resultados.criados.length} | Deletados: ${resultados.deletados.length} | Erros: ${resultados.erros.length}`, data: resultados };
      } catch (error) {
        console.error('[WHATSAPP] Erro no job recriar-todos:', error.message);
        recriarTodosJob.result = { success: false, message: error.message, data: resultados };
      } finally {
        recriarTodosJob.running = false;
        recriarTodosJob.progress.current = 'Concluído';
      }
    })();
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// GET /api/admin/whatsapp/template-images/recriar-status
// Polling endpoint para acompanhar o progresso do job assíncrono
router.get('/template-images/recriar-status', (req, res) => {
  res.json({
    success: true,
    data: {
      running: recriarTodosJob.running,
      progress: recriarTodosJob.progress,
      result: recriarTodosJob.result,
      startedAt: recriarTodosJob.startedAt,
    },
  });
});

module.exports = router;
