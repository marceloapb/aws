# FLW-01: CRUD Réguas de Follow-up (Backend + DynamoDB)

## Metadados
- **ID:** FLW-01
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** Nenhuma (fundação)

## Contexto
Régua é a configuração que define: qual domínio observar, após quantos dias de inércia disparar, quantas tentativas, qual canal, qual template de mensagem. Admin cria/edita réguas. Motor (FLW-03) as consome.

## Escopo
- `apps/backend/src/handlers/followup/reguas.js` — NOVO
- DynamoDB: entidade REGUA_FOLLOWUP
- API: POST, GET, PUT, DELETE /admin/followup/reguas

## Fora de Escopo (NÃO TOCAR)
- Motor de varredura (FLW-03)
- Gatilhos (FLW-02)
- Disparo (FLW-04/05)
- Frontend da régua (FLW-09)

## Spec Técnica

### Entidade REGUA_FOLLOWUP
```json
{
  "PK": "TENANT#t123",
  "SK": "REGUA#regua_001",
  "id": "regua_001",
  "nome": "Orçamento Pendente",
  "dominio": "orcamento",
  "gatilho_status": "pendente",
  "ativa": true,
  "tentativas": [
    { "tentativa": 1, "dias_apos_inercia": 3, "canal": "email", "template_id": "tpl_orc_lembrete_1" },
    { "tentativa": 2, "dias_apos_inercia": 7, "canal": "email", "template_id": "tpl_orc_lembrete_2" },
    { "tentativa": 3, "dias_apos_inercia": 14, "canal": "whatsapp", "template_id": "tpl_orc_lembrete_3" }
  ],
  "prioridade": 1,
  "created_at": "2026-07-17T10:00:00Z",
  "updated_at": "2026-07-17T10:00:00Z"
}
```

### Réguas Default (seed)
| Régua | Domínio | Tentativas | Canal Escalonado |
|---|---|---|---|
| Orçamento Pendente | orcamento | 3d, 7d, 14d | email → email → whatsapp |
| Contrato Aguardando | contrato | 2d, 5d, 10d | email → whatsapp → whatsapp |
| Pagamento Atrasado | pagamento | 1d, 3d, 7d | email → email → whatsapp |
| Feedback Pós-Evento | feedback | 3d, 7d | email → whatsapp |
| Álbum Pronto | album | 1d, 5d | email → email |

### API — POST /admin/followup/reguas
```json
// Input
{
  "nome": "Orçamento Pendente",
  "dominio": "orcamento",
  "gatilho_status": "pendente",
  "tentativas": [
    { "dias_apos_inercia": 3, "canal": "email", "template_id": "tpl_001" },
    { "dias_apos_inercia": 7, "canal": "whatsapp", "template_id": "tpl_002" }
  ],
  "prioridade": 1
}

// Response
{ "id": "regua_001", "sucesso": true }
```

### API — GET /admin/followup/reguas
```json
{
  "reguas": [...],
  "total": 5
}
```

### API — PUT /admin/followup/reguas/:id
```json
// Mesma estrutura do POST
{ "sucesso": true }
```

### API — DELETE /admin/followup/reguas/:id
```json
{ "sucesso": true }
```

### Backend
```js
async function criarRegua(tenantId, dados) {
  const id = `regua_${ulid()}`
  const regua = {
    PK: `TENANT#${tenantId}`,
    SK: `REGUA#${id}`,
    id,
    ...dados,
    ativa: true,
    tentativas: dados.tentativas.map((t, i) => ({ ...t, tentativa: i + 1 })),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  await dynamo.put({ TableName: TABLE, Item: regua }).promise()
  return { id, sucesso: true }
}
```

### Validações
- Nome obrigatório (max 100 chars)
- Domínio: enum [orcamento, contrato, pagamento, feedback, album]
- Tentativas: mínimo 1, máximo 5
- dias_apos_inercia: >= 1
- Canal: enum [email, whatsapp]
- template_id: obrigatório
- Prioridade: 1-10 (1 = mais alta)

### Regras
- Régua deletada → gatilhos ativos dessa régua são cancelados (FLW-10)
- Régua desativada → motor ignora
- Seed com 5 réguas default na primeira config

## Critérios de Aceite
- [ ] CRUD completo funciona
- [ ] Validações aplicadas
- [ ] Entidade no DynamoDB
- [ ] Seed com 5 réguas default
- [ ] Desativar régua funciona
- [ ] Delete cancela gatilhos ativos

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FLW-01: CRUD Réguas de Follow-up.

1. Crie handlers/followup/reguas.js: POST, GET, PUT, DELETE.
2. Entidade REGUA_FOLLOWUP no DynamoDB.
3. Validações: nome, domínio (enum), tentativas (1-5), canal (enum).
4. Seed com 5 réguas default.
5. SAM: 4 rotas.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
