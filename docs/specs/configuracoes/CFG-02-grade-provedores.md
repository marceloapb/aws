# CFG-02: Grade de provedores com toggle + selo

## Metadados
- **ID:** CFG-02
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** CFG-01

## Contexto
Hoje a tela (nos protótipos) tem um dropdown simples. A §21 define: 11 provedores, cada um com ativo/inativo, modo (sandbox/produção), flag is_padrao, e selos visuais. O toggle só ativa se credencial válida.

## Escopo
- `apps/frontend/src/pages/admin/Configuracoes/Gateway.jsx` — conteúdo principal
- `apps/frontend/src/hooks/useGateways.js` — NOVO custom hook
- `apps/api/src/routes/admin-configuracoes.js` — adicionar GET/PUT /configuracoes/gateways
- DynamoDB: entidade `GATEWAY` — `PK: TENANT#<id>`, `SK: GATEWAY#<provider>`

## Fora de Escopo (NÃO TOCAR)
- Modal de credenciais (CFG-03)
- Matriz de capacidades (CFG-04)
- Webhook/log (CFG-07)
- Backend real dos adapters de pagamento
- Outras rotas/pages

## Spec Técnica

### DynamoDB — Entidade Gateway
```
PK: TENANT#<tenant_id>
SK: GATEWAY#<provider_slug>
attributes:
  provider: string (asaas|mercadopago|stripe|pagarme|pagbank|picpay|sumup|banco-inter|stone|infinitepay|manual)
  ativo: boolean
  is_padrao: boolean
  ambiente: 'sandbox' | 'producao'
  credenciais_configuradas: boolean
  created_at: ISO string
  updated_at: ISO string
```

### API — Rotas
| Método | Path | Descrição |
|---|---|---|
| GET | /admin/configuracoes/gateways | Lista todos os gateways do tenant |
| PUT | /admin/configuracoes/gateways/:provider | Atualiza ativo/is_padrao/ambiente |

### Frontend — Gateway.jsx
- Grid de cards (1 por provedor), cada card com:
  - Logo/ícone do provedor
  - Nome do provedor
  - Toggle ativo/inativo (desabilitado se `credenciais_configuradas === false`)
  - Badge "Padrão" (orange) se `is_padrao`
  - Badge de estado: "Sandbox" (amber), "Configurado" (emerald), "Faltam credenciais" (red)
  - Botão "Configurar" (abre modal CFG-03)
- Regra: apenas 1 provedor pode ser `is_padrao` por vez
- "Manual" (Nenhum) sempre ativo, sem toggle, badge "Controle Manual"

### Provedores (11 + Manual)
1. Nenhum (controle manual)
2. Asaas
3. MercadoPago
4. Stripe
5. Pagarme
6. PagBank
7. PicPay
8. SumUp
9. Banco Inter
10. Stone
11. InfinitePay

## Critérios de Aceite
- [ ] 11 provedores + Manual visíveis em grade
- [ ] Toggle desabilitado sem credencial
- [ ] Apenas 1 marcado como padrão por vez
- [ ] Selos refletem estado real (Sandbox/Configurado/Faltam credenciais/Padrão)
- [ ] "Nenhum" sempre ativo, sem toggle
- [ ] API persiste no DynamoDB

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CFG-02: Grade de provedores com toggle + selo.

1. Backend: Em apps/api/src/routes/admin-configuracoes.js, adicione:
   - GET /admin/configuracoes/gateways → lista todos os gateways do tenant (DynamoDB Query PK=TENANT#id, SK begins_with GATEWAY#)
   - PUT /admin/configuracoes/gateways/:provider → atualiza ativo, is_padrao, ambiente
   - Se is_padrao=true, desmarcar o anterior (transact write)
   - Validar: não permitir ativo=true se credenciais_configuradas=false

2. Frontend: Substitua o placeholder de apps/frontend/src/pages/admin/Configuracoes/Gateway.jsx por:
   - Grid responsivo (grid-cols-1 md:grid-cols-2 lg:grid-cols-3) de cards
   - Cada card: logo, nome, toggle, badges, botão "Configurar"
   - Custom hook useGateways.js para fetch/mutate

3. DynamoDB: Use PK TENANT#<id>, SK GATEWAY#<provider>. Seed inicial com 12 itens (manual + 11 provedores) com ativo=false e credenciais_configuradas=false.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
