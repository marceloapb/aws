# NTF-02: CRUD de Regras de Notificação (Matriz Evento × Canal × Destinatário)

## Metadados
- **ID:** NTF-02
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo-Médio
- **Dependência:** NTF-03

## Contexto
Admin configura quais eventos geram notificação, para quem (admin vs cliente) e por qual canal (in-app, email, WhatsApp). Ex: "orcamento.aceito" → notificar admin via in-app + notificar cliente via email.

## Escopo
- `apps/backend/src/handlers/notificacoes/regras.js` — NOVO
- DynamoDB: entidade REGRA_NTF
- API: GET/POST/PUT/DELETE /admin/notificacoes/regras

## Fora de Escopo (NÃO TOCAR)
- Dispatcher (NTF-03 — consome regras)
- Canais (NTF-04/05/06)
- Barramento (NTF-01)

## Spec Técnica

### Entidade REGRA_NTF
```json
{
  "PK": "TENANT#t123",
  "SK": "REGRA_NTF#rnf_001",
  "id": "rnf_001",
  "tipo_evento": "orcamento.aceito",
  "source": "mbf.orcamentos",
  "descricao": "Cliente aceitou o orçamento",
  "destinatarios": [
    {
      "tipo": "admin",
      "canais": ["inapp", "email"],
      "template_email": "tpl_orc_aceito_admin",
      "titulo_inapp": "💰 Orçamento aceito!",
      "corpo_inapp": "{{cliente_nome}} aceitou o orçamento de R$ {{valor}}"
    },
    {
      "tipo": "cliente",
      "canais": ["email"],
      "template_email": "tpl_orc_aceito_cliente"
    }
  ],
  "ativa": true,
  "created_at": "2026-07-17T10:00:00Z"
}
```

### Regras Default (seed)
| Evento | Admin | Cliente |
|---|---|---|
| orcamento.aceito | in-app + email | email |
| orcamento.recusado | in-app | — |
| contrato.assinado | in-app + email | email |
| pagamento.confirmado | in-app + email | email |
| pagamento.vencido | in-app | email + WhatsApp |
| evento.confirmado | in-app | email |
| mensagem.recebida | in-app | — |
| album.baixado | in-app | — |
| feedback.respondido | in-app | — |

### API — POST /admin/notificacoes/regras
```json
{
  "tipo_evento": "orcamento.aceito",
  "source": "mbf.orcamentos",
  "descricao": "Cliente aceitou orçamento",
  "destinatarios": [
    { "tipo": "admin", "canais": ["inapp", "email"], "titulo_inapp": "💰 Aceito!", "corpo_inapp": "{{cliente_nome}} aceitou" }
  ]
}
```

### API — GET /admin/notificacoes/regras
```json
{
  "regras": [...],
  "total": 9
}
```

### API — PUT /admin/notificacoes/regras/:id
```json
// Atualizar canais, templates, ativa/desativa
```

### API — DELETE /admin/notificacoes/regras/:id
```json
// Soft delete
{ "sucesso": true }
```

### Validações
- tipo_evento: deve existir no catálogo (NTF-01 schemas)
- canais: enum [inapp, email, whatsapp]
- tipo destinatário: enum [admin, cliente]
- Cliente NÃO pode receber in-app (só admin)
- Admin NÃO recebe WhatsApp (só in-app + email)
- template obrigatório se canal = email
- titulo_inapp obrigatório se canal = inapp

### Regras
- Seed com 9 regras default
- Admin pode editar canais e templates
- Desativar regra = evento não gera notificação
- 1 regra por tipo_evento (não duplicar)

## Critérios de Aceite
- [ ] CRUD completo funciona
- [ ] Seed com 9 regras default
- [ ] Validação de canais por tipo de destinatário
- [ ] 1 regra por tipo_evento
- [ ] Soft delete
- [ ] Template obrigatório para email

## Prompt Pronto para o Kiro CLI

```
Implemente a spec NTF-02: CRUD Regras de Notificação.

1. Crie handlers/notificacoes/regras.js: GET/POST/PUT/DELETE.
2. Entidade REGRA_NTF no DynamoDB.
3. Seed com 9 regras default.
4. Validar: canais por tipo destinatário.
5. 1 regra por tipo_evento.
6. SAM: 4 rotas CRUD.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
