# PRS-12: Obter Item/Pacote por ID (Consumo por Orçamento)

## Metadados
- **ID:** PRS-12
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** PRS-02, PRS-06

## Contexto
O módulo Orçamentos precisa buscar detalhes de itens e pacotes por ID para montar a proposta. Esta API é a interface de leitura que outros módulos consomem. Retorna dados necessários para cálculo (valor_base, duração, hora adicional).

## Escopo
- `apps/backend/src/handlers/produtos/itens.js` — ALTERAR (GET :id)
- `apps/backend/src/handlers/produtos/pacotes.js` — ALTERAR (GET :id)
- API: GET /admin/produtos/itens/:id, GET /admin/produtos/pacotes/:id

## Fora de Escopo (NÃO TOCAR)
- Cálculo de valor (PRS-10 — util separado)
- Criação/edição
- Frontend (consumido internamente)

## Spec Técnica

### API — GET /admin/produtos/itens/:id
```json
{
  "id": "itm_001",
  "nome": "Cobertura Casamento",
  "tipo": "servico_principal",
  "categoria_id": "cat_001",
  "categoria_nome": "Fotografia",
  "descricao": "Cobertura fotográfica completa",
  "valor_base": 3500.00,
  "duracao_base": 8,
  "valor_hora_adicional": 250.00,
  "exibir_ao_cliente": true,
  "ativo": true
}
```

### API — GET /admin/produtos/pacotes/:id
```json
{
  "id": "pkt_001",
  "nome": "Pacote Casamento Completo",
  "descricao": "Cobertura + Álbum + Making Of com 10% off",
  "itens": [
    {
      "item_id": "itm_001",
      "item_nome": "Cobertura Casamento",
      "tipo": "servico_principal",
      "qtd": 1,
      "valor_unitario": 3500.00,
      "duracao_base": 8,
      "valor_hora_adicional": 250.00
    },
    {
      "item_id": "itm_005",
      "item_nome": "Álbum 30x30",
      "tipo": "produto",
      "qtd": 1,
      "valor_unitario": 1200.00
    }
  ],
  "desconto_tipo": "percentual",
  "desconto_valor": 10,
  "valor_bruto": 5500.00,
  "valor_desconto": 550.00,
  "valor_final": 4950.00,
  "ativo": true
}
```

### Regras
- Retornar 404 se não encontrado ou não pertence ao tenant
- Incluir dados suficientes para cálculo (tipo, valor_base, duração, hora adicional)
- Incluir categoria_nome (join desnormalizado ou campo salvo)
- Não expor dados sensíveis (não há, mas princípio)

### Uso por Outros Módulos
- **Orçamento**: ao adicionar item → busca por ID → captura snapshot
- **Checklist (EQP-06)**: ao listar tipos de evento → busca itens tipo='servico_principal'
- **Frontend**: ao montar proposta → exibe detalhes do item

## Critérios de Aceite
- [ ] GET item por ID retorna todos os campos
- [ ] GET pacote por ID retorna itens expandidos
- [ ] 404 se não encontrado
- [ ] 403 se não pertence ao tenant
- [ ] Dados suficientes para cálculo de valor
- [ ] Categoria nome inclusa

## Prompt Pronto para o Kiro CLI

```
Implemente a spec PRS-12: Obter Item/Pacote por ID.

1. Em handlers/produtos/itens.js: GET /admin/produtos/itens/{id}.
2. Em handlers/produtos/pacotes.js: GET /admin/produtos/pacotes/{id}.
3. Retornar todos os campos necessários para cálculo.
4. 404 se não existe, 403 se não é do tenant.
5. Incluir categoria_nome no item.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
