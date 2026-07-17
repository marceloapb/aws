# CT-13: Pendência de Reembolso

## Metadados
- **ID:** CT-13
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** CT-12

## Contexto
Quando um aditivo de redução é aceito e o cliente já pagou mais do que o novo valor total, o sistema cria uma pendência de reembolso. O sistema NÃO estorna automaticamente — apenas sinaliza para o admin resolver manualmente (PIX, crédito, desconto futuro).

## Escopo
- `apps/backend/src/handlers/contratos/reembolso.js` — NOVO
- `apps/frontend/src/pages/admin/Reembolsos.jsx` — NOVO
- API: GET /admin/reembolsos, PUT /admin/reembolsos/:id/resolver

## Fora de Escopo (NÃO TOCAR)
- Recálculo (CT-12 — cria a pendência)
- Estorno automático (não existe)
- Gateway de pagamento (FIN-*)

## Spec Técnica

### Entidade REEMBOLSO
```json
{
  "PK": "TENANT#t123",
  "SK": "REEMBOLSO#reemb_001",
  "id": "reemb_001",
  "contrato_id": "ct_001",
  "aditivo_id": "adit_002",
  "cliente_id": "cli_001",
  "valor": 300,
  "motivo": "Redução de escopo — aditivo adit_002 aceito",
  "status": "pendente",
  "resolucao": null,
  "resolvido_em": null,
  "created_at": "2026-08-05T10:00:00Z"
}
```

### Status de Reembolso
| Status | Descrição |
|---|---|
| pendente | Aguardando ação do admin |
| resolvido | Admin marcou como resolvido |
| cancelado | Admin cancelou (acordo com cliente) |

### Opções de Resolução
| Opção | Descrição |
|---|---|
| pix | Estorno via PIX |
| credito | Crédito para próximo serviço |
| desconto | Desconto na parcela seguinte |
| acordo | Acordo verbal com cliente |

### API — GET /admin/reembolsos
```json
{
  "items": [
    {
      "id": "reemb_001",
      "cliente": "Ana Carolina Silva",
      "valor": 300,
      "motivo": "Redução de escopo",
      "status": "pendente",
      "created_at": "2026-08-05T10:00:00Z"
    }
  ],
  "resumo": {
    "total_pendente": 300,
    "quantidade_pendentes": 1,
    "total_resolvido_mes": 0
  }
}
```

### API — PUT /admin/reembolsos/:id/resolver
```json
// Input
{
  "resolucao": "pix",
  "observacao": "PIX de R$300 enviado em 05/08"
}

// Response
{
  "id": "reemb_001",
  "status": "resolvido",
  "resolucao": "pix",
  "resolvido_em": "2026-08-05T14:00:00Z"
}
```

### Frontend — Reembolsos.jsx
- **Cards resumo:** Total pendente (R$), Quantidade, Resolvidos no mês
- **Lista de pendências:**
  - Cliente, Valor, Motivo, Data, Status
  - Botão "Resolver" → modal com opções
- **Modal Resolver:**
  - Tipo de resolução (select: pix/crédito/desconto/acordo)
  - Observação (textarea)
  - Confirmar
- **Badge no menu:** Número de pendências (vermelho)

### Notificações
- Ao criar pendência: notificar admin (in-app + email)
- Se pendente > 7 dias: lembrete diário

### Regras
- Sistema NUNCA faz estorno automático
- Admin decide manualmente como resolver
- Log de auditoria: quem resolveu, quando, como
- Badge no menu para visibilidade

## Critérios de Aceite
- [ ] Pendência criada automaticamente por CT-12
- [ ] Listagem com filtros
- [ ] Resolver com tipo + observação
- [ ] Status: pendente → resolvido/cancelado
- [ ] Notificação ao admin
- [ ] Badge no menu
- [ ] Lembrete se pendente > 7 dias
- [ ] Não faz estorno automático

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CT-13: Pendência de Reembolso.

1. Crie handlers/contratos/reembolso.js: listar + resolver.
2. Crie pages/admin/Reembolsos.jsx: lista + modal resolver.
3. Entidade REEMBOLSO no DynamoDB.
4. Opções: pix, crédito, desconto, acordo.
5. Notificar admin ao criar pendência.
6. Badge no menu.
7. SAM: rotas GET/PUT.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
