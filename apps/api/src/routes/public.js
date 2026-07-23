const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const emailService = require('../services/emailService');
const cloudfrontService = require('../services/cloudfrontService');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

// GET /public/portfolio/:photographerId - Fotos publicadas
router.get('/portfolio/:photographerId', async (req, res) => {
  try {
    const { photographerId } = req.params;
    logger.info({ action: 'public_portfolio', photographerId });

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'ALBUM#'
      }
    }));

    const albumsPublicos = (result.Items || []).filter(a => a.publico === true || a.status === 'publicado');

    // Gerar URLs assinadas do CloudFront para as capas
    const albums = await Promise.all(albumsPublicos.map(async (album) => {
      let capaUrl = null;
      if (album.capaKey) {
        capaUrl = await cloudfrontService.generateSignedUrl(album.capaKey, 7200);
      }
      return {
        id: album.id,
        titulo: album.titulo || album.nome,
        descricao: album.descricao || '',
        tipo: album.tipo || '',
        capaUrl,
        criadoEm: album.criadoEm
      };
    }));

    res.json({ success: true, data: albums });
  } catch (error) {
    logger.error({ action: 'public_portfolio_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao buscar portfólio' });
  }
});

// GET /public/pacotes/:photographerId - Pacotes ativos do catálogo
router.get('/pacotes/:photographerId', async (req, res) => {
  try {
    const { photographerId } = req.params;
    logger.info({ action: 'public_pacotes', photographerId });

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'CATALOGO#'
      }
    }));

    const pacotesAtivos = (result.Items || [])
      .filter(p => p.ativo === true)
      .map(p => ({
        id: p.id,
        nome: p.nome,
        descricao: p.descricao || '',
        tipo: p.tipo || '',
        preco: p.preco,
        quantidadeFotos: p.quantidadeFotos || 0,
        duracaoHoras: p.duracaoHoras || 0,
        itensInclusos: p.itensInclusos || []
      }))
      .sort((a, b) => a.preco - b.preco);

    res.json({ success: true, data: pacotesAtivos });
  } catch (error) {
    logger.error({ action: 'public_pacotes_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao buscar pacotes' });
  }
});

// GET /public/depoimentos/:photographerId - Feedbacks autorizados
router.get('/depoimentos/:photographerId', async (req, res) => {
  try {
    const { photographerId } = req.params;
    logger.info({ action: 'public_depoimentos', photographerId });

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'FEEDBACK#'
      }
    }));

    const depoimentos = (result.Items || [])
      .filter(f => f.autorizado === true && f.nota && f.comentario)
      .map(f => ({
        clienteNome: f.clienteNome,
        nota: f.nota,
        comentario: f.comentario,
        respondidoEm: f.respondidoEm
      }))
      .sort((a, b) => (b.respondidoEm || '').localeCompare(a.respondidoEm || ''));

    const mediaNota = depoimentos.length > 0
      ? parseFloat((depoimentos.reduce((sum, d) => sum + d.nota, 0) / depoimentos.length).toFixed(1))
      : null;

    res.json({ success: true, data: { mediaNota, total: depoimentos.length, depoimentos } });
  } catch (error) {
    logger.error({ action: 'public_depoimentos_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao buscar depoimentos' });
  }
});

// GET /public/perfil/:photographerId - Dados públicos do fotógrafo
router.get('/perfil/:photographerId', async (req, res) => {
  try {
    const { photographerId } = req.params;
    logger.info({ action: 'public_perfil', photographerId });

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'PROFILE#'
      }
    }));

    const profile = result.Items && result.Items[0];
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Fotógrafo não encontrado' });
    }

    res.json({
      success: true,
      data: {
        nome: profile.nome || profile.nomeEstudio || '',
        bio: profile.bio || '',
        especialidades: profile.especialidades || [],
        cidade: profile.cidade || '',
        estado: profile.estado || '',
        instagram: profile.instagram || '',
        whatsapp: profile.whatsapp || '',
        logoUrl: profile.logoUrl || null,
        logoDarkUrl: profile.logoDarkUrl || null
      }
    });
  } catch (error) {
    logger.error({ action: 'public_perfil_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao buscar perfil' });
  }
});

// POST /public/contato - Formulário de contato
router.post('/contato', async (req, res) => {
  try {
    const { photographerId, nome, email, telefone, mensagem, pacoteInteresse } = req.body;

    if (!photographerId || !nome || !email || !mensagem) {
      return res.status(400).json({ success: false, error: 'photographerId, nome, email e mensagem são obrigatórios' });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Email inválido' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    // Salvar lead no DynamoDB
    const item = {
      PK: `PHOTOGRAPHER#${photographerId}`,
      SK: `LEAD#${id}`,
      GSI1PK: `PHOTOGRAPHER#${photographerId}`,
      GSI1SK: `LEAD#${now}`,
      id,
      photographerId,
      nome,
      email,
      telefone: telefone || '',
      mensagem,
      pacoteInteresse: pacoteInteresse || '',
      status: 'novo',
      origem: 'site',
      criadoEm: now
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    // Enviar email de notificação ao fotógrafo
    try {
      // Buscar email do fotógrafo
      const profileResult = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `PHOTOGRAPHER#${photographerId}`,
          ':sk': 'PROFILE#'
        }
      }));

      const profile = profileResult.Items && profileResult.Items[0];
      if (profile && profile.email) {
        await emailService.sendEmail({
          to: profile.email,
          subject: `Novo contato via site: ${nome}`,
          html: `<h3>Novo lead do site</h3><p><strong>Nome:</strong> ${nome}</p><p><strong>Email:</strong> ${email}</p><p><strong>Telefone:</strong> ${telefone || 'Não informado'}</p><p><strong>Mensagem:</strong> ${mensagem}</p>${pacoteInteresse ? `<p><strong>Pacote de interesse:</strong> ${pacoteInteresse}</p>` : ''}`
        });
      }
    } catch (emailError) {
      logger.warn({ action: 'public_contato_email_error', error: emailError.message });
    }

    logger.info({ action: 'public_contato', photographerId, leadId: id });
    res.status(201).json({ success: true, data: { message: 'Mensagem enviada com sucesso!' } });
  } catch (error) {
    logger.error({ action: 'public_contato_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao enviar mensagem' });
  }
});

// GET /public/portfolio — Categorias visíveis com fotos prontas (portfolio público)
router.get('/portfolio', async (req, res) => {
  try {
    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    const s3 = new S3Client({});
    const BUCKET = process.env.S3_BUCKET_NAME || 'mbf-backend-v3-fotos';

    // Fetch all visible categories
    const catResult = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': 'TENANT#1',
        ':sk': 'CATPORTFOLIO#',
      },
    }));

    const categorias = (catResult.Items || [])
      .filter(cat => cat.visivel !== false)
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    // Fetch photos for each visible category
    const categoriasComFotos = await Promise.all(
      categorias.map(async (cat) => {
        const fotosResult = await docClient.send(new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': 'TENANT#1',
            ':sk': `FOTOPORT#${cat.id}#`,
          },
        }));

        const fotosRaw = (fotosResult.Items || [])
          .filter(f => f.status === 'ativo' || f.status === 'processando')
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

        // Generate presigned URLs for each photo
        // Prefer web/thumb versions (lighter), fallback to original if they don't exist
        const fotos = await Promise.all(fotosRaw.map(async (f) => {
          let url = null;
          let url_full = null;
          try {
            // Check if web version exists
            const webKey = f.s3_key_web;
            const thumbKey = f.s3_key_thumb;
            if (webKey) {
              try {
                await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: webKey, Range: 'bytes=0-0' }));
                url_full = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: webKey }), { expiresIn: 3600 });
              } catch {
                url_full = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: f.s3_key }), { expiresIn: 3600 });
              }
            } else {
              url_full = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: f.s3_key }), { expiresIn: 3600 });
            }
            if (thumbKey) {
              try {
                await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: thumbKey, Range: 'bytes=0-0' }));
                url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: thumbKey }), { expiresIn: 3600 });
              } catch {
                url = url_full;
              }
            } else {
              url = url_full;
            }
          } catch {
            try {
              url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: f.s3_key }), { expiresIn: 3600 });
              url_full = url;
            } catch {}
          }
          return {
            id: f.id,
            titulo: f.titulo || '',
            descricao: f.descricao || '',
            ordem: f.ordem || 0,
            categoria: cat.nome,
            url,
            thumb_url: url,
            url_full,
          };
        }));

        return {
          id: cat.id,
          nome: cat.nome,
          texto: cat.texto || '',
          ordem: cat.ordem || 0,
          fotos,
        };
      })
    );

    // Flatten for the frontend format
    const allFotos = categoriasComFotos.flatMap(c => c.fotos);

    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, data: { categorias: categoriasComFotos, fotos: allFotos } });
  } catch (error) {
    logger.error({ action: 'public_portfolio_categorias_error', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao buscar portfólio' });
  }
});

module.exports = router;
