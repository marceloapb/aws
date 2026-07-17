# EQP-03: CRUD de Equipamentos (Inventário)

## Metadados
- **ID:** EQP-03
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Médio
- **Dependência:** EQP-02

## Contexto
CRUD completo de equipamentos: cadastrar, editar, listar, desativar. Cada equipamento tem categoria, marca, modelo, número de série, localização, flags (padrão, ativo) e status.

## Escopo
- `apps/backend/src/handlers/equipamento/equipamentos.js` — NOVO
- `apps/frontend/src/pages/admin/Equipamentos.jsx` — NOVO (listagem)
- `apps/frontend/src/pages/admin/EquipamentoForm.jsx` — NOVO (formulário)
- API: /admin/equipamentos (GET, POST, PUT, DELETE)

## Fora de Escopo (NÃO TOCAR)
- Checklist (EQP-06)
- Importação CSV (EQP-09)
- Painel resumo (EQP-04)

## Spec Técnica

### Campos do Formulário
| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| nome | text | Sim | max 100 chars |
| categoria_id | select | Sim | categorias ativas |
| marca | text | Não | max 50 |
| modelo | text | Não | max 50 |
| num_serie | text | Não | max 50, único por tenant |
| status | select | Sim | disponivel/em_uso/manutencao/indisponivel |
| localizacao | text | Não | max 100 |
| obs | textarea | Não | max 500 |
| padrao | toggle | Não | default false |
| ativo | toggle | Não | default true |

### Frontend — Equipamentos.jsx (listagem)
- Tabela com colunas: Nome, Categoria, Marca/Modelo, Status, Padrão, Ações
- Filtros: por categoria, status, flag padrão, ativo/inativo
- Busca por nome, marca, modelo, num_serie
- Botão "+ Novo Equipamento"
- Ações: Editar, Desativar
- Badge de status colorido (verde=disponível, azul=em uso, amarelo=manutenção, cinza=indisponível)

### Frontend — EquipamentoForm.jsx
- Modal ou página de formulário
- Todos os campos com validação client-side
- Ao salvar: feedback toast
- Ao criar com padrao=true: aviso "Este equipamento será incluído automaticamente em todos os checklists"

### Backend — equipamentos.js
- Listar: query PK=TENANT#id, begins_with(SK, 'EQUIPAMENTO#'), filtros via FilterExpression
- Criar: validar nome, categoria existente, num_serie único
- Atualizar: mesmas validações
- Desativar: ativo=false (não remove do banco)

## Critérios de Aceite
- [ ] CRUD completo funciona
- [ ] Validação de todos os campos (client + server)
- [ ] Num_serie único por tenant
- [ ] Filtros por categoria, status, padrão
- [ ] Busca por nome/marca/modelo
- [ ] Badge de status colorido
- [ ] Toggle padrão com aviso
- [ ] Desativar (soft delete)
- [ ] Toast de feedback

## Prompt Pronto para o Kiro CLI

```
Implemente a spec EQP-03: CRUD de Equipamentos.

1. Crie handlers/equipamento/equipamentos.js: CRUD completo com validação.
2. Crie pages/admin/Equipamentos.jsx: tabela com filtros, busca, ações.
3. Crie pages/admin/EquipamentoForm.jsx: formulário com todos os campos.
4. Validações: nome obrigatório, num_serie único, categoria existente.
5. Soft delete: ativo=false.
6. SAM: rotas /admin/equipamentos.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
