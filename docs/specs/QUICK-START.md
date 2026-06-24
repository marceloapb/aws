# 🚀 Quick Start — Migração Serverless com Kiro CLI

## Pré-requisitos

```bash
# Instalar AWS SAM CLI
brew install aws-sam-cli  # macOS
# ou: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

# Verificar
sam --version
aws --version
node --version  # >= 20.x
```

## Método 1: Script Interativo (Recomendado)

```bash
cd /path/to/marceloapb/aws
chmod +x docs/specs/run-specs.sh
./docs/specs/run-specs.sh
```

O script mostra cada prompt na ordem correta. Copie, cole no Kiro, valide, e prossiga.

## Método 2: Manual (spec por spec)

### Passo 1 — Abra o Kiro no projeto
```bash
cd /path/to/marceloapb/aws
kiro .  # ou abra via IDE
```

### Passo 2 — Execute na ordem

| # | Comando no terminal para ver o prompt |
|---|--------------------------------------|
| 1 | `cat docs/specs/SPEC-06-criar-template-sam.md` |
| 2 | `cat docs/specs/SPEC-02-express-para-lambda-handler.md` |
| 3 | `cat docs/specs/SPEC-04-remover-dockerfile.md` |
| 4 | `cat docs/specs/SPEC-03-remover-rate-limiter.md` |
| 5 | `cat docs/specs/SPEC-07-segredos-ssm.md` |
| 6 | `cat docs/specs/SPEC-01-pocketbase-para-dynamodb.md` |
| 7 | `cat docs/specs/SPEC-08-auth-cognito.md` |
| 8 | `cat docs/specs/SPEC-05-jobs-eventbridge-lambda.md` |
| 9 | `cat docs/specs/SPEC-10-upload-presigned-url.md` |
| 10 | `cat docs/specs/SPEC-09-webhooks-sqs-dlq.md` |
| 11 | `cat docs/specs/SPEC-11-cloudfront-signed-urls.md` |
| 12 | `cat docs/specs/SPEC-12-frontend-cicd.md` |
| 13 | `cat docs/specs/SPEC-13-logs-estruturados.md` |

### Passo 3 — Valide entre cada spec

```bash
# Após SPEC-06:
cd apps/api && sam validate

# Após SPEC-02:
sam build

# Após SPEC-01 (DynamoDB):
npm install
grep -r "pocketbase" --include="*.js" src/  # deve retornar vazio

# Validação final:
sam build && sam local start-api
```

### Passo 4 — Deploy

```bash
cd apps/api
sam deploy --guided
```

## Troubleshooting

| Problema | Solução |
|----------|--------|
| `sam validate` falha | Verifique indentação YAML no template.yaml |
| `sam build` falha | Rode `npm install` primeiro, verifique Node >= 20 |
| Import não encontrado | Verifique se a spec anterior foi executada (dependência) |
| SPEC-01 muito grande | Peça ao Kiro para fazer por domínio: "Migre apenas as rotas admin-*" |
| Timeout no Kiro | Quebre a spec em partes menores |

## Dicas Pro

1. **Commite após cada spec** — facilita rollback se algo quebrar
2. **SPEC-01 é a mais pesada** — se o Kiro travar, divida por arquivo de rota
3. **Teste local antes de deploy** — `sam local start-api` é seu amigo
4. **SSM primeiro** — crie os parâmetros no console AWS antes do primeiro deploy
5. **Não pule a ordem** — specs têm dependências entre si
