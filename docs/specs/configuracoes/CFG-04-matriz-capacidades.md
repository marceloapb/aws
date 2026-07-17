# CFG-04: Matriz de capacidades visual por provedor

## Metadados
- **ID:** CFG-04
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** CFG-02

## Contexto
Cada gateway suporta um subconjunto de tipos de cobrança (Link, Pix, Boleto, Cartão, Maquininha, Webhook). O admin precisa saber o que cada um faz antes de escolher o padrão.

## Escopo
- `apps/frontend/src/pages/admin/Configuracoes/GatewayMatriz.jsx` — NOVO
- `apps/frontend/src/pages/admin/Configuracoes/Gateway.jsx` — importar abaixo dos cards
- Constante `CAPACIDADES_POR_PROVEDOR` (hardcoded no frontend — não precisa de API)

## Fora de Escopo (NÃO TOCAR)
- Edição de capacidades pelo admin
- Lógica de bloqueio de tipo na cobrança
- Cards e modal (CFG-02, CFG-03)
- Backend

## Spec Técnica

### Matriz de Capacidades
| Provedor | Link | Pix | Boleto | Cartão | Maquininha | Webhook |
|---|---|---|---|---|---|---|
| Manual | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Asaas | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| MercadoPago | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Stripe | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Pagarme | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| PagBank | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| PicPay | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| SumUp | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Banco Inter | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Stone | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| InfinitePay | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |

### Frontend — GatewayMatriz.jsx
- Tabela responsiva abaixo da grade de cards
- Colunas: Provedor, Link, Pix, Boleto, Cartão, Maquininha, Webhook
- Ícone ✅ (check-circle emerald-500) ou ❌ (x-circle gray-300)
- Linha do gateway padrão destacada (bg-orange-50, font-semibold)
- Nota no rodapé: "Manual suporta todos os tipos mas sem automação de cobrança."

## Critérios de Aceite
- [ ] Tabela visível abaixo da grade de provedores
- [ ] Linhas = provedores, Colunas = Link/Pix/Boleto/Cartão/Maquininha/Webhook
- [ ] Gateway padrão destacado (bg-orange-50)
- [ ] Nota: "Manual suporta todos os tipos mas sem automação de cobrança."
- [ ] Responsivo em telas menores (scroll horizontal)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CFG-04: Matriz de capacidades visual por provedor.

1. Crie apps/frontend/src/pages/admin/Configuracoes/GatewayMatriz.jsx:
   - Constante CAPACIDADES_POR_PROVEDOR com a matriz hardcoded
   - Tabela HTML com Tailwind: overflow-x-auto, divide-y
   - Ícones: CheckCircle (emerald-500) e XCircle (gray-300) do lucide-react
   - Prop: gatewayPadrao (string) para destacar a linha
   - Nota no rodapé com bg-amber-50, text-amber-800

2. Em Gateway.jsx, importe GatewayMatriz abaixo do grid de cards.
   Passe o provider que está marcado como padrão.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
