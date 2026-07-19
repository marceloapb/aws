const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { generateUploadUrl } = require('../services/mediaUploadService');
const { deleteMedia } = require('../services/mediaService');
const { getPresignedReadUrl } = require('../services/mediaUrlService');

const router = Router();

// POST /api/admin/fotos/upload-url — Gera presigned URL para upload direto ao S3
router.post('/upload-url', async (req, res) => {
  try {
    const { albumId, contentType, filename } = req.body;
    if (!albumId || !contentType) return res.status(400).json({ success: false, message: 'albumId e contentType são obrigatórios' });

    const tenant_id = req.tenantId || '1';
    const ext = contentType.split('/')[1] || 'jpg';
    const name = filename || `foto.${ext}`;

    const result = await generateUploadUrl({
      tenant_id,
      contexto: 'album',
      entidade_id: albumId,
      filename: name,
      content_type: contentType,
      size_bytes: 50 * 1024 * 1024, // max 50MB
    });

    res.json({ success: true, data: { uploadUrl: result.upload_url, key: result.key, fotoId: result.media_id } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/fotos/confirmar — Confirma upload e cria registro
router.post('/confirmar', async (req, res) => {
  try {
    const { albumId, fotoId, key, contentType } = req.body;
    if (!albumId || !fotoId || !key) return res.status(400).json({ success: false, message: 'albumId, fotoId e key são obrigatórios' });

    const tenant_id = req.tenantId || '1';
    const id = fotoId;
    const now = new Date().toISOString();

    // Contar fotos existentes para definir ordem
    const countResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${albumId}`, ':sk': 'FOTO#' },
      Select: 'COUNT',
    }));
    const ordem = countResult.Count || 0;

    // Criar registro da foto
    const item = {
      PK: `ALBUM#${albumId}`,
      SK: `FOTO#${id}`,
      GSI1PK: 'FOTO',
      GSI1SK: `FOTO#${id}`,
      id,
      album_id: albumId,
      tenant_id,
      s3_key: key,
      s3_key_original: key,
      s3_key_thumb: null,
      s3_key_media: null,
      content_type: contentType || 'image/jpeg',
      status_processamento: 'pendente',
      ordem,
      created: now,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    // Atualizar contagem do álbum
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
        ExpressionAttributeValues: { ':t': (ordem + 1) },
      }));
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/fotos/view-url — Gera URL assinada para visualização
router.post('/view-url', async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ success: false, message: 'key é obrigatório' });

    const bucket = process.env.S3_BUCKET_NAME;
    const url = await getPresignedReadUrl(key, bucket, 3600);
    res.json({ success: true, data: { url } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/fotos/:id
router.delete('/:id', async (req, res) => {
  try {
    const found = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'FOTO', ':sk': `FOTO#${req.params.id}` },
    }));
    if (!found.Items || found.Items.length === 0) return res.status(404).json({ success: false, message: 'Foto não encontrada' });
    const foto = found.Items[0];

    // Soft-delete no serviço de mídia (se tiver media_id)
    if (foto.media_id) {
      try { await deleteMedia(foto.media_id, 'album', foto.album_id); } catch {}
    }

    // Deletar registro do DynamoDB
    await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: foto.PK, SK: foto.SK } }));

    // Atualizar contagem do álbum
    const albumResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${foto.album_id}` },
    }));
    if (albumResult.Items?.length > 0) {
      const album = albumResult.Items[0];
      const totalResult = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `ALBUM#${foto.album_id}`, ':sk': 'FOTO#' },
        Select: 'COUNT',
      }));
      await dynamo.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: album.PK, SK: album.SK },
        UpdateExpression: 'SET total_fotos = :t',
        ExpressionAttributeValues: { ':t': totalResult.Count || 0 },
      }));
    }

    res.json({ success: true, message: 'Foto excluída' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/fotos/reordenar
router.put('/reordenar', async (req, res) => {
  try {
    const { fotos } = req.body;
    for (const item of fotos) {
      const found = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
        ExpressionAttributeValues: { ':pk': 'FOTO', ':sk': `FOTO#${item.id}` },
      }));
      if (found.Items?.length > 0) {
        const foto = found.Items[0];
        await dynamo.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: foto.PK, SK: foto.SK },
          UpdateExpression: 'SET ordem = :o',
          ExpressionAttributeValues: { ':o': item.ordem },
        }));
      }
    }
    res.json({ success: true, message: 'Fotos reordenadas' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
