# SAT-06: Pesquisa de Recusa — Disparo Automático

## Metadados
- **ID:** SAT-06
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** SAT-01

## Contexto
Quando o orçamento é recusado pelo cliente (ou expirado sem resposta), o sistema dispara uma pesquisa de recusa para entender o motivo. Delay de 24h para não parecer invasivo.

## Escopo
- `apps/backend/src/handlers/satisfacao/dispararRecusa.js` — NOVO
- EventBridge: consumir 'orcamento.recusado' e 'orcamento.expirado'

## Fora de Escopo (NÃO TOCAR)
- Tela de resposta (SAT-07)
- Dashboard (SAT-08)
- Feedback pós-entrega (SAT-02/03)

## Spec Técnica

### Triggers
```
Evento: 'orcamento.recusado'
Evento: 'orcamento.expirado'
Payload: { tenant_id, orcamento_id, cliente_id }
→ Agendar pesquisa em D+1 (24h)
```

### Fluxo
```js
async function agendarPesquisaRecusa(evento) {
  const { tenant_id, orcamento_id, cliente_id } = evento
  const config = await getConfig(tenant_id)
  
  // Verificar se pesquisa de recusa está habilitada
  if (!config.pesquisa_recusa_ativa) return
  
  // Não enviar se já existe pesquisa para esse orçamento
  const existente = await getPesquisaRecusaPorOrcamento(tenant_id, orcamento_id)
  if (existente) return
  
  // Criar registro
  const pesquisa = await criarPesquisaRecusa(tenant_id, {
    orcamento_id,
    cliente_id,
    status: 'pendente',
    link_token: gerarToken()
  })
  
  // Agendar envio em 24h
  const enviarEm = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await criarSchedule({
    nome: `recusa-${pesquisa.id}`,
    expression: `at(${enviarEm.toISOString().replace('.000Z', '')})`,
    target: 'EnviarPesquisaRecusaFunction',
    input: { tenant_id, pesquisa_id: pesquisa.id },
    deleteAfterCompletion: true
  })
}
```

### Enviar Pesquisa
```js
async function enviarPesquisaRecusa(evento) {
  const { tenant_id, pesquisa_id } = evento
  const pesquisa = await getPesquisaRecusa(tenant_id, pesquisa_id)
  const cliente = await getCliente(tenant_id, pesquisa.cliente_id)
  
  const link = `https://app.mbfotos.com.br/pesquisa-recusa/${pesquisa.id}?token=${pesquisa.link_token}`
  
  // Email
  await enviarEmail({
    para: cliente.email,
    assunto: 'Podemos melhorar? Sua opinião é importante',
    template: 'pesquisa-recusa',
    dados: { nome: cliente.nome, link }
  })
  
  // WhatsApp (se configurado)
  await enviarWhatsApp(tenant_id, cliente.telefone, 'pesquisa_recusa', {
    nome: cliente.nome, link
  })
}
```

### Configuração
| Param | Default | Onde |
|---|---|---|
| pesquisa_recusa_ativa | true | CONFIG TENANT |
| recusa_delay_horas | 24 | CONFIG TENANT |
| recusa_expira_dias | 14 | CONFIG TENANT |

### Regras
- Delay de 24h (configurável)
- Não enviar se cliente bloqueou comunicação
- Não duplicar pesquisa para mesmo orçamento
- Se orçamento volta para status 'aceito' antes do envio: cancelar schedule
- Tom empático na mensagem (não culpar o cliente)

## Critérios de Aceite
- [ ] Pesquisa agendada ao evento 'orcamento.recusado'
- [ ] Pesquisa agendada ao evento 'orcamento.expirado'
- [ ] Delay 24h configurável
- [ ] Não duplica pesquisa
- [ ] Email + WhatsApp enviados
- [ ] Cancelar se orçamento aceito depois
- [ ] Respeitar opt-out

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SAT-06: Disparo Pesquisa de Recusa.

1. Crie handlers/satisfacao/dispararRecusa.js: consumir eventos.
2. Criar PESQUISA_RECUSA com status='pendente'.
3. Agendar envio com delay 24h (configurável).
4. Enviar email + WhatsApp com link.
5. Não duplicar, cancelar se aceito depois.
6. SAM: triggers EventBridge.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
