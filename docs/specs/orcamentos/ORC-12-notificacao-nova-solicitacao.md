# ORC-12: Notificação ao ADM em Nova Solicitação

## Metadados
- **ID:** ORC-12
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
Quando um lead/cliente solicita um orçamento pelo site/portal, o admin precisa ser notificado para não perder a oportunidade.

## Escopo
- Backend: Lambda `notificarNovoOrcamento`
- SES: template de email
- EventBridge: trigger após criação pelo cliente

## Fora de Escopo (NÃO TOCAR)
- WhatsApp (futuro)
- Push notification
- Formulário do site

## Spec Técnica

### Trigger
- Após PutItem de novo ORCAMENTO com origem='site' ou 'portal'
- EventBridge rule: detail-type = 'OrcamentoCriado'

### Lambda — notificarNovoOrcamento
- Buscar dados do orçamento + cliente
- Enviar email via SES para admin(s) do tenant
- Template: nome cliente, tipo de evento, data desejada, orçamento estimado

### Template SES
```
Assunto: 🆕 Nova solicitação de orçamento — {cliente_nome}
Corpo: Nome, Evento, Data, Telefone, Link para o orçamento no admin
```

## Critérios de Aceite
- [ ] Email enviado ao admin quando novo orçamento é criado por cliente
- [ ] Template com dados corretos
- [ ] Link funcional para o orçamento
- [ ] Não dispara para orçamentos criados pelo admin

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-12: Notificação ao ADM em Nova Solicitação.

1. Lambda notificarNovoOrcamento: triggered por EventBridge OrcamentoCriado.
2. Template SES com dados do cliente e link.
3. Filtro: só dispara se origem != 'admin'.
4. IAM: ses:SendTemplatedEmail.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
