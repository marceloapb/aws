const { Router } = require('express');
const { enviarTemplate, enviarTemplateComImagem, enviarTemplateComVideo, enviarTemplateComDocumento, enviarNotificacaoOrcamento, enviarNotificacaoAlbum } = require('../services/whatsappService');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, ScanCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

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

// POST /api/admin/whatsapp/enviar-template-midia
// Envia template com mídia no header (imagem, vídeo ou documento)
// Body: { numero, template, media_type, media_url, filename?, parametros_body?, botoes?, categoria? }
router.post('/enviar-template-midia', async (req, res) => {
  try {
    const { numero, template, media_type, media_url, filename, parametros_body, botoes, categoria } = req.body;

    if (!numero || !template) {
      return res.status(400).json({ success: false, message: 'numero e template são obrigatórios' });
    }
    if (!media_url) {
      return res.status(400).json({ success: false, message: 'media_url é obrigatório (URL pública da imagem/vídeo/documento)' });
    }
    if (!media_type || !['image', 'video', 'document'].includes(media_type)) {
      return res.status(400).json({ success: false, message: 'media_type é obrigatório e deve ser: image, video ou document' });
    }

    let resultado;

    if (media_type === 'image') {
      resultado = await enviarTemplateComImagem(numero, template, media_url, parametros_body || [], botoes || []);
    } else if (media_type === 'video') {
      resultado = await enviarTemplateComVideo(numero, template, media_url, parametros_body || [], botoes || []);
    } else if (media_type === 'document') {
      resultado = await enviarTemplateComDocumento(numero, template, media_url, filename || 'documento.pdf', parametros_body || [], botoes || []);
    }

    // Registrar envio no DynamoDB para histórico/custos
    const phone = numero.replace(/\D/g, '');
    const now = new Date();
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `WHATSAPP#${phone.startsWith('55') ? phone : '55' + phone}`,
        SK: `OUT#${now.toISOString()}#${resultado.message_id || Date.now()}`,
        type: 'template',
        templateNome: template,
        categoria: categoria || 'marketing',
        mediaType: media_type,
        mediaUrl: media_url,
        status: 'enviado',
        messageId: resultado.message_id || null,
        origem: 'admin',
        createdAt: now.toISOString(),
        timestamp: Math.floor(now.getTime() / 1000).toString(),
      },
    }));

    res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('[WHATSAPP] Erro ao enviar template com mídia:', error.message);
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
        phoneNumberId: params.WHATSAPP_PHONE_NUMBER_ID ? '••••' + params.WHATSAPP_PHONE_NUMBER_ID.slice(-4) : '',
        verifyTokenConfigured: !!params.WHATSAPP_VERIFY_TOKEN,
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
      const headerInfo = headerComp ? {
        tipo: headerComp.format?.toLowerCase() || 'text', // text, image, video, document
        texto: headerComp.text || null,
        exemplo_url: headerComp.example?.header_handle?.[0] || headerComp.example?.header_url?.[0] || null,
      } : null;

      return {
        id: t.id,
        nome: t.name,
        status: t.status === 'APPROVED' ? 'aprovado' : t.status === 'PENDING' ? 'pendente' : t.status === 'REJECTED' ? 'rejeitado' : t.status?.toLowerCase(),
        categoria: t.category?.toLowerCase(),
        idioma: t.language,
        header: headerInfo,
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

    const { nome, categoria, idioma, corpo, variaveis, header, header_type, header_example_url } = req.body;

    if (!nome || !corpo) {
      return res.status(400).json({ success: false, message: 'Nome e corpo são obrigatórios' });
    }

    // Montar components
    const components = [];

    // Header (opcional) — suporta TEXT, IMAGE, VIDEO, DOCUMENT
    if (header_type && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header_type.toUpperCase())) {
      const headerComp = { type: 'HEADER', format: header_type.toUpperCase() };
      // A Meta exige um exemplo de mídia ao criar template com header de mídia
      if (header_example_url) {
        headerComp.example = { header_handle: [header_example_url] };
      }
      components.push(headerComp);
    } else if (header) {
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

// PUT /api/admin/whatsapp/templates/:id - Editar template na Meta
router.put('/templates/:id', async (req, res) => {
  try {
    const { loadParams } = require('../config/env');
    const params = await loadParams();
    const token = params.WHATSAPP_ACCESS_TOKEN;

    if (!token) return res.status(400).json({ success: false, message: 'Token WhatsApp não configurado' });

    const { corpo, variaveis, header } = req.body;
    const templateId = req.params.id;

    if (!corpo) return res.status(400).json({ success: false, message: 'Corpo é obrigatório' });

    // Montar components para update
    const components = [];

    if (header) {
      components.push({ type: 'HEADER', format: 'TEXT', text: header });
    }

    const bodyComponent = { type: 'BODY', text: corpo };
    const varMatches = corpo.match(/\{\{\d+\}\}/g) || [];
    if (varMatches.length > 0) {
      const examples = variaveis?.map(v => v.exemplo || 'exemplo') || varMatches.map(() => 'exemplo');
      bodyComponent.example = { body_text: [examples] };
    }
    components.push(bodyComponent);

    // Meta Graph API: editar template por ID
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${templateId}`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ components }),
        signal: AbortSignal.timeout(15000),
      }
    );
    const result = await response.json();

    if (!response.ok) {
      const errMsg = result.error?.error_user_msg || result.error?.message || 'Erro ao editar template';
      return res.status(400).json({ success: false, message: errMsg });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[WHATSAPP] Erro ao editar template:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/whatsapp/conversas - Conversas reais (do webhook)
router.get('/conversas', async (req, res) => {
  try {
    // Buscar todas as mensagens WHATSAPP# (scan paginado)
    let items = [];
    let lastKey = undefined;
    do {
      const params = {
        TableName: TABLE,
        FilterExpression: 'begins_with(PK, :prefix) AND begins_with(SK, :msgPrefix)',
        ExpressionAttributeValues: { ':prefix': 'WHATSAPP#', ':msgPrefix': 'MSG#' },
      };
      if (lastKey) params.ExclusiveStartKey = lastKey;
      const result = await dynamo.send(new ScanCommand(params));
      items = items.concat(result.Items || []);
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    // Agrupar por número (PK)
    const conversasMap = {};
    for (const msg of items) {
      const numero = msg.PK.replace('WHATSAPP#', '');
      if (!conversasMap[numero]) {
        conversasMap[numero] = { clienteId: numero, nome: '', telefone: numero, mensagens: [], naoLidas: 0 };
      }
      conversasMap[numero].mensagens.push(msg);
    }

    // Buscar envios (mensagens de saída) - paginado
    let outItems = [];
    lastKey = undefined;
    do {
      const params = {
        TableName: TABLE,
        FilterExpression: 'begins_with(PK, :prefix) AND begins_with(SK, :outPrefix)',
        ExpressionAttributeValues: { ':prefix': 'WHATSAPP#', ':outPrefix': 'OUT#' },
      };
      if (lastKey) params.ExclusiveStartKey = lastKey;
      const result = await dynamo.send(new ScanCommand(params));
      outItems = outItems.concat(result.Items || []);
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    for (const msg of outItems) {
      const numero = msg.PK.replace('WHATSAPP#', '');
      if (!conversasMap[numero]) {
        conversasMap[numero] = { clienteId: numero, nome: '', telefone: numero, mensagens: [], naoLidas: 0 };
      }
      conversasMap[numero].mensagens.push({ ...msg, direcao: 'saida' });
    }

    // Tentar resolver nomes via clientes cadastrados
    const TENANT = process.env.TENANT_ID || 'default';
    const clientesResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'CLIENTE#' },
    }));
    const clientesMap = {};
    for (const c of (clientesResult.Items || [])) {
      const tel = (c.whatsapp_numero || c.whatsapp || c.telefone || c.celular || '').replace(/\D/g, '');
      if (!tel) continue;
      // Mapear todas as variações possíveis do número
      clientesMap[tel] = c.nome;                          // 11994715161
      clientesMap[`55${tel}`] = c.nome;                   // 5511994715161
      if (tel.startsWith('55')) {
        clientesMap[tel.slice(2)] = c.nome;               // sem DDI
      }
      if (tel.length === 11) {
        clientesMap[`55${tel}`] = c.nome;                 // com DDI
      }
      if (tel.length === 13 && tel.startsWith('55')) {
        clientesMap[tel] = c.nome;                        // 5511994715161
        clientesMap[tel.slice(2)] = c.nome;               // 11994715161
      }
    }

    // Montar lista de conversas
    const conversas = Object.values(conversasMap).map(c => {
      // Resolver nome
      c.nome = clientesMap[c.telefone] || clientesMap[c.telefone.replace(/^55/, '')] || `+${c.telefone}`;

      // Ordenar mensagens por timestamp
      c.mensagens.sort((a, b) => (a.timestamp || a.createdAt || '').localeCompare(b.timestamp || b.createdAt || ''));
      const ultima = c.mensagens[c.mensagens.length - 1];

      // Janela 24h: última mensagem recebida (entrada) dentro de 24h
      const ultimaEntrada = [...c.mensagens].reverse().find(m => m.direcao !== 'saida');
      let janelaAberta = false;
      let janelaAte = '';
      if (ultimaEntrada) {
        const ts = ultimaEntrada.timestamp ? new Date(Number(ultimaEntrada.timestamp) * 1000) : new Date(ultimaEntrada.createdAt);
        const expira = new Date(ts.getTime() + 24 * 60 * 60 * 1000);
        janelaAberta = expira > new Date();
        janelaAte = janelaAberta ? expira.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';
      }

      return {
        clienteId: c.telefone,
        nome: c.nome,
        telefone: c.telefone,
        ultimaMensagem: ultima?.text || ultima?.type || '(mídia)',
        naoLidas: c.mensagens.filter(m => m.direcao !== 'saida' && !m.lida).length,
        janelaAberta,
        janelaAte,
        ultimoTimestamp: ultima?.timestamp || ultima?.createdAt || '',
      };
    });

    // Ordenar por mais recente
    conversas.sort((a, b) => (b.ultimoTimestamp || '').localeCompare(a.ultimoTimestamp || ''));

    res.json({ success: true, data: conversas });
  } catch (error) {
    console.error('[WHATSAPP] Erro ao listar conversas:', error.message);
    res.json({ success: true, data: [] });
  }
});

// GET /api/admin/whatsapp/conversas/:clienteId - Mensagens de uma conversa
router.get('/conversas/:clienteId', async (req, res) => {
  try {
    const numero = req.params.clienteId;
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    const { S3Client } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({});
    const BUCKET = process.env.S3_BUCKET_NAME || 'mbf-backend-v3-fotos';

    // Buscar mensagens recebidas
    const msgResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `WHATSAPP#${numero}`, ':sk': 'MSG#' },
      ScanIndexForward: true,
    }));

    // Buscar mensagens enviadas
    const outResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `WHATSAPP#${numero}`, ':sk': 'OUT#' },
      ScanIndexForward: true,
    }));

    // Gerar signed URLs para mídias
    const generateMediaUrl = async (s3Key) => {
      if (!s3Key) return null;
      try {
        return await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }), { expiresIn: 3600 });
      } catch { return null; }
    };

    // Download mídia sob demanda: se tem mediaId mas não tem s3Key, baixar agora
    const { loadParams } = require('../config/env');
    const params = await loadParams();
    const accessToken = params.WHATSAPP_ACCESS_TOKEN;
    const { S3Client: S3C, PutObjectCommand: PutObjCmd } = require('@aws-sdk/client-s3');
    const s3put = new S3C({});

    const downloadMediaOnDemand = async (item) => {
      if (!item.mediaId || item.mediaS3Key || !accessToken) return null;
      try {
        // Get media URL from Meta
        const metaResp = await fetch(`https://graph.facebook.com/v20.0/${item.mediaId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(10000),
        });
        const metaData = await metaResp.json();
        if (!metaResp.ok || !metaData.url) return null;

        const mimeType = metaData.mime_type || 'application/octet-stream';

        // Download file
        const fileResp = await fetch(metaData.url, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(30000),
        });
        if (!fileResp.ok) return null;

        const buffer = Buffer.from(await fileResp.arrayBuffer());

        // Determine extension
        const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'audio/ogg': '.ogg', 'audio/ogg; codecs=opus': '.ogg', 'audio/mpeg': '.mp3', 'audio/mp4': '.m4a', 'video/mp4': '.mp4' };
        const ext = extMap[mimeType.split(';')[0]] || '';

        const fromNum = item.PK.replace('WHATSAPP#', '');
        const s3Key = `whatsapp/media/${fromNum}/${Date.now()}-${item.mediaId.slice(-8)}${ext}`;

        // Upload to S3
        await s3put.send(new PutObjCmd({ Bucket: BUCKET, Key: s3Key, Body: buffer, ContentType: mimeType }));

        // Update DynamoDB with s3Key and mime
        await dynamo.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: item.PK, SK: item.SK },
          UpdateExpression: 'SET mediaS3Key = :key, mediaMime = :mime',
          ExpressionAttributeValues: { ':key': s3Key, ':mime': mimeType },
        }));

        return { s3Key, mimeType };
      } catch (err) {
        console.error('[WHATSAPP] Erro download on-demand:', err.message);
        return null;
      }
    };

    const entradas = await Promise.all((msgResult.Items || []).map(async m => {
      let mediaS3Key = m.mediaS3Key;
      let mediaMime = m.mediaMime;

      // Tentar download sob demanda se necessário
      if (m.mediaId && !mediaS3Key) {
        const result = await downloadMediaOnDemand(m);
        if (result) {
          mediaS3Key = result.s3Key;
          mediaMime = result.mimeType;
        }
      }

      const mediaUrl = mediaS3Key ? await generateMediaUrl(mediaS3Key) : null;
      return {
        id: m.SK,
        direcao: 'entrada',
        texto: m.text || (mediaUrl ? '' : (m.mediaId ? `[${m.type || 'mídia'}]` : '')),
        tipo: m.type,
        mediaUrl,
        mediaMime: mediaMime || null,
        mediaS3Key: mediaS3Key || null,
        timestamp: m.timestamp,
        hora: m.timestamp ? new Date(Number(m.timestamp) * 1000).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
        status: 'recebido',
      };
    }));

    const saidas = (outResult.Items || []).map(m => ({
      id: m.SK,
      direcao: 'saida',
      texto: m.text || m.templateNome || '[template]',
      tipo: m.type || 'text',
      mediaUrl: null,
      mediaMime: null,
      timestamp: m.timestamp || m.createdAt,
      hora: m.createdAt ? new Date(m.createdAt).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
      status: m.status || 'enviado',
    }));

    const todas = [...entradas, ...saidas];

    // Ordenar por timestamp
    todas.sort((a, b) => {
      const ta = a.timestamp ? (String(a.timestamp).length <= 10 ? Number(a.timestamp) * 1000 : Number(a.timestamp)) : new Date(a.timestamp).getTime();
      const tb = b.timestamp ? (String(b.timestamp).length <= 10 ? Number(b.timestamp) * 1000 : Number(b.timestamp)) : new Date(b.timestamp).getTime();
      return ta - tb;
    });

    res.json({ success: true, data: todas });
  } catch (error) {
    console.error('[WHATSAPP] Erro ao buscar mensagens:', error.message);
    res.json({ success: true, data: [] });
  }
});

// POST /api/admin/whatsapp/conversas/:clienteId/marcar-lida - Marcar msgs como lidas
router.post('/conversas/:clienteId/marcar-lida', async (req, res) => {
  try {
    const numero = req.params.clienteId;

    // Buscar mensagens não lidas
    const msgResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `WHATSAPP#${numero}`, ':sk': 'MSG#' },
    }));

    // Marcar cada uma como lida
    const naoLidas = (msgResult.Items || []).filter(m => !m.lida);
    const promises = naoLidas.map(m =>
      dynamo.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: m.PK, SK: m.SK },
        UpdateExpression: 'SET lida = :true',
        ExpressionAttributeValues: { ':true': true },
      })).catch(() => {})
    );
    await Promise.all(promises);

    res.json({ success: true, marcadas: naoLidas.length });
  } catch (error) {
    res.json({ success: true, marcadas: 0 });
  }
});

// POST /api/admin/whatsapp/enviar-texto - Enviar texto livre (dentro da janela 24h)
router.post('/enviar-texto', async (req, res) => {
  try {
    const { clienteId, texto } = req.body;
    if (!clienteId || !texto) return res.status(400).json({ success: false, message: 'clienteId e texto são obrigatórios' });

    const whatsapp = require('../lib/whatsapp/client');

    // Enviar via WhatsApp Cloud API
    const result = await whatsapp.enviarTexto({ telefone: clienteId, texto });

    // Salvar mensagem de saída no DynamoDB
    const now = new Date();
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `WHATSAPP#${result.phone || clienteId.replace(/\D/g, '')}`,
        SK: `OUT#${now.toISOString()}#${result.message_id || Date.now()}`,
        type: 'text',
        text: texto,
        status: 'enviado',
        messageId: result.message_id,
        createdAt: now.toISOString(),
        timestamp: Math.floor(now.getTime() / 1000).toString(),
      },
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/admin/whatsapp/custos - Custos do mês (baseado em mensagens reais)
router.get('/custos', async (req, res) => {
  try {
    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Buscar mensagens de saída do mês (paginado)
    let envios = [];
    let lastKey = undefined;
    do {
      const params = {
        TableName: TABLE,
        FilterExpression: 'begins_with(PK, :prefix) AND begins_with(SK, :outPrefix) AND begins_with(createdAt, :mes)',
        ExpressionAttributeValues: { ':prefix': 'WHATSAPP#', ':outPrefix': 'OUT#', ':mes': mesAtual },
      };
      if (lastKey) params.ExclusiveStartKey = lastKey;
      const result = await dynamo.send(new ScanCommand(params));
      envios = envios.concat(result.Items || []);
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    // Buscar mensagens recebidas do mês (paginado)
    let recebidas = [];
    lastKey = undefined;
    do {
      const params = {
        TableName: TABLE,
        FilterExpression: 'begins_with(PK, :prefix) AND begins_with(SK, :msgPrefix) AND begins_with(createdAt, :mes)',
        ExpressionAttributeValues: { ':prefix': 'WHATSAPP#', ':msgPrefix': 'MSG#', ':mes': mesAtual },
      };
      if (lastKey) params.ExclusiveStartKey = lastKey;
      const result = await dynamo.send(new ScanCommand(params));
      recebidas = recebidas.concat(result.Items || []);
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    const totalMes = envios.length;
    const totalRecebidas = recebidas.length;

    // Custos WhatsApp Cloud API (por categoria)
    // Utility: ~R$0,035 | Marketing: ~R$0,0625 | Authentication: ~R$0,0345
    let custoTotal = 0;
    let templateCount = 0;
    let textoLivre = 0;
    const porTipoMap = {};

    for (const e of envios) {
      const tipo = e.categoria || (e.templateNome ? 'utility' : 'service');
      const custo = tipo === 'marketing' ? 0.0625 : tipo === 'authentication' ? 0.0345 : tipo === 'utility' ? 0.035 : 0;
      custoTotal += custo;
      if (e.templateNome) templateCount++; else textoLivre++;
      if (!porTipoMap[tipo]) porTipoMap[tipo] = { tipo, qtd: 0, custoUnitario: custo, total: 0 };
      porTipoMap[tipo].qtd++;
      porTipoMap[tipo].total += custo;
    }

    // Gráfico por dia
    const porDia = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const diaStr = d.toISOString().slice(0, 10);
      const qtdOut = envios.filter(e => e.createdAt?.startsWith(diaStr)).length;
      const qtdIn = recebidas.filter(e => e.createdAt?.startsWith(diaStr)).length;
      porDia.push({ dia: diaStr.slice(5), qtd: qtdOut, recebidas: qtdIn });
    }

    res.json({
      success: true,
      data: {
        totalMes,
        totalRecebidas,
        custoTotal,
        mediaDia: totalMes / 30,
        templates: templateCount,
        textoLivre,
        porDia,
        porTipo: Object.values(porTipoMap),
        budget: 50,
      },
    });
  } catch (error) {
    console.error('[WHATSAPP] Erro ao calcular custos:', error.message);
    res.json({ success: true, data: { totalMes: 0, totalRecebidas: 0, custoTotal: 0, mediaDia: 0, templates: 0, textoLivre: 0, porDia: [], porTipo: [], budget: 50 } });
  }
});

module.exports = router;
