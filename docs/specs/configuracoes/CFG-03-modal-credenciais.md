# CFG-03: Modal de credenciais dinâmico por provedor

## Metadados
- **ID:** CFG-03
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** CFG-02

## Contexto
Cada provedor tem campos de credencial DISTINTOS. Hoje a tela tem apenas 1 campo genérico "Client Secret". Precisa de modal com campos específicos + seletor de ambiente por provedor.

## Escopo
- `apps/frontend/src/pages/admin/Configuracoes/GatewayCredenciaisModal.jsx` — NOVO
- `apps/frontend/src/pages/admin/Configuracoes/Gateway.jsx` — onclick "Configurar" abre modal
- `apps/api/src/routes/admin-configuracoes.js` — PUT /configuracoes/gateways/:provider/credenciais

## Fora de Escopo (NÃO TOCAR)
- Implementação real do cofre/criptografia (usar SSM placeholder)
- Validação real contra a API do provedor
- Grade de provedores (CFG-02 já pronta)
- Matriz de capacidades (CFG-04)
- Outros módulos

## Spec Técnica

### Campos por Provedor
| Provedor | Campos |
|---|---|
| Asaas | api_key, webhook_token |
| MercadoPago | access_token, public_key |
| Stripe | secret_key, publishable_key, webhook_secret |
| Pagarme | api_key, encryption_key |
| PagBank | client_id, client_secret |
| PicPay | x_picpay_token, x_seller_token |
| SumUp | client_id, client_secret |
| Banco Inter | client_id, client_secret, certificado_mtls (upload) |
| Stone | stone_code, client_id |
| InfinitePay | client_id, client_secret |

### API
| Método | Path | Descrição |
|---|---|---|
| PUT | /admin/configuracoes/gateways/:provider/credenciais | Salva credenciais (criptografadas via SSM) |
| GET | /admin/configuracoes/gateways/:provider/credenciais | Retorna campos mascarados (últimos 4 chars) |

### Frontend — GatewayCredenciaisModal.jsx
- Modal overlay com título "Configurar {NomeProvedor}"
- Campos renderizados dinamicamente conforme tabela acima
- Toggle ambiente Sandbox/Produção dentro do modal
- Campos de senha com eye-toggle para revelar
- Banco Inter: campo especial de upload para certificado .pem
- Stone: banner amarelo "Esquema de autenticação não confirmado oficialmente"
- Botão Salvar → PUT → fecha modal → atualiza badge na grade

### Backend
- Credenciais salvas em SSM Parameter Store: `/mbf/<tenant_id>/gateways/<provider>/<campo>`
- No DynamoDB, marcar `credenciais_configuradas: true` após save bem-sucedido
- GET retorna versão mascarada: `{ api_key: "****abcd" }`

## Critérios de Aceite
- [ ] Modal abre com campos corretos para o provedor clicado
- [ ] Campos dinâmicos por provedor
- [ ] Banco Inter mostra campo de upload de certificado mTLS
- [ ] Stone mostra aviso de esquema não confirmado
- [ ] Após salvar, badge muda de "Faltam credenciais" → "Configurado"
- [ ] Ambiente (Sandbox/Produção) é por provedor, não global
- [ ] Credenciais mascaradas no GET

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CFG-03: Modal de credenciais dinâmico por provedor.

1. Crie apps/frontend/src/pages/admin/Configuracoes/GatewayCredenciaisModal.jsx:
   - Recebe props: { provider, isOpen, onClose, onSaved }
   - Renderiza campos dinamicamente com base em PROVIDER_FIELDS[provider]
   - Toggle Sandbox/Produção
   - Eye-toggle em campos de senha
   - Upload .pem para Banco Inter
   - Banner warning para Stone
   - Chama PUT /admin/configuracoes/gateways/:provider/credenciais

2. Em Gateway.jsx, no botão "Configurar" de cada card, abra o modal passando o provider.

3. Backend em admin-configuracoes.js:
   - PUT /admin/configuracoes/gateways/:provider/credenciais → salva em SSM, marca credenciais_configuradas=true no DynamoDB
   - GET /admin/configuracoes/gateways/:provider/credenciais → retorna valores mascarados

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
