# FIN-14: API — CRUD Categorias de Despesa

## Metadados
- **ID:** FIN-14
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Baixo
- **Esforço:** Baixo
- **Dependência:** FIN-13

## Contexto
Antes de cadastrar despesas, o admin define categorias (Aluguel, Transporte, Software, etc.). Tabela de domínio simples, mesma lógica de CategoriaEquipamento.

## Escopo
- `apps/backend/src/handlers/financeiro/categoriasDespesa.js` — NOVO
- `apps/frontend/src/components/financeiro/CategoriasDespesa.jsx` — NOVO
- API: /admin/financeiro/categorias-despesa (CRUD)

## Fora de Escopo (NÃO TOCAR)
- Despesas avulsas (FIN-15)
- Despesas fixas (FIN-16)
- Cobranças (FIN-01+)

## Spec Técnica

### API
| Método | Rota | Ação |
|---|---|---|
| GET | /admin/financeiro/categorias-despesa | Listar |
| POST | /admin/financeiro/categorias-despesa | Criar |
| PUT | /admin/financeiro/categorias-despesa/:id | Renomear/tipo |
| DELETE | /admin/financeiro/categorias-despesa/:id | Desativar |

### Campos
- nome (obrigatório, max 50, único)
- tipo: 'fixa' ou 'variável'
- ativa: boolean

### Frontend — CategoriasDespesa.jsx
- Lista com inline edit
- Badge de tipo (fixa/variável)
- Botão criar + desativar
- Acessível via Financeiro → Configurar Categorias

## Critérios de Aceite
- [ ] CRUD funciona
- [ ] Nome único por tenant
- [ ] Tipo fixa/variável
- [ ] Desativar (não apaga)
- [ ] Seed de categorias no onboarding

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-14: CRUD Categorias de Despesa.

1. Crie handlers/financeiro/categoriasDespesa.js: CRUD.
2. Crie components/financeiro/CategoriasDespesa.jsx: lista, inline edit.
3. Regras: nome único, tipo fixa/variável, desativar.
4. SAM: rotas /admin/financeiro/categorias-despesa.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
