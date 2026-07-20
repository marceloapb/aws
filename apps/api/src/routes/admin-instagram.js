const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { publicarCarrossel, publicarFotoUnica } = require('../services/instagramService');
const { INSTAGRAM_STATUS } = require('../config/constants');

const router = Router();

// GET /api/admin/instagram/status
router.get('/status', async (req, res) => {
  try {
    const { loadParams, features } = require('../config/env');
    const params = await loadParams();
    const connected = !!(params.INSTAGRAM_ACCESS_TOKEN && params.INSTAGRAM_BUSINESS_ACCOUNT_ID);
    
    let username = '';
    let accountType = '';
    let lastPublishAt = null;
    
    if (connected) {
      // Try to get account info from Meta Graph API
      try {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${params.INSTAGRAM_BUSINESS_ACCOUNT_ID}?fields=username,account_type&access_token=${params.INSTAGRAM_ACCESS_TOKEN}`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (response.ok) {
          const data = await response.json();
          username = data.username || '';
          accountType = data.account_type || 'BUSINESS';
        }
      } catch {}
      
      // Get last successful publish from DB
      try {
        const lastPubResult = await dynamo.send(new QueryCommand({
          TableName: TABLE,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk',
          FilterExpression: '#s = :status',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':pk': 'INSTAGRAM', ':status': 'PUBLICADO' },
          ScanIndexForward: false,
          Limit: 1,
        }));
        if (lastPubResult.Items?.length > 0) {
          lastPublishAt = lastPubResult.Items[0].publicado_em;
        }
      } catch {}
    }
    
    res.json({
      success: true,
      data: {
        connected,
        username,
        accountType,
        appId: params.INSTAGRAM_APP_ID || '',
        businessAccountId: params.INSTAGRAM_BUSINESS_ACCOUNT_ID || '',
        lastPublishAt,
        tokenConfigured: !!params.INSTAGRAM_ACCESS_TOKEN,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/instagram
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const params = {
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'INSTAGRAM' },
    };
    if (status) {
      params.FilterExpression = '#s = :status';
      params.ExpressionAttributeNames = { '#s': 'status' };
      params.ExpressionAttributeValues[':status'] = status;
    }

    const result = await dynamo.send(new QueryCommand(params));
    const items = result.Items || [];
    const total = items.length;
    const start = (Number(page) - 1) * Number(limit);
    const data = items.slice(start, start + Number(limit));

    res.json({ success: true, data, pagination: { page: Number(page), totalPages: Math.ceil(total / Number(limit)), totalItems: total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/instagram
router.post('/', async (req, res) => {
  try {
    const { fotos_ids, caption, agendado_para, album_id } = req.body;
    if (!fotos_ids || fotos_ids.length === 0) return res.status(400).json({ success: false, message: 'Selecione pelo menos 1 foto' });
    if (fotos_ids.length > 10) return res.status(400).json({ success: false, message: 'Máximo 10 fotos por carrossel' });

    const id = crypto.randomUUID();
    const item = {
      id, fotos_ids,
      PK: `INSTAGRAM#${id}`, SK: `INSTAGRAM#${id}`,
      GSI1PK: 'INSTAGRAM', GSI1SK: `INSTAGRAM#${agendado_para || new Date().toISOString()}`,
      caption: caption || '',
      agendado_para: agendado_para || new Date().toISOString(),
      album_id: album_id || '',
      status: INSTAGRAM_STATUS.AGENDADO,
      created: new Date().toISOString(),
    };
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/instagram/:id/publicar-agora
router.post('/:id/publicar-agora', async (req, res) => {
  try {
    const pubResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: { ':pk': 'INSTAGRAM', ':id': req.params.id },
    }));
    const pub = pubResult.Items?.[0];
    if (!pub) return res.status(404).json({ success: false, message: 'Publicação não encontrada' });

    // Buscar fotos
    const fotosResults = await Promise.all(pub.fotos_ids.map(fid =>
      dynamo.send(new QueryCommand({
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
        ExpressionAttributeValues: { ':pk': 'FOTO', ':sk': `FOTO#${fid}` },
      }))
    ));
    const fotosKeys = fotosResults.flatMap(r => (r.Items || []).map(f => f.s3_key));

    let resultado;
    if (fotosKeys.length === 1) {
      resultado = await publicarFotoUnica(fotosKeys[0], pub.caption || '');
    } else {
      resultado = await publicarCarrossel(fotosKeys, pub.caption || '');
    }

    if (resultado.success) {
      await dynamo.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: pub.PK, SK: pub.SK },
        UpdateExpression: 'SET #s = :s, publicado_em = :pe, instagram_post_id = :pi, instagram_permalink = :pp',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':s': INSTAGRAM_STATUS.PUBLICADO,
          ':pe': new Date().toISOString(),
          ':pi': resultado.instagram_post_id,
          ':pp': resultado.instagram_permalink,
        },
      }));
      res.json({ success: true, data: resultado });
    } else {
      throw new Error(resultado.error);
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/instagram/:id
router.delete('/:id', async (req, res) => {
  try {
    await dynamo.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `INSTAGRAM#${req.params.id}`, SK: `INSTAGRAM#${req.params.id}` },
    }));
    res.json({ success: true, message: 'Publicação cancelada' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/instagram/renew-token - Renovar token de longa duração
router.post('/renew-token', async (req, res) => {
  try {
    const { loadParams, clearParamsCache } = require('../config/env');
    const params = await loadParams();

    if (!params.INSTAGRAM_ACCESS_TOKEN) {
      return res.json({ success: false, message: 'Access Token não configurado.' });
    }

    // Exchange for long-lived token via Meta Graph API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${params.INSTAGRAM_APP_ID || params.FACEBOOK_APP_ID}&client_secret=${params.INSTAGRAM_APP_SECRET || params.FACEBOOK_APP_SECRET}&fb_exchange_token=${params.INSTAGRAM_ACCESS_TOKEN}`,
      { signal: AbortSignal.timeout(15000) }
    );
    const data = await response.json();

    if (response.ok && data.access_token) {
      // Update the token in SSM
      const { SSMClient, PutParameterCommand } = require('@aws-sdk/client-ssm');
      const ssm = new SSMClient({ region: 'us-east-1' });
      const prefix = process.env.SSM_PREFIX || `/mbf/${process.env.STAGE || 'prod'}`;

      await ssm.send(new PutParameterCommand({
        Name: `${prefix}/INSTAGRAM_ACCESS_TOKEN`,
        Value: data.access_token,
        Type: 'SecureString',
        Overwrite: true,
      }));

      // Clear cached params to force reload on next request
      clearParamsCache();

      res.json({
        success: true,
        message: `Token renovado com sucesso. Expira em ${data.expires_in ? Math.round(data.expires_in / 86400) + ' dias' : '60 dias'}.`,
      });
    } else {
      const errorMsg = data.error?.message || 'Erro ao renovar token';
      res.json({ success: false, message: `Falha: ${errorMsg}` });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================== STORIES =====================

// GET /api/admin/instagram/stories/templates
router.get('/stories/templates', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': 'STORY_TEMPLATE', ':sk': 'TPL#' },
    }));
    res.json(result.Items || []);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/instagram/stories/templates
router.post('/stories/templates', async (req, res) => {
  try {
    const { nome, prompt_base, estilo_visual, overlay_position } = req.body;
    if (!nome || !prompt_base) return res.status(400).json({ success: false, message: 'Nome e prompt_base são obrigatórios' });

    const id = crypto.randomUUID();
    const item = {
      PK: 'STORY_TEMPLATE', SK: `TPL#${id}`,
      id, nome, prompt_base, estilo_visual: estilo_visual || 'minimalista', overlay_position: overlay_position || 'bottom',
      created_at: new Date().toISOString(),
    };
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/instagram/stories/templates/:id
router.put('/stories/templates/:id', async (req, res) => {
  try {
    const { nome, prompt_base, estilo_visual, overlay_position } = req.body;
    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: 'STORY_TEMPLATE', SK: `TPL#${req.params.id}` },
      UpdateExpression: 'SET nome = :n, prompt_base = :p, estilo_visual = :e, overlay_position = :o, updated_at = :u',
      ExpressionAttributeValues: {
        ':n': nome, ':p': prompt_base, ':e': estilo_visual || 'minimalista',
        ':o': overlay_position || 'bottom', ':u': new Date().toISOString(),
      },
    }));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/instagram/stories/templates/:id
router.delete('/stories/templates/:id', async (req, res) => {
  try {
    await dynamo.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: 'STORY_TEMPLATE', SK: `TPL#${req.params.id}` },
    }));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/instagram/stories/template — Gerar story com IA usando template
router.post('/stories/template', async (req, res) => {
  try {
    const { gerarTextoStory } = require('../services/aiService');
    const { template_id, foto_url } = req.body;

    if (!template_id) return res.status(400).json({ success: false, message: 'template_id é obrigatório' });

    // Buscar template
    const tplResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: { ':pk': 'STORY_TEMPLATE', ':sk': `TPL#${template_id}` },
    }));
    const template = tplResult.Items?.[0];
    if (!template) return res.status(404).json({ success: false, message: 'Template não encontrado' });

    // Gerar texto via IA
    const texto = await gerarTextoStory({
      tipo_evento: template.prompt_base,
      estilo: template.estilo_visual,
    });

    // Registrar uso para controle de custo
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: 'STORY_IA_LOG', SK: `LOG#${Date.now()}`,
        tipo: 'template', template_id, texto, foto_url: foto_url || null,
        created_at: new Date().toISOString(),
      },
    }));

    res.json({ success: true, texto, preview_url: foto_url || null, template: template.nome });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/instagram/stories/ia-livre — Gerar story com IA livre (prompt customizado)
router.post('/stories/ia-livre', async (req, res) => {
  try {
    const { gerarTextoStory } = require('../services/aiService');
    const { prompt, foto_url } = req.body;

    if (!prompt || !prompt.trim()) return res.status(400).json({ success: false, message: 'Prompt é obrigatório' });

    // Gerar texto via IA com prompt livre
    const texto = await gerarTextoStory({ prompt_livre: prompt });

    // Registrar uso para controle de custo
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: 'STORY_IA_LOG', SK: `LOG#${Date.now()}`,
        tipo: 'ia_livre', prompt, texto, foto_url: foto_url || null,
        created_at: new Date().toISOString(),
      },
    }));

    res.json({ success: true, texto, preview_url: foto_url || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
