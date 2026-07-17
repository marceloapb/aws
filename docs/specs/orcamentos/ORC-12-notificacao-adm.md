# ORC-12: Notificação ao ADM em Nova Solicitação

## Metadados
- **ID:** ORC-12
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
Quando um cliente solicita um orçamento pelo site/portal, o admin precisa ser notificado para responder rápido. Hoje possivelmente depende de check manual.

## Escopo
- Backend: Lambda `notificarNovoOrcamento` — NOVO
- EventBridge: evento ORCAMENTO_CRIADO_CLIENTE
- SES: email ao admin
- DynamoDB: preferência de notificação

## Fora de Escopo (NÃO TOCAR)
- WhatsApp (futuro)
- Push notification (futuro)
- Solicitação em si

## Spec Técnica

### Trigger
- Evento: ORCAMENTO_CRIADO_CLIENTE (publicado quando cliente cria solicitação)
- Lambda consome evento → envia email via SES

### Email
- To: admin do tenant (email principal)
- Subject: "Nova solicitação de orçamento — {nome_cliente}"
- Body: nome cliente, tipo evento, data desejada, link para o orçamento no admin

### SAM
```yaml
NotificarNovoOrcamentoFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: handlers/notificarNovoOrcamento.handler
    Timeout: 10
    Events:
      EventBridgeRule:
        Type: EventBridgeRule
        Properties:
          Pattern:
            source: ["mbf.orcamentos"]
            detail-type: ["ORCAMENTO_CRIADO_CLIENTE"]
```

## Critérios de Aceite
- [ ] Admin recebe email ao ter nova solicitação
- [ ] Email contém dados do cliente e evento
- [ ] Link direto para o orçamento no admin
- [ ] Se SES falha, não quebra fluxo principal
- [ ] Preferência de notificação respeitada

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-12: Notificação ao ADM.

1. Lambda notificarNovoOrcamento: consumir evento, enviar email via SES.
2. SAM: EventBridgeRule para ORCAMENTO_CRIADO_CLIENTE.
3. IAM: ses:SendEmail + dynamodb:GetItem (preferência).

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
