# WPP-03: CRUD de Templates (Categoria, Variáveis, Evento)

## Metadados
- **ID:** WPP-03
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Médio
- **Dependência:** WPP-01

## Contexto
Templates são mensagens pré-aprovadas pela Meta para envio fora da janela de 24h. Cada template tem categoria (utility/marketing), corpo com variáveis ({{1}}, {{2}}), e vínculo com evento de negócio.

## Escopo
- `apps/backend/src/handlers/whatsapp/templates.js` — NOVO
- `apps/frontend/src/pages/admin/WhatsAppTemplates.jsx` — NOVO
- `apps/frontend/src/pages/admin/TemplateForm.jsx` — NOVO
- API: /admin/whatsapp/templates (CRUD)
- DynamoDB: entidade TEMPLATE_WPP

## Fora de Escopo (NÃO TOCAR)
- Submeter à Meta (WPP-04)
- Envio (WPP-06)
- Webhook (WPP-11)

## Spec Técnica

### Entidade TEMPLATE_WPP
```json
{
  "PK": "TENANT#t123",
  "SK": "TEMPLATE_WPP#tpl_001",
  "id": "tpl_001",
  "nome": "orcamento_enviado",
  "categoria": "utility",
  "idioma": "pt_BR",
  "corpo": "Olá {{1}}, seu orçamento para {{2}} está pronto! Acesse: {{3}}",
  "variaveis": [
    { "indice": 1, "descricao": "Nome do cliente", "exemplo": "Ana" },
    { "indice": 2, "descricao": "Tipo de evento", "exemplo": "Casamento" },
    { "indice": 3, "descricao": "Link do orçamento", "exemplo": "https://..." }
  ],
  "header": { "tipo": "text", "valor": "📸 Seu orçamento está pronto!" },
  "footer": "Studio MBF • Responda para falar conosco",
  "botoes": [
    { "tipo": "url", "texto": "Ver Orçamento", "url": "{{3}}" }
  ],
  "evento_negocio": "orcamento_enviado",
  "status": "rascunho",
  "meta_template_id": null,
  "meta_status": null,
  "motivo_rejeicao": null,
  "created_at": "2026-07-17T10:00:00Z",
  "updated_at": "2026-07-17T10:00:00Z"
}
```

### Eventos de Negócio (trigger)
| Evento | Quando dispara | Variáveis típicas |
|---|---|---|
| orcamento_enviado | Admin envia orçamento | nome, evento, link |
| orcamento_aceito | Cliente aceita | nome, evento, valor |
| lembrete_pagamento | Véspera do vencimento | nome, valor, data, link_pag |
| pagamento_confirmado | Cobrança paga | nome, valor, parcela |
| album_pronto | Álbum publicado | nome, link_album |
| lembrete_evento | Véspera do evento | nome, data, horario, local |
| contrato_enviado | Contrato gerado | nome, link_contrato |
| follow_up_generico | Follow-up manual | nome, mensagem |

### Categorias Meta
| Categoria | Custo | Uso |
|---|---|---|
| utility | Grátis dentro janela, barato fora | Transacional: pagamento, entrega |
| marketing | Sempre cobrado | Promoções, follow-up |
| authentication | Grátis | OTP (não usamos) |

### Frontend — WhatsAppTemplates.jsx
- Lista de templates com: nome, categoria, status (badge), evento
- Filtro por status (rascunho/pendente/aprovado/rejeitado)
- Filtro por categoria
- Badges: 🟢 Aprovado, 🟡 Pendente, 🔴 Rejeitado, ⚪ Rascunho

### Frontend — TemplateForm.jsx
- Nome (slug, lowercase, underscores)
- Categoria (select)
- Idioma (pt_BR fixo)
- Header (opcional: text ou image)
- Corpo (textarea com helper de variáveis {{1}})
- Footer (opcional)
- Botões (max 3: url ou quick_reply)
- Preview em tempo real (mockup de celular)
- Vincular a evento de negócio (select)

## Critérios de Aceite
- [ ] CRUD de templates funciona
- [ ] Categorias utility/marketing
- [ ] Variáveis com {{N}} no corpo
- [ ] Preview em tempo real
- [ ] Vínculo com evento de negócio
- [ ] Status: rascunho/pendente/aprovado/rejeitado
- [ ] Filtros na listagem
- [ ] Header, footer e botões opcionais

## Prompt Pronto para o Kiro CLI

```
Implemente a spec WPP-03: CRUD de Templates WhatsApp.

1. Crie handlers/whatsapp/templates.js: CRUD completo.
2. Crie pages/admin/WhatsAppTemplates.jsx: listagem com filtros.
3. Crie pages/admin/TemplateForm.jsx: formulário com preview celular.
4. Variáveis {{N}}, header, footer, botões.
5. Vincular a evento de negócio.
6. SAM: rotas /admin/whatsapp/templates.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
