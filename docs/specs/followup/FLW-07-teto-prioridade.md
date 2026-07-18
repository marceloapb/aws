# FLW-07: Teto 1 msg/cliente/dia + Prioridade entre Pendências

## Metadados
- **ID:** FLW-07
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** FLW-03

## Contexto
Um cliente pode ter múltiplas pendências (orçamento + contrato + pagamento). Para não bombardear, teto de 1 mensagem por cliente por dia. Quando há múltiplos gatilhos, prioridade decide qual dispara primeiro.

## Escopo
- Modifica: `apps/backend/src/handlers/followup/motorVarredura.js`
- `apps/backend/src/services/prioridadeFollowup.js` — NOVO

## Fora de Escopo (NÃO TOCAR)
- Disparo (FLW-04/05)
- Escalonamento (FLW-06)
- Réguas (FLW-01)

## Spec Técnica

### Tabela de Prioridade
| Domínio | Prioridade | Justificativa |
|---|---|---|
| pagamento | 1 (mais alta) | Impacto financeiro direto |
| contrato | 2 | Bloqueador do fluxo |
| orcamento | 3 | Receita potencial |
| album | 4 | Pós-venda |
| feedback | 5 (mais baixa) | Nice-to-have |

### Lógica de Priorização
```js
function priorizarGatilhos(gatilhosDoCliente) {
  const prioridades = {
    pagamento: 1,
    contrato: 2,
    orcamento: 3,
    album: 4,
    feedback: 5
  }
  
  return gatilhosDoCliente
    .filter(g => estaMaduro(g)) // Só os maduros
    .sort((a, b) => {
      // 1. Por prioridade do domínio
      const prioA = prioridades[a.dominio] || 99
      const prioB = prioridades[b.dominio] || 99
      if (prioA !== prioB) return prioA - prioB
      
      // 2. Empate: mais antigo primeiro
      return new Date(a.inicio_inercia) - new Date(b.inicio_inercia)
    })
}
```

### Aplicação do Teto no Motor
```js
async function processarTenant(tenantId) {
  const gatilhos = await queryGatilhosAtivos(tenantId)
  const porCliente = agruparPorCliente(gatilhos)
  
  // Verificar quem já recebeu hoje
  const disparosHoje = await getDisparosDeHoje(tenantId)
  const clientesJaReceberam = new Set(disparosHoje.map(d => d.cliente_id))
  
  for (const [clienteId, gatilhosCliente] of Object.entries(porCliente)) {
    // TETO: já recebeu hoje? Skip!
    if (clientesJaReceberam.has(clienteId)) continue
    
    // Priorizar
    const ordenados = priorizarGatilhos(gatilhosCliente)
    if (ordenados.length === 0) continue
    
    // Disparar APENAS o mais prioritário
    const gatilho = ordenados[0]
    await enviarParaFila(tenantId, gatilho)
  }
}
```

### Consulta de Disparos de Hoje
```js
async function getDisparosDeHoje(tenantId) {
  const hojeInicio = new Date()
  hojeInicio.setHours(0, 0, 0, 0)
  
  // GSI: TENANT#t | DISPARO#2026-07-17
  return await dynamo.query({
    TableName: TABLE,
    IndexName: 'GSI_DISPAROS_DIA',
    KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK >= :hoje',
    ExpressionAttributeValues: {
      ':pk': `TENANT#${tenantId}`,
      ':hoje': `DISPARO#${hojeInicio.toISOString().split('T')[0]}`
    }
  }).promise()
}
```

### Configuração do Admin
```json
// Futuro: configurável na tela de config
{
  "teto_diario": 1,
  "horario_disparo": "09:00",
  "prioridades": {
    "pagamento": 1,
    "contrato": 2,
    "orcamento": 3,
    "album": 4,
    "feedback": 5
  }
}
```

### Regras
- Teto: 1 msg por cliente por dia (hardcoded por ora)
- Prioridade: pagamento > contrato > orçamento > álbum > feedback
- Empate: mais antigo primeiro
- Verificar disparos de hoje antes de enviar
- Gatilhos não-maduros são ignorados
- Os gatilhos "atrasados" pelo teto são disparados nos dias seguintes

## Critérios de Aceite
- [ ] Máximo 1 msg/cliente/dia
- [ ] Prioridade por domínio funciona
- [ ] Empate resolvido por antiguidade
- [ ] Cliente que já recebeu hoje: skip
- [ ] Gatilhos postergados disparam nos dias seguintes
- [ ] Só gatilhos maduros entram

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FLW-07: Teto + Prioridade.

1. Crie services/prioridadeFollowup.js: priorizarGatilhos().
2. Modifique motorVarredura.js: verificar disparos de hoje.
3. Teto: 1/dia por cliente (skip se já recebeu).
4. Prioridade: pagamento(1) > contrato(2) > orcamento(3) > album(4) > feedback(5).
5. Empate: mais antigo primeiro.
6. GSI para consulta de disparos do dia.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
