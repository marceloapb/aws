const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./config/logger');
const errorHandler = require('./middlewares/errorHandler');
const adminAuth = require('./middlewares/adminAuth');
const clientAuth = require('./middlewares/clientAuth');

// Rotas Admin
const adminAgendaRoutes = require('./routes/admin-agenda');
const adminAlbunsRoutes = require('./routes/admin-albuns');
const adminClientesRoutes = require('./routes/admin-clientes');
const adminCobrancasRoutes = require('./routes/admin-cobrancas');
const adminConfiguracoesRoutes = require('./routes/admin-configuracoes');
const adminContratosRoutes = require('./routes/admin-contratos');
const adminEquipamentosRoutes = require('./routes/admin-equipamentos');
const adminFotografosRoutes = require('./routes/admin-fotografos');
const adminFotosRoutes = require('./routes/admin-fotos');
const adminGoogleCalendarRoutes = require('./routes/admin-google-calendar');
const adminInstagramRoutes = require('./routes/admin-instagram');
const adminOrcamentosRoutes = require('./routes/admin-orcamentos');
const adminPendenciasRoutes = require('./routes/admin-pendencias');
const adminWhatsappRoutes = require('./routes/admin-whatsapp');
const adminCatalogoRoutes = require('./routes/admin-catalogo');
const adminImportRoutes = require('./routes/admin-import');
const adminFeedbackRoutes = require('./routes/admin-feedback');
const adminAditivosRoutes = require('./routes/admin-aditivos');
const adminNotasFiscaisRoutes = require('./routes/admin-notas-fiscais');
const adminFinanceiroRoutes = require('./routes/admin-financeiro');
const adminFollowupRoutes = require('./routes/admin-followup');
const adminIntegracoesRoutes = require('./routes/admin-integracoes');
const adminNotificacoesRoutes = require('./routes/admin-notificacoes');
const adminNovidadesRoutes = require('./routes/admin-novidades');
const adminSiteRoutes = require('./routes/admin-site');
const adminMediaRoutes = require('./routes/admin-media');
const adminGaleriasRoutes = require('./routes/admin-galerias');
const adminAlbumComentariosRoutes = require('./routes/admin-album-comentarios');
const adminAlbumStatsRoutes = require('./routes/admin-album-stats');
const adminAlbumConfigRoutes = require('./routes/admin-album-config');
const adminAlbumTemaRoutes = require('./routes/admin-album-tema');
const adminFotoMetaRoutes = require('./routes/admin-foto-meta');

// Rotas Client
const clientAuthRoutes = require('./routes/client-auth');
const clientAlbunsRoutes = require('./routes/client-albuns');
const clientContratosRoutes = require('./routes/client-contratos');
const clientOrcamentosRoutes = require('./routes/client-orcamentos');
const clientPagamentosRoutes = require('./routes/client-pagamentos');
const clientFeedbackRoutes = require('./routes/client-feedback');
const clientAditivosRoutes = require('./routes/client-aditivos');
const clientPortalRoutes = require('./routes/client-portal');
const clientMediaRoutes = require('./routes/client-media');
const clientSelecaoRoutes = require('./routes/client-selecao');
const clientDownloadRoutes = require('./routes/client-download');
const clientComentariosRoutes = require('./routes/client-comentarios');
const clientTrackingRoutes = require('./routes/client-tracking');
const clientProrrogacaoRoutes = require('./routes/client-prorrogacao');
const clientExtensaoRoutes = require('./routes/client-extensao');
const clientOnboardingRoutes = require('./routes/client-onboarding');

// Rotas Públicas (sem auth)
const publicRoutes = require('./routes/public');
const publicNovidadesRoutes = require('./routes/public-novidades');
const publicSiteRoutes = require('./routes/public-site');
const publicAlbumTemaRoutes = require('./routes/public-album-tema');

// Rotas Webhook
const webhooksRoutes = require('./routes/webhooks');

const app = express();

// Middlewares globais
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// CORS preflight - responder OPTIONS antes de qualquer auth
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,X-Amz-Date,X-Api-Key');
  res.header('Access-Control-Max-Age', '86400');
  res.status(204).send();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Registrar rotas Admin (protegidas por adminAuth)
app.use('/admin/agenda', adminAuth, adminAgendaRoutes);
app.use('/admin/albuns/:albumId/galerias', adminAuth, adminGaleriasRoutes);
app.use('/admin/albuns/:albumId/comentarios', adminAuth, adminAlbumComentariosRoutes);
app.use('/admin/albuns/:albumId/estatisticas', adminAuth, adminAlbumStatsRoutes);
app.use('/admin/albuns/:albumId/tema', adminAuth, adminAlbumTemaRoutes);
app.use('/admin/album/config', adminAuth, adminAlbumConfigRoutes);
app.use('/admin/album/galeria/:galeriaId/foto/:fotoId', adminAuth, adminFotoMetaRoutes);
app.use('/admin/albuns', adminAuth, adminAlbunsRoutes);
app.use('/admin/clientes', adminAuth, adminClientesRoutes);
app.use('/admin/cobrancas', adminAuth, adminCobrancasRoutes);
app.use('/admin/configuracoes', adminAuth, adminConfiguracoesRoutes);
app.use('/admin/contratos', adminAuth, adminContratosRoutes);
app.use('/admin/equipamentos', adminAuth, adminEquipamentosRoutes);
app.use('/admin/fotografos', adminAuth, adminFotografosRoutes);
app.use('/admin/fotos', adminAuth, adminFotosRoutes);
app.use('/admin/google-calendar', adminAuth, adminGoogleCalendarRoutes);
app.use('/admin/instagram', adminAuth, adminInstagramRoutes);
app.use('/admin/integracoes', adminAuth, adminIntegracoesRoutes);
app.use('/admin/orcamentos', adminAuth, adminOrcamentosRoutes);
app.use('/admin/pendencias', adminAuth, adminPendenciasRoutes);
app.use('/admin/whatsapp', adminAuth, adminWhatsappRoutes);
app.use('/admin/catalogo', adminAuth, adminCatalogoRoutes);
app.use('/admin/import', adminAuth, adminImportRoutes);
app.use('/admin/feedback', adminAuth, adminFeedbackRoutes);
app.use('/admin/aditivos', adminAuth, adminAditivosRoutes);
app.use('/admin/notas-fiscais', adminAuth, adminNotasFiscaisRoutes);
app.use('/admin/nfse', adminAuth, require('./routes/admin-nfse'));
app.use('/admin/financeiro', adminAuth, adminFinanceiroRoutes);
app.use('/admin/followup', adminAuth, adminFollowupRoutes);
app.use('/admin/notificacoes', adminAuth, adminNotificacoesRoutes);
app.use('/admin/novidades', adminAuth, adminNovidadesRoutes);
app.use('/admin/site', adminAuth, adminSiteRoutes);
app.use('/admin/media', adminAuth, adminMediaRoutes);

// Registrar rotas Client (protegidas por clientAuth)
app.use('/client/auth', clientAuthRoutes);
app.use('/client/albuns/prorrogacao', clientAuth, clientProrrogacaoRoutes);
app.use('/client/album/:albumId/extensao', clientAuth, clientExtensaoRoutes);
app.use('/client/albuns', clientAuth, clientAlbunsRoutes);
app.use('/client/albuns/:slug/selecao', clientAuth, clientSelecaoRoutes);
app.use('/client/albuns/:slug/download', clientAuth, clientDownloadRoutes);
app.use('/client/albuns/:slug/comentarios', clientAuth, clientComentariosRoutes);
app.use('/client/albuns/:slug/track', clientAuth, clientTrackingRoutes);
app.use('/client/contratos', clientAuth, clientContratosRoutes);
app.use('/client/orcamentos', clientAuth, clientOrcamentosRoutes);
app.use('/client/pagamentos', clientAuth, clientPagamentosRoutes);

// Rotas Client públicas (acesso via token, sem auth)
app.use('/client/feedback', clientFeedbackRoutes);
app.use('/client/aditivos', clientAditivosRoutes);

// Rotas Client Portal (consolidadas, com auth)
app.use('/client/portal', clientAuth, clientPortalRoutes);
app.use('/client/media', clientAuth, clientMediaRoutes);
app.use('/client/onboarding', clientAuth, clientOnboardingRoutes);

// Rotas Públicas (site institucional, sem auth)
app.use('/public/album/:slug/tema', publicAlbumTemaRoutes);
app.use('/public', publicRoutes);
app.use('/public/novidades', publicNovidadesRoutes);
app.use('/public/site', publicSiteRoutes);

// Auth pública (login/signup - sem auth)
app.use('/auth', clientAuthRoutes);

// Notificações in-app (admin) — MIGRADO para routes/admin-notificacoes.js

// Google Maps (MAP-01 a MAP-08)
app.post('/admin/maps/geocode', adminAuth, async (req, res) => {
  try {
    const { geocode } = require('./services/mapsService');
    const { endereco, cep } = req.body;
    const result = await geocode(endereco, cep);
    res.json({ success: true, data: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.post('/admin/maps/distance', adminAuth, async (req, res) => {
  try {
    const { distanceMatrix } = require('./services/mapsService');
    const { origem_lat, origem_lng, destino_lat, destino_lng } = req.body;
    const result = await distanceMatrix(origem_lat, origem_lng, destino_lat, destino_lng);
    res.json({ success: true, data: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// MAP-08: Controle de Custo Google Maps
app.put('/admin/maps/config', adminAuth, async (req, res) => {
  const { salvarApiKey } = require('./services/mapsConfigService');
  return salvarApiKey(req, res);
});

app.get('/admin/maps/status', adminAuth, async (req, res) => {
  const { getStatus } = require('./services/mapsConfigService');
  return getStatus(req, res);
});

// DSH-07: Badges (contagem de pendências para o menu)
app.get('/admin/dashboard/badges', adminAuth, async (req, res) => {
  try {
    const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    const tenantId = req.user.sub;
    const TABLE = process.env.TABLE_NAME;

    const [orcResult, ctResult, finResult, notifResult] = await Promise.all([
      // Orçamentos pendentes (enviados, aguardando resposta)
      ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        FilterExpression: '#s IN (:s1, :s2, :s3)',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':pk': `TENANT#${tenantId}`, ':sk': 'ORC#', ':s1': 'enviado', ':s2': 'rascunho', ':s3': 'pendente' },
        Select: 'COUNT',
      })).catch(() => ({ Count: 0 })),
      // Contratos aguardando aceite
      ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        FilterExpression: '#s IN (:s1, :s2)',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':pk': `TENANT#${tenantId}`, ':sk': 'CT#', ':s1': 'aguardando', ':s2': 'enviado' },
        Select: 'COUNT',
      })).catch(() => ({ Count: 0 })),
      // Cobranças atrasadas
      ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        FilterExpression: '#s = :s1',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':pk': `TENANT#${tenantId}`, ':sk': 'COBRANCA#', ':s1': 'atrasada' },
        Select: 'COUNT',
      })).catch(() => ({ Count: 0 })),
      // Notificações não lidas
      ddb.send(new QueryCommand({
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: 'lida = :false',
        ExpressionAttributeValues: { ':pk': `NOTIF#${tenantId}`, ':false': false },
        Select: 'COUNT',
      })).catch(() => ({ Count: 0 })),
    ]);

    res.json({
      success: true,
      data: {
        orcamentos: orcResult.Count || 0,
        contratos: ctResult.Count || 0,
        financeiro: finResult.Count || 0,
        notificacoes: notifResult.Count || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// NOTA: Status das integrações agora são servidos pelos routers dedicados:
// - GET /admin/instagram/status → admin-instagram.js
// - GET /admin/google-calendar/status → admin-google-calendar.js
// - GET /admin/whatsapp/config → admin-whatsapp.js

// IA - Gerar Caption Instagram (Bedrock)
app.post('/admin/instagram/gerar-caption', adminAuth, async (req, res) => {
  try {
    const { gerarCaption } = require('./services/aiService');
    const { tipo_evento, cliente_nome, tom, contexto, incluir_hashtags } = req.body;
    const caption = await gerarCaption({ tipo_evento, cliente_nome, tom, contexto, incluir_hashtags });
    res.json({ success: true, data: { caption } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backup trigger manual
app.post('/admin/backup/trigger', adminAuth, async (req, res) => {
  try {
    const { handler } = require('./jobs/backupJob');
    await handler();
    res.json({ success: true, message: 'Backup executado com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Limpar cache (SSM params)
app.post('/admin/system/clear-cache', adminAuth, async (req, res) => {
  try {
    const { clearParamsCache } = require('./config/env');
    clearParamsCache();
    res.json({ success: true, message: 'Cache limpo com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Presigned GET URL para exibir imagens (admin)
app.post('/admin/fotos/view-url', adminAuth, async (req, res) => {
  try {
    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    const s3 = new S3Client({});
    const { key } = req.body;
    if (!key) return res.status(400).json({ success: false, message: 'key é obrigatório' });
    const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    res.json({ success: true, data: { url } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Storage stats (admin)
app.get('/admin/storage/stats', adminAuth, async (req, res) => {
  try {
    const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({});
    const BUCKET = process.env.S3_BUCKET_NAME;
    const prefixes = ['fotos/', 'backups/', 'uploads/', 'processed/', 'contratos/'];
    const byPrefix = [];
    let totalBytes = 0, totalObjects = 0;

    for (const prefix of prefixes) {
      let bytes = 0, objects = 0, token = undefined;
      do {
        const resp = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token }));
        (resp.Contents || []).forEach(obj => { bytes += obj.Size; objects++; });
        token = resp.IsTruncated ? resp.NextContinuationToken : undefined;
      } while (token);
      byPrefix.push({ prefix, bytes, objects });
      totalBytes += bytes;
      totalObjects += objects;
    }

    res.json({ success: true, data: { totalBytes, totalObjects, byPrefix, bucket: BUCKET } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Webhooks (sem auth - validação interna)
app.use('/webhooks', webhooksRoutes);

// Error handler
app.use(errorHandler);

module.exports = app;

