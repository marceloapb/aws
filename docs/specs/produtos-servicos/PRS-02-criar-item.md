# PRS-02: Criar Item (3 Tipos)

## Metadados
- **ID:** PRS-02
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Médio
- **Dependência:** Nenhuma

## Contexto
O admin cadastra itens no catálogo. Existem 3 tipos: servico_principal (ex: Cobertura Casamento), produto (ex: Álbum 30x30), adicional (ex: Hora Extra, Drone). Cada tipo tem campos específicos. Serviço principal é o tipo que alimenta o Checklist de equipamentos (§27).

## Escopo
- `apps/backend/src/handlers/produtos/itens.js` — NOVO
- `apps/backend/src/models/item.js` — NOVO
- `apps/frontend/src/pages/admin/ProdutosServicos.jsx` — NOVO
- `apps/frontend/src/pages/admin/ItemForm.jsx` — NOVO
- API: POST /admin/produtos/itens
- DynamoDB: entidade ITEM + GSIs

## Fora de Escopo (NÃO TOCAR)
- Pacotes (PRS-06)
- Orçamentos (consumidor)
- Equipamentos/Checklist (consumidor)

## Spec Técnica

### Entidade ITEM
```json
{
  "PK": "TENANT#t123",
  "SK": "ITEM#itm_001",
  "GSI1PK": "TENANT#t123#TIPO#servico_principal",
  "GSI1SK": "ITEM#Cobertura Casamento",
  "GSI2PK": "TENANT#t123#CAT#cat_001",
  "GSI2SK": "ITEM#Cobertura Casamento",
  "id": "itm_001",
  "nome": "Cobertura Casamento",
  "tipo": "servico_principal",
  "categoria_id": "cat_001",
  "descricao": "Cobertura fotográfica completa do casamento",
  "valor_base": 3500.00,
  "duracao_base": 8,
  "valor_hora_adicional": 250.00,
  "exibir_ao_cliente": true,
  "ativo": true,
  "created_at": "2026-07-17T10:00:00Z",
  "updated_at": "2026-07-17T10:00:00Z"
}
```

### Tipos de Item
| Tipo | Campos Exclusivos | Exemplo |
|---|---|---|
| servico_principal | duracao_base, valor_hora_adicional | Cobertura Casamento, Ensaio |
| produto | — (só campos base) | Álbum 30x30, Quadro 60x90 |
| adicional | — (só campos base) | Hora Extra, Drone, Making Of |

### Campos do Formulário
| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| nome | text | Sim | max 100, único por tenant |
| tipo | select | Sim | servico_principal/produto/adicional |
| categoria_id | select | Sim | categorias ativas |
| descricao | textarea | Não | max 500 |
| valor_base | currency | Sim | > 0 |
| duracao_base | number (horas) | Só servico_principal | > 0 |
| valor_hora_adicional | currency | Só servico_principal | >= 0 |
| exibir_ao_cliente | toggle | Não | default: true |

### GSIs
| GSI | PK | SK | Uso |
|---|---|---|---|
| GSI1 | TENANT#id#TIPO#tipo | ITEM#nome | Listar por tipo |
| GSI2 | TENANT#id#CAT#cat_id | ITEM#nome | Listar por categoria |

### Frontend — ItemForm.jsx
- Formulário dinâmico por tipo
- Ao selecionar tipo='servico_principal': exibe campos de duração/hora adicional
- Máscara monetária no valor
- Preview de cálculo: "8h = R$ 3.500 | 10h = R$ 4.000"
- Toggle exibir_ao_cliente com tooltip

## Critérios de Aceite
- [ ] Criar item com todos os campos
- [ ] 3 tipos funcionam
- [ ] Campos condicionais por tipo
- [ ] Validação nome único
- [ ] GSIs populados
- [ ] Máscara monetária
- [ ] Preview de cálculo para servico_principal
- [ ] Toggle exibir_ao_cliente

## Prompt Pronto para o Kiro CLI

```
Implemente a spec PRS-02: Criar Item (3 Tipos).

1. Crie models/item.js: entidade ITEM com GSIs.
2. Crie handlers/produtos/itens.js: POST /admin/produtos/itens.
3. Crie pages/admin/ItemForm.jsx: formulário dinâmico por tipo.
4. Campos condicionais: duracao_base e valor_hora_adicional só para servico_principal.
5. GSI1 (tipo) e GSI2 (categoria).
6. SAM: rota POST + GSIs.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
