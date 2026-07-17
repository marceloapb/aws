# CT-08: Notificações (Contrato Gerado + Assinado)

## Metadados
- **ID:** CT-08
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** CT-05

## Contexto
Enviar notificações por email e WhatsApp nos eventos: contrato gerado (para cliente), contrato assinado (para admin e cliente), contrato expirado (para admin).

## Escopo
- `apps/backend/src/handlers/contratos/notificar.js` — NOVO
- EventBridge: consumir eventos de contrato
- SES: emails
- WhatsApp (WPP-06): mensagens

## Fora de Escopo (NÃO TOCAR)
- Aceite (CT-05)
- Follow-up (CT-09 — régua separada)
- Templates WhatsApp (WPP-03)

## Spec Técnica

### Eventos Consumidos
| Evento | Destinatário | Canal | Mensagem |
|---|---|---|---|
| contrato.gerado | Cliente | Email + WhatsApp | "Seu contrato está pronto para assinatura" |
| contrato.assinado | Admin | Email + WhatsApp | "Cliente assinou o contrato!" |
| contrato.assinado | Cliente | Email | "Confirmação: contrato assinado" + PDF anexo |
| contrato.expirado | Admin | Email | "Contrato expirou sem assinatura" |
| contrato.pdf_gerado | Cliente | Email | PDF do contrato como anexo |

### Notificação — Contrato Gerado (para cliente)
```js
async function notificarContratoGerado(evento) {
  const { tenant_id, contrato_id } = evento
  const contrato = await getContrato(tenant_id, contrato_id)
  const cliente = await getCliente(tenant_id, contrato.cliente_id)
  
  // Email
  await enviarEmail({
    para: cliente.email,
    assunto: 'Seu contrato está pronto para assinatura',
    template: 'contrato-gerado',
    dados: {
      nome_cliente: cliente.nome,
      link_contrato: contrato.link_cliente,
      prazo_dias: contrato.prazo_assinatura_dias
    }
  })
  
  // WhatsApp (se configurado)
  await enviarWhatsApp(tenant_id, cliente.telefone, 'contrato_gerado', {
    nome: cliente.nome,
    link: contrato.link_cliente
  })
}
```

### Notificação — Contrato Assinado (para admin)
```js
async function notificarContratoAssinado(evento) {
  const { tenant_id, contrato_id } = evento
  const contrato = await getContrato(tenant_id, contrato_id)
  const cliente = await getCliente(tenant_id, contrato.cliente_id)
  
  // Email para admin
  await enviarEmailAdmin(tenant_id, {
    assunto: `✅ ${cliente.nome} assinou o contrato!`,
    template: 'contrato-assinado-admin',
    dados: { nome_cliente: cliente.nome, contrato_id }
  })
  
  // WhatsApp para admin (WPP-10)
  await avisarAdmin(tenant_id, `✅ ${cliente.nome} assinou o contrato para ${contrato.snapshot_orcamento.tipo_evento}`)
}
```

## Critérios de Aceite
- [ ] Email enviado ao gerar contrato
- [ ] WhatsApp enviado ao gerar (se configurado)
- [ ] Admin notificado ao assinar
- [ ] Cliente recebe confirmação + PDF ao assinar
- [ ] Admin notificado ao expirar
- [ ] Consume eventos via EventBridge

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CT-08: Notificações de Contratos.

1. Crie handlers/contratos/notificar.js: consumir eventos contrato.*
2. Contrato gerado: email + WhatsApp para cliente.
3. Contrato assinado: email admin + email+PDF cliente.
4. Contrato expirado: email admin.
5. Usar SES + WPP-06 (se configurado).
6. SAM: triggers EventBridge para 3 eventos.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
