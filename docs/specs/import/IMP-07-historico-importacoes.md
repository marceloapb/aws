# IMP-07: Histórico de Importações (auditoria)

## Metadados
- **ID:** IMP-07
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** IMP-06

## Contexto
Não existe registro de quem importou o quê e quando. Para auditoria e troubleshooting, o admin precisa de um histórico de todas as importações realizadas.

## Escopo
- `apps/frontend/src/pages/admin/ImportCSV.jsx` — aba/seção de histórico
- `apps/frontend/src/components/import/ImportHistory.jsx` — NOVO
- API: `GET /admin/import/historico` — NOVO
- Lambda: `listImportHistory` — NOVO
- DynamoDB: novo record type IMPORT_LOG

## Fora de Escopo (NÃO TOCAR)
- Desfazer importação (rollback)
- Importação em si (IMP-06)
- Outras telas

## Spec Técnica

### DynamoDB — IMPORT_LOG
```
PK: TENANT#<tenant_id>
SK: IMPORT#<timestamp>#<uuid>
Attributes:
  entidade: string (clientes, sessoes, etc.)
  arquivo: string (nome do CSV original)
  total_linhas: number
  importados: number
  falhados: number
  duplicatas_puladas: number
  usuario: string (email do admin)
  created_at: ISO timestamp
  duracao_ms: number
  status: 'sucesso' | 'parcial' | 'erro'
```

### API
| Método | Path | Response |
|---|---|---|
| GET | /admin/import/historico?limit=20&offset=0 | { items: [], total: number } |

### Frontend — ImportHistory.jsx
- Tabela com colunas:
  - Data/Hora
  - Entidade (badge colorido)
  - Arquivo
  - Resultado: "{importados}/{total}" + badge status
  - Duração
  - Usuário
- Filtros: por entidade, por período, por status
- Paginação
- Acessível via tab "Histórico" na página ImportCSV

### Gravação do Log
- No final de cada importação (IMP-06), gravar IMPORT_LOG no DynamoDB
- Incluir todos os metadados (contagens, tempo, arquivo)

## Critérios de Aceite
- [ ] Tab "Histórico" visível na página ImportCSV
- [ ] Lista todas as importações com dados corretos
- [ ] Badge de status: verde (sucesso), amarelo (parcial), vermelho (erro)
- [ ] Filtro por entidade funciona
- [ ] Filtro por período funciona
- [ ] Paginação funciona
- [ ] Cada importação grava log automaticamente
- [ ] Mostra nome do arquivo original

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IMP-07: Histórico de Importações.

1. Crie apps/frontend/src/components/import/ImportHistory.jsx:
   - Tabela: Data, Entidade (badge), Arquivo, Resultado, Duração, Usuário
   - Filtros: entidade (select), período (date range), status
   - Paginação com limit/offset
   - Fetch GET /admin/import/historico

2. Em ImportCSV.jsx:
   - Adicionar tabs: "Importar" (default) | "Histórico"
   - Tab Histórico renderiza ImportHistory

3. Backend GET /admin/import/historico:
   - Lambda listImportHistory: Query DynamoDB PK=TENANT#id, SK begins_with IMPORT#
   - Suportar filtros por entidade e período
   - Ordenar por data desc

4. No final do batchImport (IMP-06), adicionar PutItem do IMPORT_LOG.

5. IAM: Role listImportHistory-role com dynamodb:Query na tabela principal.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
