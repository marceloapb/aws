# PRS-08: Editar Pacote

## Metadados
- **ID:** PRS-08
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** PRS-06

## Contexto
O admin edita pacotes: adiciona/remove itens, altera desconto, renomeia. Assim como itens, alteração de valor NÃO afeta orçamentos existentes (congelamento).

## Escopo
- `apps/backend/src/handlers/produtos/pacotes.js` — ALTERAR (PUT)
- `apps/frontend/src/pages/admin/PacoteForm.jsx` — ALTERAR (modo edição)
- API: PUT /admin/produtos/pacotes/:id

## Fora de Escopo (NÃO TOCAR)
- Criar pacote (PRS-06)
- Orçamentos existentes (congelamento)
- Itens individuais

## Spec Técnica

### API — PUT /admin/produtos/pacotes/:id
```json
// Input
{
  "nome": "Pacote Casamento Premium",
  "descricao": "Atualizado com drone",
  "itens": [
    { "item_id": "itm_001", "qtd": 1 },
    { "item_id": "itm_005", "qtd": 1 },
    { "item_id": "itm_008", "qtd": 1 },
    { "item_id": "itm_012", "qtd": 1 }
  ],
  "desconto_tipo": "percentual",
  "desconto_valor": 15,
  "exibir_ao_cliente": true
}
```

### Regras
- Nome único (excluindo próprio)
- Mínimo 2 itens
- Itens devem estar ativos
- Recalcular valor_bruto, valor_desconto, valor_final
- Capturar novo snapshot de valor_unitario dos itens
- Aviso: "Orçamentos existentes mantêm a composição anterior"

### Frontend — PacoteForm.jsx (modo edição)
- Pré-populado com dados atuais
- Mesmo UX de criação
- Aviso ao salvar se valores mudaram
- Histórico de alterações (opcional — tooltip "Última edição: data")

## Critérios de Aceite
- [ ] Editar nome, descrição, itens, desconto
- [ ] Recalcular valores ao salvar
- [ ] Mínimo 2 itens
- [ ] Nome único
- [ ] Novo snapshot de valores
- [ ] Aviso sobre orçamentos existentes
- [ ] Congelamento: orçamentos antigos não afetados

## Prompt Pronto para o Kiro CLI

```
Implemente a spec PRS-08: Editar Pacote.

1. Em handlers/produtos/pacotes.js: PUT /admin/produtos/pacotes/{id}.
2. Em PacoteForm.jsx: modo edição, pré-populado.
3. Recalcular valor_bruto, desconto, valor_final.
4. Novo snapshot de valor_unitario.
5. Validar: min 2 itens, nome único, itens ativos.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
