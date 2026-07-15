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

// Rotas Client
const clientAuthRoutes = require('./routes/client-auth');
const clientAlbunsRoutes = require('./routes/client-albuns');
const clientContratosRoutes = require('./routes/client-contratos');
const clientOrcamentosRoutes = require('./routes/client-orcamentos');
const clientPagamentosRoutes = require('./routes/client-pagamentos');
const clientFeedbackRoutes = require('./routes/client-feedback');
const clientAditivosRoutes = require('./routes/client-aditivos');

// Rotas Webhook
const webhooksRoutes = require('./routes/webhooks');

const app = express();

// Middlewares globais
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Registrar rotas Admin (protegidas por adminAuth)
app.use('/admin/agenda', adminAuth, adminAgendaRoutes);
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
app.use('/admin/orcamentos', adminAuth, adminOrcamentosRoutes);
app.use('/admin/pendencias', adminAuth, adminPendenciasRoutes);
app.use('/admin/whatsapp', adminAuth, adminWhatsappRoutes);
app.use('/admin/catalogo', adminAuth, adminCatalogoRoutes);
app.use('/admin/import', adminAuth, adminImportRoutes);
app.use('/admin/feedback', adminAuth, adminFeedbackRoutes);
app.use('/admin/aditivos', adminAuth, adminAditivosRoutes);
app.use('/admin/notas-fiscais', adminAuth, adminNotasFiscaisRoutes);

// Registrar rotas Client (protegidas por clientAuth)
app.use('/client/auth', clientAuthRoutes);
app.use('/client/albuns', clientAuth, clientAlbunsRoutes);
app.use('/client/contratos', clientAuth, clientContratosRoutes);
app.use('/client/orcamentos', clientAuth, clientOrcamentosRoutes);
app.use('/client/pagamentos', clientAuth, clientPagamentosRoutes);

// Rotas Client públicas (acesso via token, sem auth)
app.use('/client/feedback', clientFeedbackRoutes);
app.use('/client/aditivos', clientAditivosRoutes);

// Webhooks (sem auth - validação interna)
app.use('/webhooks', webhooksRoutes);

// Error handler
app.use(errorHandler);

module.exports = app;
