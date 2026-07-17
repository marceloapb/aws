# IMP-03: Validação por Coluna (tipo, formato, obrigatoriedade)

## Metadados
- **ID:** IMP-03
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** IMP-02

## Contexto
O preview (IMP-02) mostra os dados mas não valida o conteúdo. É preciso verificar: campos obrigatórios preenchidos, formatos corretos (email, CPF, data, telefone), tipos de dados (número, texto, data).

## Escopo
- `apps/frontend/src/utils/importValidators.js` — NOVO
- `apps/frontend/src/components/import/ImportPreviewTable.jsx` — integrar validação
- `apps/frontend/src/pages/admin/ImportCSV.jsx` — exibir resumo de validação

## Fora de Escopo (NÃO TOCAR)
- Detecção de duplicatas no banco (IMP-04)
- Backend
- Seletor de entidade (IMP-01)
- Parser CSV (IMP-02)

## Spec Técnica

### Regras de Validação por Entidade

#### Clientes
| Coluna | Tipo | Regra |
|---|---|---|
| nome | string | obrigatório, min 2 chars |
| email | email | obrigatório, formato válido |
| telefone | phone | obrigatório, formato (XX) XXXXX-XXXX ou variações |
| cpf | cpf | opcional, validar dígitos verificadores |
| data_nascimento | date | opcional, formato YYYY-MM-DD ou DD/MM/YYYY |
| instagram | string | opcional, deve começar com @ |

#### Sessões
| Coluna | Tipo | Regra |
|---|---|---|
| titulo | string | obrigatório, min 3 chars |
| tipo | enum | obrigatório, valores: ensaio, casamento, aniversario, corporativo, batizado, formatura, newborn |
| data | date | obrigatório, formato válido, não pode ser passado |
| hora_inicio | time | obrigatório, formato HH:MM |
| hora_fim | time | opcional, deve ser > hora_inicio |
| valor | number | opcional, >= 0 |

#### Equipamentos
| Coluna | Tipo | Regra |
|---|---|---|
| nome | string | obrigatório, min 2 chars |
| categoria | enum | obrigatório: camera, lente, flash, tripe, drone, iluminacao, outro |
| numero_serie | string | obrigatório, único no CSV |
| valor_compra | number | opcional, >= 0 |
| data_compra | date | opcional, formato válido |

### Frontend — importValidators.js
```js
export const VALIDATORS = {
  required: (value) => ({ valid: !!value?.trim(), error: 'Campo obrigatório' }),
  email: (value) => ({ valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), error: 'Email inválido' }),
  cpf: (value) => ({ valid: validateCPF(value), error: 'CPF inválido' }),
  phone: (value) => ({ valid: /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(value.replace(/\s/g, '')), error: 'Telefone inválido' }),
  date: (value) => ({ valid: isValidDate(value), error: 'Data inválida (use YYYY-MM-DD ou DD/MM/YYYY)' }),
  time: (value) => ({ valid: /^\d{2}:\d{2}$/.test(value), error: 'Hora inválida (use HH:MM)' }),
  number: (value) => ({ valid: !isNaN(parseFloat(value)) && parseFloat(value) >= 0, error: 'Número inválido' }),
  enum: (value, options) => ({ valid: options.includes(value.toLowerCase()), error: `Valor deve ser: ${options.join(', ')}` }),
}

export function validateRow(row, schema) {
  // Retorna: { valid: boolean, errors: [{ column, message, value }] }
}

export function validateCSV(rows, entitySchema) {
  // Retorna: { validRows: [], invalidRows: [], errorSummary: {} }
}
```

### Integração no Preview
- Cada célula inválida: borda vermelha + tooltip com mensagem de erro
- Cada célula válida: sem destaque (limpo)
- Header da coluna: badge com contagem de erros ("3 erros")
- Resumo no footer atualizado: "✅ {X} válidos | ❌ {Y} com erros | Total: {Z}"

## Critérios de Aceite
- [ ] Email inválido é detectado e destacado em vermelho
- [ ] CPF inválido (dígitos verificadores) é detectado
- [ ] Campo obrigatório vazio é detectado
- [ ] Data em formato errado é detectada
- [ ] Telefone em formato errado é detectado
- [ ] Enum com valor fora da lista é detectado
- [ ] Tooltip na célula mostra a mensagem de erro específica
- [ ] Header da coluna mostra contagem de erros
- [ ] Resumo total correto no footer
- [ ] Validação roda client-side (sem chamada ao backend)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IMP-03: Validação por Coluna.

1. Crie apps/frontend/src/utils/importValidators.js:
   - Validators individuais: required, email, cpf (com dígitos verificadores), phone, date, time, number, enum
   - validateRow(row, schema) → { valid, errors[] }
   - validateCSV(rows, entitySchema) → { validRows, invalidRows, errorSummary }
   - Schemas para cada entidade (clientes, sessoes, equipamentos, catalogo, pagamentos)

2. Em ImportPreviewTable.jsx:
   - Receber prop validationResults
   - Célula inválida: border-red-500, tooltip com erro
   - Header: badge com count de erros na coluna
   - Footer: resumo atualizado com válidos/inválidos

3. Em ImportCSV.jsx:
   - Após parse (IMP-02), rodar validateCSV(rows, schema da entidade selecionada)
   - Passar validationResults para ImportPreviewTable
   - Botão "Confirmar" desabilitado se 0 válidos

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
