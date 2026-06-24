# 🚀 Guia Deploy AWS Full — Horizons Photography System

**Arquitetura:** Amplify (Frontend) + ECS Fargate (Backend) + S3/CloudFront (Fotos) + PocketBase (DB)

---

## Arquitetura Final

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

---

## Etapa 1 — S3 + CloudFront (15 min)

### Criar bucket de fotos
```bash
aws s3 mb s3://horizons-photos-production --region sa-east-1
```

### Configurar CORS
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://app.seudominio.com.br", "https://api.seudominio.com.br"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### Criar IAM User
Policy com acesso a S3 + SES.

---

## Etapa 2 — EFS + ECS Fargate (20 min)

### Criar EFS
```bash
aws efs create-file-system --performance-mode generalPurpose --encrypted --region sa-east-1
```

### Dockerfile
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

FROM node:20-alpine
RUN apk add --no-cache wget unzip curl
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v0.26.8/pocketbase_0.26.8_linux_amd64.zip \
    && unzip pocketbase_0.26.8_linux_amd64.zip -d /usr/local/bin/ \
    && rm pocketbase_0.26.8_linux_amd64.zip
WORKDIR /app
COPY --from=builder /app .
RUN mkdir -p /data/pb_data
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 3000 8090
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:3000/api/health || exit 1
ENTRYPOINT ["/docker-entrypoint.sh"]
```

### Task Definition (ECS)
- CPU: 1024 (1 vCPU)
- Memory: 2048 (2GB)
- EFS volume montado em /data
- Secrets do Secrets Manager

---

## Etapa 3 — AWS Amplify (10 min)

### amplify.yml
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - echo "VITE_API_URL=$VITE_API_URL" >> .env.production
        - echo "VITE_CDN_URL=$VITE_CDN_URL" >> .env.production
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Variáveis no Amplify
- VITE_API_URL = https://api.seudominio.com.br
- VITE_CDN_URL = https://cdn.seudominio.com.br

---

## Etapa 4 — Secrets Manager (5 min)

```bash
aws secretsmanager create-secret --name horizons/jwt-secret --secret-string "$(openssl rand -base64 64)"
aws secretsmanager create-secret --name horizons/aws-keys --secret-string '{...}'
aws secretsmanager create-secret --name horizons/payment-gateways --secret-string '{...}'
aws secretsmanager create-secret --name horizons/meta-tokens --secret-string '{...}'
aws secretsmanager create-secret --name horizons/google-calendar --secret-string '{...}'
```

---

## Etapa 5 — CI/CD (GitHub Actions)

```yaml
name: Deploy API to ECS
on:
  push:
    branches: [main]
    paths: ['apps/api/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
      - uses: aws-actions/amazon-ecr-login@v2
      - run: docker build -t horizons-api apps/api
      - run: docker push $ECR_REGISTRY/horizons-api:latest
      - run: aws ecs update-service --cluster horizons-cluster --service horizons-api --force-new-deployment
```

---

## Etapa 6 — Monitoramento

- CloudWatch Logs (retention 30 dias)
- Alarms: CPU > 80%, Memory > 80%
- SNS Topic para alertas por email
- Auto Scaling: 1-3 tasks baseado em CPU

---

## Custo Estimado

| Serviço | Custo/mês |
|---------|-----------|
| ECS Fargate (1 task) | ~$35 |
| EFS (10GB) | ~$3 |
| ALB | ~$20 |
| S3 (500GB) | ~$12 |
| CloudFront (100GB) | ~$9 |
| Amplify | ~$5 |
| SES | ~$1 |
| CloudWatch | ~$3 |
| Secrets Manager | ~$3 |
| ECR | ~$1 |
| **TOTAL** | **~$92/mês** |
