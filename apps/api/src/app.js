import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authAdmin, authCliente } from './middlewares/authMiddleware.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { env } from './config/env.js';

// Rotas Admin
import adminAgenda from './routes/admin-agenda.js';
import adminClientes from './routes/admin-clientes.js';
import adminOrcamentos from './routes/admin-orcamentos.js';
import adminCobrancas from './routes/admin-cobrancas.js';
import adminAlbuns from './routes/admin-albuns.js';
import adminFotos from './routes/admin-fotos.js';
import adminContratos from './routes/admin-contratos.js';
import adminInstagram from './routes/admin-instagram.js';
import adminWhatsapp from './routes/admin-whatsapp.js';
import adminGoogleCalendar from './routes/admin-google-calendar.js';
import adminConfiguracoes from './routes/admin-configuracoes.js';
import adminFotografos from './routes/admin-fotografos.js';
import adminEquipamentos from './routes/admin-equipamentos.js';
import adminPendencias from './routes/admin-pendencias.js';

// Rotas Cliente
import clientAuth from './routes/client-auth.js';
import clientAlbuns from './routes/client-albuns.js';
import clientContratos from './routes/client-contratos.js';
import clientPagamentos from './routes/client-pagamentos.js';
import clientOrcamentos from './routes/client-orcamentos.js';

// Webhooks
import webhooks from './routes/webhooks.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Admin (protegidas)
app.use('/api/admin/agenda', authAdmin, adminAgenda);
app.use('/api/admin/clientes', authAdmin, adminClientes);
app.use('/api/admin/orcamentos', authAdmin, adminOrcamentos);
app.use('/api/admin/cobrancas', authAdmin, adminCobrancas);
app.use('/api/admin/albuns', authAdmin, adminAlbuns);
app.use('/api/admin/fotos', authAdmin, adminFotos);
app.use('/api/admin/contratos', authAdmin, adminContratos);
app.use('/api/admin/instagram', authAdmin, adminInstagram);
app.use('/api/admin/whatsapp', authAdmin, adminWhatsapp);
app.use('/api/admin/google-calendar', authAdmin, adminGoogleCalendar);
app.use('/api/admin/configuracoes', authAdmin, adminConfiguracoes);
app.use('/api/admin/fotografos', authAdmin, adminFotografos);
app.use('/api/admin/equipamentos', authAdmin, adminEquipamentos);
app.use('/api/admin/pendencias', authAdmin, adminPendencias);

// Cliente
app.use('/api/client', clientAuth);
app.use('/api/client/albuns', authCliente, clientAlbuns);
app.use('/api/client/contratos', authCliente, clientContratos);
app.use('/api/client/pagamentos', authCliente, clientPagamentos);
app.use('/api/client/orcamentos', authCliente, clientOrcamentos);

// Webhooks (sem auth)
app.use('/api/webhooks', webhooks);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
export default app;
