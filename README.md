# 📷 MBF Photography Platform

Sistema completo de gestão para fotógrafos profissionais.

## 🏗️ Arquitetura

```
aws/
├── apps/
│   ├── api/          # Node.js 20 + Express + AWS SAM (Lambda + API Gateway)
│   ├── frontend/     # React 18 + TailwindCSS + CRA (Cognito Auth)
│   └── web/          # Landing page alternativa (Vite)
├── infra/            # CloudFormation
├── scripts/          # Deploy scripts
└── .github/          # CI/CD (GitHub Actions)
```

## 🚀 Início Rápido

```bash
# API
cd apps/api
cp .env.example .env   # preencher variáveis
npm install
npm run dev

# Frontend
cd apps/frontend
npm install
npm start
```

## ☁️ Stack AWS

- **Compute:** Lambda + API Gateway (HttpApi) via SAM
- **Database:** DynamoDB (single-table design)
- **Storage:** S3 + CloudFront (signed URLs)
- **Auth:** Cognito (User Pool us-east-1)
- **Secrets:** SSM Parameter Store (prefix /mbf/prod/)
- **E-mail:** SES
- **Região:** sa-east-1

## 🌐 Funcionalidades

- **Admin**: Dashboard, Agenda, Clientes, Orçamentos, Cobranças, Contratos, Álbuns, Catálogo, Equipamentos, Notas Fiscais, Logs
- **Integrações**: Google Calendar, WhatsApp (Meta Cloud API), Instagram (Meta Graph API), AWS S3/CloudFront/SES
- **Pagamentos**: Asaas, Stripe, Mercado Pago, Pagarme, PagBank, PicPay, SumUp, Banco Inter, Stone, InfinitePay
- **Portal do Cliente**: Álbuns, Contratos, Pagamentos, Orçamentos, Feedback
- **Automações**: Follow-up, Lembretes WhatsApp, Publicação Instagram, Sync Google Calendar

## 🚀 Deploy

```bash
# API (Lambda + API Gateway via SAM)
cd apps/api
sam build
sam deploy --no-confirm-changeset --no-fail-on-empty-changeset

# Frontend (S3 + CloudFront)
cd apps/frontend
node node_modules/react-scripts/bin/react-scripts.js build
aws s3 sync build s3://mbf-prod-frontend --delete --region sa-east-1
aws cloudfront create-invalidation --distribution-id E38U3W8Y8P36VO --paths "/*"
```

**Secrets necessários no GitHub:**
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `FRONTEND_BUCKET`, `CLOUDFRONT_ID`, `ECR_REGISTRY`, `APPRUNNER_SERVICE_ARN`

## 🛠️ Padrões de Código

- **Frontend:** Componentes funcionais React, TailwindCSS inline, cor accent `#EA580C`
- **API:** Express Router, async/await, DynamoDB single-table (PK/SK + GSI1PK/GSI1SK)
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`)

## 📄 Licença

MIT
