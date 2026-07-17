# WPP-05: Listar Templates + Sync Status (Aprovado/Rejeitado)

## Metadados
- **ID:** WPP-05
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** WPP-04

## Contexto
Após submissão, o status do template muda na Meta. O admin precisa ver o status atual e o sistema precisa sincronizar via polling manual.

## Escopo
- `apps/backend/src/handlers/whatsapp/syncTemplates.js` — NOVO
- API: POST /admin/whatsapp/templates/sync

## Fora de Escopo (NÃO TOCAR)
- CRUD local (WPP-03)
- Submissão (WPP-04)
- Envio (WPP-06)

## Spec Técnica

### API — POST /admin/whatsapp/templates/sync
```json
{
  "atualizados": 2,
  "templates": [
    { "id": "tpl_001", "nome": "orcamento_enviado", "meta_status": "APPROVED" },
    { "id": "tpl_002", "nome": "lembrete_pagamento", "meta_status": "REJECTED", "motivo": "Conteúdo não permitido" }
  ]
}
```

### Fluxo
```
1. Buscar todos os templates pendentes do tenant
2. Para cada um: GET https://graph.facebook.com/v21.0/{waba_id}/message_templates?name={nome}
3. Comparar status Meta vs local
4. Se mudou: atualizar local (aprovado/rejeitado + motivo)
5. Retornar resumo
```

### Mapeamento de Status
| Meta Status | Status Local |
|---|---|
| APPROVED | aprovado |
| REJECTED | rejeitado |
| PENDING | pendente |
| DISABLED | desativado |

### Frontend
- Botão "🔄 Atualizar Status" na listagem de templates
- Badge atualizado em tempo real após sync
- Se rejeitado: tooltip com motivo de rejeição

## Critérios de Aceite
- [ ] Sync busca status na Meta
- [ ] Templates pendentes atualizados
- [ ] Motivo de rejeição salvo
- [ ] Badge de status atualizado no frontend
- [ ] Rate limit respeitado (max 1 sync/min)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec WPP-05: Sync Status de Templates.

1. Crie handlers/whatsapp/syncTemplates.js: buscar status na Meta, atualizar local.
2. Mapear APPROVED/REJECTED/PENDING.
3. Salvar motivo de rejeição.
4. Rota: POST /admin/whatsapp/templates/sync.
5. Rate limit: max 1 sync/min por tenant.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
