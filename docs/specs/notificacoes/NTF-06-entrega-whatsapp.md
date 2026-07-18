# NTF-06: Entrega por WhatsApp (Reusa Adapter §24, Template Aprovado)

## Metadados
- **ID:** NTF-06
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto — canal externo cliente
- **Esforço:** Baixo
- **Dependência:** NTF-03, WPP-01

## Contexto
Adapter que envia notificação via WhatsApp Cloud API, reutilizando o service do módulo WhatsApp (WPP-01). Usa templates UTILITY aprovados pela Meta. Não requer janela 24h (template pode ser enviado a qualquer hora).

## Escopo
- `apps/backend/src/adapters/notificacoes/whatsappAdapter.js` — NOVO
- Reutiliza: `services/whatsappService.js` (WPP-01)

## Fora de Escopo (NÃO TOCAR)
- Módulo WhatsApp completo (WPP-*)
- Dispatcher (NTF-03)
- Email (NTF-05)
- Follow-up WhatsApp (FLW-05 — separado)

## Spec Técnica

### Adapter — whatsappAdapter.js
```js
const { enviarTemplate } = require('../../services/whatsappService')

async function enviarNotificacaoWhatsApp({ tenantId, destinatarioId, regra, evento, tipoEvento }) {
  // 1. Resolver telefone do destinatário
  const cliente = await getCliente(tenantId, evento.cliente_id)
  if (!cliente?.telefone) {
    throw new Error('telefone_nao_encontrado')
  }
  
  const telefone = formatarE164(cliente.telefone)
  
  // 2. Montar payload do template
  const templateConfig = getTemplateConfig(regra.template_whatsapp)
  
  const payload = {
    telefone,
    template_name: templateConfig.name,
    template_language: 'pt_BR',
    components: [{
      type: 'body',
      parameters: templateConfig.buildParams(evento)
    }]
  }
  
  // 3. Enviar via Cloud API
  const resultado = await enviarTemplate(tenantId, payload)
  
  return {
    canal: 'whatsapp',
    destino: telefone,
    status: 'enviado',
    wamid: resultado.messages?.[0]?.id
  }
}

// Mapeamento templates
const TEMPLATES = {
  'tpl_album_publicado_wpp': {
    name: 'mbf_album_pronto',
    buildParams: (evt) => [
      { type: 'text', text: evt.cliente_nome },
      { type: 'text', text: evt.dados?.link || '' }
    ]
  },
  'tpl_contrato_enviado_wpp': {
    name: 'mbf_contrato_disponivel',
    buildParams: (evt) => [
      { type: 'text', text: evt.cliente_nome }
    ]
  },
  'tpl_pagamento_vencido_wpp': {
    name: 'mbf_pagamento_pendente',
    buildParams: (evt) => [
      { type: 'text', text: evt.cliente_nome },
      { type: 'text', text: String(evt.dados?.valor || '') }
    ]
  }
}

function getTemplateConfig(templateId) {
  const config = TEMPLATES[templateId]
  if (!config) throw new Error(`Template WhatsApp não mapeado: ${templateId}`)
  return config
}

module.exports = { enviarNotificacaoWhatsApp }
```

### Templates WhatsApp (aprovados pela Meta)
| Template Name | Categoria | Variáveis |
|---|---|---|
| mbf_album_pronto | UTILITY | {{1}}=nome, {{2}}=link |
| mbf_contrato_disponivel | UTILITY | {{1}}=nome |
| mbf_pagamento_pendente | UTILITY | {{1}}=nome, {{2}}=valor |

### Custo
| Volume | Custo (UTILITY BR) |
|---|---|
| 50 msgs/mês | ~$1.54 |
| 200 msgs/mês | ~$6.16 |
| 500 msgs/mês | ~$15.40 |

### Regras
- Reutilizar 100% o whatsappService existente
- Templates UTILITY: não precisa de janela 24h
- Se telefone não encontrado: falha sem retry
- Se erro 400 (template inválido): falha sem retry
- Se erro 500: falha registrada (notificação = fire-and-forget)
- Registrar wamid para tracking
- Destinatário: APENAS cliente (admin nunca recebe via WhatsApp)

## Critérios de Aceite
- [ ] Adapter envia via Cloud API
- [ ] Reutiliza whatsappService
- [ ] Template montado corretamente
- [ ] wamid registrado
- [ ] Se sem telefone: erro registrado
- [ ] Só envia para cliente (nunca admin)
- [ ] Fire-and-forget (sem retry)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec NTF-06: Entrega WhatsApp.

1. Crie adapters/notificacoes/whatsappAdapter.js.
2. Reutilizar services/whatsappService.js (enviarTemplate).
3. Mapeamento de 3 templates UTILITY.
4. Formatar telefone E.164.
5. Se sem telefone: throw erro.
6. Registrar wamid no retorno.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
