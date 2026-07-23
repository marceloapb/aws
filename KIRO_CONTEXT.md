# KIRO CONTEXT — MBFoto Photography Platform

## Quem sou
Marcelo Bloise — fotógrafo profissional, dono do www.mbfoto.com.br

## Projeto
Sistema de gestão completo para fotógrafos profissionais (MBF Photography Platform / Horizons).

## Repositório
- Local: D:\OneDrive\.Git\aws
- Remote: https://github.com/marceloapb/aws.git (branch main)
- O projeto fica sincronizado no OneDrive

## Stack
- **Frontend:** React 18 + TailwindCSS + Lucide icons (apps/frontend)
  - Build: react-scripts (CRA)
  - Auth: Amazon Cognito (cognito-identity-js)
- **API:** Node.js 20 + Express + AWS SAM (apps/api)
  - DB: DynamoDB (single-table design)
  - Storage: S3 (bucket mbf-backend-v3-fotos) + CloudFront
  - Secrets: SSM Parameter Store (prefix /mbf/prod/)
  - Auth middleware: Cognito JWT
- **Infra:** CloudFormation via SAM
  - Stack: horizons-prod (região us-east-1)
  - API Gateway: HttpApi (https://setvwal0cd.execute-api.us-east-1.amazonaws.com/prod)
  - Frontend: S3 bucket mbf-prod-frontend + CloudFront E38U3W8Y8P36VO
  - Fotos: CloudFront E2MVLLIKOH609F (bucket mbf-arquivos-producao)

## Deploy
```bash
# API (Lambda + API Gateway)
cd D:\OneDrive\.Git\aws\apps\api
sam build
sam deploy --no-confirm-changeset --no-fail-on-empty-changeset

# Frontend (S3 + CloudFront)
cd D:\OneDrive\.Git\aws\apps\frontend
node node_modules/react-scripts/bin/react-scripts.js build
aws s3 sync build s3://mbf-prod-frontend --delete --region us-east-1
aws cloudfront create-invalidation --distribution-id E38U3W8Y8P36VO --paths "/*"
```

## Estrutura principal
```
apps/
├── api/
│   ├── src/
│   │   ├── app.js              # Express app principal
│   │   ├── handler.js          # Lambda handler (serverless-express)
│   │   ├── config/             # env.js, dynamodb.js, constants.js
│   │   ├── routes/             # admin-*, client-*, public, webhooks
│   │   ├── services/           # lógica de negócio
│   │   ├── jobs/               # scheduled jobs (EventBridge)
│   │   ├── functions/          # Lambda functions isoladas
│   │   ├── lib/                # clients (instagram, whatsapp, gateway)
│   │   ├── middlewares/        # auth, error handler
│   │   ├── adapters/           # gateways de pagamento
│   │   └── utils/
│   ├── template.yaml           # SAM template (CloudFormation)
│   └── samconfig.toml          # SAM deploy config
├── frontend/
│   ├── src/
│   │   ├── App.js              # Rotas React Router
│   │   ├── components/         # Sidebar, Layout, ConfigXxx, UI
│   │   ├── pages/admin/        # Dashboard, Agenda, Clientes, etc.
│   │   ├── pages/cliente/      # Portal do cliente
│   │   ├── pages/public/       # Landing page
│   │   ├── contexts/           # AuthContext (Cognito)
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── styles/
│   └── package.json
└── web/                        # Landing page alternativa (Vite)
```

## Funcionalidades implementadas
- Dashboard com KPIs e pendências
- Agenda (integração Google Calendar)
- Clientes (CRUD + histórico)
- Orçamentos (criação, envio, aprovação)
- Contratos (geração, assinatura)
- Financeiro (cobranças, parcelas)
- Álbuns de fotos (upload S3, entrega CloudFront com signed URLs)
- Catálogo de serviços
- Follow-up automatizado
- WhatsApp (Meta Cloud API)
- Instagram (Meta Graph API — publicação automática)
- Notificações (e-mail SES + in-app)
- Equipamentos
- Notas Fiscais
- Aditivos contratuais
- Import CSV
- Feedback de clientes
- Gateways de pagamento: Asaas, Stripe, MercadoPago, Pagarme, PagBank, PicPay, SumUp, Banco Inter, Stone, InfinitePay
- Portal do cliente (álbuns, contratos, orçamentos, pagamentos)
- Tela de logs de integrações com botão de teste

## CI/CD (GitHub Actions)
- Workflow: `.github/workflows/deploy.yml`
- Trigger: push na `main` ou manual (workflow_dispatch)
- Jobs paralelos: deploy-api (SAM) + deploy-frontend (S3 + CloudFront)
- Secrets configurados no GitHub:
  - `AWS_ACCESS_KEY_ID`: AKIA6GNWSWPECERTFYBE (user mbf-deploy)
  - `AWS_SECRET_ACCESS_KEY`: configurado no GitHub Secrets
- Monitorar: https://github.com/marceloapb/aws/actions
- Disparo manual: Actions > "Deploy MBFoto Platform" > "Run workflow"

## AWS Account
- Account: 975877354440
- User: mbf-deploy
- Região principal: us-east-1 (tudo unificado)
- Cognito: us-east-1 (User Pool us-east-1_ENV0dsEJx)

## Padrões de código
- Frontend: componentes funcionais React, TailwindCSS inline, cor accent #EA580C
- API: Express Router, async/await, DynamoDB single-table (PK/SK + GSI1PK/GSI1SK)
- Commits: conventional commits (feat:, fix:, docs:)
- Build frontend no Windows: usar `node node_modules/react-scripts/bin/react-scripts.js build`

## Instruções para o Kiro
- **SEMPRE ao iniciar sessão**: executar `Set-Location D:\OneDrive\.Git\aws; git pull --rebase` antes de qualquer alteração
- Não fazer perguntas desnecessárias, só executa
- Repo local: D:\OneDrive\.Git\aws
- Depois de alterações, fazer commit + push (o GitHub Actions faz o deploy automaticamente)
- NÃO fazer deploy manual — o CI/CD cuida disso a cada push na main
- PowerShell no Windows (usar Set-Location, não cd &&)
- git pull --rebase antes de push se rejeitar
- Quando o Marcelo pedir pra publicar/deploy, só commit + push é suficiente
- Não perguntar sobre cache do navegador ou se o deploy está no lugar certo — confia no processo
