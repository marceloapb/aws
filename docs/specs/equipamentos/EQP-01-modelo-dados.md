# EQP-01: Modelo de Dados DynamoDB (Equipamento + Categoria)

## Metadados
- **ID:** EQP-01
- **Tipo:** Correção
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Médio
- **Dependência:** Nenhuma

## Contexto
O módulo Equipamentos precisa de um modelo single-table design no DynamoDB para suportar: equipamentos com categorias, flags (padrão/ativo), e queries por categoria, status e tenant.

## Escopo
- `apps/backend/src/models/equipamento.js` — NOVO
- DynamoDB: entidades EQUIPAMENTO, CATEGORIA_EQUIPAMENTO
- SAM template: adicionar GSIs necessários

## Fora de Escopo (NÃO TOCAR)
- Frontend
- Checklist (EQP-06)
- Outros módulos

## Spec Técnica

### Entidade EQUIPAMENTO
```json
{
  "PK": "TENANT#t123",
  "SK": "EQUIPAMENTO#eqp_001",
  "GSI1PK": "TENANT#t123",
  "GSI1SK": "EQUIPAMENTO#CAT#cat_001",
  "id": "eqp_001",
  "nome": "Canon EOS R5",
  "categoria_id": "cat_001",
  "marca": "Canon",
  "modelo": "EOS R5",
  "num_serie": "012345678",
  "status": "disponivel",
  "localizacao": "Estúdio A",
  "obs": "Comprada em 2024",
  "padrao": true,
  "ativo": true,
  "tenant_id": "t123",
  "created_at": "2026-07-17T10:00:00Z",
  "updated_at": "2026-07-17T10:00:00Z"
}
```

### Status do Equipamento
| Status | Descrição |
|---|---|
| disponivel | Pronto para uso |
| em_uso | Alocado em evento |
| manutencao | Em reparo externo |
| indisponivel | Temporariamente fora |

### Entidade CATEGORIA_EQUIPAMENTO
```json
{
  "PK": "TENANT#t123",
  "SK": "CAT_EQUIP#cat_001",
  "id": "cat_001",
  "nome": "Câmeras",
  "ativo": true,
  "created_at": "2026-07-17T10:00:00Z"
}
```

### GSIs
| GSI | PK | SK | Uso |
|---|---|---|---|
| GSI1 | TENANT#id | EQUIPAMENTO#CAT#cat_id | Listar por categoria |

### API
- POST /admin/equipamentos — criar
- GET /admin/equipamentos — listar (filtros: categoria, status, ativo, padrao)
- GET /admin/equipamentos/:id — detalhe
- PUT /admin/equipamentos/:id — atualizar
- DELETE /admin/equipamentos/:id — soft delete (ativo=false)
- POST /admin/equipamentos/categorias — criar categoria
- GET /admin/equipamentos/categorias — listar categorias
- PUT /admin/equipamentos/categorias/:id — atualizar
- DELETE /admin/equipamentos/categorias/:id — desativar

## Critérios de Aceite
- [ ] Entidades EQUIPAMENTO e CATEGORIA no DynamoDB
- [ ] Single-table design com PK/SK corretos
- [ ] GSI1 para query por categoria
- [ ] Status machine (disponivel, em_uso, manutencao, indisponivel)
- [ ] Soft delete (ativo=false)
- [ ] Flag padrao funciona

## Prompt Pronto para o Kiro CLI

```
Implemente a spec EQP-01: Modelo de Dados DynamoDB para Equipamentos.

1. Crie apps/backend/src/models/equipamento.js com entidades EQUIPAMENTO e CATEGORIA_EQUIPAMENTO.
2. Single-table design: PK=TENANT#id, SK=EQUIPAMENTO#id / CAT_EQUIP#id.
3. GSI1 para listar por categoria.
4. Status: disponivel, em_uso, manutencao, indisponivel.
5. Flags: padrao (bool), ativo (bool).
6. SAM template: declarar GSI.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
