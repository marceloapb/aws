# IND-08 — SAM Resources (template.yaml)

**ID:** IND-08  
**TIPO:** Melhoria  
**PRIORIDADE:** P1  
**IMPACTO:** Alto | **ESFORÇO:** Médio  

---

## Contexto

Todos os recursos da §31 precisam ser declarados no template.yaml (IaC). Inclui 8 Lambdas, 1 EventBridge Rule, IAM roles com privilégio mínimo, e variáveis de ambiente.

---

## Escopo

- `template.yaml`

## Fora de Escopo (NÃO TOCAR)

- Resources de outros módulos já existentes.
- DynamoDB Table (já existe, single-table).
- Cognito User Pool (já existe).

---

## Spec Técnica

### Functions a declarar (8)

| Function | Path | Evento | Auth |
|---|---|---|---|
| GetIndicacoesConfigFn | indicacoes/getIndicacoesConfig | GET /indicacoes/config | Cognito (admin) |
| UpdateIndicacoesConfigFn | indicacoes/updateIndicacoesConfig | PUT /indicacoes/config | Cognito (admin) |
| ListIndicacoesFn | indicacoes/listIndicacoes | GET /indicacoes | Cognito (admin) |
| RevogarIndicadorFn | indicacoes/revogarIndicador | PATCH /indicacoes/{id}/revogar | Cognito (admin) |
| GetMinhasIndicacoesFn | indicacoes/getMinhasIndicacoes | GET /cliente/indicacoes | Cognito (client) |
| GetMeuCodigoFn | indicacoes/getMeuCodigo | GET /cliente/indicacoes/codigo | Cognito (client) |
| ResolverCodigoFn | indicacoes/resolverCodigo | GET /public/ref/{codigo} | None |
| ConfirmarIndicacaoFn | indicacoes/confirmarIndicacao | EventBridge Rule | N/A |

### IAM — Políticas por função (privilégio mínimo)

- **Read handlers:** `dynamodb:Query`, `dynamodb:GetItem` no table ARN + index ARN.
- **Write handlers:** + `dynamodb:UpdateItem`, `dynamodb:PutItem`.
- **ConfirmarIndicacao:** + `sqs:SendMessage` na fila de notificações + `events:PutEvents`.
- **ResolverCodigo:** apenas `dynamodb:Query` (sem auth, leitura mínima).

### Environment Variables comuns

```yaml
TABLE_NAME: !Ref MainTable
DOMAIN: !Ref DomainParam
```

### ConfirmarIndicacao adicional

```yaml
NOTIFICATION_QUEUE_URL: !Ref NotificationQueue
```

---

## Critérios de Aceite

1. `sam validate` passa sem erro.
2. Cada function tem role própria com privilégio mínimo.
3. Rotas públicas sem authorizer; demais com CognitoAuthorizer.
4. EventBridge Rule filtra `source=mbf.contratos, detail-type=ContratoAssinado`.

---

## Prompt para o Kiro

```
No arquivo `template.yaml`, adicione 8 resources AWS::Serverless::Function para o
módulo indicações conforme tabela desta spec. Cada function com role inline (privilégio
mínimo: apenas as actions DynamoDB necessárias sobre o ARN da MainTable).
ResolverCodigoFn sem Auth. ConfirmarIndicacaoFn com evento EventBridgeRule
(source=mbf.contratos, detail-type=ContratoAssinado) e env var NOTIFICATION_QUEUE_URL.
Não altere nenhum resource existente no template. Adicione APENAS os 8 novos.
```
