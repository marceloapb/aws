# IMP-04: Detecção de Duplicatas (CPF/email)

## Metadados
- **ID:** IMP-04
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** IMP-03

## Contexto
Mesmo com validação de formato (IMP-03), o admin pode importar clientes que já existem no banco. É preciso checar duplicatas por email e CPF antes de inserir, evitando registros duplicados.

## Escopo
- `apps/frontend/src/pages/admin/ImportCSV.jsx` — step de verificação de duplicatas
- `apps/frontend/src/components/import/ImportDuplicatesPanel.jsx` — NOVO
- API: `POST /admin/import/check-duplicates` — NOVO
- Lambda: `checkImportDuplicates` — NOVO

## Fora de Escopo (NÃO TOCAR)
- Validação de formato (IMP-03)
- Preview (IMP-02)
- Merge/atualização de registros existentes (futuro)
- Outras entidades que não tenham campo único

## Spec Técnica

### Campos Únicos por Entidade
| Entidade | Campo(s) para check | Lógica |
|---|---|---|
| Clientes | email, cpf | Se email OU cpf já existe → duplicata |
| Sessões | data + hora_inicio + cliente_email | Mesma data/hora/cliente → conflito |
| Equipamentos | numero_serie | Se série já existe → duplicata |
| Catálogo | nome | Se nome exato já existe → duplicata |
| Pagamentos | orcamento_id + parcela | Mesma parcela do orçamento → duplicata |

### API
| Método | Path | Body | Response |
|---|---|---|---|
| POST | /admin/import/check-duplicates | { entidade, keys: [] } | { duplicates: [], new: [] } |

### Request Body
```json
{
  "entidade": "clientes",
  "keys": [
    { "email": "maria@email.com", "cpf": "123.456.789-00" },
    { "email": "joao@email.com", "cpf": "987.654.321-00" }
  ]
}
```

### Response
```json
{
  "duplicates": [
    { "row": 0, "key": "email", "value": "maria@email.com", "existing_id": "cli_456", "existing_name": "Maria Silva" }
  ],
  "new": [1],
  "total_checked": 2
}
```

### Lambda — checkImportDuplicates
- Recebe lista de keys
- Faz BatchGetItem no DynamoDB por GSI (email-index, cpf-index)
- Retorna quais já existem com referência ao registro existente
- Limite: 100 keys por request (paginar se CSV grande)

### DynamoDB
- GSI existente: `email-index` (PK: email)
- GSI existente ou novo: `cpf-index` (PK: cpf)
- GSI: `serial-index` para equipamentos (PK: numero_serie)

### Frontend — ImportDuplicatesPanel.jsx
- Lista de duplicatas encontradas com:
  - Linha do CSV: "Linha 3: maria@email.com"
  - Registro existente: "Já cadastrada como 'Maria Silva' (ID: cli_456)"
  - Ação: checkbox "Pular" (default) ou "Importar mesmo assim"
- Resumo: "⚠️ {X} duplicatas encontradas de {Y} registros"
- Botões: "Pular duplicatas e importar {Z} novos" | "Importar todos (incluindo duplicatas)"

### Fluxo Atualizado
1. Seleciona entidade (IMP-01)
2. Upload + Preview (IMP-02)
3. Validação formato (IMP-03)
4. **NOVO → Check duplicatas (IMP-04):** POST /admin/import/check-duplicates
5. Se duplicatas: mostra panel com opções
6. Confirma importação

## Critérios de Aceite
- [ ] Após validação de formato, checa duplicatas no banco automaticamente
- [ ] Duplicatas por email detectadas para clientes
- [ ] Duplicatas por CPF detectadas para clientes
- [ ] Duplicatas por numero_serie detectadas para equipamentos
- [ ] Panel mostra cada duplicata com referência ao registro existente
- [ ] Admin pode escolher "Pular duplicatas" ou "Importar todos"
- [ ] Se 0 duplicatas, pula direto para confirmação
- [ ] Loading state durante a verificação
- [ ] Se CSV grande (>100 registros), pagina as verificações

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IMP-04: Detecção de Duplicatas.

1. Crie apps/frontend/src/components/import/ImportDuplicatesPanel.jsx:
   - Props: { duplicates, totalRecords, onSkipDuplicates, onImportAll }
   - Lista cada duplicata: linha, campo, valor, registro existente
   - Checkbox para pular individualmente
   - Botões: "Pular duplicatas" | "Importar todos"
   - Se 0 duplicatas, não renderiza

2. Backend: POST /admin/import/check-duplicates
   - Body: { entidade, keys: [{email, cpf}...] }
   - Lambda checkImportDuplicates: BatchGetItem por GSI
   - Response: { duplicates: [{row, key, value, existing_id, existing_name}], new: [indexes] }

3. Em ImportCSV.jsx:
   - Após validação (IMP-03), chamar POST check-duplicates com keys extraídas
   - Se duplicates.length > 0: mostrar ImportDuplicatesPanel
   - Se 0: pular para confirmação final
   - Passar decisão do admin (pular ou incluir) para o step de importação

4. IAM: Role checkImportDuplicates-role com dynamodb:Query nos GSIs email-index, cpf-index, serial-index.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
