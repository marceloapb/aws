# SIG-03: Audit Log de Assinatura

## Metadados
- **ID:** SIG-03
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Médio
- **Dependência:** CT-05, SIG-02

## Contexto
Registrar cada ação do fluxo de assinatura como evento imutável de auditoria.

O audit log captura: abertura do link, leitura do contrato, envio de OTP, tentativas de validação, aceite final. Serve como trilha completa para disputas jurídicas e compliance.

## Escopo
- `apps/api/src/services/auditLogService.js` — NOVO
- `apps/api/src/routes/admin-contratos.js` — ALTERAR (endpoint de consulta)
- DynamoDB: entidade AUDIT_LOG_ASSINATURA

## Fora de Escopo (NÃO TOCAR)
- Logs de sistema (CloudWatch)
- Logs de outros módulos
- Dashboard de auditoria (futuro)


## Spec Técnica

### Eventos Auditáveis
| Evento | Descrição | Trigger |
|---|---|---|
| `contrato.link_aberto` | Cliente abriu o link do contrato | GET /public/contratos/:id |
| `contrato.leitura_iniciada` | Cliente começou a ler | Scroll > 10% |
| `contrato.leitura_completa` | Cliente scrollou até o final | Scroll 100% |
| `contrato.identidade_informada` | Passo 1: nome + CPF preenchidos | Passo 1 completo |
| `contrato.otp_solicitado` | OTP enviado | POST enviar-otp |
| `contrato.otp_tentativa` | Tentativa de validação OTP | POST verificar-otp |
| `contrato.otp_verificado` | OTP validado com sucesso | Verificação OK |
| `contrato.otp_expirado` | OTP expirou sem verificação | TTL expirado |
| `contrato.aceite_confirmado` | Aceite final realizado | POST aceitar |
| `contrato.aceite_rejeitado` | Cliente recusou assinar | Botão recusar |
| `contrato.pdf_gerado` | PDF gerado com sucesso | Evento pós-aceite |
| `contrato.pdf_download` | Admin/cliente baixou o PDF | GET pdf |

### Entidade DynamoDB — AUDIT_LOG_ASSINATURA
```json
{
  "PK": "CONTRATO#ct_001",
  "SK": "AUDIT#2026-07-18T15:25:00.000Z#uuid",
  "id": "audit_uuid_001",
  "contrato_id": "ct_001",
  "tenant_id": "t123",
  "cliente_id": "cli_001",
  "evento": "contrato.otp_verificado",
  "detalhes": {
    "canal": "whatsapp",
    "tentativa": 1
  },
  "ip_address": "189.44.120.55",
  "user_agent": "Mozilla/5.0...",
  "geo": {
    "cidade": "São Paulo",
    "estado": "SP",
    "pais": "BR"
  },
  "timestamp": "2026-07-18T15:25:00.000Z",
  "created_at": "2026-07-18T15:25:00.000Z"
}
```


### Serviço — auditLogService.js
```js
const { v4: uuid } = require('uuid')
const { putItem } = require('../config/dynamodb')

async function registrarAudit(contratoId, evento, contexto = {}) {
  const agora = new Date().toISOString()
  const id = uuid()

  const item = {
    PK: `CONTRATO#${contratoId}`,
    SK: `AUDIT#${agora}#${id}`,
    id,
    contrato_id: contratoId,
    tenant_id: contexto.tenant_id || null,
    cliente_id: contexto.cliente_id || null,
    evento,
    detalhes: contexto.detalhes || {},
    ip_address: contexto.ip_address || null,
    user_agent: contexto.user_agent || null,
    geo: contexto.geo || null,
    timestamp: agora,
    created_at: agora
  }

  await putItem(item)
  return item
}

async function listarAuditLog(contratoId, opts = {}) {
  const { limite = 50, ordem = 'desc' } = opts

  const params = {
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: {
      ':pk': `CONTRATO#${contratoId}`,
      ':prefix': 'AUDIT#'
    },
    ScanIndexForward: ordem === 'asc',
    Limit: limite
  }

  return await query(params)
}

module.exports = { registrarAudit, listarAuditLog }
```

### Pontos de Instrumentação
```js
// Em cada handler/rota, chamar:
const { registrarAudit } = require('../services/auditLogService')

// Exemplo no aceitar.js:
await registrarAudit(contratoId, 'contrato.aceite_confirmado', {
  tenant_id: contrato.tenant_id,
  cliente_id: contrato.cliente_id,
  ip_address: req.headers['x-forwarded-for'] || req.ip,
  user_agent: req.headers['user-agent'],
  detalhes: {
    nome_informado: payload.nome_informado,
    otp_verificado: true,
    tempo_leitura_segundos: payload.tempo_leitura
  }
})
```


### Frontend — Eventos do Cliente
```js
// No ContratoAceitar.jsx, disparar para API:
async function registrarEventoCliente(contratoId, evento, detalhes = {}) {
  await fetch(`/public/contratos/${contratoId}/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evento, detalhes, token })
  })
}

// Exemplos de uso:
// Ao abrir: registrarEventoCliente(id, 'contrato.link_aberto')
// Ao scrollar 100%: registrarEventoCliente(id, 'contrato.leitura_completa', { tempo_leitura: 45 })
```

### API — POST /public/contratos/:id/audit (registro frontend)
```json
// Input
{
  "token": "jwt_xxx",
  "evento": "contrato.leitura_completa",
  "detalhes": { "tempo_leitura": 45 }
}

// Response 201
{ "registrado": true }
```

### API — GET /admin/contratos/:id/audit-log (consulta admin)
```json
// Response 200
{
  "contrato_id": "ct_001",
  "total_eventos": 8,
  "eventos": [
    {
      "evento": "contrato.aceite_confirmado",
      "timestamp": "2026-07-18T15:30:00Z",
      "ip_address": "189.44.120.55",
      "detalhes": { "otp_verificado": true }
    },
    {
      "evento": "contrato.otp_verificado",
      "timestamp": "2026-07-18T15:29:45Z",
      "ip_address": "189.44.120.55",
      "detalhes": { "canal": "whatsapp", "tentativa": 1 }
    }
  ]
}
```


### Geolocalização (Opcional)
- Usar header `CF-IPCountry` do CloudFront quando disponível
- Ou serviço simples de GeoIP para cidade/estado
- Não é bloqueante — se falhar, registra sem geo

### Retenção
- Audit logs retidos por **5 anos** (compliance)
- Sem TTL no DynamoDB (diferente do OTP)
- Backup mensal junto com dados de contratos

### Regras
- Logs são IMUTÁVEIS — nunca editar ou deletar
- SK com timestamp garante ordenação cronológica
- UUID no SK evita colisão de eventos simultâneos
- IP e user_agent capturados em TODOS os eventos
- Frontend envia eventos de leitura de forma assíncrona (não bloqueia UX)
- Admin pode consultar log completo de qualquer contrato
- Log usado como evidência no manifesto PDF (SIG-04)

## Critérios de Aceite
- [ ] Todos os 12 eventos auditáveis são registrados
- [ ] Entidade AUDIT_LOG_ASSINATURA no DynamoDB
- [ ] IP + user_agent em cada registro
- [ ] Ordenação cronológica (SK com timestamp)
- [ ] Endpoint admin para consulta GET /admin/contratos/:id/audit-log
- [ ] Endpoint público para registro POST /public/contratos/:id/audit
- [ ] Logs imutáveis (sem update/delete)
- [ ] Frontend dispara eventos sem bloquear UX

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SIG-03: Audit Log de Assinatura.

1. Crie services/auditLogService.js: registrar + listar eventos.
2. Entidade AUDIT_LOG_ASSINATURA no DynamoDB.
3. POST /public/contratos/:id/audit — registro de eventos do frontend.
4. GET /admin/contratos/:id/audit-log — consulta para admin.
5. Instrumente aceitar.js, enviar-otp, verificar-otp com audit.
6. SK com timestamp+uuid para ordenação e unicidade.
7. Capturar IP + user_agent em todos os eventos.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
