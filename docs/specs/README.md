# Specs de Migração Serverless — Horizons Photography System

Este diretório contém as 13 specs priorizadas para migração completa do Horizons de monolito Express/PocketBase para arquitetura serverless AWS.

## Ordem de Execução Recomendada

```
SPEC-06 (template.yaml)
  → SPEC-02 (handler Lambda)
  → SPEC-04 (remover Dockerfile)
  → SPEC-03 (rate limiter)
  → SPEC-07 (segredos SSM)
  → SPEC-01 (DynamoDB)
  → SPEC-08 (Cognito)
  → SPEC-05 (jobs EventBridge)
  → SPEC-10 (presigned upload)
  → SPEC-09 (webhooks SQS)
  → SPEC-11 (CloudFront signed)
  → SPEC-12 (frontend CI/CD)
  → SPEC-13 (logs)
```

## Prioridades

| Prioridade | Specs |
|------------|-------|
| P0 (Urgente) | 01, 02, 03 |
| P1 (Alto impacto) | 04, 05, 06, 07, 08 |
| P2 (Melhoria) | 09, 10, 11, 12 |
| P3 (Desejável) | 13 |

## Como usar com Kiro CLI

Cada spec contém um **PROMPT PRONTO PARA O KIRO CLI** no final. Copie o bloco de código e cole no Kiro para implementação automática.

## Stack Alvo

- **Computação:** AWS Lambda (Node.js 20.x)
- **API:** Amazon API Gateway HTTP API
- **Banco:** Amazon DynamoDB (single-table, on-demand)
- **Auth:** Amazon Cognito User Pools
- **Storage:** Amazon S3 + CloudFront
- **Agendamento:** Amazon EventBridge Scheduler
- **Filas:** Amazon SQS
- **IaC:** AWS SAM
- **CI/CD:** GitHub Actions
