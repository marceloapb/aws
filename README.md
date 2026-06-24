# 📷 Horizons Photography Management System

Sistema completo de gestão para fotógrafos profissionais.

## 🏗️ Arquitetura

```
aws/
├── apps/
│   ├── api/          # Node.js + Express + PocketBase
│   └── web/          # React + Vite + TailwindCSS
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
cd apps/web
npm install
npm run dev
```

## 🌐 Funcionalidades

- **Admin**: Dashboard, Agenda, Clientes, Orçamentos, Cobranças, Álbuns, Contratos
- **Integrações**: Google Calendar, WhatsApp (Meta API), Instagram, AWS S3/CloudFront/SES
- **Pagamentos**: Asaas, Stripe, Mercado Pago, Pagarme, PagBank, PicPay, SumUp, Banco Inter, Stone, InfinitePay
- **Portal do Cliente**: Álbuns, Contratos, Pagamentos, Orçamentos

## ☁️ Deploy AWS

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**Secrets necessários no GitHub:**
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `FRONTEND_BUCKET`, `CLOUDFRONT_ID`, `ECR_REGISTRY`, `APPRUNNER_SERVICE_ARN`

## 📄 Licença

MIT
