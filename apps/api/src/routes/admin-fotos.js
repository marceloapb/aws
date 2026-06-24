import { Router } from 'express';
import { dynamo, TABLE } from '../config/dynamodb.js';
import { QueryCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { deleteFoto, generateUploadUrl } from '../services/s3Service.js';

const router = Router();
const TENANT = process.env.TENANT_ID || 'default';

async function getAlbumPK(albumId) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${albumId}` },
  }));
  return result.Items?.[0] || null;
}

// POST /api/admin/fotos/upload-url — Gera presigned URL para upload direto ao S3
router.post('/upload-url', async (req, res) => {
  try {
    const { albumId, contentType } = req.body;
    if (!albumId || !contentType) return res.status(400).json({ success: false, message: 'albumId e contentType são obrigatórios' });
    const tenantId = req.tenantId || TENANT;
    const result = await generateUploadUrl(tenantId, albumId, contentType);
    res.json({ success: true, data: result });
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

    await deleteFoto(foto.s3_key);
    await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: foto.PK, SK: foto.SK } }));

    const album = await getAlbumPK(foto.album_id);
    if (album) {
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

export default router;
