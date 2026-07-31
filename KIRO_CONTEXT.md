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
- **Combos/Selects**: TODAS as opções de dropdowns devem estar em ORDEM ALFABÉTICA (exceto quando a ordem tem significado funcional, ex: pipeline de status)
- Listas dinâmicas (do banco): ordenar com `.sort((a,b) => a.nome.localeCompare(b.nome))` antes de renderizar

## Instruções para o Kiro
- **SEMPRE ao iniciar sessão**: executar `Set-Location D:\OneDrive\.Git\aws; git pull --rebase` antes de qualquer alteração
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
- Despesas recorrentes: o POST funciona mas precisa testar se está gravando
- Modelo Bedrock para texto (amazon.nova-micro): funciona, mas para contratos longos usa nova-lite com chunks
- Portfolio: pipeline de thumbnails (SQS → Lambda) criado mas a Lambda de processamento pode não estar deployada ainda (depende do SAM deploy com sharp)
- **Página pública do álbum (AlbumGaleria.jsx)**: Ignora quase todo o tema — cores, layout, fontes, bordas. Usa grid hardcoded. Precisa refatorar para usar tema da API.
- **qualidade_imagem**: Salva no tema mas não é consumido em nenhum lugar (precisa backend/CDN)
- **Fontes na página pública**: Não carrega Google Fonts dinamicamente

## Contexto técnico importante
- **TENANT ÚNICO: `TENANT#default`** — TODO o sistema usa apenas este tenant. NÃO existe mais TENANT#1 nem TENANT#<cognitoSub>.
- tenantId do admin Cognito: 3438a468-a031-7040-2d21-abc059a80915 (mas NÃO é usado como PK de tenant)
- O código resolve tenant via: `process.env.TENANT_ID || 'default'` ou `req.tenantId || 'default'`
- Configurações ficam em TENANT#default / CONFIG#...
- Modelos de contrato ficam em TENANT#default / MODELO_CONTRATO#<id>
- Clientes self-signup ficam em CLIENT#<cognitoSub>/PROFILE
- Clientes criados pelo admin ficam em TENANT#default / CLIENTE#<id>
- Orçamentos ficam em CLIENTE#<clienteId>/ORCAMENTO#<id> com GSI1PK=ORCAMENTO
- Contratos ficam em CLIENTE#<clienteId>/CONTRATO#<id> com GSI1PK=CONTRATO
- Status normalizado no frontend admin: aprovado→accepted, solicitado→draft, rascunho→draft
- Portfolio fotos: bucket público para /1/portfolio/*, usa -web.webp para exibição
- **NUNCA usar TENANT#1 ou TENANT#<cognitoSub> — sempre TENANT#default**

## Notas técnicas da sessão 30/07/2026
- **AlbumPreview.jsx**: CUIDADO com useState — TODOS os hooks devem ficar ANTES dos `if (loading) return` / `if (!album) return`. Já causou tela branca 2x.
- **GalleryPhoto.jsx**: Componente wrapper que aplica animações (scroll/hover/overlay) + bordas. Usado tanto no editor (PreviewGalleryGrid via renderItem) quanto no AlbumPreview (GalleryGrid via renderItem).
- **useScrollAnimation.js**: Hook que reseta quando `animacao` muda (permite re-testar efeitos no editor).
- **Animações**: Salvas como `animacao_scroll`, `animacao_hover`, `animacao_overlay` no tema. API aceita ambos os nomes (com e sem prefixo).

## Notas técnicas da sessão 31/07/2026
- **Seleção de fotos (admin preview)**: Persiste no backend via POST /admin/albuns/:id/selecao/toggle. Campo `selecionada` na foto (PK=ALBUM#id, SK=FOTO#id). Tem botão "Confirmar Seleção" (com diálogo salvar/finalizar), "Limpar", e "Reabrir seleção".
- **Seleção de fotos (público)**: AlbumGaleria.jsx replica 100% do AlbumPreview — mesma GalleryGrid com SelectionOverlay (Heart), mesma barra de progresso, mesmo lightbox.
- **Páginas públicas do álbum**: AlbumPublico.jsx (capa) usa TODOS os capa_layout do tema (elegante, ousado, editorial, split, cinematico, full, minimalista). AlbumGalerias.jsx (sets) e AlbumGaleria.jsx (fotos) usam cores/fontes/layout do tema.
- **Endpoint público assinarFoto()**: DEVE retornar width, height, content_type, selecionada — sem eles os layouts não funcionam.
- **Logo em emails**: Usar `logo_key` com CDN URL (d2112x4m4e89fv.cloudfront.net) — NUNCA usar logo_url presigned (expira em 1h).
- **WhatsApp templates aprovados na Meta (pt_BR)**: album_pronto, contrato_assinado_aviso, contrato_assinatura, evento_confirmado, feedback_solicitacao, lembrete_evento, mbfoto_codigo_verificacao, notificacao_geral, novo_orcamento, orcamento_pronto, pagamento_confirmado, pagamento_vencido.
- **WhatsApp dispatcher**: Envia 3 parâmetros [cliente_nome, titulo, mensagem]. Registra envios em WHATSAPP#<numero>/OUT# para contabilização de custos.
- **NotificationDispatcher**: Enriquece automaticamente dados do cliente (whatsapp, email, nome) quando tem cliente_id nos dados do evento.
- **Email templates**: Novos tipos adicionados: contrato_token (código verificação), contrato_pronto (convite assinatura).
- **ConfigEmails**: Toggle Visual/HTML no editor de templates.
- **Abas removidas**: "Log de Entregas" removido de /admin/comunicacao/regras (centralizado em /admin/integracoes/logs). Abas "E-mails" e "Notificações" removidas de /admin/config.
- **Logs integrações**: GET /admin/integracoes/logs agora busca INTLOG + LOG_NTF unificados. Filtro por canal funciona para ambos.
- **Logo cache localStorage**: Todas as telas usam mbf_logo_url, mbf_logo_dark_url, mbf_empresa_nome no localStorage para exibição instantânea.
- **MeusAlbuns.jsx (portal cliente)**: Usa /client/albuns (não /albums/mine). Campos: titulo, thumbnail_url, total_fotos, slug. Ao clicar abre window.open('/album/:slug', '_blank').
- **client-albuns.js GET /:id**: Aceita tanto UUID quanto slug. Se não achar por ID, busca por slug nos álbuns do cliente.
- **Regras de Calendário**: Nova funcionalidade em `/admin/notificacoes/calendario`. Rota: `admin-calendario-rules.js`. SK: `CALENDAR_RULE#<id>`.
- **Regras de Disparo**: 20 regras cadastradas. SK: `REGRA_NTF#<id>`. Campos: `titulo_template`, `mensagem_template`, `whatsapp_template`.
- **Download ZIP**: Frontend usa JSZip para baixar todas as fotos como .zip. Dependência: `jszip@3.10.1` + `yaml@2.9.0` (necessário para resolver conflito tailwindcss/postcss-load-config).
- **Deploy**: O lockfile do frontend DEVE ter `yaml@2.9.0` como dependência direta para evitar erro no `npm ci` do GitHub Actions.
