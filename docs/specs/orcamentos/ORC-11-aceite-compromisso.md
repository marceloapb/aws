# ORC-11: Aceite = Compromisso Firme

## Metadados
- **ID:** ORC-11
- **Tipo:** Melhoria
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** ORC-03, ORC-04, ORC-06

## Contexto
Quando o cliente aceita uma opção, isso deve ser um compromisso firme: congela opção escolhida, forma de pagamento, recalcula valor final, confirma reservas de agenda, e dispara geração de contrato.

## Escopo
- Backend: Lambda `aceitarOrcamento` — atualizar
- API: POST /cliente/propostas/:id/aceitar
- DynamoDB: campos aceite_*
- Frontend cliente: modal de confirmação

## Fora de Escopo (NÃO TOCAR)
- Geração do contrato em si (módulo Contratos)
- Pagamento real (Gateway)
- Admin

## Spec Técnica

### Request — POST /cliente/propostas/:id/aceitar
```json
{
  "opcao_id": "opc_001",
  "modalidade_pagamento": "parcelado_sem_juros",
  "num_parcelas": 6,
  "aceite_termos": true
}
```

### Backend — aceitarOrcamento
1. Validar status = enviado
2. Validar opcao_id existe
3. Recalcular valor final com modalidade escolhida
4. Atualizar:
   - status_interno → aceito
   - status_cliente → "Aprovado"
   - aceite_opcao_id
   - aceite_modalidade
   - aceite_valor_final
   - aceite_parcelas
   - aceite_at (timestamp)
5. Confirmar reservas da opção escolhida (ORC-06)
6. Liberar reservas das outras opções
7. Disparar evento ORCAMENTO_ACEITO (para contrato, notificação)

### DynamoDB — Campos de Aceite
```
aceite_opcao_id: string
aceite_modalidade: 'a_vista' | 'parcelado_sem_juros' | 'parcelado_com_juros'
aceite_valor_final: number
aceite_parcelas: number
aceite_at: ISO timestamp
aceite_termos: boolean
```

### Frontend — Modal de Confirmação
- Resumo: opção escolhida + modalidade + valor final
- Checkbox: "Li e concordo com os termos"
- Botão: "Confirmar aceite" (loading state)
- Após sucesso: tela de parabéns + próximos passos

## Critérios de Aceite
- [ ] Cliente escolhe opção + modalidade para aceitar
- [ ] Valor final recalculado com base na modalidade
- [ ] Status muda para aceito
- [ ] Reservas confirmadas (opção escolhida)
- [ ] Reservas liberadas (demais opções)
- [ ] Timestamp de aceite gravado
- [ ] Evento ORCAMENTO_ACEITO disparado
- [ ] Aceite sem selecionar opção retorna 400

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-11: Aceite = Compromisso Firme.

1. Backend POST /cliente/propostas/:id/aceitar:
   - Validar, recalcular valor, atualizar status, confirmar reservas
   - Disparar evento ORCAMENTO_ACEITO

2. Frontend: modal de confirmação com resumo + checkbox termos.

3. DynamoDB: campos aceite_* no record ORCAMENTO.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
