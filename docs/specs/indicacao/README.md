# §31 — Programa de Indicações (Specs de Implementação)

> Refinamentos técnicos da SPEC-54. Cada spec é atômica e contém prompt pronto para o Kiro CLI.

## Estrutura

| Spec | Título | Prioridade |
|------|--------|------------|
| IND-01 | DynamoDB Access Patterns e PK/SK | P0 |
| IND-02 | Rotas HTTP API + Handlers Lambda | P0 |
| IND-03 | Gatilho §8→§31 (EventBridge) | P0 |
| IND-04 | Integração §25 — Código no Cadastro | P1 |
| IND-05 | Idempotência na Confirmação | P1 |
| IND-06 | Formato do Link/Código e URL Pública | P1 |
| IND-07 | Notificação ao Indicador na Conversão | P2 |
| IND-08 | SAM Resources (template.yaml) | P1 |
| IND-09 | Validar Suposição Cap A / Cap B | P0 |
| IND-10 | GSIs para Queries Admin | P1 |
| IND-11 | Race Condition First-Touch | P2 |
| IND-12 | Regeneração/Desativação do Código | P3 |
| IND-13 | Follow-up Pós-Entrega | P3 |

## Ordem de Execução

| Fase | Specs | Dependência |
|------|-------|-------------|
| 0 — Validação | IND-09 | PO decide → desbloqueia tudo |
| 1 — Fundação | IND-01, IND-06 | Nenhuma (documentação + formato) |
| 2 — Infra | IND-08 | IND-01 (precisa dos APs pra declarar IAM) |
| 3 — Core Backend | IND-02, IND-03, IND-04, IND-05 | IND-08 (resources no SAM) |
| 4 — Segurança | IND-10, IND-11 | IND-02 (handlers existem) |
| 5 — Extras | IND-07, IND-12, IND-13 | IND-03 (evento existe) |

## Handlers gerados

```
src/handlers/indicacoes/
├── getIndicacoesConfig.mjs      (IND-02)
├── updateIndicacoesConfig.mjs   (IND-02)
├── listIndicacoes.mjs           (IND-02, IND-10)
├── revogarIndicador.mjs         (IND-02, IND-12)
├── getMinhasIndicacoes.mjs      (IND-02)
├── getMeuCodigo.mjs             (IND-02, IND-06)
├── resolverCodigo.mjs           (IND-02, IND-04)
├── confirmarIndicacao.mjs       (IND-03, IND-05, IND-07)
└── regenerarCodigo.mjs          (IND-12)
```
