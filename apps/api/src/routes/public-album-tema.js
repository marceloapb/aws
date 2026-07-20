// ══════════════════════════════════════════════════════════════
// SPEC G3: GET Tema Álbum Público (sem auth)
// Mounted at /public/album/:slug/tema
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { ALBUM_STATUS } = require('../config/constants');

const router = Router({ mergeParams: true });

const DEFAULTS = {
  capa_foto_id: null,
  capa_modo: 'cover',
  cores: { fundo: '#FFFFFF', texto: '#1A1A1A', acento: '#EA580C' },
  layout: 'grade',
  fonte_titulo: 'Inter',
  fonte_corpo: 'Inter',
  animacao: 'none',
  logo_posicao: 'top-left',
};

// GET /public/album/:slug/tema — leitura pública, só se álbum publicado
router.get('/', async (req, res) => {
  try {
    const { slug } = req.params;

    // Buscar álbum pelo slug
    const albumResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'slug = :slug',
      ExpressionAttributeValues: { ':pk': 'ALBUM', ':slug': slug },
    }));

    if (!albumResult.Items || albumResult.Items.length === 0) {
      return res.status(404).json({ success: false, message: 'Álbum não encontrado' });
    }

    const album = albumResult.Items[0];

    // Só retorna tema se álbum está publicado (ativo)
    if (album.status !== ALBUM_STATUS.ATIVO && album.status !== 'publicado') {
      return res.status(404).json({ success: false, message: 'Álbum não disponível' });
    }

    // Buscar tema
    const temaResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `ALBUM#${album.id}`, SK: 'TEMA' },
    }));

    if (!temaResult.Item) {
      return res.json({ success: true, data: { ...DEFAULTS, album_id: album.id } });
    }

    // Retornar só campos visuais (sem PK/SK/metadata)
    const { PK, SK, ...tema } = temaResult.Item;
    res.json({ success: true, data: tema });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
