# PRS-01: CRUD de Categorias

## Metadados
- **ID:** PRS-01
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
Categorias organizam os itens do catálogo (ex: Fotografia, Vídeo, Álbum, Extras). São tabela de domínio simples. O admin define antes de cadastrar itens.

## Escopo
- `apps/backend/src/handlers/produtos/categorias.js` — NOVO
- `apps/frontend/src/components/produtos/CategoriaManager.jsx` — NOVO
- API: /admin/produtos/categorias (CRUD)

## Fora de Escopo (NÃO TOCAR)
- Itens (PRS-02)
- Pacotes (PRS-06)
- Outros módulos

## Spec Técnica

### Entidade CATEGORIA
```json
{
  "PK": "TENANT#t123",
  "SK": "CATEGORIA#cat_001",
  "id": "cat_001",
  "nome": "Fotografia",
  "ativa": true,
  "ordem": 1,
  "created_at": "2026-07-17T10:00:00Z"
}
```

### API
| Método | Rota | Ação |
|---|---|---|
| GET | /admin/produtos/categorias | Listar (ativas por padrão) |
| POST | /admin/produtos/categorias | Criar |
| PUT | /admin/produtos/categorias/:id | Renomear/reordenar |
| DELETE | /admin/produtos/categorias/:id | Desativar |

### Regras
- Nome obrigatório, max 50, único por tenant
- Não excluir se tem itens vinculados → desativar
- Ordem (drag & drop para reordenar)
- Desativar: ativa=false, itens permanecem (mas categoria some dos selects)

### Categorias Sugeridas (seed)
| Nome | Ordem |
|---|---|
| Fotografia | 1 |
| Vídeo | 2 |
| Álbum/Impressos | 3 |
| Extras | 4 |

### Frontend — CategoriaManager.jsx
- Lista com drag & drop para reordenar
- Inline edit (click para renomear)
- Badge com quantidade de itens
- Botão + para nova
- Botão desativar
- Acessível via: Produtos e Serviços → Categorias

## Critérios de Aceite
- [ ] CRUD completo
- [ ] Nome único por tenant
- [ ] Drag & drop reordena
- [ ] Não exclui se tem itens (desativa)
- [ ] Badge com contagem de itens
- [ ] Seed de categorias sugeridas

## Prompt Pronto para o Kiro CLI

```
Implemente a spec PRS-01: CRUD de Categorias de Produtos e Serviços.

1. Crie handlers/produtos/categorias.js: listar, criar, renomear, reordenar, desativar.
2. Crie components/produtos/CategoriaManager.jsx: lista drag & drop, inline edit, badge.
3. Regras: nome único, não excluir se tem itens, ordem persistida.
4. SAM: rotas /admin/produtos/categorias.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
