# ORC-10: Proposta Client-Facing (Visibilidade Controlada)

## Metadados
- **ID:** ORC-10
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** ORC-02, ORC-03

## Contexto
O cliente só deve ver valores APÓS o admin enviar explicitamente. Antes disso, mesmo que o orçamento exista, é invisível no portal. Após envio, o cliente vê uma proposta formatada com opções, valores e condições.

## Escopo
- Backend: Lambda `getPropostaCliente` — NOVO
- API: GET /cliente/propostas/:id
- Frontend cliente: `PropostaView.jsx` — NOVO (portal)
- DynamoDB: controle de visibilidade por status

## Fora de Escopo (NÃO TOCAR)
- Admin (Orcamentos.jsx, OrcamentoForm.jsx)
- Fluxo de aceite (ORC-11)
- PDF (ORC-13)

## Spec Técnica

### API — GET /cliente/propostas/:id
- Autenticação: Cognito (cliente)
- Validação: status_interno IN ['enviado','aceito','recusado','expirado','contrato_gerado']
- Se status = rascunho/em_revisao/pronto_enviar → 404
- Response: dados formatados para exibição

### Response Shape
```json
{
  "id": "orc_456",
  "fotografo": { "nome": "Marcelo Bloise", "logo_url": "..." },
  "status": "Proposta enviada",
  "opcoes": [
    {
      "id": "opc_001",
      "nome": "Pacote Premium",
      "descricao": "...",
      "itens": [...],
      "eventos": [...],
      "valor_total": 6700,
      "destaque": true
    }
  ],
  "condicoes_pagamento": [...],
  "expira_em": "2026-08-15T00:00:00Z",
  "mensagem_fotografo": "Fico feliz com o interesse..."
}
```

### Frontend Cliente — PropostaView.jsx
- Header com logo + nome do fotógrafo
- Cards de opções (destaque visual na recomendada)
- Condições de pagamento comparativas
- Countdown de expiração
- Botões: "Aceitar esta opção" (por opção) + "Recusar"
- Mensagem personalizada do fotógrafo

## Critérios de Aceite
- [ ] Cliente não vê orçamentos em rascunho/revisão
- [ ] Proposta enviada é visível com dados completos
- [ ] Opções exibidas como cards comparativos
- [ ] Destaque visual na opção recomendada
- [ ] Countdown de expiração visível
- [ ] Botão aceitar por opção
- [ ] Mensagem do fotógrafo exibida

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-10: Proposta Client-Facing.

1. Backend GET /cliente/propostas/:id: validar visibilidade por status, retornar dados formatados.
2. Crie PropostaView.jsx no portal do cliente com cards de opções e countdown.
3. IAM com privilégio mínimo para o Lambda.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
