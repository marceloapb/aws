# FLW-05: Disparo por WhatsApp (Reusa Adapter WPP §24)

## Metadados
- **ID:** FLW-05
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** FLW-03, WPP-01

## Contexto
Consumer da mesma fila SQS que dispara mensagem via WhatsApp Cloud API quando o canal é 'whatsapp'. Reutiliza o adapter do módulo WhatsApp (WPP-01/02). Usa templates aprovados pela Meta. Registra resultado no DISPARO.

## Escopo
- `apps/backend/src/handlers/followup/disparoWhatsapp.js` — NOVO
- Reutiliza: `services/whatsappService.js` (WPP-01)
- SQS consumer (mesma fila, filtra canal)

## Fora de Escopo (NÃO TOCAR)
- Módulo WhatsApp completo (WPP-*)
- Motor de varredura (FLW-03)
- Email (FLW-04)
- Escalonamento (FLW-06)

## Spec Técnica

### SQS Consumer — disparoWhatsapp.js
```js
async function handler(event) {
  for (const record of event.Records) {
    const msg = JSON.parse(record.body)
    
    if (msg.canal !== 'whatsapp') continue
    
    try {
      // 1. Buscar dados do cliente
      const cliente = await getCliente(msg.tenantId, msg.cliente_id)
      if (!cliente?.telefone) {
        await registrarDisparo(msg, 'falha', 'telefone_nao_encontrado')
        return
      }
      
      // 2. Formatar telefone (E.164)
      const telefone = formatarTelefone(cliente.telefone)
      
      // 3. Montar payload do template
      const templatePayload = montarTemplate(msg.template_id, {
        nome: cliente.nome,
        dominio: msg.dominio,
        recurso_id: msg.recurso_id,
        tentativa: msg.tentativa
      })
      
      // 4. Enviar via Cloud API (reutiliza adapter WPP)
      const resultado = await enviarTemplateWhatsApp(msg.tenantId, {
        telefone,
        template_name: templatePayload.name,
        template_language: 'pt_BR',
        components: templatePayload.components
      })
      
      // 5. Registrar sucesso
      await registrarDisparo(msg, 'enviado', null, {
        wamid: resultado.messages[0].id
      })
      
    } catch (error) {
      // Se erro 400 (template inválido): não retentar
      if (error.statusCode === 400) {
        await registrarDisparo(msg, 'falha', error.message)
        return
      }
      // Erro técnico: throw para SQS retry
      await registrarDisparo(msg, 'falha', error.message)
      throw error
    }
  }
}
```

### Templates WhatsApp (aprovados pela Meta)
| Template Name | Categoria | Variáveis |
|---|---|---|
| mbf_orcamento_lembrete | UTILITY | {{1}}=nome, {{2}}=valor |
| mbf_contrato_lembrete | UTILITY | {{1}}=nome |
| mbf_pagamento_lembrete | UTILITY | {{1}}=nome, {{2}}=valor, {{3}}=vencimento |
| mbf_feedback_convite | UTILITY | {{1}}=nome, {{2}}=link |
| mbf_album_pronto | UTILITY | {{1}}=nome, {{2}}=link |

### Montar Template
```js
function montarTemplate(template_id, dados) {
  const templates = {
    'tpl_orc_wpp': {
      name: 'mbf_orcamento_lembrete',
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: dados.nome },
          { type: 'text', text: dados.valor || '' }
        ]
      }]
    },
    'tpl_ct_wpp': {
      name: 'mbf_contrato_lembrete',
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: dados.nome }
        ]
      }]
    },
    // ... demais
  }
  
  return templates[template_id]
}
```

### Entidade DISPARO (WhatsApp)
```json
{
  "PK": "GATILHO#gat_001",
  "SK": "DISPARO#3#2026-07-28T09:00:00Z",
  "tentativa": 3,
  "canal": "whatsapp",
  "destino": "5511999999999",
  "template_id": "tpl_orc_wpp",
  "template_name": "mbf_orcamento_lembrete",
  "status": "enviado",
  "wamid": "wamid.xxx",
  "erro": null,
  "enviado_em": "2026-07-28T09:00:00Z"
}
```

### Regras
- Reutilizar 100% o adapter do WPP (enviarTemplateWhatsApp)
- Templates UTILITY: menor custo ($0.0308/msg no BR)
- Se telefone não existe: falha sem retry
- Se erro 400 (template inválido/não aprovado): falha sem retry
- Se erro 500/timeout: throw para SQS retry (até DLQ)
- Registrar wamid para tracking de delivery
- Rate limit: respeitar janela do WhatsApp (fora da janela só template)

### Custo
| Volume | Custo (UTILITY BR) |
|---|---|
| 100 msgs/mês | ~$3.08 |
| 500 msgs/mês | ~$15.40 |
| 1000 msgs/mês | ~$30.80 |

## Critérios de Aceite
- [ ] Consumer processa mensagens canal='whatsapp'
- [ ] Reutiliza adapter WPP existente
- [ ] Template montado corretamente
- [ ] Mensagem enviada via Cloud API
- [ ] DISPARO registrado com wamid
- [ ] Se sem telefone: falha sem retry
- [ ] Se erro 400: falha sem retry
- [ ] Se erro 500: retry via SQS

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FLW-05: Disparo WhatsApp.

1. Crie handlers/followup/disparoWhatsapp.js: SQS consumer.
2. Reutilizar services/whatsappService.js (enviarTemplateWhatsApp).
3. Montar payload de template com variáveis.
4. Registrar DISPARO com wamid.
5. Se sem telefone ou erro 400: falha sem retry.
6. Se erro 500: throw para SQS retry.
7. SAM: mesmo SQS trigger, filtro por canal.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
