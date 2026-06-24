import { Router } from 'express';
import multer from 'multer';
import { dynamo, TABLE } from '../config/dynamodb.js';
import { QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { uploadFoto, deleteFoto } from '../services/s3Service.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

async function getAlbumPK(albumId) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${albumId}` },
  }));
  return result.Items?.[0] || null;
}

// POST /api/admin/fotos/upload
router.post('/upload', upload.array('fotos', 50), async (req, res) => {
  try {
    const { album_id } = req.body;
    if (!album_id) return res.status(400).json({ success: false, message: 'album_id é obrigatório' });

    const album = await getAlbumPK(album_id);
    if (!album) return res.status(404).json({ success: false, message: 'Álbum não encontrado' });

    const fotosExist = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${album_id}`, ':sk': 'FOTO#' },
    }));
    let ordem = (fotosExist.Items || []).reduce((max, f) => Math.max(max, f.ordem || 0), 0) + 1;

    const resultados = [];
    for (const file of req.files) {
      const key = `albuns/${album_id}/${Date.now()}-${file.originalname}`;
      const s3Result = await uploadFoto(file.buffer, key, file.mimetype);
      const id = crypto.randomUUID();
      const foto = {
        id, album_id,
        PK: `ALBUM#${album_id}`, SK: `FOTO#${id}`,
        GSI1PK: 'FOTO', GSI1SK: `FOTO#${id}`,
        nome_arquivo: file.originalname,
        s3_key: s3Result.s3_key, s3_key_thumb: s3Result.s3_key_thumb,
        url: s3Result.url, url_thumb: s3Result.url_thumb,
        largura: s3Result.largura, altura: s3Result.altura,
        tamanho_bytes: s3Result.tamanho_bytes, mime_type: file.mimetype,
        ordem: ordem++,
        created: new Date().toISOString(),
      };
      await dynamo.send(new PutCommand({ TableName: TABLE, Item: foto }));
      resultados.push(foto);
    }

    // Atualizar total_fotos no álbum
    const totalResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${album_id}`, ':sk': 'FOTO#' },
      Select: 'COUNT',
    }));
    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: album.PK, SK: album.SK },
      UpdateExpression: 'SET total_fotos = :t',
      ExpressionAttributeValues: { ':t': totalResult.Count || resultados.length },
    }));

    res.status(201).json({ success: true, data: resultados, total: resultados.length });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/fotos/:id
router.delete('/:id', async (req, res) => {
  try {
    // Busca a foto via GSI1
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

    // Atualizar total_fotos
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
    const { fotos } = req.body; // [{ id, ordem }]
    for (const item of fotos) {
      const found = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
        ExpressionAttributeValues: { ':pk': 'FOTO', ':sk': `FOTO#${item.id}` },
      }));
      if (found.Items && found.Items.length > 0) {
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
