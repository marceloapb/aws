# ORC-03: Sistema de N Opções por Orçamento

## Metadados
- **ID:** ORC-03
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Crítico
- **Esforço:** Alto
- **Dependência:** ORC-01, ORC-07

## Contexto
A spec §6 define que cada orçamento pode ter múltiplas opções (ex: "Pacote Básico", "Pacote Premium", "Pacote Personalizado"). O cliente escolhe uma opção ao aceitar. Sem isso, o admin cria N orçamentos separados, perdendo rastreabilidade.

## Escopo
- `apps/frontend/src/pages/admin/OrcamentoForm.jsx` — builder de opções
- `apps/frontend/src/components/orcamento/OpcaoCard.jsx` — NOVO
- `apps/frontend/src/components/orcamento/OpcaoBuilder.jsx` — NOVO
- Backend: modelo de dados com opções
- DynamoDB: atributo `opcoes[]` no ORCAMENTO

## Fora de Escopo (NÃO TOCAR)
- Condições de pagamento (ORC-04)
- Reserva de agenda (ORC-06)
- Portal do cliente
- Listagem (Orcamentos.jsx)

## Spec Técnica

### Modelo de Dados — Opção
```json
{
  "opcao_id": "opc_001",
  "nome": "Pacote Premium",
  "descricao": "Cobertura completa com álbum e making of",
  "itens_snapshot": [
    { "item_id": "cat_abc", "nome": "Cobertura 8h", "valor": 5500, "quantidade": 1 },
    { "item_id": "cat_def", "nome": "Álbum 30x30", "valor": 1200, "quantidade": 1 }
  ],
  "eventos": [],
  "valor_total": 6700.00,
  "valor_customizado": false,
  "destaque": true,
  "ordem": 1
}
```

### Frontend — OpcaoBuilder.jsx
- Lista de opções (cards) com drag & drop para reordenar
- Cada opção: nome, descrição, seletor de itens, lista de eventos, valor total, toggle destaque, duplicar, remover
- Botão "+ Adicionar opção" (limite 5)
- Mínimo 1 opção obrigatória

### Frontend — OpcaoCard.jsx (read-only)
- Card com: nome, descrição, lista de itens, valor total
- Badge "Recomendado" se destaque=true
- Badge "Escolhida" se foi a aceita pelo cliente

### Backend
- Validar: min 1, max 5 opções
- Cada opção deve ter itens_snapshot[]
- No aceite: receber opcao_id escolhida

## Critérios de Aceite
- [ ] Admin pode criar 1 a 5 opções por orçamento
- [ ] Cada opção tem nome, descrição, itens e eventos
- [ ] Valor total calculado automaticamente
- [ ] Drag & drop reordena
- [ ] Duplicar opção funciona
- [ ] Toggle "Destacar" marca como recomendada
- [ ] No aceite, cliente escolhe 1 opção
- [ ] Mínimo 1 opção obrigatória

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-03: Sistema de N Opções por Orçamento.

1. Crie apps/frontend/src/components/orcamento/OpcaoBuilder.jsx:
   - Props: { opcoes, onChange, catalogoItems }
   - Cards editáveis com drag & drop
   - Botões: + Adicionar, Duplicar, Remover
   - Limites: min 1, max 5

2. Crie apps/frontend/src/components/orcamento/OpcaoCard.jsx:
   - Props: { opcao, isChosen, isHighlighted }
   - Card read-only com badges

3. Em OrcamentoForm.jsx: substituir campo de itens simples por OpcaoBuilder.

4. Backend: validar opcoes min 1/max 5, persistir no DynamoDB.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
