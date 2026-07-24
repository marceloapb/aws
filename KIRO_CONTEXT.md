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

## Pendências / Próximas implementações
- **Templates de E-mail**: criar aba em Configurações > E-mails com:
  - Nome do remetente configurável (na tela Integrações)
  - Editor visual (tipo o do contrato) para cada template
  - Logo da empresa no cabeçalho de todos os e-mails
  - Templates para: contrato assinatura, orçamento novo, álbum publicado, lembrete pagamento, boas-vindas, follow-up, notificação geral
  - Variáveis dinâmicas disponíveis em cada template
  - O SES_FROM_EMAIL está em SSM (/mbf/prod/SES_FROM_EMAIL = contato@bloise.com.br)
  - Domínio verificado no SES: bloise.com.br

## Problemas conhecidos
- WhatsApp Meta API: token expirado (Invalid OAuth access token) — precisa renovar no painel Meta
- Despesas recorrentes: o POST funciona mas precisa testar se está gravando
- Modelo Bedrock para texto (amazon.nova-micro): funciona, mas para contratos longos usa nova-lite com chunks
- Portfolio: pipeline de thumbnails (SQS → Lambda) criado mas a Lambda de processamento pode não estar deployada ainda (depende do SAM deploy com sharp)

## Contexto técnico importante
- tenantId do admin Cognito: 3438a468-a031-7040-2d21-abc059a80915
- Configurações ficam em TENANT#default (não no sub do admin)
- Modelos de contrato ficam em TENANT#<adminSub> (3438a468...)
- Clientes self-signup ficam em CLIENT#<cognitoSub>/PROFILE
- Clientes criados pelo admin ficam em TENANT#default/CLIENTE#<id>
- Orçamentos ficam em CLIENTE#<clienteId>/ORCAMENTO#<id> com GSI1PK=ORCAMENTO
- Contratos ficam em CLIENTE#<clienteId>/CONTRATO#<id> com GSI1PK=CONTRATO
- Status normalizado no frontend admin: aprovado→accepted, solicitado→draft, rascunho→draft
- Portfolio fotos: bucket público para /1/portfolio/*, usa -web.webp para exibição
