# NTF-02: CRUD de Regras de Notificação (Matriz evento × canal × destinatário)

## Metadados
- **ID:** NTF-02
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto — configurabilidade
- **Esforço:** Baixo-Médio
- **Dependência:** NTF-01

## Contexto
Admin configura QUAIS eventos geram notificação, para QUEM e por QUAL canal. Ex: "orcamento.aceito" → notificar admin (in-app + email). "album.publicado" → notificar cliente (email + WhatsApp). Matriz editável.

## Escopo
- `apps/backend/src/handlers/notificacoes/regras.js` — NOVO
- DynamoDB: entidade REGRA_NTF
- API: GET/POST/PUT/DELETE /admin/notificacoes/regras

## Fora de Escopo (NÃO TOCAR)
- Dispatcher (NTF-03)
- In-App (NTF-04)
- Entregas (NTF-05/06)

## Spec Técnica

### Entidade REGRA_NTF
```json
{
  "PK": "TENANT#t123",
  "SK": "REGRA_NTF#rnf_001",
  "id": "rnf_001",
  "tipo_evento": "orcamento.aceito",
  "destinatario": "admin",
  "canais": ["inapp", "email"],
  "template_email": "tpl_orc_aceito_admin",
  "template_whatsapp": null,
  "titulo_inapp": "🎉 Orçamento aceito!",
  "corpo_inapp": "{{cliente_nome}} aceitou o orçamento {{dados.titulo}}",
  "ativa": true,
  "created_at": "2026-07-18T10:00:00Z"
}
```

### Regras Default (seed)
| Evento | Destinatário | Canais | Título |
|---|---|---|---|
| orcamento.aceito | admin | inapp, email | 🎉 Orçamento aceito! |
| orcamento.recusado | admin | inapp | ❌ Orçamento recusado |
| contrato.assinado | admin | inapp, email | ✍️ Contrato assinado! |
| pagamento.confirmado | admin | inapp, email | 💰 Pagamento confirmado! |
| pagamento.vencido | admin | inapp | ⚠️ Pagamento vencido |
| mensagem.recebida | admin | inapp | 💬 Nova mensagem! |
| album.publicado | cliente | email, whatsapp | 📸 Suas fotos estão prontas! |
| evento.confirmado | cliente | email | ✅ Sessão confirmada! |
| contrato.enviado | cliente | email, whatsapp | 📝 Contrato disponível |
| orcamento.enviado | cliente | email | 📋 Proposta disponível |

### API — POST /admin/notificacoes/regras
```json
{
  "tipo_evento": "orcamento.aceito",
  "destinatario": "admin",
  "canais": ["inapp", "email"],
  "titulo_inapp": "🎉 Orçamento aceito!",
  "corpo_inapp": "{{cliente_nome}} aceitou {{dados.titulo}}",
  "template_email": "tpl_orc_aceito_admin"
}
```

### API — GET /admin/notificacoes/regras
```json
{
  "regras": [...],
  "total": 10
}
```

### Validações
- tipo_evento: deve existir no catálogo (NTF-01)
- destinatario: enum [admin, cliente]
- canais: array de [inapp, email, whatsapp]
- inapp só disponível para admin
- Se canal=email: template_email obrigatório
- Se canal=whatsapp: template_whatsapp obrigatório

### Regras
- Seed com 10 regras default na primeira configuração
- Admin pode desativar/reativar (não deletar seed)
- Múltiplas regras por evento são possíveis (admin + cliente)
- Regra desativada = dispatcher ignora

## Critérios de Aceite
- [ ] CRUD completo
- [ ] Seed com 10 regras default
- [ ] Validação: canais válidos por destinatário
- [ ] Template obrigatório por canal
- [ ] Desativar/reativar funciona
- [ ] Múltiplas regras por evento

## Prompt Pronto para o Kiro CLI

```
Implemente a spec NTF-02: CRUD Regras de Notificação.

1. Crie handlers/notificacoes/regras.js: GET/POST/PUT/DELETE.
2. Entidade REGRA_NTF no DynamoDB.
3. Seed com 10 regras default.
4. Validar: canais por destinatário, template obrigatório.
5. inapp só para admin.
6. SAM: 4 rotas.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
