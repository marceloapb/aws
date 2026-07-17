# CT-05: Aceite Eletrônico (3 Passos)

## Metadados
- **ID:** CT-05
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Crítico
- **Esforço:** Médio
- **Dependência:** CT-04

## Contexto
O cliente aceita o contrato em 3 passos: (1) confirma identidade (nome + CPF), (2) confirma que leu o documento, (3) aceita os termos. O sistema registra IP, user agent, timestamps como prova legal.

## Escopo
- `apps/backend/src/handlers/contratos/aceitar.js` — NOVO
- `apps/frontend/src/pages/public/ContratoAceitar.jsx` — NOVO
- API: POST /public/contratos/:id/aceitar

## Fora de Escopo (NÃO TOCAR)
- Visualização (CT-04 — já existe)
- PDF (CT-06)
- Assinatura digital ICP-Brasil

## Spec Técnica

### Fluxo de 3 Passos
```
Passo 1 — Identidade:
  - Input: Nome completo, CPF
  - Validar CPF (algoritmo)
  - Comparar nome/CPF com dados do cliente no sistema
  - Se divergir: aviso mas permite (pode ser representante)

Passo 2 — Leitura:
  - Checkbox: "Li integralmente o contrato acima"
  - Só habilita se scrollou até o final (CT-04)
  - Exibe tempo de leitura estimado vs tempo real

Passo 3 — Aceite:
  - Checkbox: "Aceito todos os termos e condições"
  - Botão: "Assinar Contrato"
  - Confirmação: modal "Tem certeza? Esta ação é irreversível"
```

### API — POST /public/contratos/:id/aceitar
```json
// Input
{
  "token": "jwt_xxx",
  "nome_informado": "Ana Carolina Silva",
  "cpf_informado": "123.456.789-00",
  "checkbox_lido": true,
  "checkbox_aceito": true
}

// Response
{
  "sucesso": true,
  "contrato_id": "ct_001",
  "status": "assinado",
  "data_aceite": "2026-07-18T15:30:00Z",
  "mensagem": "Contrato assinado com sucesso!"
}
```

### Backend
```js
async function aceitarContrato(contratoId, payload, request) {
  const contrato = await getContrato(contratoId)
  
  // Validações
  if (contrato.status !== 'pendente') throw new Error('Contrato não está pendente')
  if (new Date(contrato.expira_em) < new Date()) throw new Error('Contrato expirado')
  if (!payload.checkbox_lido || !payload.checkbox_aceito) throw new Error('Checkboxes obrigatórios')
  if (!validarCPF(payload.cpf_informado)) throw new Error('CPF inválido')
  
  // Registrar aceite (prova legal)
  await criarAceite(contratoId, {
    cliente_id: contrato.cliente_id,
    nome_informado: payload.nome_informado,
    cpf_informado: payload.cpf_informado,
    ip_address: request.headers['x-forwarded-for'] || request.ip,
    user_agent: request.headers['user-agent'],
    checkbox_lido: true,
    checkbox_aceito: true,
    data_aceite: new Date().toISOString()
  })
  
  // Atualizar status
  await atualizarContrato(contratoId, { status: 'assinado' })
  
  // Emitir evento
  await emitirEvento('contrato.assinado', {
    tenant_id: contrato.tenant_id,
    contrato_id: contratoId,
    cliente_id: contrato.cliente_id
  })
}
```

### Frontend — ContratoAceitar.jsx
- Stepper visual (3 passos)
- Passo 1: Inputs nome + CPF + validação
- Passo 2: Checkbox "Li integralmente" (disabled se não scrollou)
- Passo 3: Checkbox "Aceito os termos" + botão assinar
- Modal de confirmação final
- Tela de sucesso: "✅ Contrato assinado! Você receberá uma cópia por email."

### Regras
- IRREVERSÍVEL: uma vez assinado, não volta
- IP e user_agent registrados automaticamente
- Se contrato expirado: erro 410 "Prazo encerrado"
- Se já assinado: erro 409 "Já assinado"
- CPF validado (algoritmo dos dígitos)
- Evento 'contrato.assinado' dispara: PDF, notificação, financeiro

## Critérios de Aceite
- [ ] 3 passos funcionam sequencialmente
- [ ] CPF validado
- [ ] Scrollou até o final (pré-requisito passo 2)
- [ ] IP + user_agent registrados
- [ ] Status muda para 'assinado'
- [ ] Evento emitido
- [ ] Erro se expirado ou já assinado
- [ ] Modal de confirmação

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CT-05: Aceite Eletrônico.

1. Crie handlers/contratos/aceitar.js: POST público com validações.
2. Crie pages/public/ContratoAceitar.jsx: stepper 3 passos.
3. Passo 1: nome+CPF. Passo 2: checkbox lido. Passo 3: checkbox aceito.
4. Registrar ACEITE_CONTRATO com IP, user_agent, timestamps.
5. Validar CPF, verificar expiração, impedir duplicação.
6. Emitir evento 'contrato.assinado'.
7. SAM: rota POST /public/contratos/{id}/aceitar.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
