# ORC-11: Aceite = Compromisso Firme

## Metadados
- **ID:** ORC-11
- **Tipo:** Melhoria
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** ORC-03, ORC-04, ORC-06

## Contexto
Quando o cliente aceita, o sistema deve congelar: opção escolhida, forma de pagamento, valor final calculado. Isso fecha o ciclo de venda e permite gerar contrato/cobrança.

## Escopo
- Backend: Lambda `aceitarOrcamento`
- DynamoDB: campos `aceite_*` no ORCAMENTO
- Frontend admin: OrcamentoDetalhe.jsx — exibir aceite

## Fora de Escopo (NÃO TOCAR)
- Geração de contrato
- Cobrança/pagamento real
- Portal do cliente

## Spec Técnica

### Dados do Aceite
```json
{
  "aceite": {
    "opcao_id": "opc_001",
    "opcao_nome": "Pacote Premium",
    "forma_pagamento": "parcelado_sem_juros",
    "num_parcelas": 6,
    "valor_parcela": 1116.67,
    "valor_total_final": 6700.00,
    "aceito_em": "2026-07-20T10:30:00Z",
    "aceito_por": "cliente@email.com",
    "ip_cliente": "189.10.20.30"
  }
}
```

### Backend — aceitarOrcamento
1. Validar: status_interno == 'enviado'
2. Recalcular valor final com forma de pagamento escolhida
3. Salvar bloco `aceite` imutável
4. Atualizar status: 'enviado' → 'aceito'
5. Confirmar reserva da opção escolhida (ORC-06)
6. Liberar reservas das outras opções
7. Cancelar schedule de expiração (ORC-09)

### Frontend — OrcamentoDetalhe.jsx
- Se aceito: card verde com resumo do aceite
- Opção escolhida destacada
- Valor final e forma de pagamento
- Timestamp + email do aceite
- Botão "Gerar contrato" (futuro)

## Critérios de Aceite
- [ ] Aceite congela opção + pagamento + valor
- [ ] Dados imutáveis após aceite
- [ ] Status muda para 'aceito'
- [ ] Reserva confirmada, demais liberadas
- [ ] Schedule de expiração cancelado
- [ ] Card de aceite no detalhe admin
- [ ] IP do cliente registrado

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-11: Aceite = Compromisso Firme.

1. Backend aceitarOrcamento:
   - Validar status=enviado
   - Recalcular valor final com paymentCalculator
   - Salvar bloco aceite imutável
   - Confirmar reserva, liberar demais, cancelar schedule

2. Em OrcamentoDetalhe.jsx: card verde com dados do aceite.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
