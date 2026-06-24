# 🚀 Horizons Photography Management System

**Sistema completo de gestão para fotógrafos profissionais**

Versão: v9 | Data: Junho 2026

---

## 📋 Sobre

O Horizons é uma plataforma SaaS completa para fotógrafos profissionais, gerenciando todo o ciclo de vida do cliente: desde orçamentos, agendamento, entrega de fotos, pagamentos online, até o portal do cliente.

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└──────────┬──────────────────┬──────────────────┬────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌──────────────────┐ ┌───────────────────┐ ┌──────────────────────┐
│  AWS Amplify     │ │  ECS Fargate      │ │  CloudFront CDN      │
│  (Frontend)      │ │  (Backend API)    │ │  (Fotos/Assets)      │
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
                    │         AWS Cloud (sa-east-1)           │
                    └─────────────────────────────────────────┘
```

## 🛠️ Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18.3 + Vite 7.3 + TailwindCSS |
| Backend | Node.js 20 + Express.js 5.0 |
| Banco de Dados | PocketBase 0.26.8 (SQLite) |
| Storage | AWS S3 + CloudFront |
| Hosting Frontend | AWS Amplify |
| Hosting Backend | AWS ECS Fargate + EFS |
| Email | AWS SES |
| Pagamentos | 10 gateways (Asaas, MercadoPago, Pagar.me, PagBank, PicPay, SumUp, Banco Inter, Stone, InfinitePay, Stripe) |
| Calendar | Google Calendar API (sync bidirecional) |
| Mensagens | Meta WhatsApp Business API |
| Social | Meta Instagram Graph API |
| CI/CD | GitHub Actions + Amplify Auto-deploy |

## 📁 Estrutura do Projeto

```
horizons/
├── apps/
│   ├── api/          ← Backend Node.js (ECS Fargate)
│   └── web/          ← Frontend React (Amplify)
├── infra/            ← Docker + AWS configs
├── scripts/          ← Setup e utilitários
├── docs/             ← Documentação técnica
└── .github/          ← CI/CD workflows
```

## 📖 Documentação

- [Especificação Técnica Completa](docs/especificacao-tecnica.md)
- [Guia de Deploy AWS](docs/deploy-aws.md)
- [Style Guide](docs/style-guide.md)
- [Templates WhatsApp](docs/whatsapp-templates.md)

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/marceloapb/aws.git
cd aws

# Backend
cd apps/api
npm install
cp .env.example .env
npm run dev

# Frontend (outro terminal)
cd apps/web
npm install
npm run dev
```

## 📄 Licença

Privado — Todos os direitos reservados.
