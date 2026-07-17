# EQP-04: Painel do Inventário

## Metadados
- **ID:** EQP-04
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** EQP-03

## Contexto
O admin precisa de uma visão rápida do inventário: quantos equipamentos tem, por categoria, por status, quais são padrão. Cards resumo no topo + listagem abaixo.

## Escopo
- `apps/frontend/src/pages/admin/Equipamentos.jsx` — ALTERAR (adicionar cards)
- `apps/backend/src/handlers/equipamento/resumo.js` — NOVO
- API: GET /admin/equipamentos/resumo

## Fora de Escopo (NÃO TOCAR)
- CRUD de equipamentos (EQP-03 — já feito)
- Checklist (EQP-06)
- Outros módulos

## Spec Técnica

### API — GET /admin/equipamentos/resumo
```json
{
  "total_equipamentos": 24,
  "total_ativos": 22,
  "total_inativos": 2,
  "total_padrao": 8,
  "por_categoria": [
    { "categoria": "Câmeras", "quantidade": 5 },
    { "categoria": "Lentes", "quantidade": 8 },
    { "categoria": "Iluminação", "quantidade": 6 },
    { "categoria": "Acessórios", "quantidade": 5 }
  ],
  "por_status": [
    { "status": "disponivel", "quantidade": 18 },
    { "status": "em_uso", "quantidade": 3 },
    { "status": "manutencao", "quantidade": 1 },
    { "status": "indisponivel", "quantidade": 2 }
  ]
}
```

### Frontend — Cards Resumo
- Card 1: Total de equipamentos (ícone pacote)
- Card 2: Disponíveis (ícone check, verde)
- Card 3: Em uso (ícone calendário, azul)
- Card 4: Padrão (ícone estrela, amarelo)

### Breakdown por Categoria
- Mini barras horizontais ou donut chart simples
- Cada categoria com cor distinta
- Clicável: filtra a listagem abaixo

### Layout
```
[Cards Resumo - 4 colunas]
[Breakdown por Categoria]
[Tabela de Equipamentos (EQP-03)]
```

## Critérios de Aceite
- [ ] API retorna resumo agregado
- [ ] 4 cards com totais corretos
- [ ] Breakdown por categoria visível
- [ ] Click na categoria filtra listagem
- [ ] Atualizado em tempo real (após CRUD)
- [ ] Responsive (cards empilham em mobile)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec EQP-04: Painel do Inventário.

1. Crie handlers/equipamento/resumo.js: agregar totais por status, categoria, flags.
2. Em Equipamentos.jsx: adicionar cards resumo no topo + breakdown por categoria.
3. Cards clicáveis filtram a listagem abaixo.
4. SAM: rota GET /admin/equipamentos/resumo.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
