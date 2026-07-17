# CT-03: Geração Automática (Orçamento Aceito → Contrato)

## Metadados
- **ID:** CT-03
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** CT-02, ORC-02

## Contexto
Quando o orçamento é aceito pelo cliente, o sistema gera automaticamente o contrato usando o modelo configurado. Faz snapshot do orçamento (valor, serviços, parcelas) e interpola as variáveis no template. O contrato nasce com status='pendente'.

## Escopo
- `apps/backend/src/handlers/contratos/gerar.js` — NOVO
- EventBridge: evento 'orcamento.aceito' → trigger geração
- API: POST /admin/contratos/gerar (manual, se preferir)

## Fora de Escopo (NÃO TOCAR)
- Modelos (CT-02 — já existe)
- Aceite eletrônico (CT-05)
- Orçamentos (módulo ORC)

## Spec Técnica

### Trigger
```
Evento: 'orcamento.aceito'
Payload: { tenant_id, orcamento_id, cliente_id }
→ Lambda gerarContrato
```

### Fluxo
```js
async function gerarContrato(tenantId, orcamentoId) {
  // 1. Buscar orçamento
  const orcamento = await getOrcamento(tenantId, orcamentoId)
  const cliente = await getCliente(tenantId, orcamento.cliente_id)
  const tenant = await getTenant(tenantId)
  
  // 2. Buscar modelo de contrato (default ou específico do tipo de evento)
  const modelo = await getModeloContrato(tenantId, orcamento.tipo_evento)
  
  // 3. Montar variáveis
  const variaveis = {
    nome_cliente: cliente.nome,
    cpf_cliente: cliente.cpf,
    email_cliente: cliente.email,
    telefone_cliente: cliente.telefone,
    tipo_evento: orcamento.tipo_evento,
    data_evento: formatarData(orcamento.data_evento),
    local_evento: orcamento.local,
    valor_total: formatarMoeda(orcamento.valor_total),
    forma_pagamento: formatarParcelas(orcamento.parcelas),
    prazo_entrega: `${orcamento.prazo_entrega_dias} dias`,
    servicos_contratados: formatarServicos(orcamento.itens),
    nome_fotografo: tenant.nome,
    cnpj_fotografo: tenant.cnpj,
    data_hoje: formatarData(new Date())
  }
  
  // 4. Interpolar template
  const corpoRenderizado = interpolar(modelo.corpo_html, variaveis)
  
  // 5. Salvar contrato
  const contrato = await criarContrato(tenantId, {
    modelo_id: modelo.id,
    orcamento_id: orcamentoId,
    cliente_id: orcamento.cliente_id,
    status: 'pendente',
    corpo_html_renderizado: corpoRenderizado,
    snapshot_orcamento: {
      valor_total: orcamento.valor_total,
      itens: orcamento.itens,
      parcelas: orcamento.parcelas,
      data_evento: orcamento.data_evento
    },
    prazo_assinatura_dias: modelo.prazo_assinatura_dias,
    expira_em: calcularExpiracao(modelo.prazo_assinatura_dias)
  })
  
  // 6. Gerar link do cliente
  const link = gerarLinkCliente(contrato.id)
  await atualizarContrato(contrato.id, { link_cliente: link })
  
  // 7. Emitir evento 'contrato.gerado'
  await emitirEvento('contrato.gerado', { tenant_id: tenantId, contrato_id: contrato.id })
  
  return contrato
}
```

### Interpolação
```js
function interpolar(template, variaveis) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variaveis[key] || match // Mantém placeholder se variável não existe
  })
}
```

### API Manual — POST /admin/contratos/gerar
```json
// Input
{
  "orcamento_id": "orc_001",
  "modelo_id": "modelo_001",
  "campos_manuais": {
    "observacoes_adicionais": "Inclui making of",
    "clausula_especial": "Fotógrafo terá acesso ao local 2h antes"
  }
}

// Response
{
  "contrato_id": "ct_001",
  "status": "pendente",
  "link_cliente": "https://app.mbfotos.com.br/contrato/ct_001?token=xxx",
  "expira_em": "2026-07-24T10:00:00Z"
}
```

### Regras
- Snapshot é IMUTÁVEL (se orçamento mudar depois, contrato não muda)
- Se modelo não encontrado para tipo_evento: usar modelo default
- Se já existe contrato para o orçamento: erro 409 (não duplicar)
- Link do cliente usa token JWT de curta duração (7 dias)
- Campos manuais opcionais (se não preenchidos, ficam em branco)

## Critérios de Aceite
- [ ] Contrato gerado ao evento 'orcamento.aceito'
- [ ] Variáveis interpoladas corretamente
- [ ] Snapshot salvo (imutável)
- [ ] Link do cliente gerado
- [ ] Status='pendente'
- [ ] Não duplica contrato para mesmo orçamento
- [ ] Campos manuais opcionais
- [ ] Evento 'contrato.gerado' emitido

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CT-03: Geração Automática de Contrato.

1. Crie handlers/contratos/gerar.js: trigger por evento + API manual.
2. Interpolar variáveis no template HTML.
3. Snapshot do orçamento (imutável).
4. Gerar link do cliente com token JWT.
5. Erro 409 se contrato já existe para o orçamento.
6. EventBridge: consumir 'orcamento.aceito', emitir 'contrato.gerado'.
7. SAM: rota POST /admin/contratos/gerar + trigger EventBridge.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
