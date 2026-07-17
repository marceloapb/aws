# WPP-08: Log de Envios (Filtros, Custo, Status Delivery)

## Metadados
- **ID:** WPP-08
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** WPP-06

## Contexto
Tela de histórico de todas as mensagens enviadas via WhatsApp. Permite ver status de delivery, custo acumulado, filtrar por período/cliente/template.

## Escopo
- `apps/backend/src/handlers/whatsapp/logs.js` — NOVO
- `apps/frontend/src/pages/admin/WhatsAppLogs.jsx` — NOVO
- API: GET /admin/whatsapp/logs

## Fora de Escopo (NÃO TOCAR)
- Envio (WPP-06)
- Webhook (WPP-11 atualiza status)
- Dashboard custos (WPP-16)

## Spec Técnica

### API — GET /admin/whatsapp/logs
Query params: `periodo_inicio`, `periodo_fim`, `cliente_id`, `template_id`, `status`, `page`, `limit`

```json
{
  "items": [
    {
      "id": "log_001",
      "destinatario": "+5511999998888",
      "cliente_nome": "Ana Silva",
      "tipo": "template",
      "template_nome": "orcamento_enviado",
      "status": "lido",
      "custo_estimado": 0.0308,
      "created_at": "2026-07-17T10:00:00Z"
    }
  ],
  "resumo": {
    "total_enviados": 45,
    "entregues": 43,
    "lidos": 38,
    "falhos": 2,
    "custo_total": 1.23
  },
  "total": 45,
  "page": 1
}
```

### Status de Delivery
| Status | Descrição |
|---|---|
| enviado | Aceito pela Meta |
| entregue | Chegou no celular |
| lido | Usuário leu (check azul) |
| falho | Erro (número inválido, bloqueado) |

### Frontend — WhatsAppLogs.jsx
- **Cards Resumo:** Enviados, Entregues, Lidos, Falhos, Custo Total
- **Filtros:** Período, cliente, template, status
- **Tabela:** Destinatário, Template, Status (badge), Custo, Data
- **Badges:** 📤 Enviado, ✅ Entregue, 👁 Lido, ❌ Falho
- **Export:** botão para exportar CSV

## Critérios de Aceite
- [ ] Listagem de logs com paginação
- [ ] Filtros funcionam (período, cliente, template, status)
- [ ] Cards resumo com totais
- [ ] Custo total calculado
- [ ] Badges de status
- [ ] Export CSV

## Prompt Pronto para o Kiro CLI

```
Implemente a spec WPP-08: Log de Envios WhatsApp.

1. Crie handlers/whatsapp/logs.js: GET /admin/whatsapp/logs com filtros.
2. Crie pages/admin/WhatsAppLogs.jsx: cards resumo + tabela + filtros.
3. Resumo: total enviados/entregues/lidos/falhos/custo.
4. Export CSV.
5. SAM: rota GET.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
