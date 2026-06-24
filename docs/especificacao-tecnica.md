# ESPECIFICAÇÃO TÉCNICA COMPLETA
# Horizons Photography Management System
# Data: Junho 2026 | Versão: v9 (Consolidada + Deploy AWS)

---

## ÍNDICE GERAL

### PARTE 1 — Fundação
- 1. Visão Geral do Sistema
- 2. Stack Tecnológico
- 3. Arquitetura do Sistema
- 4. Estrutura do Monorepo
- 5. Configuração do Ambiente
- 6. PocketBase — Configuração e Collections
- 7. Autenticação e Autorização
- 8. API REST — Endpoints Completos
- 9. Integrações Externas (Google Calendar, WhatsApp, Instagram)
- 10. Gateways de Pagamento (10 adapters)

### PARTE 2 — Dados
- 11-18. Dicionário de Dados Completo (todas as collections)
- 19. Relacionamentos entre Collections
- 20. Regras de Acesso (PocketBase Rules)

### PARTE 3 — Analytics & Troubleshooting
- 21. AWS QuickSight + ETL Pipeline
- 22. Troubleshooting Guide
- 23. Frontend Architecture
- 24. Data Flows & API Responses

### PARTE 4 — Features Avançadas
- 25. Equipment Management
- 26. Client Portal
- 27. Ratings & Testimonials
- 28. Production Deployment
- 29. QuickSight Dashboards
- 30. Multi-Photographer + Loyalty

### PARTE 5 — Deploy & Operação
- 31. Deploy AWS Full (Amplify + ECS Fargate + S3)
- 32. CI/CD Pipeline
- 33. Monitoramento e Alertas
- 34. Backup & Disaster Recovery
- 35. Configuração de Ambiente (.env)
- 36. Templates WhatsApp
- 37. Style Guide do Projeto

---

## 1. VISÃO GERAL DO SISTEMA

### 1.1 O que é o Horizons

O Horizons Photography Management System é uma plataforma SaaS completa para fotógrafos profissionais, gerenciando todo o ciclo de vida do cliente: desde orçamentos, agendamento, entrega de fotos, pagamentos online, até o portal do cliente.

### 1.2 Funcionalidades Principais

| Módulo | Descrição |
|--------|----------|
| Agenda | Agendamento de eventos com sync bidirecional Google Calendar |
| Clientes | CRM completo com histórico e indicações |
| Orçamentos | Criação, envio, aprovação e conversão em contrato |
| Contratos | Geração de PDF e assinatura digital |
| Cobranças | 10 gateways de pagamento (PIX, boleto, cartão) |
| Álbuns | Entrega digital com expiração e plano anual |
| WhatsApp | Lembretes automáticos via Meta Business API |
| Instagram | Publicação automática de carrosséis |
| Portal do Cliente | Acesso a álbuns, contratos e pagamentos |
| Relatórios | KPIs, receita, NPS, exportação CSV |
| Equipamentos | Inventário e checklists por tipo de evento |
| Backup | Automático para S3 com restore |

### 1.3 Usuários do Sistema

| Tipo | Acesso | Autenticação |
|------|--------|-------------|
| Admin (Fotógrafo) | Painel completo `/admin/*` | Email + senha (JWT) |
| Cliente | Portal limitado `/client/*` | Email + código verificação |
| Público | Contrato para assinar | Token único na URL |

---

## 2. STACK TECNOLÓGICO

### 2.1 Backend

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| Node.js | 20.x LTS | Runtime |
| Express.js | 5.0 | Framework HTTP |
| PocketBase | 0.26.8 | Banco de dados (SQLite) |
| AWS SDK v3 | latest | S3, SES, CloudFront |
| sharp | latest | Processamento de imagens |
| node-cron | latest | Agendamento de jobs |
| googleapis | latest | Google Calendar API |
| puppeteer | latest | Geração de PDF |

### 2.2 Frontend

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| React | 18.3 | UI Library |
| Vite | 7.3 | Build tool |
| TailwindCSS | 3.x | Estilização |
| Radix UI | latest | Componentes acessíveis |
| react-hook-form | latest | Formulários |
| Recharts | latest | Gráficos |
| Lucide React | latest | Ícones |
| react-router-dom | 6.x | Roteamento |

### 2.3 Infraestrutura AWS

| Serviço | Uso |
|---------|-----|
| Amplify | Hosting frontend (React SPA) |
| ECS Fargate | Backend (Node.js + PocketBase) |
| EFS | Volume persistente para SQLite |
| S3 | Armazenamento de fotos (2TB+) |
| CloudFront | CDN para fotos |
| SES | Envio de emails |
| Secrets Manager | Tokens e API keys |
| CloudWatch | Logs e alertas |
| EventBridge + Lambda | ETL para analytics |
| Glue + Athena | Data catalog e queries |
| QuickSight | Dashboards e BI |
| ACM | Certificados SSL |

### 2.4 Integrações Externas

| Serviço | Uso |
|---------|-----|
| Google Calendar API | Sync bidirecional de eventos |
| Meta WhatsApp Business API | Lembretes e notificações |
| Meta Instagram Graph API | Publicação automática |
| Asaas | Gateway de pagamento |
| MercadoPago | Gateway de pagamento |
| Pagar.me | Gateway de pagamento |
| PagBank | Gateway de pagamento |
| PicPay | Gateway de pagamento |
| SumUp | Gateway de pagamento |
| Banco Inter | Gateway de pagamento |
| Stone | Gateway de pagamento |
| InfinitePay | Gateway de pagamento |
| Stripe | Gateway de pagamento |

---

## 3. ARQUITETURA DO SISTEMA

### 3.1 Diagrama de Arquitetura AWS

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└──────────┬──────────────────┬──────────────────┬────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌──────────────────┐ ┌───────────────────┐ ┌──────────────────────┐
│  AWS Amplify     │ │  ECS Fargate      │ │  CloudFront CDN      │
│  (Frontend)      │ │  (Backend API)    │ │  (Fotos/Assets)      │
│                  │ │                   │ │                      │
│  React + Vite    │ │  Node.js/Express  │ │  S3 Origin           │
│  app.dominio.com │ │  api.dominio.com  │ │  cdn.dominio.com     │
└──────────────────┘ └────────┬──────────┘ └──────────┬───────────┘
                              │                       │
                    ┌─────────┼───────────────────────┼──────┐
                    │         ▼                       ▼      │
                    │  ┌─────────────┐    ┌────────────────┐ │
                    │  │ PocketBase  │    │   S3 Bucket    │ │
                    │  │ (SQLite DB) │    │   (2TB fotos)  │ │
                    │  │ EFS Volume  │    │                │ │
                    │  └─────────────┘    └────────────────┘ │
                    │                                         │
                    │  ┌─────────────┐    ┌────────────────┐ │
                    │  │ SES (Email) │    │ Secrets Manager│ │
                    │  └─────────────┘    └────────────────┘ │
                    │                                         │
                    │         AWS Cloud (sa-east-1)           │
                    └─────────────────────────────────────────┘
```

### 3.2 Fluxo de Requisição

```
Cliente → CloudFront/Amplify → React SPA
React SPA → ALB → ECS Fargate (Express.js)
Express.js → PocketBase (SQLite via EFS)
Express.js → S3 (upload/download fotos)
Express.js → SES (emails)
Express.js → Meta API (WhatsApp/Instagram)
Express.js → Google Calendar API
Express.js → Payment Gateways
```

### 3.3 Comunicação entre Serviços

| De | Para | Protocolo | Porta |
|----|------|-----------|-------|
| Amplify | ALB | HTTPS | 443 |
| ALB | ECS | HTTP | 3000 |
| ECS | PocketBase | HTTP | 8090 (localhost) |
| ECS | S3 | HTTPS | 443 (AWS SDK) |
| ECS | SES | HTTPS | 443 (AWS SDK) |
| ECS | Meta API | HTTPS | 443 |
| ECS | Google API | HTTPS | 443 |
| ECS | Gateways | HTTPS | 443 |
| Webhooks | ALB | HTTPS | 443 |

---

## 4. ESTRUTURA DO MONOREPO

```
horizons/
├── apps/
│   ├── api/                          ← Backend Node.js
│   │   ├── src/
│   │   │   ├── index.js             ← Entry point
│   │   │   ├── app.js               ← Express app setup
│   │   │   ├── config/
│   │   │   │   ├── pocketbase.js    ← PB client singleton
│   │   │   │   ├── s3.js            ← AWS S3 client
│   │   │   │   ├── env.js           ← Validação de env vars
│   │   │   │   └── constants.js     ← Constantes do sistema
│   │   │   ├── middlewares/
│   │   │   │   ├── adminAuth.js     ← JWT auth admin
│   │   │   │   ├── clientAuth.js    ← JWT auth cliente
│   │   │   │   ├── rateLimiter.js   ← Rate limiting
│   │   │   │   ├── errorHandler.js  ← Error handler global
│   │   │   │   └── upload.js        ← Multer config
│   │   │   ├── routes/
│   │   │   │   ├── admin-agenda.js
│   │   │   │   ├── admin-clientes.js
│   │   │   │   ├── admin-orcamentos.js
│   │   │   │   ├── admin-cobrancas.js
│   │   │   │   ├── admin-albuns.js
│   │   │   │   ├── admin-fotos.js
│   │   │   │   ├── admin-contratos.js
│   │   │   │   ├── admin-gateways.js
│   │   │   │   ├── admin-google-calendar.js
│   │   │   │   ├── admin-instagram.js
│   │   │   │   ├── admin-whatsapp.js
│   │   │   │   ├── admin-fotografos.js
│   │   │   │   ├── admin-equipamentos.js
│   │   │   │   ├── admin-pendencias.js
│   │   │   │   ├── admin-pacotes.js
│   │   │   │   ├── admin-depoimentos.js
│   │   │   │   ├── admin-avaliacoes.js
│   │   │   │   ├── admin-portfolio.js
│   │   │   │   ├── admin-configuracoes.js
│   │   │   │   ├── admin-backup.js
│   │   │   │   ├── admin-relatorios.js
│   │   │   │   ├── admin-novidades.js
│   │   │   │   ├── auth.js
│   │   │   │   ├── client-albuns.js
│   │   │   │   ├── client-contratos.js
│   │   │   │   ├── client-pagamentos.js
│   │   │   │   ├── client-dados.js
│   │   │   │   ├── webhooks.js
│   │   │   │   └── public.js
│   │   │   ├── services/
│   │   │   │   ├── s3Service.js
│   │   │   │   ├── emailService.js
│   │   │   │   ├── pdfService.js
│   │   │   │   ├── whatsappService.js
│   │   │   │   ├── whatsappTemplateService.js
│   │   │   │   ├── instagramService.js
│   │   │   │   ├── googleCalendarService.js
│   │   │   │   ├── googleCalendarSyncService.js
│   │   │   │   └── contratoService.js
│   │   │   ├── adapters/
│   │   │   │   ├── index.js          ← Factory de adapters
│   │   │   │   ├── asaas.js
│   │   │   │   ├── mercadopago.js
│   │   │   │   ├── pagarme.js
│   │   │   │   ├── pagbank.js
│   │   │   │   ├── picpay.js
│   │   │   │   ├── sumup.js
│   │   │   │   ├── banco-inter.js
│   │   │   │   ├── stone.js
│   │   │   │   ├── infinitepay.js
│   │   │   │   └── stripe.js
│   │   │   └── jobs/
│   │   │       ├── whatsappReminderJob.js
│   │   │       ├── albumRetentionJob.js
│   │   │       ├── instagramSchedulerJob.js
│   │   │       ├── googleCalendarSyncJob.js
│   │   │       ├── orcamentoExpiracaoJob.js
│   │   │       └── backupJob.js
│   │   ├── Dockerfile
│   │   ├── docker-entrypoint.sh
│   │   ├── package.json
│   │   └── .env.example
│   │
│   └── web/                           ← Frontend React
│       ├── src/
│       │   ├── main.jsx
│       │   ├── App.jsx
│       │   ├── pages/
│       │   │   ├── admin/            ← 25+ páginas admin
│       │   │   ├── client/           ← 6 páginas cliente
│       │   │   ├── auth/             ← Login/Registro
│       │   │   └── public/           ← Contrato público
│       │   ├── components/
│       │   │   └── ui/               ← 16+ componentes
│       │   ├── layouts/
│       │   ├── hooks/
│       │   ├── utils/
│       │   └── contexts/
│       ├── amplify.yml
│       ├── package.json
│       └── vite.config.js
│
├── infra/
│   ├── docker/
│   ├── aws/
│   └── nginx/
│
├── scripts/
│   ├── setup-collections.js
│   ├── register-whatsapp-templates.js
│   └── backup-restore.js
│
├── .github/workflows/
│   └── deploy-api.yml
│
└── docs/
    ├── especificacao-tecnica.md
    ├── deploy-aws.md
    ├── style-guide.md
    └── whatsapp-templates.md
```

---

## 5. CONFIGURAÇÃO DO AMBIENTE

### 5.1 Variáveis de Ambiente (.env)

```env
# ── SERVIDOR
NODE_ENV=production
PORT=3000
APP_URL=https://api.seudominio.com.br
FRONTEND_URL=https://app.seudominio.com.br

# ── AUTENTICAÇÃO
JWT_SECRET=gere_com_openssl_rand_base64_64
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# ── POCKETBASE
PB_URL=http://127.0.0.1:8090
PB_ADMIN_EMAIL=admin@seudominio.com.br
PB_ADMIN_PASSWORD=sua_senha_admin_forte
PB_DATA_DIR=/data/pb_data

# ── AWS S3
AWS_REGION=sa-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=horizons-photos-production
S3_BACKUP_BUCKET=horizons-backups-production
CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net

# ── GOOGLE CALENDAR
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://api.seudominio.com.br/api/admin/google-calendar/callback
GOOGLE_CALENDAR_ID=primary

# ── WHATSAPP (Meta Business API)
WHATSAPP_TOKEN=EAAx...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_VERIFY_TOKEN=horizons_verify_token_2026
WHATSAPP_ANTECEDENCIA_PADRAO=60

# ── INSTAGRAM (Meta Graph API)
INSTAGRAM_ACCESS_TOKEN=EAAx...
INSTAGRAM_BUSINESS_ACCOUNT_ID=17841400000000000

# ── EMAIL (AWS SES)
EMAIL_PROVIDER=ses
SES_REGION=sa-east-1
SES_FROM_EMAIL=contato@seudominio.com.br
SES_FROM_NAME=Horizons Fotografia

# ── GATEWAYS DE PAGAMENTO
ASAAS_API_KEY=$aact_...
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
PAGARME_API_KEY=ak_live_...
PAGBANK_TOKEN=...
PICPAY_TOKEN=...
SUMUP_API_KEY=sup_sk_...
BANCO_INTER_CLIENT_ID=...
BANCO_INTER_CLIENT_SECRET=...
STONE_API_KEY=...
INFINITEPAY_API_KEY=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── BACKUP
BACKUP_CRON=0 2 * * *
BACKUP_RETENTION_DAYS=30

# ── RATE LIMITING
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### 5.2 Validação de Ambiente

O sistema valida todas as variáveis obrigatórias no startup e falha rápido se algo estiver faltando.

**Variáveis obrigatórias (sistema não inicia sem elas):**
- JWT_SECRET
- PB_URL
- PB_ADMIN_EMAIL
- PB_ADMIN_PASSWORD
- AWS_REGION
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- S3_BUCKET

**Grupos de features (opcionais, mas precisam estar completos se ativados):**
- Google Calendar: GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REDIRECT_URI
- WhatsApp: WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_VERIFY_TOKEN
- Instagram: INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ACCOUNT_ID
- Email SES: SES_REGION + SES_FROM_EMAIL
- Stripe: STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET
- CloudFront: CLOUDFRONT_DOMAIN + CLOUDFRONT_KEY_PAIR_ID

---

## 6. POCKETBASE — CONFIGURAÇÃO E COLLECTIONS

### 6.1 Visão Geral

PocketBase é usado como banco de dados principal (SQLite) com API REST automática. Roda como processo separado na porta 8090 dentro do mesmo container ECS.

### 6.2 Collections do Sistema

| Collection | Tipo | Descrição |
|-----------|------|----------|
| agenda | base | Eventos e agendamentos |
| clientes | base | Cadastro de clientes |
| orcamentos | base | Orçamentos/propostas |
| cobracas | base | Cobranças e pagamentos |
| albuns | base | Álbuns de fotos |
| fotos | base | Fotos individuais |
| galerias | base | Galerias de seleção |
| contratos | base | Contratos digitais |
| google_calendar_config | base | Config do Google Calendar |
| google_calendar_logs | base | Logs de sincronização |
| instagram_publicacoes | base | Posts agendados/publicados |
| equipamentos | base | Inventário de equipamentos |
| fotografos | base | Fotógrafos da equipe |
| pendencias | base | Tarefas internas |
| pacotes_comerciais | base | Pacotes de serviço |
| depoimentos | base | Depoimentos aprovados |
| avaliacoes | base | Avaliações NPS |
| portfolio | base | Itens do portfólio |
| configuracoes | base | Configurações globais |
| backups | base | Registro de backups |
| planos_anuais | base | Planos de proteção de álbum |
| novidades | base | Changelog/novidades |
| users_admin | auth | Usuários administradores |
| users_cliente | auth | Usuários clientes |

---

## 7. AUTENTICAÇÃO E AUTORIZAÇÃO

### 7.1 Fluxo de Autenticação Admin

```
1. POST /api/auth/admin/login {email, password}
2. Valida credenciais no PocketBase (collection users_admin)
3. Gera JWT com payload: {id, email, role: 'admin'}
4. Retorna: {token, refreshToken, user: {id, nome, email}}
5. Frontend armazena token no localStorage
6. Todas as requisições incluem: Authorization: Bearer <token>
```

### 7.2 Fluxo de Autenticação Cliente

```
1. POST /api/auth/client/login {email}
2. Gera código de 6 dígitos
3. Envia código por email (SES) e/ou WhatsApp
4. POST /api/auth/client/verify {email, code}
5. Valida código (expira em 10 min)
6. Gera JWT com payload: {id, email, role: 'client', cliente_id}
7. Retorna: {token, user: {id, nome, email}}
```

### 7.3 Middleware de Autenticação

```javascript
// adminAuth.js — Protege rotas /api/admin/*
// Verifica JWT, extrai payload, injeta req.admin
// Retorna 401 se token inválido/expirado

// clientAuth.js — Protege rotas /api/client/*
// Verifica JWT, extrai payload, injeta req.client
// Verifica se cliente_id existe e está ativo
// Retorna 401/403 conforme o caso
```

### 7.4 Rate Limiting

- 100 requisições por IP a cada 15 minutos
- Rotas de auth: 10 tentativas por IP a cada 15 minutos
- Webhooks: sem limite (validados por signature)

---

## 8. API REST — ENDPOINTS COMPLETOS

### 8.1 Autenticação

| Método | Rota | Descrição |
|--------|------|----------|
| POST | /api/auth/admin/login | Login admin |
| POST | /api/auth/admin/refresh | Renovar token admin |
| GET | /api/auth/admin/me | Dados do admin logado |
| POST | /api/auth/client/login | Solicitar código cliente |
| POST | /api/auth/client/verify | Verificar código |
| POST | /api/auth/client/refresh | Renovar token cliente |

### 8.2 Admin — Agenda

| Método | Rota | Descrição |
|--------|------|----------|
| GET | /api/admin/agenda | Listar eventos (filtros: data, status, tipo) |
| GET | /api/admin/agenda/:id | Detalhe do evento |
| POST | /api/admin/agenda | Criar evento |
| PUT | /api/admin/agenda/:id | Atualizar evento |
| DELETE | /api/admin/agenda/:id | Excluir evento |
| GET | /api/admin/agenda/semana | Eventos da semana |
| GET | /api/admin/agenda/disponibilidade | Horários disponíveis |

### 8.3 Admin — Clientes

| Método | Rota | Descrição |
|--------|------|----------|
| GET | /api/admin/clientes | Listar (paginado, busca) |
| GET | /api/admin/clientes/:id | Detalhe com histórico |
| POST | /api/admin/clientes | Criar cliente |
| PUT | /api/admin/clientes/:id | Atualizar |
| DELETE | /api/admin/clientes/:id | Desativar (soft delete) |
| GET | /api/admin/clientes/:id/timeline | Timeline completa |

### 8.4 Admin — Orçamentos

| Método | Rota | Descrição |
|--------|------|----------|
| GET | /api/admin/orcamentos | Listar (filtros: status, cliente) |
| GET | /api/admin/orcamentos/:id | Detalhe |
| POST | /api/admin/orcamentos | Criar |
| PUT | /api/admin/orcamentos/:id | Atualizar |
| POST | /api/admin/orcamentos/:id/enviar | Enviar ao cliente |
| POST | /api/admin/orcamentos/:id/aprovar | Aprovar manualmente |
| POST | /api/admin/orcamentos/:id/rejeitar | Rejeitar |
| POST | /api/admin/orcamentos/:id/gerar-contrato | Gerar contrato |

### 8.5 Admin — Cobranças

| Método | Rota | Descrição |
|--------|------|----------|
| GET | /api/admin/cobrancas | Listar |
| GET | /api/admin/cobrancas/:id | Detalhe |
| POST | /api/admin/cobrancas | Criar cobrança |
| PUT | /api/admin/cobrancas/:id | Atualizar |
| POST | /api/admin/cobrancas/:id/cancelar | Cancelar |
| POST | /api/admin/cobrancas/:id/estornar | Estornar |
| GET | /api/admin/cobrancas/parcelas/simular | Simular parcelamento |

### 8.6 Admin — Álbuns e Fotos

| Método | Rota | Descrição |
|--------|------|----------|
| GET | /api/admin/albuns | Listar álbuns |
| GET | /api/admin/albuns/:id | Detalhe do álbum |
| POST | /api/admin/albuns | Criar álbum |
| PUT | /api/admin/albuns/:id | Atualizar |
| DELETE | /api/admin/albuns/:id | Excluir |
| POST | /api/admin/albuns/:id/fotos | Upload de fotos (batch) |
| DELETE | /api/admin/albuns/:id/fotos/:fotoId | Excluir foto |
| PUT | /api/admin/albuns/:id/fotos/reordenar | Reordenar fotos |
| POST | /api/admin/albuns/:id/galeria | Criar galeria de seleção |
| GET | /api/admin/albuns/:id/galeria | Listar galerias |
| PUT | /api/admin/albuns/:id/galeria/:galeriaId | Atualizar galeria |

### 8.7 Admin — Contratos

| Método | Rota | Descrição |
|--------|------|----------|
| GET | /api/admin/contratos | Listar |
| GET | /api/admin/contratos/:id | Detalhe |
| POST | /api/admin/contratos | Criar |
| PUT | /api/admin/contratos/:id | Atualizar |
| POST | /api/admin/contratos/:id/enviar | Enviar para assinatura |
| GET | /api/admin/contratos/:id/pdf | Download PDF |

### 8.8 Admin — Gateways

| Método | Rota | Descrição |
|--------|------|----------|
| GET | /api/admin/gateways | Listar gateways configurados |
| GET | /api/admin/gateways/:provider | Config de um gateway |
| PUT | /api/admin/gateways/:provider | Atualizar config |
| POST | /api/admin/gateways/:provider/testar | Testar conexão |
| PUT | /api/admin/gateways/:provider/padrao | Definir como padrão |

### 8.9 Admin — Google Calendar

| Método | Rota | Descrição |
|--------|------|----------|
| GET | /api/admin/google-calendar/config | Ver configuração |
| POST | /api/admin/google-calendar/connect | Iniciar OAuth |
| GET | /api/admin/google-calendar/callback | Callback OAuth |
| POST | /api/admin/google-calendar/disconnect | Desconectar |
| POST | /api/admin/google-calendar/sync | Forçar sincronização |
| GET | /api/admin/google-calendar/logs | Ver logs de sync |
| POST | /api/admin/google-calendar/watch | Registrar push notifications |

### 8.10 Admin — Instagram

| Método | Rota | Descrição |
|--------|------|----------|
| GET | /api/admin/instagram/config | Ver configuração |
| PUT | /api/admin/instagram/config | Atualizar config |
| GET | /api/admin/instagram/publicacoes | Listar publicações |
| POST | /api/admin/instagram/publicacoes | Agendar publicação |
| DELETE | /api/admin/instagram/publicacoes/:id | Cancelar agendamento |
| POST | /api/admin/instagram/publicacoes/:id/publicar | Publicar agora |

### 8.11 Admin — WhatsApp

| Método | Rota | Descrição |
|--------|------|----------|
| GET | /api/admin/whatsapp/config | Ver configuração |
| PUT | /api/admin/whatsapp/config | Atualizar config |
| POST | /api/admin/whatsapp/enviar | Enviar mensagem manual |
| GET | /api/admin/whatsapp/logs | Ver logs de envio |

### 8.12 Admin — Outros

| Método | Rota | Descrição |
|--------|------|----------|
| GET/POST/PUT/DELETE | /api/admin/fotografos | CRUD fotógrafos |
| GET/POST/PUT/DELETE | /api/admin/equipamentos | CRUD equipamentos |
| GET/POST/PUT/DELETE | /api/admin/pendencias | CRUD pendências |
| GET/POST/PUT/DELETE | /api/admin/pacotes | CRUD pacotes |
| GET/POST/PUT/DELETE | /api/admin/depoimentos | CRUD depoimentos |
| GET/POST/PUT/DELETE | /api/admin/avaliacoes | CRUD avaliações |
| GET/POST/PUT/DELETE | /api/admin/portfolio | CRUD portfólio |
| GET/PUT | /api/admin/configuracoes | Configurações globais |
| GET/POST | /api/admin/backup | Backup manual + listar |
| POST | /api/admin/backup/restore | Restaurar backup |
| GET | /api/admin/relatorios | Relatórios com filtros |
| GET/POST/PUT/DELETE | /api/admin/novidades | CRUD novidades |

### 8.13 Portal do Cliente

| Método | Rota | Descrição |
|--------|------|----------|
| GET | /api/client/dashboard | Dashboard do cliente |
| GET | /api/client/albuns | Meus álbuns |
| GET | /api/client/albuns/:id | Ver álbum (com senha) |
| GET | /api/client/albuns/:id/fotos | Listar fotos |
| GET | /api/client/albuns/:id/fotos/:fotoId/download | Download foto |
| POST | /api/client/albuns/:id/download-zip | Download ZIP |
| GET | /api/client/contratos | Meus contratos |
| GET | /api/client/contratos/:id | Ver contrato |
| POST | /api/client/contratos/:id/assinar | Assinar contrato |
| GET | /api/client/pagamentos | Minhas cobranças |
| GET | /api/client/dados | Meus dados |
| PUT | /api/client/dados | Atualizar dados |

### 8.14 Webhooks

| Método | Rota | Descrição |
|--------|------|----------|
| POST | /api/webhooks/asaas | Webhook Asaas |
| POST | /api/webhooks/mercadopago | Webhook MercadoPago |
| POST | /api/webhooks/stripe | Webhook Stripe |
| POST | /api/webhooks/pagarme | Webhook Pagar.me |
| POST | /api/webhooks/pagbank | Webhook PagBank |
| POST | /api/webhooks/picpay | Webhook PicPay |
| POST | /api/webhooks/sumup | Webhook SumUp |
| POST | /api/webhooks/banco-inter | Webhook Banco Inter |
| POST | /api/webhooks/stone | Webhook Stone |
| POST | /api/webhooks/infinitepay | Webhook InfinitePay |
| POST | /api/webhooks/whatsapp | Webhook WhatsApp |
| POST | /api/webhooks/google-calendar | Push notification Google |

### 8.15 Público

| Método | Rota | Descrição |
|--------|------|----------|
| GET | /api/public/contrato/:token | Ver contrato público |
| POST | /api/public/contrato/:token/assinar | Assinar contrato |
| GET | /api/public/orcamento/:token | Ver orçamento público |
| POST | /api/public/orcamento/:token/aprovar | Aprovar orçamento |
| GET | /api/health | Health check |

---

## 9. INTEGRAÇÕES EXTERNAS

### 9.1 Google Calendar — Sync Bidirecional

**Fluxo de Sincronização (a cada 30 minutos):**

```
1. Buscar eventos locais com sync_status = 'pendente'
2. Para cada evento pendente:
   - Se não tem google_event_id → criar no Google
   - Se tem google_event_id → atualizar no Google
3. Buscar eventos do Google (incremental sync com syncToken)
4. Para cada evento do Google:
   - Se não existe local → criar localmente
   - Se existe local → atualizar se mais recente
5. Registrar log de sincronização
```

**Push Notifications:**
- Google envia notificação quando evento muda
- Endpoint: POST /api/webhooks/google-calendar
- Dispara sync incremental imediata
- Watch channel renovado a cada 6 dias (expira em 7)

**Reserva Automática:**
- Quando orçamento é aprovado → cria evento no Google Calendar
- Cor do evento baseada no tipo (casamento = verde, ensaio = azul, etc.)
- Descrição inclui dados do cliente e link do orçamento

### 9.2 WhatsApp — Meta Business API

**Templates Aprovados:**

| Template | Categoria | Uso |
|----------|-----------|-----|
| lembrete_evento | UTILITY | Lembrete X min antes do evento |
| orcamento_enviado | UTILITY | Notificar novo orçamento |
| cobranca_gerada | UTILITY | Notificar nova cobrança |
| album_disponivel | UTILITY | Avisar que fotos estão prontas |
| contrato_assinatura | UTILITY | Enviar link do contrato |
| avaliacao_convite | MARKETING | Pedir avaliação pós-evento |

**Scheduler de Lembretes:**
- Job roda a cada 5 minutos
- Busca eventos nas próximas X horas (configurável)
- Envia template `lembrete_evento` via WhatsApp
- Marca evento como `lembrete_enviado = true`
- Respeita configuração individual por evento

### 9.3 Instagram — Meta Graph API

**Dois Caminhos de Publicação:**

1. **Fluxo Rápido (do álbum):**
   - Admin seleciona fotos no álbum
   - Modal de publicação com caption e agendamento
   - Publica imediatamente ou agenda

2. **Fluxo Completo (tela Instagram):**
   - Tela dedicada com todas as publicações
   - Criar nova publicação selecionando fotos de qualquer álbum
   - Visualizar preview do carrossel
   - Agendar data/hora
   - Ver histórico e status

**Processo de Publicação:**
```
1. Upload de cada foto como container no Instagram
2. Criar carousel container com todos os items
3. Publicar carousel
4. Polling de status até confirmação
5. Atualizar status no banco (publicado/erro)
```

---

## 10. GATEWAYS DE PAGAMENTO

### 10.1 Arquitetura de Adapters

Todos os gateways seguem a mesma interface:

```javascript
class PaymentAdapter {
  async criarCobranca({ valor, descricao, cliente, vencimento, metodo }) {}
  async consultarStatus(gatewayId) {}
  async cancelar(gatewayId) {}
  async estornar(gatewayId, valor) {}
  validarWebhook(headers, body) {}
  parseWebhook(body) {}
}
```

### 10.2 Factory Pattern

```javascript
import { AsaasAdapter } from './asaas.js';
import { MercadoPagoAdapter } from './mercadopago.js';
// ... todos os adapters

const adapters = {
  asaas: AsaasAdapter,
  mercadopago: MercadoPagoAdapter,
  pagarme: PagarmeAdapter,
  pagbank: PagBankAdapter,
  picpay: PicPayAdapter,
  sumup: SumUpAdapter,
  'banco-inter': BancoInterAdapter,
  stone: StoneAdapter,
  infinitepay: InfinitePayAdapter,
  stripe: StripeAdapter,
};

export function getAdapter(provider) {
  const Adapter = adapters[provider];
  if (!Adapter) throw new Error(`Gateway não suportado: ${provider}`);
  return new Adapter();
}
```

### 10.3 Métodos de Pagamento por Gateway

| Gateway | PIX | Boleto | Cartão Crédito | Cartão Débito |
|---------|-----|--------|---------------|---------------|
| Asaas | ✅ | ✅ | ✅ | ✅ |
| MercadoPago | ✅ | ✅ | ✅ | ✅ |
| Pagar.me | ✅ | ✅ | ✅ | ❌ |
| PagBank | ✅ | ✅ | ✅ | ❌ |
| PicPay | ✅ | ❌ | ✅ | ❌ |
| SumUp | ✅ | ✅ | ✅ | ✅ |
| Banco Inter | ✅ | ✅ | ❌ | ❌ |
| Stone | ✅ | ✅ | ✅ | ✅ |
| InfinitePay | ✅ | ❌ | ✅ | ❌ |
| Stripe | ✅ | ❌ | ✅ | ✅ |

### 10.4 Webhook Processing

```
1. Receber POST no endpoint do gateway
2. Validar assinatura/autenticidade
3. Extrair: gateway_id, novo_status, dados_pagamento
4. Buscar cobrança local pelo gateway_id
5. Atualizar status: pendente → pago/cancelado/estornado
6. Se pago: registrar data_pagamento e meio_pagamento
7. Notificar admin (opcional)
8. Retornar 200 OK
```
