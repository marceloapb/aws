# EQP-02: CRUD de Categorias de Equipamento

## Metadados
- **ID:** EQP-02
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Baixo
- **Dependência:** EQP-01

## Contexto
Antes de cadastrar equipamentos, o admin deve definir categorias (Câmeras, Lentes, Iluminação, Acessórios, etc.). Categorias são tabela de domínio simples.

## Escopo
- `apps/backend/src/handlers/equipamento/categorias.js` — NOVO
- `apps/frontend/src/components/equipamento/CategoriaManager.jsx` — NOVO
- API: /admin/equipamentos/categorias (GET, POST, PUT, DELETE)

## Fora de Escopo (NÃO TOCAR)
- CRUD de equipamentos (EQP-03)
- Checklist (EQP-06)
- Outros módulos

## Spec Técnica

### Categorias Sugeridas (seed)
| Nome | Ícone sugerido |
|---|---|
| Câmeras | 📷 |
| Lentes | 🔭 |
| Iluminação | 💡 |
| Áudio | 🎤 |
| Suportes/Tripés | 📐 |
| Acessórios | 🎒 |
| Drones | 🚁 |
| Computadores | 💻 |

### API
| Método | Rota | Ação |
|---|---|---|
| GET | /admin/equipamentos/categorias | Listar categorias ativas |
| POST | /admin/equipamentos/categorias | Criar categoria |
| PUT | /admin/equipamentos/categorias/:id | Renomear |
| DELETE | /admin/equipamentos/categorias/:id | Desativar (ativo=false) |

### Regras
- Nome obrigatório, max 50 chars
- Nome único por tenant
- Não excluir se tem equipamentos vinculados → mensagem "Desative os equipamentos primeiro"
- Desativar: ativo=false, não aparece mais nos selects

### Frontend — CategoriaManager.jsx
- Lista simples com nome + badge de quantidade de equipamentos
- Inline edit (click para renomear)
- Botão + para nova categoria
- Botão desativar (com confirmação se tem itens)
- Acessível via: Configurações → Equipamentos → Categorias

## Critérios de Aceite
- [ ] CRUD completo de categorias
- [ ] Nome único por tenant
- [ ] Não exclui se tem equipamentos (mensagem)
- [ ] Desativar funciona (ativo=false)
- [ ] Inline edit
- [ ] Badge com contagem de equipamentos
- [ ] Seed de categorias sugeridas no onboarding

## Prompt Pronto para o Kiro CLI

```
Implemente a spec EQP-02: CRUD de Categorias de Equipamento.

1. Crie handlers/equipamento/categorias.js: listar, criar, renomear, desativar.
2. Crie components/equipamento/CategoriaManager.jsx: lista, inline edit, criar, desativar.
3. Regras: nome único, não excluir se tem equipamentos, desativar (ativo=false).
4. SAM: rotas /admin/equipamentos/categorias.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
