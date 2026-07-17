# IMP-05: Relatório de Erros (linha/coluna/motivo)

## Metadados
- **ID:** IMP-05
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** IMP-03

## Contexto
Quando a validação (IMP-03) encontra erros, o admin precisa de um relatório claro e acionável: qual linha, qual coluna, qual o problema, e como corrigir. Sem isso, o admin não sabe o que ajustar no CSV.

## Escopo
- `apps/frontend/src/components/import/ImportErrorReport.jsx` — NOVO
- `apps/frontend/src/pages/admin/ImportCSV.jsx` — integrar relatório
- `apps/frontend/src/utils/importValidators.js` — enriquecer mensagens

## Fora de Escopo (NÃO TOCAR)
- Lógica de validação (IMP-03, já implementada)
- Preview (IMP-02)
- Backend
- Correção inline no browser (futuro)

## Spec Técnica

### Frontend — ImportErrorReport.jsx

#### Layout
- Card colapsável "⚠️ {X} erros encontrados em {Y} linhas"
- Ao expandir: tabela de erros com colunas:
  - Linha (número)
  - Coluna (nome do campo)
  - Valor atual (o que veio no CSV)
  - Erro (mensagem clara)
  - Sugestão (como corrigir)

#### Exemplo de Erros
| Linha | Coluna | Valor | Erro | Sugestão |
|---|---|---|---|---|
| 3 | email | maria@@ | Email inválido | Use formato nome@dominio.com |
| 5 | cpf | 111.111.111-11 | CPF inválido (dígitos) | Verifique os dígitos verificadores |
| 7 | telefone | 9999 | Telefone inválido | Use formato (11) 99999-0000 |
| 12 | data | 32/13/2026 | Data inválida | Use DD/MM/YYYY ou YYYY-MM-DD |
| 15 | tipo | festa | Valor não permitido | Valores aceitos: ensaio, casamento, ... |

#### Funcionalidades
- Filtro por tipo de erro (dropdown)
- Filtro por coluna
- Ordenar por linha
- Botão "📥 Exportar erros como CSV" (para corrigir offline)
- Contagem agrupada: "Email: 3 erros | CPF: 2 erros | Data: 5 erros"

### Exportação de Erros
```js
function exportErrorsCSV(errors) {
  const headers = 'Linha,Coluna,Valor,Erro,Sugestao'
  const rows = errors.map(e => `${e.row},${e.column},"${e.value}","${e.error}","${e.suggestion}"`)
  // Download como CSV
}
```

### Mensagens de Sugestão (importValidators.js)
```js
export const ERROR_SUGGESTIONS = {
  required: 'Preencha este campo obrigatório',
  email: 'Use formato: nome@dominio.com',
  cpf: 'Verifique os 11 dígitos e dígitos verificadores',
  phone: 'Use formato: (11) 99999-0000 ou (11) 9999-0000',
  date: 'Use formato: DD/MM/YYYY ou YYYY-MM-DD',
  time: 'Use formato: HH:MM (ex: 10:00)',
  number: 'Use apenas números (ex: 2500.00)',
  enum: (options) => `Valores aceitos: ${options.join(', ')}`,
}
```

## Critérios de Aceite
- [ ] Relatório aparece após validação se houver erros
- [ ] Mostra linha, coluna, valor, erro e sugestão para cada problema
- [ ] Card colapsável (fechado por default se poucos erros, aberto se muitos)
- [ ] Filtro por tipo de erro funciona
- [ ] Filtro por coluna funciona
- [ ] Botão "Exportar erros como CSV" gera arquivo correto
- [ ] Contagem agrupada por tipo visível
- [ ] Se 0 erros, relatório não aparece (só mensagem de sucesso)
- [ ] Mensagens de sugestão são claras e acionáveis

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IMP-05: Relatório de Erros.

1. Crie apps/frontend/src/components/import/ImportErrorReport.jsx:
   - Props: { errors: [{row, column, value, error, suggestion}], totalRows }
   - Card colapsável com header "⚠️ {X} erros em {Y} linhas"
   - Tabela interna: Linha | Coluna | Valor | Erro | Sugestão
   - Filtros: dropdown por tipo de erro, dropdown por coluna
   - Contagem agrupada no header
   - Botão "📥 Exportar erros" → gera CSV de erros e força download

2. Em importValidators.js:
   - Adicione objeto ERROR_SUGGESTIONS com mensagem de correção para cada tipo
   - No validateRow, inclua campo "suggestion" no objeto de erro retornado

3. Em ImportCSV.jsx:
   - Após validação, se invalidRows.length > 0: renderizar ImportErrorReport
   - Passar array de erros formatado
   - Manter preview visível acima do relatório de erros

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
