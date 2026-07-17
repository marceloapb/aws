# ALB-06: Organização de Fotos

## Metadados
- **ID:** ALB-06
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** ALB-05

## Contexto
O admin precisa organizar fotos dentro e entre galerias: reordenar (drag & drop), mover fotos entre galerias, definir foto de capa do álbum, selecionar múltiplas e aplicar ações em lote.

## Escopo
- `apps/backend/src/handlers/album/organizarFotos.js` — NOVO
- `apps/frontend/src/components/album/FotoGrid.jsx` — NOVO
- API: PUT /admin/albuns/:id/fotos/reorder, PUT /admin/albuns/:id/fotos/mover, PUT /admin/albuns/:id/capa

## Fora de Escopo (NÃO TOCAR)
- Upload (ALB-02)
- Processamento (ALB-03)
- Download pelo cliente (ALB-09)

## Spec Técnica

### API
| Método | Rota | Ação |
|---|---|---|
| PUT | /admin/albuns/:id/fotos/reorder | Reordenar fotos dentro de uma galeria |
| PUT | /admin/albuns/:id/fotos/mover | Mover fotos para outra galeria |
| PUT | /admin/albuns/:id/capa | Definir foto de capa |
| DELETE | /admin/albuns/:id/fotos | Excluir fotos selecionadas (batch) |

### Frontend — FotoGrid.jsx
- Grid de thumbnails (responsive)
- Drag & drop para reordenar
- Multi-select (checkbox ou shift+click)
- Ações em lote: mover, excluir, baixar
- Click na foto → preview ampliado (modal)
- Botão "Definir como capa" (click direito ou botão)
- Badge indicando capa atual
- Filtros: todas, selecionadas, não selecionadas, por galeria

### Reordenação
- Atualiza campo `ordem` de todas as fotos afetadas
- Batch update no DynamoDB (TransactWriteItems se necessário)
- Otimistic update no frontend

### Mover entre Galerias
- Selecionar N fotos → escolher galeria destino
- Atualizar `galeria_id` de cada foto
- Reajustar contadores: -N na origem, +N no destino

### Excluir Fotos
- Soft delete ou hard delete (configurável)
- Hard delete: remove do DynamoDB + S3 (3 versões)
- Confirmação: "Excluir X fotos permanentemente?"
- Atualizar contadores no álbum e galeria

## Critérios de Aceite
- [ ] Grid de thumbnails renderiza corretamente
- [ ] Drag & drop reordena (com otimistic update)
- [ ] Multi-select funciona
- [ ] Mover entre galerias funciona
- [ ] Definir capa funciona
- [ ] Excluir em lote (com confirmação)
- [ ] Contadores atualizados após operações
- [ ] Preview ampliado ao clicar

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-06: Organização de Fotos.

1. Crie handlers/album/organizarFotos.js: reorder, mover, definir capa, excluir batch.
2. Crie components/album/FotoGrid.jsx: grid de thumbnails, drag & drop, multi-select, ações em lote.
3. Otimistic update no reorder.
4. Batch operations no DynamoDB (TransactWriteItems).
5. Atualizar contadores (total_fotos) após mover/excluir.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
