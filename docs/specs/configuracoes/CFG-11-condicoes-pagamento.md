# CFG-11: Condições de Pagamento

## Metadados
- **ID:** CFG-11
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** CFG-10

## Contexto
O fotógrafo precisa configurar condições de pagamento reutilizáveis (que depois são selecionadas no orçamento/contrato): entrada + parcelas, métodos aceitos, descontos por forma de pagamento. Funciona como um CRUD de "planos de pagamento" globais.

## Escopo
- `apps/frontend/src/pages/admin/Configuracoes/CondicoesPagamento.jsx` — NOVO
- `apps/api/src/routes/admin-configuracoes.js` — CRUD /configuracoes/condicoes-pagamento
- DynamoDB: entidade CONDICAO_PAGAMENTO

## Fora de Escopo (NÃO TOCAR)
- Gateway de pagamento (CFG-01~04)
- Geração real de cobrança
- Vínculo com orçamento/contrato (outra spec)
- Integrações

## Spec Técnica

### DynamoDB — Entidade
```
PK: TENANT#<id>
SK: CONDICAO#<condicao_id>
attributes:
  nome: string (ex: "3x sem juros", "50% entrada + 2x")
  descricao: string
  entrada_percentual: number (0-100)
  num_parcelas: number (1-24)
  intervalo_dias: number (30, 15, 7)
  metodos_aceitos: string[] (pix, boleto, cartao, link, dinheiro)
  desconto_avista: number (percentual)
  juros_parcelamento: number (percentual por parcela)
  is_padrao: boolean
  ativo: boolean
  created_at: ISO string
  updated_at: ISO string
```

### API
| Método | Path | Descrição |
|---|---|---|
| GET | /admin/configuracoes/condicoes-pagamento | Lista todas |
| POST | /admin/configuracoes/condicoes-pagamento | Cria nova |
| PUT | /admin/configuracoes/condicoes-pagamento/:id | Atualiza |
| DELETE | /admin/configuracoes/condicoes-pagamento/:id | Soft delete (ativo=false) |

### Frontend — CondicoesPagamento.jsx
- Lista de cards com condições cadastradas
- Badge "Padrão" na condição marcada como is_padrao
- Botão "+ Nova Condição" abre modal/drawer com formulário:
  - Nome
  - Entrada (%) — slider ou input
  - Número de parcelas — stepper
  - Intervalo entre parcelas (dias) — select (7/15/30)
  - Métodos aceitos — checkboxes (Pix, Boleto, Cartão, Link, Dinheiro)
  - Desconto à vista (%) — input
  - Juros parcelamento (%) — input
- Preview visual: simulação com valor exemplo (R$ 1.000)
  - "Entrada: R$ 500 + 2x de R$ 250"
- Toggle ativo/inativo por condição
- Marcar como padrão (apenas 1)

### Preview (cálculo local)
```
valor_exemplo = 1000
entrada = valor_exemplo * (entrada_percentual / 100)
restante = valor_exemplo - entrada
parcela = restante / num_parcelas
→ "Entrada: R$ {entrada} + {num_parcelas}x de R$ {parcela}"
```

## Critérios de Aceite
- [ ] CRUD completo funciona (listar, criar, editar, desativar)
- [ ] Preview visual calcula corretamente com valor exemplo
- [ ] Apenas 1 condição pode ser padrão
- [ ] Métodos aceitos são checkboxes múltiplos
- [ ] Soft delete (ativo=false), não remove do banco
- [ ] Validação: entrada 0-100%, parcelas 1-24, intervalo > 0

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CFG-11: Condições de Pagamento.

1. Crie apps/frontend/src/pages/admin/Configuracoes/CondicoesPagamento.jsx:
   - Lista de cards com condições cadastradas (nome, resumo, badges)
   - Botão "+ Nova Condição" abre modal com formulário completo
   - Preview visual: calcula entrada + parcelas com valor exemplo R$1000
   - Toggle ativo/inativo, marcar como padrão
   - Checkboxes para métodos aceitos

2. Backend em admin-configuracoes.js:
   - GET /admin/configuracoes/condicoes-pagamento → lista
   - POST → cria (gerar ID com ULID/UUID)
   - PUT /:id → atualiza (se is_padrao=true, desmarcar anterior)
   - DELETE /:id → soft delete (ativo=false)

3. DynamoDB: PK TENANT#<id>, SK CONDICAO#<id>

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
