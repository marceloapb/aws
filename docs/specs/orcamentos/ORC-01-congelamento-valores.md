# ORC-01: Congelamento de Valores do Catálogo no Momento da Criação

## Metadados
- **ID:** ORC-01
- **Tipo:** Correção
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** Nenhuma

## Contexto
Quando o admin cria um orçamento e seleciona itens do catálogo, os valores são provavelmente referenciados por ID (lookup dinâmico). Se o catálogo é editado depois, o orçamento muda retroativamente — quebrando propostas já enviadas e gerando inconsistência financeira. A spec §6 exige snapshot no momento da criação.

## Escopo
- `apps/frontend/src/pages/admin/OrcamentoForm.jsx` — gravar snapshot dos itens
- Backend: Lambda `createOrcamento` / `updateOrcamento` — persistir snapshot
- DynamoDB: campo `itens_snapshot[]` no record ORCAMENTO

## Fora de Escopo (NÃO TOCAR)
- Catálogo em si (Catalogo.jsx)
- Listagem de orçamentos (Orcamentos.jsx)
- Fluxo de aprovação

## Spec Técnica

### Modelo de Dados — Snapshot de Item
```json
{
  "item_id": "cat_abc123",
  "nome": "Pacote Premium Casamento",
  "valor_unitario": 5500.00,
  "descricao": "Cobertura completa...",
  "horas_incluidas": 8,
  "itens_inclusos": ["200 fotos editadas", "1 álbum 30x30"],
  "quantidade": 1,
  "valor_total": 5500.00,
  "snapshot_at": "2026-07-17T14:00:00Z"
}
```

### Frontend — OrcamentoForm.jsx
- Ao selecionar item do catálogo: copiar TODOS os campos relevantes para o state local
- Gravar no payload de envio como `itens_snapshot[]`
- Permitir edição manual do valor (override) com flag `valor_customizado: true`
- Mostrar aviso se valor difere do catálogo atual: "⚠️ Valor do catálogo mudou desde a criação"

### Backend — createOrcamento
- Receber `itens_snapshot[]` no body
- Persistir no DynamoDB como atributo do ORCAMENTO
- NÃO fazer lookup do catálogo na leitura — usar sempre o snapshot

### Backend — getOrcamento
- Retornar `itens_snapshot[]` como fonte da verdade
- Opcionalmente: comparar com catálogo atual e sinalizar diferenças

### Migração de dados existentes
- Orçamentos antigos sem snapshot: na primeira leitura, fazer lookup do catálogo e criar snapshot (one-time migration on read)

## Critérios de Aceite
- [ ] Ao criar orçamento, valores do catálogo são copiados (snapshot)
- [ ] Editar catálogo NÃO altera orçamentos existentes
- [ ] Snapshot inclui: nome, valor, descrição, horas, itens inclusos
- [ ] Override manual de valor funciona com flag
- [ ] Aviso visual quando valor do catálogo difere do snapshot
- [ ] Orçamentos antigos migram on-read

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-01: Congelamento de Valores do Catálogo.

1. Em OrcamentoForm.jsx:
   - Ao selecionar item do catálogo, copiar todos os campos para itens_snapshot[] no state
   - Permitir edição manual do valor (flag valor_customizado)
   - Enviar itens_snapshot[] no payload de criação/edição

2. Backend createOrcamento/updateOrcamento:
   - Persistir itens_snapshot[] como atributo do record ORCAMENTO no DynamoDB
   - Cada item: { item_id, nome, valor_unitario, descricao, horas_incluidas, itens_inclusos, quantidade, valor_total, snapshot_at }

3. Backend getOrcamento:
   - Retornar itens_snapshot[] diretamente (não fazer lookup no catálogo)
   - Se snapshot vazio (legado): fazer lookup uma vez e salvar

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
