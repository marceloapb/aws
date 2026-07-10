# SPEC-33 — Inventário / Checklist

| Campo | Valor |
|-------|-------|
| ID | GAP-18 / SPEC-33 |
| Tipo | Feature |
| Prioridade | P3 |
| Impacto | Baixo |
| Esforço | Baixo |

## CONTEXTO

§27 do MVP-1 define CRUD de equipamentos e modelos de checklist por tipo de evento.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/inventario/crud-equipamento.js` — CRUD /admin/equipamentos
- `src/functions/inventario/crud-checklist.js` — CRUD /admin/checklists
- `src/functions/inventario/gerar-checklist-evento.js` — POST /admin/eventos/:id/checklist
- `template.yaml` — rotas + role

## FORA DE ESCOPO (NÃO TOCAR)

- Controle de manutenção
- Seguro de equipamento
- Qualquer outro arquivo

## SPEC TÉCNICA

### Modelo DynamoDB

```
Equipamento: PK=TENANT#1, SK=EQUIP#<ulid>
Checklist Modelo: PK=TENANT#1, SK=CHECKLIST#<ulid>
Checklist Evento: PK=TENANT#1, SK=CHECKLIST_EVT#<orc_id>
```

Campos Equipamento: id, nome, categoria, numero_serie, status (disponivel|em_uso|manutencao)

Campos Checklist Modelo: id, nome, tipo_evento, itens[{descricao, obrigatorio}]

Campos Checklist Evento: id, orcamento_id, modelo_id, itens[{descricao, marcado, marcado_em}]

### Fluxos

**CRUD equipamentos:** padrão.
**CRUD checklists modelos:** padrão, por tipo_evento.
**Gerar checklist evento:** clona modelo para o evento, admin marca itens antes do dia.

### IAM

Role `InventarioFunctionRole`:
- DynamoDB: PutItem, GetItem, UpdateItem, Query

## CRITÉRIOS DE ACEITE

1. CRUD de equipamentos funciona
2. Modelo de checklist por tipo de evento
3. Gerar checklist para evento específico (clone do modelo)
4. Marcar itens como feito

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar Inventário/Checklist conforme spec SPEC-33.
Handlers em src/functions/inventario/.

Alterar SOMENTE:
- template.yaml (rotas, role)
- src/functions/inventario/*.js (3 handlers)

NÃO refatorar, renomear ou mexer em mais nada.
```
