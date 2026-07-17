# PRS-09: Desativar/Reativar Pacote

## Metadados
- **ID:** PRS-09
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** PRS-06

## Contexto
Mesma lógica de desativar item (PRS-05), aplicada a pacotes. Pacote desativado não aparece nas opções de orçamento, mas permanece em orçamentos existentes.

## Escopo
- `apps/backend/src/handlers/produtos/pacotes.js` — ALTERAR (PATCH status)
- `apps/frontend/src/pages/admin/ProdutosServicos.jsx` — ALTERAR (ação)
- API: PATCH /admin/produtos/pacotes/:id/status

## Fora de Escopo (NÃO TOCAR)
- Itens (spec separada)
- Orçamentos existentes
- Exclusão permanente

## Spec Técnica

### API — PATCH /admin/produtos/pacotes/:id/status
```json
{ "ativo": false }
```

### Regras
- Desativar: `ativo=false`
- Reativar: `ativo=true`
- Pacote desativado:
  - NÃO aparece nos selects de orçamento
  - APARECE na listagem (filtro inativo)
  - PERMANECE em orçamentos existentes
- Confirmação obrigatória no frontend

### Frontend
- Botão desativar/reativar na listagem de pacotes
- Modal de confirmação
- Badge "Inativo" + opacidade reduzida

## Critérios de Aceite
- [ ] Desativar muda ativo=false
- [ ] Reativar muda ativo=true
- [ ] Pacote inativo não aparece nos selects
- [ ] Aparece na listagem com filtro
- [ ] Visual: opacidade + badge
- [ ] Confirmação obrigatória

## Prompt Pronto para o Kiro CLI

```
Implemente a spec PRS-09: Desativar/Reativar Pacote.

1. Em handlers/produtos/pacotes.js: PATCH /admin/produtos/pacotes/{id}/status.
2. Em ProdutosServicos.jsx: botão desativar/reativar, modal confirmação.
3. Pacote inativo não aparece em selects de orçamento.
4. Visual: opacidade + badge Inativo.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
