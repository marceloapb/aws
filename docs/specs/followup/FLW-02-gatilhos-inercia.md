# FLW-02: Gatilhos de Inércia (Criação + Resolução Event-Driven)

## Metadados
- **ID:** FLW-02
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** FLW-01

## Contexto
Gatilho de inércia é criado quando um domínio entra em estado de espera (ex: orçamento enviado). É RESOLVIDO quando o evento esperado ocorre (ex: orçamento aceito). Enquanto ativo, o motor (FLW-03) dispara follow-ups.

## Escopo
- `apps/backend/src/handlers/followup/gatilhos.js` — NOVO
- `apps/backend/src/services/followupService.js` — NOVO (funções compartilhadas)
- DynamoDB: entidade GATILHO_INERCIA
- EventBridge: regras para capturar eventos de domínio

## Fora de Escopo (NÃO TOCAR)
- Motor de varredura (FLW-03)
- Disparos (FLW-04, FLW-05)
- CRUD Réguas (FLW-01 — já feito)

## Spec Técnica

### Entidade GATILHO_INERCIA
```json
{
  "PK": "TENANT#t123",
  "SK": "GATILHO#gat_001",
  "GSI1PK": "TENANT#t123",
  "GSI1SK": "STATUS#ativo#2026-07-17",
  "id": "gat_001",
  "regua_id": "reg_001",
  "cliente_id": "cli_001",
  "cliente_nome": "Ana Carolina",
  "dominio": "orcamento",
  "recurso_id": "orc_001",
  "recurso_label": "Casamento Ana & Pedro - R$ 5.500",
  "gatilho_tipo": "orcamento_enviado_sem_resposta",
  "status": "ativo",
  "data_inicio": "2026-07-17T10:00:00Z",
  "data_resolucao": null,
  "tentativa_atual": 0,
  "max_tentativas": 3,
  "proximo_disparo": "2026-07-19T10:00:00Z",
  "created_at": "2026-07-17T10:00:00Z"
}
```

### Status do Gatilho
| Status | Significado |
|---|---|
| ativo | Aguardando resolução, motor pode disparar |
| resolvido | Evento de resolução recebido |
| expirado | Todas tentativas esgotadas |
| cancelado | Admin cancelou manualmente |

### Criação de Gatilho (Event-Driven)
```js
// Chamado pelo módulo de origem ao mudar estado
async function criarGatilho(tenantId, dados) {
  // Buscar régua ativa para este tipo de gatilho
  const regua = await getReguaAtiva(tenantId, dados.gatilho_tipo)
  if (!regua) return null // Sem régua configurada = sem follow-up
  
  // Verificar se já existe gatilho ativo para este recurso
  const existente = await getGatilhoAtivoByRecurso(tenantId, dados.recurso_id)
  if (existente) return existente // Idempotência
  
  const id = `gat_${ulid()}`
  const primeiraTentativa = regua.tentativas[0]
  const proximoDisparo = addDays(new Date(), primeiraTentativa.dias_apos_gatilho)
  
  const gatilho = {
    PK: `TENANT#${tenantId}`,
    SK: `GATILHO#${id}`,
    GSI1PK: `TENANT#${tenantId}`,
    GSI1SK: `STATUS#ativo#${today()}`,
    id,
    regua_id: regua.id,
    cliente_id: dados.cliente_id,
    cliente_nome: dados.cliente_nome,
    dominio: dados.dominio,
    recurso_id: dados.recurso_id,
    recurso_label: dados.recurso_label,
    gatilho_tipo: dados.gatilho_tipo,
    status: 'ativo',
    data_inicio: new Date().toISOString(),
    data_resolucao: null,
    tentativa_atual: 0,
    max_tentativas: regua.max_tentativas,
    proximo_disparo: proximoDisparo.toISOString(),
    created_at: new Date().toISOString()
  }
  
  await dynamo.put({ TableName: TABLE, Item: gatilho }).promise()
  return gatilho
}
```

### Resolução de Gatilho
```js
// Chamado quando evento de resolução ocorre
async function resolverGatilho(tenantId, recurso_id) {
  const gatilho = await getGatilhoAtivoByRecurso(tenantId, recurso_id)
  if (!gatilho) return null // Sem gatilho ativo
  
  await dynamo.update({
    TableName: TABLE,
    Key: { PK: gatilho.PK, SK: gatilho.SK },
    UpdateExpression: 'SET #status = :resolvido, data_resolucao = :agora, GSI1SK = :gsi',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':resolvido': 'resolvido',
      ':agora': new Date().toISOString(),
      ':gsi': `STATUS#resolvido#${today()}`
    }
  }).promise()
  
  return { resolvido: true, gatilho_id: gatilho.id }
}
```

### Pontos de Integração (módulos chamam criarGatilho/resolverGatilho)
| Módulo | Cria gatilho quando | Resolve quando |
|---|---|---|
| Orçamento | Envia orçamento ao cliente | Cliente aceita/recusa |
| Contrato | Envia contrato para assinatura | Cliente assina |
| Financeiro | Parcela vence | Pagamento confirmado |
| Álbum | Entrega álbum | Cliente dá feedback |
| Pesquisa | Envia pesquisa | Resposta recebida |

### Regras
- Idempotência: 1 gatilho ativo por recurso (não duplicar)
- Se não existe régua ativa: não criar gatilho (silencioso)
- Resolução automática via eventos de domínio
- GSI1 permite query eficiente: "todos ativos do tenant"
- Status: ativo → resolvido/expirado/cancelado

## Critérios de Aceite
- [ ] Criar gatilho ao receber evento de inércia
- [ ] Idempotência (não duplicar por recurso)
- [ ] Se sem régua: não criar (silencioso)
- [ ] Resolver ao receber evento de resolução
- [ ] Status transiciona corretamente
- [ ] GSI1 funciona (query ativos por tenant)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FLW-02: Gatilhos de Inércia.

1. Crie handlers/followup/gatilhos.js: criar + resolver.
2. Crie services/followupService.js: funções compartilhadas.
3. Entidade GATILHO_INERCIA no DynamoDB + GSI1.
4. Idempotência: 1 gatilho ativo por recurso.
5. Se sem régua: não criar.
6. Resolver: atualizar status + data_resolucao.
7. SAM: EventBridge rules para capturar eventos.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
