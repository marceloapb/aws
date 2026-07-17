# PRS-05: Desativar/Reativar Item

## Metadados
- **ID:** PRS-05
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** PRS-04

## Contexto
O admin desativa itens que não oferece mais (ex: descontinuou serviço de Drone). O item NÃO é excluído — permanece para referência em orçamentos antigos. Item inativo não aparece em seleções, mas continua visível na listagem com filtro.

## Escopo
- `apps/backend/src/handlers/produtos/itens.js` — ALTERAR (PATCH ativo)
- `apps/frontend/src/pages/admin/ProdutosServicos.jsx` — ALTERAR (ação desativar)
- API: PATCH /admin/produtos/itens/:id/status

## Fora de Escopo (NÃO TOCAR)
- Excluir permanentemente (não existe)
- Orçamentos (congelamento)
- Pacotes (tratamento separado)

## Spec Técnica

### API — PATCH /admin/produtos/itens/:id/status
```json
// Input
{ "ativo": false }

// Response
{ "id": "itm_001", "ativo": false, "updated_at": "2026-07-17T10:00:00Z" }
```

### Regras
- Desativar: `ativo=false`
- Reativar: `ativo=true`
- Item desativado:
  - NÃO aparece nos selects de criação de orçamento
  - NÃO aparece nos selects de pacote
  - APARECE na listagem (com filtro ativo/inativo)
  - PERMANECE em orçamentos e pacotes existentes
- Se item está em pacotes ativos: aviso "Este item está em X pacotes ativos. Desativar mesmo?"
- Confirmação obrigatória no frontend

### Frontend
- Botão "Desativar" na listagem (ação por item)
- Modal de confirmação: "Item será removido das opções de novos orçamentos"
- Se em pacotes: listar pacotes afetados
- Item desativado: row com opacidade reduzida + badge "Inativo"
- Botão "Reativar" para itens inativos

## Critérios de Aceite
- [ ] Desativar muda ativo=false
- [ ] Reativar muda ativo=true
- [ ] Item inativo não aparece nos selects
- [ ] Item inativo aparece na listagem (filtro)
- [ ] Aviso se item está em pacotes
- [ ] Confirmação antes de desativar
- [ ] Visual: opacidade + badge "Inativo"

## Prompt Pronto para o Kiro CLI

```
Implemente a spec PRS-05: Desativar/Reativar Item.

1. Em handlers/produtos/itens.js: PATCH /admin/produtos/itens/{id}/status.
2. Em ProdutosServicos.jsx: botão desativar/reativar, modal confirmação.
3. Item inativo não aparece em selects de orçamento/pacote.
4. Se em pacotes ativos: aviso com lista.
5. Visual: opacidade + badge Inativo.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
