const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { deleteAlbumFolder } = require('../services/s3Service');
const { generateUploadUrl } = require('../services/mediaUploadService');
const { ALBUM_STATUS, COBRANCA_STATUS } = require('../config/constants');
const { slugify } = require('../utils/slugify');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { listarProrrogacoes, aprovarProrrogacao } = require('../services/albumProrrogacaoService');
const crypto = require('crypto');

const sqs = new SQSClient({});

const router = Router();

// GET /api/admin/albuns
router.get('/', async (req, res) => {
  try {
    const { status, cliente_id, page = 1, limit = 50 } = req.query;

    let items = [];
    if (cliente_id) {
      const result = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `CLIENTE#${cliente_id}`, ':sk': 'ALBUM#' },
      }));
      items = result.Items || [];
    } else {
      // GSI1: query por status
      const params = {
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'ALBUM' },
      };
      if (status) {
        params.FilterExpression = '#s = :status';
        params.ExpressionAttributeNames = { '#s': 'status' };
        params.ExpressionAttributeValues[':status'] = status;
      }
      const result = await dynamo.send(new QueryCommand(params));
      items = result.Items || [];
    }

    if (status && cliente_id) items = items.filter(a => a.status === status);

    const total = items.length;
    const start = (Number(page) - 1) * Number(limit);
    const data = items.slice(start, start + Number(limit));

    // G4: Enriquecer com percentual_pago, pode_publicar e thumbnail
    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    const s3 = new S3Client({});
    const bucket = process.env.S3_BUCKET_NAME;

    const dataEnriquecida = await Promise.all(data.map(async (album) => {
      // Buscar nome do cliente se existir cliente_id
      let cliente_nome = album.cliente_nome || null;
      if (!cliente_nome && album.cliente_id) {
        try {
          // Padrão 1: CLIENT#<id>/PROFILE (self-signup)
          const clienteResult = await dynamo.send(new GetCommand({
            TableName: TABLE,
            Key: { PK: `CLIENT#${album.cliente_id}`, SK: 'PROFILE' },
          }));
          if (clienteResult.Item) {
            cliente_nome = clienteResult.Item.nome || clienteResult.Item.name || null;
          }
          // Padrão 2: TENANT#default/CLIENTE#<id> (admin-created)
          if (!cliente_nome) {
            const TENANT = process.env.TENANT_ID || 'default';
            const clienteResult2 = await dynamo.send(new GetCommand({
              TableName: TABLE,
              Key: { PK: `TENANT#${TENANT}`, SK: `CLIENTE#${album.cliente_id}` },
            }));
            if (clienteResult2.Item) {
              cliente_nome = clienteResult2.Item.nome || clienteResult2.Item.name || null;
            }
          }
        } catch {}
      }

      // Buscar foto de capa para thumbnail
      let thumbnail_url = null;
      try {
        // Determine capa_foto_id (album field or tema)
        let capaId = album.capa_foto_id || null;
        if (!capaId) {
          try {
            const temaResult = await dynamo.send(new GetCommand({
              TableName: TABLE,
              Key: { PK: `ALBUM#${album.id}`, SK: 'TEMA' },
            }));
            if (temaResult.Item?.capa_foto_id) capaId = temaResult.Item.capa_foto_id;
          } catch {}
        }

        let capaFoto = null;

        // If we have a capa_foto_id, fetch that specific photo
        if (capaId) {
          try {
            const fotoResult = await dynamo.send(new GetCommand({
              TableName: TABLE,
              Key: { PK: `ALBUM#${album.id}`, SK: `FOTO#${capaId}` },
            }));
            if (fotoResult.Item) capaFoto = fotoResult.Item;
          } catch {}
        }

        // Fallback: first photo by ordem
        if (!capaFoto) {
          const fotosResult = await dynamo.send(new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: { ':pk': `ALBUM#${album.id}`, ':sk': 'FOTO#' },
            Limit: 5,
          }));
          const fotos = (fotosResult.Items || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
          if (fotos.length > 0) capaFoto = fotos[0];
        }

        if (capaFoto) {
          const key = capaFoto.s3_key_thumb || capaFoto.s3_key_media || capaFoto.s3_key_original;
          if (key) {
            thumbnail_url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
          }
        }
      } catch {}

      if (!album.orcamento_id) {
        return { ...album, cliente_nome, percentual_pago: null, pode_publicar: true, thumbnail_url };
      }
      try {
        const cobrancasResult = await dynamo.send(new QueryCommand({
          TableName: TABLE,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk',
          FilterExpression: 'orcamento_id = :oid',
          ExpressionAttributeValues: { ':pk': 'COBRANCA', ':oid': album.orcamento_id },
        }));
        const cobrancas = cobrancasResult.Items || [];
        const totalValor = cobrancas.reduce((sum, c) => sum + (c.valor || 0), 0);
        const totalPago = cobrancas
          .filter(c => c.status === COBRANCA_STATUS.PAGO)
          .reduce((sum, c) => sum + (c.valor || 0), 0);
        const percentual_pago = totalValor > 0 ? Math.round((totalPago / totalValor) * 100) : 0;
        return { ...album, cliente_nome, percentual_pago, pode_publicar: percentual_pago >= 70, thumbnail_url };
      } catch {
        return { ...album, cliente_nome, percentual_pago: null, pode_publicar: true, thumbnail_url };
      }
    }));

    res.json({ success: true, data: dataEnriquecida, pagination: { page: Number(page), totalPages: Math.ceil(total / Number(limit)), totalItems: total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/albuns/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${req.params.id}` },
    }));
    if (!result.Items || result.Items.length === 0) return res.status(404).json({ success: false, message: 'Álbum não encontrado' });
    const album = result.Items[0];

    const fotosResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${album.id}`, ':sk': 'FOTO#' },
    }));
    const fotos = (fotosResult.Items || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    // Gerar presigned URLs em lotes (máx 100 para não dar timeout)
    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    const s3 = new S3Client({});
    const bucket = process.env.S3_BUCKET_NAME;

    const fotosComUrl = await Promise.all(fotos.map(async (foto) => {
      const keyThumb = (foto.s3_key_thumb && foto.s3_key_thumb !== null) ? foto.s3_key_thumb : null;
      const keyMedia = (foto.s3_key_media && foto.s3_key_media !== null) ? foto.s3_key_media : null;
      const keyOriginal = foto.s3_key_original || foto.s3_key || foto.key;
      const keyForGrid = keyThumb || keyMedia || keyOriginal;
      if (!keyForGrid) return foto;
      try {
        const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: keyForGrid }), { expiresIn: 3600 });
        const url_full = (keyForGrid !== keyOriginal && keyOriginal)
          ? await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: keyOriginal }), { expiresIn: 3600 })
          : url;
        return { ...foto, url, url_full };
      } catch {
        return foto;
      }
    }));

    res.json({ success: true, data: { ...album, fotos: fotosComUrl } });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Álbum não encontrado' });
  }
});

// POST /api/admin/albuns
router.post('/', async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const TENANT = req.tenantId || process.env.TENANT_ID || 'default';

    // Validade do álbum só começa a contar a partir da publicação.
    // Aqui apenas armazena dias_expiracao para usar no momento da publicação.
    let diasExpiracao = req.body.dias_expiracao || null;
    if (!diasExpiracao) {
      try {
        let cfgResult = await dynamo.send(new GetCommand({
          TableName: TABLE,
          Key: { PK: `TENANT#${TENANT}`, SK: 'CONFIG#ALBUM' },
        }));
        if (!cfgResult.Item && TENANT !== 'default') {
          cfgResult = await dynamo.send(new GetCommand({
            TableName: TABLE,
            Key: { PK: 'TENANT#default', SK: 'CONFIG#ALBUM' },
          }));
        }
        diasExpiracao = cfgResult.Item?.prazo_padrao_dias || 180;
      } catch {
        diasExpiracao = 180;
      }
    }

    const clienteId = req.body.cliente_id || null;

    const item = {
      ...req.body,
      id,
      PK: clienteId ? `CLIENTE#${clienteId}` : `TENANT#${process.env.TENANT_ID || 'default'}`,
      SK: `ALBUM#${id}`,
      GSI1PK: 'ALBUM',
      GSI1SK: `ALBUM#${id}`,
      tipo: req.body.tipo || (clienteId ? 'evento' : 'avulso'),
      tipo_evento: req.body.tipo_evento || '',
      cliente_id: clienteId,
      status: ALBUM_STATUS.ATIVO,
      dias_expiracao: diasExpiracao,
      created: new Date().toISOString(),
    };
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    // Create default 'Geral' gallery
    const galeriaId = crypto.randomUUID();
    const galeriaItem = {
      PK: `ALBUM#${id}`,
      SK: `GALERIA#${galeriaId}`,
      id: galeriaId,
      album_id: id,
      nome: 'Geral',
      ordem: 0,
      created: new Date().toISOString(),
    };
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: galeriaItem }));

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/albuns/:id
router.put('/:id', async (req, res) => {
  try {
    const found = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${req.params.id}` },
    }));
    if (!found.Items || found.Items.length === 0) return res.status(404).json({ success: false, message: 'Álbum não encontrado' });
    const album = found.Items[0];

    const updates = req.body;
    const keys = Object.keys(updates);
    const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
    const vals = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));
    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: album.PK, SK: album.SK },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
      ReturnValues: 'ALL_NEW',
    }));
    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/albuns/:id
router.delete('/:id', async (req, res) => {
  try {
    const found = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${req.params.id}` },
    }));
    if (!found.Items || found.Items.length === 0) return res.status(404).json({ success: false, message: 'Álbum não encontrado' });
    const album = found.Items[0];

    await deleteAlbumFolder(req.params.id);

    const fotos = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${req.params.id}`, ':sk': 'FOTO#' },
    }));
    for (const foto of (fotos.Items || [])) {
      await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: foto.PK, SK: foto.SK } }));
    }

    await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: album.PK, SK: album.SK } }));
    res.json({ success: true, message: 'Álbum excluído' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/albuns/:id/publicar — Publish album
router.post('/:id/publicar', async (req, res) => {
  try {
    // Find album
    const found = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${req.params.id}` },
    }));
    if (!found.Items || found.Items.length === 0) return res.status(404).json({ success: false, message: 'Álbum não encontrado' });
    const album = found.Items[0];

    // Check 70% payment if orcamento_id exists
    if (album.orcamento_id) {
      const cobrancasResult = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: 'orcamento_id = :oid',
        ExpressionAttributeValues: { ':pk': 'COBRANCA', ':oid': album.orcamento_id },
      }));

      const cobrancas = cobrancasResult.Items || [];
      const totalValor = cobrancas.reduce((sum, c) => sum + (c.valor || 0), 0);
      const totalPago = cobrancas
        .filter(c => c.status === COBRANCA_STATUS.PAGO)
        .reduce((sum, c) => sum + (c.valor || 0), 0);

      if (totalValor > 0 && (totalPago / totalValor) < 0.7) {
        console.log(`[ALBUM] Publicando com pagamento abaixo de 70%: ${Math.round((totalPago / totalValor) * 100)}%`);
      }
    }

    // Generate slug if not exists
    let slug = album.slug;
    if (!slug) {
      slug = slugify(album.titulo || `album-${req.params.id.slice(0, 8)}`);
      // Uniqueness check
      const slugCheck = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: 'slug = :slug',
        ExpressionAttributeValues: { ':pk': 'ALBUM', ':slug': slug },
      }));
      if (slugCheck.Items && slugCheck.Items.length > 0) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }
    }

    // Calculate expiration from publish date (not creation date)
    // Validade do álbum começa a contar SOMENTE a partir da publicação
    const TENANT = req.tenantId || process.env.TENANT_ID || 'default';
    let diasExpiracao = album.dias_expiracao || 180;
    if (!album.dias_expiracao) {
      try {
        // Try tenant ID first, then 'default'
        let cfgResult = await dynamo.send(new GetCommand({
          TableName: TABLE,
          Key: { PK: `TENANT#${TENANT}`, SK: 'CONFIG#ALBUM' },
        }));
        if (!cfgResult.Item && TENANT !== 'default') {
          cfgResult = await dynamo.send(new GetCommand({
            TableName: TABLE,
            Key: { PK: 'TENANT#default', SK: 'CONFIG#ALBUM' },
          }));
        }
        diasExpiracao = cfgResult.Item?.prazo_padrao_dias || 180;
      } catch {}
    }
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + diasExpiracao);

    // Update album
    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: album.PK, SK: album.SK },
      UpdateExpression: 'SET #s = :status, slug = :slug, disponivel_em = :disp, data_expiracao = :exp, dias_totais = :dias',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':status': 'publicado',
        ':slug': slug,
        ':disp': new Date().toISOString(),
        ':exp': dataExpiracao.toISOString().split('T')[0],
        ':dias': diasExpiracao,
      },
      ReturnValues: 'ALL_NEW',
    }));

    // Disparar evento album_publicado para regras de notificação
    const clienteId = album.cliente_id;
    if (clienteId) {
      try {
        const { registrarEvento } = require('../services/clienteHistoricoService');
        await registrarEvento({
          cliente_id: clienteId,
          tipo: 'album_publicado',
          descricao: `Álbum publicado – ${album.titulo || 'Álbum'}`,
          metadata: { album_id: req.params.id, titulo: album.titulo, slug },
        });
      } catch (evtErr) {
        console.error('[ALBUM] Erro ao registrar evento album_publicado:', evtErr.message);
      }
    }

    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/albuns/:id/despublicar — Unpublish album
router.post('/:id/despublicar', async (req, res) => {
  try {
    const found = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${req.params.id}` },
    }));
    if (!found.Items || found.Items.length === 0) return res.status(404).json({ success: false, message: 'Álbum não encontrado' });
    const album = found.Items[0];

    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: album.PK, SK: album.SK },
      UpdateExpression: 'SET #s = :status REMOVE slug, disponivel_em',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': 'pronto' },
      ReturnValues: 'ALL_NEW',
    }));

    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/albuns/:id/reprocessar — Re-enqueue photos with processing errors
router.post('/:id/reprocessar', async (req, res) => {
  try {
    const albumId = req.params.id;
    const tenant_id = req.tenantId || 'default';
    const QUEUE_URL = process.env.MEDIA_QUEUE_URL;
    if (!QUEUE_URL) return res.status(400).json({ success: false, message: 'MEDIA_QUEUE_URL não configurada' });

    // Buscar fotos com erro
    const fotosResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${albumId}`, ':sk': 'FOTO#' },
    }));
    const fotosComErro = (fotosResult.Items || []).filter(f => f.status_processamento === 'erro' || !f.s3_key_thumb || f.s3_key_thumb === null);

    let enqueued = 0;
    for (const foto of fotosComErro) {
      const originalKey = foto.s3_key_original || foto.s3_key;
      if (!originalKey) continue;
      await sqs.send(new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify({
          action: 'process_foto',
          tenant_id: foto.tenant_id || tenant_id,
          album_id: albumId,
          galeria_id: foto.galeria_id,
          foto_id: foto.id,
          s3_key_original: originalKey,
          s3_key: originalKey,
          content_type: foto.content_type || 'image/jpeg',
        }),
      }));
      // Reset status
      await dynamo.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: foto.PK, SK: foto.SK },
        UpdateExpression: 'SET status_processamento = :s REMOVE erro_processamento',
        ExpressionAttributeValues: { ':s': 'pendente' },
      }));
      enqueued++;
    }

    res.json({ success: true, message: `${enqueued} fotos enfileiradas para reprocessamento`, data: { total: enqueued } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/albuns/:id/upload-urls — Batch presigned URLs
router.post('/:id/upload-urls', async (req, res) => {
  try {
    const { files } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, message: 'files é obrigatório (array de {filename, content_type, size_bytes})' });
    }
    if (files.length > 50) {
      return res.status(400).json({ success: false, message: 'Máximo de 50 arquivos por requisição' });
    }

    const MAX_SIZE = 30 * 1024 * 1024; // 30MB
    const tenant_id = req.tenantId || 'default';
    const albumId = req.params.id;

    const results = [];
    for (const file of files) {
      if (file.size_bytes && file.size_bytes > MAX_SIZE) {
        return res.status(400).json({ success: false, message: `Arquivo ${file.filename} excede 30MB` });
      }

      const result = await generateUploadUrl({
        tenant_id,
        contexto: 'album',
        entidade_id: albumId,
        filename: file.filename || 'foto.jpg',
        content_type: file.content_type || 'image/jpeg',
        size_bytes: file.size_bytes || MAX_SIZE,
      });

      results.push({
        upload_url: result.upload_url,
        foto_id: result.media_id,
        key: result.key,
      });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/albuns/:id/fotos/confirmar-batch — Confirm multiple uploads
router.post('/:id/fotos/confirmar-batch', async (req, res) => {
  try {
    const { fotos, galeria_id } = req.body;
    const albumId = req.params.id;
    const tenant_id = req.tenantId || 'default';

    if (!Array.isArray(fotos) || fotos.length === 0) {
      return res.status(400).json({ success: false, message: 'fotos é obrigatório (array de {foto_id, key, content_type})' });
    }

    // Get current photo count for ordering
    const countResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${albumId}`, ':sk': 'FOTO#' },
      Select: 'COUNT',
    }));
    let ordem = countResult.Count || 0;
    const now = new Date().toISOString();
    const created = [];

    for (const foto of fotos) {
      const id = foto.foto_id || crypto.randomUUID();
      const item = {
        PK: `ALBUM#${albumId}`,
        SK: `FOTO#${id}`,
        GSI1PK: 'FOTO',
        GSI1SK: `FOTO#${id}`,
        id,
        album_id: albumId,
        galeria_id: galeria_id || null,
        tenant_id,
        s3_key: foto.key,
        s3_key_original: foto.key,
        s3_key_thumb: null,
        s3_key_media: null,
        filename: foto.filename || null,
        content_type: foto.content_type || 'image/jpeg',
        status_processamento: 'pendente',
        ordem,
        created: now,
      };
      await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
      created.push(item);
      ordem++;
    }

    // Update album total_fotos
    const albumResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${albumId}` },
    }));
    if (albumResult.Items?.length > 0) {
      const album = albumResult.Items[0];
      await dynamo.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: album.PK, SK: album.SK },
        UpdateExpression: 'SET total_fotos = :t',
        ExpressionAttributeValues: { ':t': ordem },
      }));
    }

    // Push SQS message for processing
    const QUEUE_URL = process.env.MEDIA_QUEUE_URL;
    if (QUEUE_URL) {
      for (const foto of created) {
        await sqs.send(new SendMessageCommand({
          QueueUrl: QUEUE_URL,
          MessageBody: JSON.stringify({
            action: 'process_foto',
            tenant_id: foto.tenant_id,
            album_id: albumId,
            galeria_id: foto.galeria_id,
            foto_id: foto.id,
            s3_key_original: foto.s3_key_original || foto.s3_key,
            s3_key: foto.s3_key,
            content_type: foto.content_type,
          }),
        }));
      }
    }

    res.json({ success: true, data: { confirmadas: created.length, fotos: created } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/albuns/:id/galerias-default — Create default 'Geral' gallery
router.post('/:id/galerias-default', async (req, res) => {
  try {
    const albumId = req.params.id;
    const id = crypto.randomUUID();

    const item = {
      PK: `ALBUM#${albumId}`,
      SK: `GALERIA#${id}`,
      id,
      album_id: albumId,
      nome: 'Geral',
      ordem: 0,
      created: new Date().toISOString(),
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/albuns/:id/capa — Set cover photo
router.put('/:id/capa', async (req, res) => {
  try {
    const { foto_id } = req.body;
    if (!foto_id) return res.status(400).json({ success: false, message: 'foto_id é obrigatório' });

    const found = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${req.params.id}` },
    }));
    if (!found.Items || found.Items.length === 0) return res.status(404).json({ success: false, message: 'Álbum não encontrado' });
    const album = found.Items[0];

    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: album.PK, SK: album.SK },
      UpdateExpression: 'SET capa_foto_id = :fid',
      ExpressionAttributeValues: { ':fid': foto_id },
      ReturnValues: 'ALL_NEW',
    }));

    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/albuns/:id/fotos/batch — Batch delete photos
router.delete('/:id/fotos/batch', async (req, res) => {
  try {
    const { foto_ids } = req.body;
    const albumId = req.params.id;

    if (!Array.isArray(foto_ids) || foto_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'foto_ids é obrigatório (array de IDs)' });
    }

    let deleted = 0;
    for (const fotoId of foto_ids) {
      // Get photo record
      const fotoResult = await dynamo.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `ALBUM#${albumId}`, SK: `FOTO#${fotoId}` },
      }));

      if (fotoResult.Item) {
        // Soft-delete: mark as deleted
        await dynamo.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: `ALBUM#${albumId}`, SK: `FOTO#${fotoId}` },
          UpdateExpression: 'SET deleted = :d, deleted_at = :t',
          ExpressionAttributeValues: { ':d': true, ':t': new Date().toISOString() },
        }));

        // Hard delete from DDB
        await dynamo.send(new DeleteCommand({
          TableName: TABLE,
          Key: { PK: `ALBUM#${albumId}`, SK: `FOTO#${fotoId}` },
        }));
        deleted++;
      }
    }

    // Update album total_fotos
    const remaining = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${albumId}`, ':sk': 'FOTO#' },
      Select: 'COUNT',
    }));

    const albumResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${albumId}` },
    }));
    if (albumResult.Items?.length > 0) {
      const album = albumResult.Items[0];
      await dynamo.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: album.PK, SK: album.SK },
        UpdateExpression: 'SET total_fotos = :t',
        ExpressionAttributeValues: { ':t': remaining.Count || 0 },
      }));
    }

    res.json({ success: true, data: { deleted }, message: `${deleted} foto(s) excluída(s)` });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /:id/prorrogacoes — List extensions for album (ALB-11)
router.get('/:id/prorrogacoes', async (req, res) => {
  try {
    const prorrogacoes = await listarProrrogacoes(req.params.id);
    res.json({ success: true, data: prorrogacoes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /:id/prorrogacoes/:prorrogacaoId/aprovar — Approve extension (ALB-11)
router.post('/:id/prorrogacoes/:prorrogacaoId/aprovar', async (req, res) => {
  try {
    const result = await aprovarProrrogacao(req.params.prorrogacaoId, req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    const status = error.message.includes('não encontrad') ? 404 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
});

// POST /api/admin/albuns/:id/selecao/toggle — Toggle photo selection (admin)
router.post('/:id/selecao/toggle', async (req, res) => {
  try {
    const { foto_id } = req.body;
    if (!foto_id) return res.status(400).json({ success: false, message: 'foto_id é obrigatório' });

    const albumId = req.params.id;

    // Get photo
    const fotoResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `ALBUM#${albumId}`, SK: `FOTO#${foto_id}` },
    }));
    if (!fotoResult.Item) return res.status(404).json({ success: false, message: 'Foto não encontrada' });

    const foto = fotoResult.Item;
    const newState = !(foto.selecionada === true);

    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `ALBUM#${albumId}`, SK: `FOTO#${foto_id}` },
      UpdateExpression: 'SET selecionada = :s',
      ExpressionAttributeValues: { ':s': newState },
    }));

    res.json({ success: true, data: { foto_id, selecionada: newState } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/albuns/:id/selecao — Get selected photos with download URLs
router.get('/:id/selecao', async (req, res) => {
  try {
    const albumId = req.params.id;

    // Get all photos for this album
    const fotosResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${albumId}`, ':sk': 'FOTO#' },
    }));

    const fotos = (fotosResult.Items || []).filter(f => f.selecionada === true);

    // Generate signed URLs for selected photos (use original for download)
    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    const s3 = new S3Client({});
    const bucket = process.env.S3_BUCKET_NAME;

    const fotosComUrl = await Promise.all(fotos.map(async (foto) => {
      const key = foto.s3_key_original || foto.s3_key || foto.key;
      if (!key) return { ...foto, url_download: null };
      try {
        const url_download = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
        return { ...foto, url_download };
      } catch {
        return { ...foto, url_download: null };
      }
    }));

    res.json({
      success: true,
      data: {
        total_selecionadas: fotosComUrl.length,
        fotos: fotosComUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
