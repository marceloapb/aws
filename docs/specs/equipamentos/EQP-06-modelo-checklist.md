# EQP-06: Modelo de Checklist por Tipo de Evento

## Metadados
- **ID:** EQP-06
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** EQP-05

## Contexto
O fotógrafo monta checklists diferentes para tipos de evento diferentes. Ex: "Casamento" precisa de 2 câmeras + flash + tripé; "Ensaio" precisa de 1 câmera + rebatedor. Cada modelo é associado a um Tipo de Evento (referencia ITEM do Catálogo, tipo='Serviço Principal').

## Escopo
- `apps/backend/src/handlers/equipamento/checklist.js` — NOVO
- `apps/frontend/src/pages/admin/ChecklistModelo.jsx` — NOVO
- DynamoDB: entidades MODELO_CHECKLIST, ITEM_CHECKLIST
- API: /admin/equipamentos/checklists

## Fora de Escopo (NÃO TOCAR)
- CRUD de equipamentos (EQP-03)
- Conferência (EQP-07 — tela de check)
- Agenda/Eventos

## Spec Técnica

### Entidade MODELO_CHECKLIST
```json
{
  "PK": "TENANT#t123",
  "SK": "CHECKLIST_MODELO#chk_001",
  "id": "chk_001",
  "nome": "Casamento Completo",
  "tipo_evento_id": "item_serv_001",
  "tipo_evento_nome": "Casamento",
  "total_itens": 12,
  "ativo": true,
  "created_at": "2026-07-17T10:00:00Z"
}
```

### Entidade ITEM_CHECKLIST
```json
{
  "PK": "CHECKLIST_MODELO#chk_001",
  "SK": "ITEM_CK#ick_001",
  "id": "ick_001",
  "modelo_id": "chk_001",
  "equipamento_id": "eqp_001",
  "equipamento_nome": "Canon EOS R5",
  "obrigatorio": true,
  "ordem": 1,
  "auto": true
}
```

### API
| Método | Rota | Ação |
|---|---|---|
| GET | /admin/equipamentos/checklists | Listar modelos |
| POST | /admin/equipamentos/checklists | Criar modelo |
| GET | /admin/equipamentos/checklists/:id | Detalhe (com itens) |
| PUT | /admin/equipamentos/checklists/:id | Atualizar nome/tipo |
| DELETE | /admin/equipamentos/checklists/:id | Desativar |
| POST | /admin/equipamentos/checklists/:id/itens | Adicionar equipamento |
| DELETE | /admin/equipamentos/checklists/:id/itens/:itemId | Remover equipamento |
| PUT | /admin/equipamentos/checklists/:id/itens/reorder | Reordenar |

### Regras
- Ao criar modelo: pré-incluir todos os equipamentos com `padrao=true`
- Tipo de evento: select populado por ITEM Catálogo (tipo='Serviço Principal')
- Um tipo de evento pode ter mais de um modelo (ex: "Casamento Básico" vs "Casamento Premium")
- Equipamento não pode ser adicionado 2x no mesmo modelo
- Campo `obrigatorio`: se true, não pode ser desmarcado na conferência

### Frontend — ChecklistModelo.jsx
- Listagem de modelos em cards (nome + tipo evento + qtd itens)
- Criar/editar modelo:
  - Nome do modelo
  - Select de tipo de evento
  - Lista de equipamentos (drag & drop para ordenar)
  - Botão "+ Adicionar Equipamento" (select com busca)
  - Toggle "Obrigatório" em cada item
  - Items com `auto=true`: badge "Padrão" (não remove)

## Critérios de Aceite
- [ ] CRUD de modelos funciona
- [ ] Itens do checklist vinculados a equipamentos reais
- [ ] Equipamentos padrão pré-incluídos ao criar
- [ ] Select de tipo de evento do Catálogo
- [ ] Drag & drop para reordenar
- [ ] Toggle obrigatório funciona
- [ ] Badge "Padrão" nos itens automáticos
- [ ] Não permite duplicar equipamento no mesmo modelo

## Prompt Pronto para o Kiro CLI

```
Implemente a spec EQP-06: Modelo de Checklist por Tipo de Evento.

1. Crie handlers/equipamento/checklist.js: CRUD modelos + itens.
2. Crie pages/admin/ChecklistModelo.jsx: cards de modelos, editor com drag & drop.
3. Entidades MODELO_CHECKLIST e ITEM_CHECKLIST no DynamoDB.
4. Pré-incluir equipamentos padrao=true ao criar modelo.
5. Tipo evento: select de ITEM Catálogo (tipo='Serviço Principal').
6. SAM: rotas /admin/equipamentos/checklists.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
