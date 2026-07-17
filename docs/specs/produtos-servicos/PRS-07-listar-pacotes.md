# PRS-07: Listar Pacotes

## Metadados
- **ID:** PRS-07
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** PRS-06

## Contexto
Listagem de pacotes na aba "Pacotes" do módulo Produtos e Serviços. Exibe nome, itens incluídos, desconto, valor final e status.

## Escopo
- `apps/backend/src/handlers/produtos/pacotes.js` — ALTERAR (GET)
- `apps/frontend/src/pages/admin/ProdutosServicos.jsx` — ALTERAR (tab Pacotes)
- API: GET /admin/produtos/pacotes

## Fora de Escopo (NÃO TOCAR)
- Criação (PRS-06 — já feito)
- Itens individuais
- Orçamentos

## Spec Técnica

### API — GET /admin/produtos/pacotes
Query params: `ativo`, `busca`

```json
{
  "items": [
    {
      "id": "pkt_001",
      "nome": "Pacote Casamento Completo",
      "qtd_itens": 3,
      "valor_bruto": 5500.00,
      "desconto_tipo": "percentual",
      "desconto_valor": 10,
      "valor_final": 4950.00,
      "ativo": true,
      "exibir_ao_cliente": true
    }
  ],
  "total": 5
}
```

### Frontend — Tab Pacotes
- Cards ou tabela com:
  - Nome do pacote
  - Qtd de itens incluídos
  - Valor final (com desconto aplicado)
  - Badge desconto: "10% off" ou "-R$ 500"
  - Status (ativo/inativo)
- Expandir card: lista de itens com valores individuais
- Ações: Editar, Desativar, Duplicar
- Busca por nome

### Layout
```
[Tabs: Todos | Serviços | Produtos | Adicionais | **Pacotes**]
[Busca + Filtro ativo]
[Cards/Tabela de Pacotes]
```

## Critérios de Aceite
- [ ] Listagem de pacotes funciona
- [ ] Valor final calculado e exibido
- [ ] Badge de desconto
- [ ] Expandir mostra itens
- [ ] Busca por nome
- [ ] Filtro ativo/inativo
- [ ] Ações: editar, desativar, duplicar

## Prompt Pronto para o Kiro CLI

```
Implemente a spec PRS-07: Listar Pacotes.

1. Em handlers/produtos/pacotes.js: GET /admin/produtos/pacotes com filtros.
2. Em ProdutosServicos.jsx: tab Pacotes, cards/tabela, expandir itens.
3. Badge de desconto, valor final, busca.
4. Ações: editar, desativar, duplicar.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
