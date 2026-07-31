// ══════════════════════════════════════════════════════════════
// PUBLIC ALBUM ROUTE — Acesso público via slug (sem auth)
// Retorna álbum com galerias e fotos agrupadas
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { getSignedDownloadUrl } = require('../services/s3Service');
const { ALBUM_STATUS } = require('../config/constants');

const router = Router({ mergeParams: true });

async function assinarFoto(foto) {
  const key = foto.s3_key_media || foto.s3_key || '';
  const thumbKey = foto.s3_key_thumb || '';
  const originalKey = foto.s3_key_original || foto.s3_key || '';
  return {
    id: foto.id,
    album_id: foto.album_id,
    galeria_id: foto.galeria_id,
    titulo: foto.titulo || null,
    ordem: foto.ordem || 0,
    filename: foto.filename || foto.original_filename || null,
    width: foto.width || null,
    height: foto.height || null,
    content_type: foto.content_type || null,
    selecionada: foto.selecionada || false,
    url: key ? await getSignedDownloadUrl(key, 86400) : null,
    url_thumb: thumbKey ? await getSignedDownloadUrl(thumbKey, 86400) : (key ? await getSignedDownloadUrl(key, 86400) : null),
    url_original: originalKey ? await getSignedDownloadUrl(originalKey, 86400) : null,
  };
}

// GET /public/album/:slug — Album landing page data (cover, title, date, gallery count)
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

    // Só retorna se álbum está publicado
    if (album.status !== ALBUM_STATUS.ATIVO && album.status !== 'publicado') {
      return res.status(404).json({ success: false, message: 'Álbum não disponível' });
    }

    // Verificar senha
    if (album.senha_acesso) {
      const { senha } = req.query;
      if (!senha || senha !== album.senha_acesso) {
        return res.json({
          success: true,
          data: { id: album.id, titulo: album.titulo, slug: album.slug, requer_senha: true },
        });
      }
    }

    // Buscar galerias
    const galeriasResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${album.id}`, ':sk': 'GALERIA#' },
    }));
    const galerias = (galeriasResult.Items || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    // Buscar todas as fotos do álbum
    const fotosResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${album.id}`, ':sk': 'FOTO#' },
    }));
    const todasFotos = (fotosResult.Items || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    // Buscar tema
    const temaResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `ALBUM#${album.id}`, SK: 'TEMA' },
    }));
    const tema = temaResult.Item || {};
    const { PK: _pk, SK: _sk, ...temaClean } = tema;

    // Foto de capa do álbum
    let capaFoto = null;
    const capaId = album.capa_foto_id || temaClean.capa_foto_id;
    if (capaId) {
      capaFoto = todasFotos.find(f => f.id === capaId);
    }
    if (!capaFoto && todasFotos.length > 0) {
      capaFoto = todasFotos[0];
    }

    // Assinar URL da capa — usar original (alta resolução) para não distorcer
    let capa_url = null;
    if (capaFoto) {
      const originalKey = capaFoto.s3_key_original || capaFoto.s3_key || capaFoto.s3_key_media || '';
      capa_url = originalKey ? await getSignedDownloadUrl(originalKey, 86400) : null;
    }

    // Para cada galeria, pegar primeira foto como thumbnail
    const galeriasComCapa = await Promise.all(galerias.map(async (g) => {
      const fotosGaleria = todasFotos.filter(f => f.galeria_id === g.id);
      let thumbnail_url = null;
      if (fotosGaleria.length > 0) {
        // Usar capa_foto_id da galeria se existir, senão primeira foto
        const capaGaleria = g.capa_foto_id
          ? fotosGaleria.find(f => f.id === g.capa_foto_id) || fotosGaleria[0]
          : fotosGaleria[0];
        const signed = await assinarFoto(capaGaleria);
        thumbnail_url = signed.url_thumb || signed.url;
      }
      return {
        id: g.id,
        nome: g.nome,
        ordem: g.ordem,
        total_fotos: fotosGaleria.length,
        thumbnail_url,
      };
    }));

    // Filtrar galerias vazias (sem fotos)
    const galeriasAtivas = galeriasComCapa.filter(g => g.total_fotos > 0);

    res.json({
      success: true,
      data: {
        id: album.id,
        titulo: album.titulo,
        slug: album.slug,
        data_evento: album.data_evento || album.created?.split('T')[0] || null,
        tipo: album.tipo || null,
        capa_url,
        total_fotos: todasFotos.length,
        total_galerias: galeriasAtivas.length,
        galerias: galeriasAtivas,
        permite_download: album.permite_download || false,
        permite_selecao: album.permite_selecao || false,
        permite_comentarios: album.permite_comentarios || false,
        cota_selecao: album.cota_selecao || null,
        tema: temaClean,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /public/album/:slug/galeria/:galeriaId — Fotos de uma galeria específica
router.get('/galeria/:galeriaId', async (req, res) => {
  try {
    const { slug, galeriaId } = req.params;

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
    if (album.status !== ALBUM_STATUS.ATIVO && album.status !== 'publicado') {
      return res.status(404).json({ success: false, message: 'Álbum não disponível' });
    }

    // Verificar senha
    if (album.senha_acesso) {
      const { senha } = req.query;
      if (!senha || senha !== album.senha_acesso) {
        return res.status(401).json({ success: false, message: 'Senha necessária' });
      }
    }

    // Buscar galeria
    const galeriaResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `ALBUM#${album.id}`, SK: `GALERIA#${galeriaId}` },
    }));

    if (!galeriaResult.Item) {
      return res.status(404).json({ success: false, message: 'Galeria não encontrada' });
    }

    const galeria = galeriaResult.Item;

    // Buscar fotos da galeria
    const fotosResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'galeria_id = :gid',
      ExpressionAttributeValues: { ':pk': `ALBUM#${album.id}`, ':sk': 'FOTO#', ':gid': galeriaId },
    }));

    const fotos = (fotosResult.Items || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    const fotosAssinadas = await Promise.all(fotos.map(assinarFoto));

    // Buscar tema do álbum
    let tema = {};
    try {
      const temaResult = await dynamo.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `ALBUM#${album.id}`, SK: 'TEMA' },
      }));
      if (temaResult.Item) {
        const { PK, SK, ...temaData } = temaResult.Item;
        tema = temaData;
      }
    } catch {}

    res.json({
      success: true,
      data: {
        album_id: album.id,
        album_titulo: album.titulo,
        album_slug: album.slug,
        galeria: {
          id: galeria.id,
          nome: galeria.nome,
          ordem: galeria.ordem,
        },
        fotos: fotosAssinadas,
        tema,
        permite_download: album.permite_download || false,
        permite_selecao: album.permite_selecao || false,
        permite_comentarios: album.permite_comentarios || false,
        cota_selecao: album.cota_selecao || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /public/album/:slug/fotos — Todas as fotos do álbum (quando é galeria única)
router.get('/fotos', async (req, res) => {
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
    if (album.status !== ALBUM_STATUS.ATIVO && album.status !== 'publicado') {
      return res.status(404).json({ success: false, message: 'Álbum não disponível' });
    }

    // Verificar senha
    if (album.senha_acesso) {
      const { senha } = req.query;
      if (!senha || senha !== album.senha_acesso) {
        return res.status(401).json({ success: false, message: 'Senha necessária' });
      }
    }

    // Buscar todas as fotos
    const fotosResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${album.id}`, ':sk': 'FOTO#' },
    }));

    const fotos = (fotosResult.Items || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    const fotosAssinadas = await Promise.all(fotos.map(assinarFoto));

    // Buscar tema do álbum
    let tema = {};
    try {
      const temaResult = await dynamo.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `ALBUM#${album.id}`, SK: 'TEMA' },
      }));
      if (temaResult.Item) {
        const { PK, SK, ...temaData } = temaResult.Item;
        tema = temaData;
      }
    } catch {}

    res.json({
      success: true,
      data: {
        album_id: album.id,
        album_titulo: album.titulo,
        album_slug: album.slug,
        fotos: fotosAssinadas,
        tema,
        permite_download: album.permite_download || false,
        permite_selecao: album.permite_selecao || false,
        permite_comentarios: album.permite_comentarios || false,
        cota_selecao: album.cota_selecao || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
