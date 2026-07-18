# FLW-01: CRUD Réguas de Follow-up (Backend + DynamoDB)

## Metadados
- **ID:** FLW-01
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** Nenhuma (fundação)

## Contexto
Régua é o template que define QUANDO e COMO disparar follow-ups para cada tipo de inércia (orçamento sem resposta, contrato sem aceite, pagamento atrasado, etc.). Admin cria/edita réguas que o motor (FLW-03) consome.

## Escopo
- `apps/backend/src/handlers/followup/reguas.js` — NOVO
- DynamoDB: entidade REGUA_FOLLOWUP
- API: GET/POST/PUT/DELETE /admin/followup/reguas

## Fora de Escopo (NÃO TOCAR)
- Motor de varredura (FLW-03)
- Gatilhos (FLW-02)
- Frontend (FLW-09)

## Spec Técnica

### Entidade REGUA_FOLLOWUP
```json
{
  "PK": "TENANT#t123",
  "SK": "REGUA#reg_001",
  "id": "reg_001",
  "nome": "Orçamento sem resposta",
  "dominio": "orcamento",
  "gatilho_tipo": "orcamento_enviado_sem_resposta",
  "ativa": true,
  "tentativas": [
    { "ordem": 1, "dias_apos_gatilho": 2, "canal": "email", "template": "followup_orc_1" },
    { "ordem": 2, "dias_apos_gatilho": 5, "canal": "email", "template": "followup_orc_2" },
    { "ordem": 3, "dias_apos_gatilho": 8, "canal": "whatsapp", "template": "followup_orc_wpp" }
  ],
  "resolucao_evento": "orcamento_aceito",
  "max_tentativas": 3,
  "created_at": "2026-07-17T10:00:00Z",
  "updated_at": "2026-07-17T10:00:00Z"
}
```

### Domínios Suportados
| Domínio | Gatilho | Resolução |
|---|---|---|
| orcamento | Enviado sem resposta | Aceito ou Recusado |
| contrato | Enviado sem aceite | Assinado |
| pagamento | Parcela vencida | Pagamento confirmado |
| album | Entregue sem feedback | Feedback recebido |
| pesquisa | Enviada sem resposta | Resposta recebida |

### API — POST /admin/followup/reguas
```json
// Input
{
  "nome": "Orçamento sem resposta",
  "dominio": "orcamento",
  "gatilho_tipo": "orcamento_enviado_sem_resposta",
  "tentativas": [
    { "dias_apos_gatilho": 2, "canal": "email", "template": "followup_orc_1" },
    { "dias_apos_gatilho": 5, "canal": "email", "template": "followup_orc_2" },
    { "dias_apos_gatilho": 8, "canal": "whatsapp", "template": "followup_orc_wpp" }
  ]
}

// Response
{
  "sucesso": true,
  "regua": { "id": "reg_001", "nome": "Orçamento sem resposta", ... }
}
```

### API — GET /admin/followup/reguas
```json
{
  "reguas": [
    { "id": "reg_001", "nome": "Orçamento sem resposta", "dominio": "orcamento", "ativa": true, "tentativas": 3 },
    { "id": "reg_002", "nome": "Contrato sem aceite", "dominio": "contrato", "ativa": true, "tentativas": 2 }
  ],
  "total": 2
}
```

### API — PUT /admin/followup/reguas/:id
```json
// Mesmo formato do POST (campos a atualizar)
```

### API — DELETE /admin/followup/reguas/:id
```json
// Soft delete (ativa: false) — não remove gatilhos em andamento
{ "sucesso": true, "desativada": true }
```

### Backend
```js
async function criarRegua(tenantId, dados) {
  const id = `reg_${ulid()}`
  
  // Validar
  if (!dados.tentativas?.length) throw new Error('Mínimo 1 tentativa')
  if (dados.tentativas.length > 5) throw new Error('Máximo 5 tentativas')
  
  // Ordenar tentativas por dias
  const tentativas = dados.tentativas
    .sort((a, b) => a.dias_apos_gatilho - b.dias_apos_gatilho)
    .map((t, i) => ({ ...t, ordem: i + 1 }))
  
  const regua = {
    PK: `TENANT#${tenantId}`,
    SK: `REGUA#${id}`,
    id,
    nome: dados.nome,
    dominio: dados.dominio,
    gatilho_tipo: dados.gatilho_tipo,
    ativa: true,
    tentativas,
    resolucao_evento: dados.resolucao_evento,
    max_tentativas: tentativas.length,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  await dynamo.put({ TableName: TABLE, Item: regua }).promise()
  return regua
}
```

### Regras
- Mínimo 1, máximo 5 tentativas por régua
- Tentativas ordenadas por dias_apos_gatilho (crescente)
- Delete = soft delete (desativa)
- Apenas 1 régua ativa por gatilho_tipo
- Canal: 'email' ou 'whatsapp'
- Template referencia templates existentes (SES/WPP)

## Critérios de Aceite
- [ ] CRUD completo (criar, listar, editar, desativar)
- [ ] Validação: 1-5 tentativas
- [ ] Ordenação automática por dias
- [ ] Soft delete
- [ ] 1 régua ativa por gatilho_tipo
- [ ] Entidade no DynamoDB

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FLW-01: CRUD Réguas de Follow-up.

1. Crie handlers/followup/reguas.js: GET/POST/PUT/DELETE.
2. Entidade REGUA_FOLLOWUP no DynamoDB.
3. Validar 1-5 tentativas, ordenar por dias.
4. Soft delete (ativa: false).
5. 1 régua ativa por gatilho_tipo.
6. SAM: 4 rotas CRUD.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
