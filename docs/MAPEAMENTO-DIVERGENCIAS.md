# MAPEAMENTO DE DIVERGÊNCIAS: sistema-mbf → aws

Este documento registra as diferenças entre a documentação de concepção (repo `sistema-mbf`) e a implementação serverless real (repo `aws`). O repo `sistema-mbf` é fonte da verdade de **NEGÓCIO** (regras, fluxos, módulos). O repo `aws` é fonte da verdade de **IMPLEMENTAÇÃO** (como isso se traduz em serverless AWS).

> **Premissa:** O repo `sistema-mbf` NÃO será alterado. Este documento serve como "dicionário de tradução" entre os conceitos lá descritos e a realidade técnica aqui implementada.

---

## Legenda de Severidade

- 🔴 ALTA — conceito estrutural diferente, requer mapeamento explícito
- 🟡 MÉDIA — terminologia ou padrão diferente, tradução direta
- 🟢 BAIXA — diferença cosmética ou já resolvida por spec existente

---

## Tabela de Mapeamento

| # | Área | sistema-mbf diz | aws implementa | Severidade | Spec que resolve |
|---|------|-----------------|----------------|------------|------------------|
| D1 | Stack/Runtime | "Monólito modular, um sistema, um deploy" | Lambda por função + API Gateway HTTP API + SAM | 🔴 ALTA | SPEC-02, SPEC-06 |
| D2 | Banco de dados | "PostgreSQL" | DynamoDB on-demand, single-table design | 🔴 ALTA | SPEC-01 |
| D3 | Multi-tenant | "RLS por tenant_id em cada tabela" | PK prefix `TENANT#<id>` + IAM LeadingKeys condition | 🔴 ALTA | SPEC-01 (base) |
| D4 | Jobs assíncronos | "Fila de trabalhos dentro do mesmo deploy" | EventBridge Scheduler + SQS + Lambda consumer | 🟡 MÉDIA | SPEC-05, SPEC-09 |
| D5 | API layer | Express.js monolítico com middlewares | Lambda handlers stateless + HTTP API Gateway | 🟡 MÉDIA | SPEC-02 |
| D6 | Processamento imagem | "Job na mesma fila, gera versões" | S3 trigger → Lambda com Sharp layer | 🟡 MÉDIA | SPEC-10, SPEC-21 |
| D7 | Cofre credenciais | "Cofre" genérico | SSM Parameter Store SecureString | 🟢 BAIXA | SPEC-07 |
| D8 | Auth | "Conta com senha, dois perfis" | Cognito User Pool + Groups (admin/cliente) | 🟢 BAIXA | SPEC-08, SPEC-14 |
| D9 | Webhooks | "Endpoint no monólito com retry" | API GW → SQS → Lambda consumer + DLQ | 🟡 MÉDIA | SPEC-09 |
| D10 | Frontend hosting | Não especificado | S3 + CloudFront (Amplify Hosting) | 🟢 BAIXA | SPEC-12 |
| D11 | IaC | Sem menção | AWS SAM (template.yaml) | 🟢 BAIXA | SPEC-06 |
| D12 | Observabilidade | "Alertas ao ADM no dashboard" | CloudWatch + logs JSON estruturados | 🟢 BAIXA | SPEC-13 |
| D13 | Rate limiter | Resquício Express | Removido — API GW tem throttling nativo | 🟢 BAIXA | SPEC-03 |
| D14 | Containers | Docker/Dockerfile | Removido — Lambda nativo | 🟢 BAIXA | SPEC-04 |

---

## Divergências Internas no repo sistema-mbf (para referência)

Estas divergências existem DENTRO do repo sistema-mbf entre seus próprios docs. Não vamos corrigi-las lá — apenas documentamos aqui para evitar confusão:

| # | Doc A | Doc B | Conflito | Como interpretamos no aws |
|---|-------|-------|----------|---------------------------|
| I1 | MVP-1 §2 diz "monólito" | SISTEMA-MBF.md lista "Lambda, DynamoDB" | SISTEMA-MBF.md é mais recente | Seguimos serverless |
| I2 | arquitetura §0 diz "PostgreSQL" | MODELO-DE-DADOS.md modela PK/SK/GSI | MODELO-DE-DADOS está atualizado | Seguimos DynamoDB |
| I3 | arquitetura §8 detalha RLS | Decisão implícita de DynamoDB | arq §8 obsoleto | Isolamento por PK partition |
| I4 | MVP-1 §7 diz "Google Calendar sync" genérico | arquitetura §6 detalha sync | Sem conflito, apenas profundidade | Lambda + retry (SPEC-18) |
| I5 | §21 usa "EventoWebhook" | arq §2.4 usa "EVENTO_GATEWAY" | Mesma coisa, nomes diferentes | Usamos `WebhookEvent` no código |

---

## Como usar este documento

1. Ao ler qualquer doc do repo `sistema-mbf`, use esta tabela para traduzir conceitos
2. Quando o sistema-mbf diz "banco", leia "DynamoDB single-table"
3. Quando diz "fila", leia "SQS + Lambda consumer"
4. Quando diz "cron/job", leia "EventBridge Scheduler + Lambda"
5. Quando diz "endpoint", leia "Lambda handler + rota no API Gateway HTTP API"
6. Quando diz "RLS", leia "isolamento por PK prefix TENANT#"

---

## Princípios de decisão (stack alvo)

- Computação: AWS Lambda (Node.js, handlers stateless)
- API: Amazon API Gateway HTTP API
- Permissões: IAM com privilégio mínimo, uma role por função
- Banco: DynamoDB on-demand, single-table design
- Auth: Amazon Cognito User Pools
- Storage: S3 + CloudFront com URLs assinadas
- Agendamento: EventBridge Scheduler + Lambda
- E-mail: Amazon SES
- Filas: Amazon SQS
- Orquestração: Step Functions (quando necessário)
- IaC: AWS SAM (template.yaml)
- Segredos: SSM Parameter Store
- Logs: CloudWatch com JSON estruturado
