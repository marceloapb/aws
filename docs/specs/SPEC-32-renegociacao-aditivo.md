# SPEC-32 — Renegociação / Aditivo de Contrato

| Campo | Valor |
|-------|-------|
| ID | GAP-17 / SPEC-32 |
| Tipo | Feature |
| Prioridade | P3 |
| Impacto | Médio |
| Esforço | Médio |

## CONTEXTO

§26 do MVP-1 define aditivos contratuais, recalcular plano de pagamento e registro de reembolso parcial.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/renegociacao/criar-aditivo.js` — POST /admin/contratos/:id/aditivo
- `src/functions/renegociacao/recalcular-pagamento.js` — POST /admin/orcamentos/:id/recalcular
- `src/functions/renegociacao/registrar-reembolso.js` — POST /admin/cobrancas/:id/reembolso
- `template.yaml` — rotas + role

## FORA DE ESCOPO (NÃO TOCAR)

- Cancelamento total do contrato (workflow separado)
- Estorno via gateway (depende do adapter)
- Qualquer outro arquivo

## SPEC TÉCNICA

### Modelo DynamoDB

```
Aditivo: PK=TENANT#1, SK=ADITIVO#<contrato_id>#<seq>
```
Campos: id, contrato_id, motivo, alteracoes (JSON livre), novo_valor_total, aprovado_em, aceite_cliente (bool), created_at

### Fluxos

**Criar aditivo:** Gera novo item vinculado ao contrato original. Não altera contrato (imutável). Registra as alterações.

**Recalcular pagamento:** Com base no novo valor, cancela cobranças em_aberto e gera novas conforme nova condição.

**Registrar reembolso:** Cria item com valor negativo, atualiza percentual pago.

### IAM

Role `RenegociacaoFunctionRole`:
- DynamoDB: PutItem, UpdateItem, Query, BatchWriteItem

## CRITÉRIOS DE ACEITE

1. Aditivo criado sem alterar contrato original
2. Recalcular gera novas cobranças e cancela antigas
3. Reembolso registrado com valor negativo
4. Percentual pago recalculado após reembolso

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar Renegociação conforme spec SPEC-32.
Handlers em src/functions/renegociacao/, aditivos vinculados,
recalcular cobranças, reembolso parcial.

Alterar SOMENTE:
- template.yaml (rotas, role)
- src/functions/renegociacao/*.js (3 handlers)

NÃO refatorar, renomear ou mexer em mais nada.
```
