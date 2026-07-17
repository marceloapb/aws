# ALB-05: CRUD de Galerias

## Metadados
- **ID:** ALB-05
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** ALB-01

## Contexto
Cada álbum contém N galerias (ex: Making Of, Cerimônia, Festa, Ensaio). O admin precisa criar, renomear, reordenar e excluir galerias. Fotos são organizadas dentro de galerias.

## Escopo
- `apps/backend/src/handlers/album/galerias.js` — NOVO (CRUD)
- `apps/frontend/src/components/album/GaleriaManager.jsx` — NOVO
- API: /admin/albuns/:id/galerias (GET, POST, PUT, DELETE)
- DynamoDB: entidade GALERIA

## Fora de Escopo (NÃO TOCAR)
- Upload de fotos (ALB-02)
- Organização/ordenação de fotos dentro da galeria (ALB-06)
- Albuns.jsx (listagem principal)

## Spec Técnica

### API
| Método | Rota | Ação |
|---|---|---|
| GET | /admin/albuns/:id/galerias | Listar galerias do álbum (ordenadas) |
| POST | /admin/albuns/:id/galerias | Criar galeria |
| PUT | /admin/albuns/:id/galerias/:galeriaId | Renomear / reordenar |
| DELETE | /admin/albuns/:id/galerias/:galeriaId | Excluir (se vazia) |
| PUT | /admin/albuns/:id/galerias/reorder | Reordenar todas (batch) |

### Regras
- Galeria só pode ser excluída se não contém fotos
- Se contém fotos: exibir aviso "Mova as fotos para outra galeria antes de excluir"
- Nome obrigatório, max 100 chars
- Ordem: inteiro sequencial (1, 2, 3...)
- Máximo 20 galerias por álbum
- Galeria padrão criada automaticamente: "Geral" (ordem 0)

### Frontend — GaleriaManager.jsx
- Lista de galerias com drag & drop para reordenar
- Inline edit do nome (click para editar)
- Botão + para criar nova galeria
- Botão excluir com confirmação
- Badge com total de fotos em cada galeria
- Tab navigation: clicar na galeria mostra suas fotos

## Critérios de Aceite
- [ ] CRUD completo de galerias
- [ ] Reordenação via drag & drop
- [ ] Renomear inline
- [ ] Excluir bloqueado se tem fotos
- [ ] Máximo 20 galerias
- [ ] Galeria "Geral" criada automaticamente
- [ ] Badge com contagem de fotos
- [ ] Validação de nome (obrigatório, max 100)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-05: CRUD de Galerias.

1. Crie handlers/album/galerias.js: CRUD completo (criar, listar, renomear, reordenar, excluir).
2. Crie components/album/GaleriaManager.jsx: lista com drag & drop, inline edit, criar, excluir.
3. Regras: max 20 galerias, excluir só se vazia, galeria "Geral" padrão.
4. SAM: rotas /admin/albuns/{id}/galerias.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
