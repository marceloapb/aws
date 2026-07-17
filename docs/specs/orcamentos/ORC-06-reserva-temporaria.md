# ORC-06: Reserva Temporária de Datas no Envio

## Metadados
- **ID:** ORC-06
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Alto
- **Dependência:** ORC-05, ORC-02

## Contexto
Quando o orçamento é enviado ao cliente, a data precisa ser "reservada" temporariamente na agenda para evitar dupla venda. Se o cliente aceita, vira confirmação. Se recusa ou expira, a reserva é liberada.

## Escopo
- Backend: Lambdas enviarOrcamento, aceitarOrcamento, recusarOrcamento
- DynamoDB: record AGENDA com status=reserva
- EventBridge: expiração automática

## Fora de Escopo (NÃO TOCAR)
- Calendário frontend (AGD-*)
- Portal do cliente

## Spec Técnica

### Fluxo
1. Envio → criar reservas para todos eventos/opções
2. Aceite → confirmar reservas da opção escolhida, liberar demais
3. Recusa/Expiração → liberar todas

### DynamoDB — Record de Reserva
```json
{
  "PK": "TENANT#abc",
  "SK": "AGENDA#2026-11-15#res_xyz",
  "tipo": "reserva",
  "titulo": "[Reserva] Casamento — Pacote Premium",
  "orcamento_id": "orc_456",
  "opcao_id": "opc_001",
  "status": "reserva",
  "TTL": 1753401599
}
```

## Critérios de Aceite
- [ ] Ao enviar, reservas criadas na agenda
- [ ] Reserva aparece com badge visual
- [ ] Aceite: opção escolhida → confirmada, demais → liberadas
- [ ] Recusa: todas liberadas
- [ ] Expiração: todas liberadas automaticamente
- [ ] Conflito com reserva existente gera warning

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-06: Reserva Temporária de Datas.

1. Backend enviarOrcamento: criar reservas AGENDA para cada evento/opção.
2. Backend aceitarOrcamento: confirmar opção aceita, deletar demais.
3. Backend recusarOrcamento + EventBridge: liberar todas.
4. IAM com privilégio mínimo.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
