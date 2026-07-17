# EQP-05: Flag "Padrão" + Auto-Inclusão no Checklist

## Metadados
- **ID:** EQP-05
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** EQP-03

## Contexto
Equipamentos marcados como "padrão" devem ser incluídos automaticamente em TODOS os modelos de checklist criados. Isso garante que itens essenciais (ex: câmera principal, flash principal) nunca sejam esquecidos.

## Escopo
- `apps/backend/src/handlers/equipamento/equipamentos.js` — ALTERAR (lógica ao setar padrao=true)
- `apps/backend/src/handlers/equipamento/checklist.js` — ALTERAR (auto-incluir padrões ao criar modelo)
- Frontend: aviso visual quando padrao=true

## Fora de Escopo (NÃO TOCAR)
- CRUD base (EQP-03 — já feito)
- Modelo de Checklist (EQP-06 — spec própria)
- Outros módulos

## Spec Técnica

### Comportamento
1. Quando admin marca `padrao=true` em um equipamento:
   - Equipamento é adicionado a TODOS os modelos de checklist existentes
   - Mensagem: "Este equipamento será incluído em todos os checklists automaticamente"
2. Quando admin cria um NOVO modelo de checklist:
   - Todos os equipamentos com `padrao=true` são pré-incluídos
3. Quando admin desmarca `padrao=false`:
   - Equipamento NÃO é removido dos checklists existentes (só para de entrar nos novos)
   - Mensagem: "O equipamento não será mais incluído automaticamente em novos checklists"

### Backend
```js
// Ao atualizar equipamento com padrao=true:
async function setPadrao(equipamentoId, padrao) {
  await updateEquipamento(equipamentoId, { padrao })
  
  if (padrao) {
    // Buscar todos os modelos de checklist do tenant
    const modelos = await listarModelosChecklist(tenantId)
    // Adicionar equipamento em cada modelo (se não existe já)
    for (const modelo of modelos) {
      await adicionarItemChecklist(modelo.id, equipamentoId, { auto: true })
    }
  }
}
```

### Frontend
- Toggle "Padrão" no formulário com ícone estrela ⭐
- Tooltip: "Equipamentos padrão são incluídos automaticamente em todos os checklists"
- Na listagem: ícone estrela na coluna Padrão
- Confirmação ao marcar: "Confirma incluir em todos os X checklists existentes?"

## Critérios de Aceite
- [ ] Marcar padrao=true adiciona em todos os checklists existentes
- [ ] Novo checklist já vem com todos os padrões
- [ ] Desmarcar padrao NÃO remove dos existentes
- [ ] Mensagem de confirmação ao marcar
- [ ] Ícone estrela na listagem
- [ ] Tooltip explicativo

## Prompt Pronto para o Kiro CLI

```
Implemente a spec EQP-05: Flag Padrão + Auto-Inclusão.

1. Em equipamentos.js: ao setar padrao=true, iterar modelos de checklist e adicionar equipamento.
2. Em checklist.js (quando existir): ao criar modelo, pré-incluir todos com padrao=true.
3. No frontend: toggle com estrela, tooltip, confirmação.
4. Desmarcar NÃO remove dos checklists existentes.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
