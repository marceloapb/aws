# SPEC-34 — Nota Fiscal (Estrutura Base)

| Campo | Valor |
|-------|-------|
| ID | GAP-19 / SPEC-34 |
| Tipo | Feature |
| Prioridade | P3 |
| Impacto | Médio |
| Esforço | Alto |

## CONTEXTO

§28 do MVP-1 define emissão de NFS-e. Pela complexidade de integração com prefeituras, esta spec cria a estrutura base (modelo + controle) e deixa o adapter de emissão real como extensão.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/nf/solicitar-emissao.js` — POST /admin/notas-fiscais
- `src/functions/nf/listar.js` — GET /admin/notas-fiscais
- `src/functions/nf/cancelar.js` — POST /admin/notas-fiscais/:id/cancelar
- `src/lib/nf/interface.js` — interface do adapter de emissão
- `template.yaml` — rotas + role

## FORA DE ESCOPO (NÃO TOCAR)

- Adapter concreto de prefeitura (eNotas, NFe.io, etc)
- DANFE/PDF real
- Integração contábil
- Qualquer outro arquivo

## SPEC TÉCNICA

### Modelo DynamoDB

```
PK: TENANT#1, SK: NF#<ulid>
```
Campos: id, orcamento_id, cobranca_id (opcional), valor, descricao_servico, status (pendente|emitida|cancelada|erro), numero_nf, emitida_em, cancelada_em, erro_msg, created_at

### Interface adapter

```javascript
module.exports = {
  emitir: async ({ valor, descricao, tomador }) => {},
  cancelar: async ({ numero_nf }) => {},
  consultar: async ({ numero_nf }) => {}
};
```

### Fluxos

**Solicitar emissão:** Cria item status=pendente. Se adapter configurado, tenta emitir. Se não, fica pendente para emissão manual.

**Cancelar:** Marca status=cancelada. Se adapter, chama cancelar.

### IAM

Role `NFFunctionRole`:
- DynamoDB: PutItem, GetItem, UpdateItem, Query
- SSM: GetParameter `/mbf/nf/*`

## CRITÉRIOS DE ACEITE

1. Solicitar cria item pendente
2. Se adapter mock, marca como emitida
3. Cancelar atualiza status
4. Interface pronta para adapter real
5. Listar filtra por período e status

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar estrutura base de Nota Fiscal conforme spec SPEC-34.
Handlers em src/functions/nf/, interface em src/lib/nf/interface.js.

Alterar SOMENTE:
- template.yaml (rotas, role)
- src/functions/nf/*.js (3 handlers)
- src/lib/nf/interface.js

NÃO refatorar, renomear ou mexer em mais nada.
```
