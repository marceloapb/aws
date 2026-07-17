# PRS-06: Criar Pacote (Receita + Desconto)

## Metadados
- **ID:** PRS-06
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** PRS-02

## Contexto
O admin monta pacotes combinando itens do catálogo com desconto. O pacote NÃO tem preço próprio — seu valor é a soma dos itens menos o desconto. Usado para facilitar a montagem de orçamentos (ex: "Pacote Casamento Completo" = Cobertura + Álbum + Making Of com 10% de desconto).

## Escopo
- `apps/backend/src/handlers/produtos/pacotes.js` — NOVO
- `apps/backend/src/models/pacote.js` — NOVO
- `apps/frontend/src/pages/admin/PacoteForm.jsx` — NOVO
- API: POST /admin/produtos/pacotes
- DynamoDB: entidade PACOTE

## Fora de Escopo (NÃO TOCAR)
- Itens (PRS-02 a PRS-05 — já feito)
- Orçamentos (consumidor)
- Cálculo de valor final (PRS-10)

## Spec Técnica

### Entidade PACOTE
```json
{
  "PK": "TENANT#t123",
  "SK": "PACOTE#pkt_001",
  "id": "pkt_001",
  "nome": "Pacote Casamento Completo",
  "descricao": "Cobertura + Álbum + Making Of com 10% off",
  "itens": [
    { "item_id": "itm_001", "item_nome": "Cobertura Casamento", "qtd": 1, "valor_unitario": 3500.00 },
    { "item_id": "itm_005", "item_nome": "Álbum 30x30", "qtd": 1, "valor_unitario": 1200.00 },
    { "item_id": "itm_008", "item_nome": "Making Of Noiva", "qtd": 1, "valor_unitario": 800.00 }
  ],
  "desconto_tipo": "percentual",
  "desconto_valor": 10,
  "valor_bruto": 5500.00,
  "valor_desconto": 550.00,
  "valor_final": 4950.00,
  "exibir_ao_cliente": true,
  "ativo": true,
  "created_at": "2026-07-17T10:00:00Z",
  "updated_at": "2026-07-17T10:00:00Z"
}
```

### Tipos de Desconto
| Tipo | Descrição | Exemplo |
|---|---|---|
| percentual | % sobre o total bruto | 10% de R$ 5500 = R$ 550 |
| fixo | Valor fixo de desconto | R$ 500 de desconto |
| nenhum | Sem desconto (conveniência) | R$ 0 |

### Cálculo do Pacote
```js
const valor_bruto = itens.reduce((sum, i) => sum + (i.valor_unitario * i.qtd), 0)
let valor_desconto = 0

if (desconto_tipo === 'percentual') {
  valor_desconto = valor_bruto * (desconto_valor / 100)
} else if (desconto_tipo === 'fixo') {
  valor_desconto = desconto_valor
}

const valor_final = valor_bruto - valor_desconto
```

### API — POST /admin/produtos/pacotes
```json
// Input
{
  "nome": "Pacote Casamento Completo",
  "descricao": "Cobertura + Álbum + Making Of com desconto",
  "itens": [
    { "item_id": "itm_001", "qtd": 1 },
    { "item_id": "itm_005", "qtd": 1 },
    { "item_id": "itm_008", "qtd": 1 }
  ],
  "desconto_tipo": "percentual",
  "desconto_valor": 10,
  "exibir_ao_cliente": true
}
```

### Regras
- Nome obrigatório, max 100, único por tenant
- Mínimo 2 itens no pacote
- Itens devem estar ativos
- Desconto não pode gerar valor_final negativo
- Valor unitário capturado do item no momento da criação (snapshot)
- Ao salvar: calcular valor_bruto, valor_desconto, valor_final

### Frontend — PacoteForm.jsx
- Campo nome + descrição
- Lista de itens:
  - Botão "+ Adicionar Item" (select com busca)
  - Cada item: nome + valor + qtd (editável) + botão remover
  - Não permite duplicar item no mesmo pacote
- Desconto:
  - Radio: Percentual / Fixo / Nenhum
  - Input de valor (% ou R$)
- Resumo em tempo real:
  - Subtotal (soma dos itens)
  - Desconto (valor calculado)
  - **Total Final** (destaque)
- Toggle exibir_ao_cliente

## Critérios de Aceite
- [ ] Criar pacote com 2+ itens
- [ ] Desconto percentual funciona
- [ ] Desconto fixo funciona
- [ ] Cálculo correto (bruto - desconto = final)
- [ ] Snapshot de valor unitário capturado
- [ ] Itens devem estar ativos
- [ ] Não duplicar item no pacote
- [ ] Preview em tempo real no frontend
- [ ] Nome único por tenant

## Prompt Pronto para o Kiro CLI

```
Implemente a spec PRS-06: Criar Pacote.

1. Crie models/pacote.js: entidade PACOTE.
2. Crie handlers/produtos/pacotes.js: POST /admin/produtos/pacotes.
3. Crie pages/admin/PacoteForm.jsx: adicionar itens, desconto, preview.
4. Cálculo: valor_bruto - desconto = valor_final.
5. Snapshot de valor unitário no momento da criação.
6. Min 2 itens, nome único, desconto não gera negativo.
7. SAM: rota POST.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
