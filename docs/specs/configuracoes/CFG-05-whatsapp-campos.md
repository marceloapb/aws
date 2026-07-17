# CFG-05: WhatsApp — Campos faltantes

## Metadados
- **ID:** CFG-05
- **Tipo:** Melhoria
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
A tela atual (print image-4.png) mostra apenas WABA ID e Phone Number ID. Faltam: Token permanente, Verify Token do webhook, modo (produção/desenvolvimento), status de conexão real (healthcheck), e link direto para URL do webhook.

## Escopo
- `apps/frontend/src/pages/admin/` — tela de Configurações > Integrações > WhatsApp
- `apps/api/src/routes/admin-whatsapp.js` — expor campos extras
- `apps/api/src/routes/admin-configuracoes.js` — se WhatsApp config estiver aqui

## Fora de Escopo (NÃO TOCAR)
- Lógica de envio/recebimento de mensagens WhatsApp
- Templates de mensagem
- Log de conversas
- Outros módulos

## Spec Técnica

### Campos adicionais na tela WhatsApp
| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| WABA ID | text | Sim | Já existe |
| Phone Number ID | text | Sim | Já existe |
| Token Permanente | password | Sim | NOVO — salvar em SSM |
| Verify Token | text (readonly) | Sim | NOVO — gerado pelo sistema |
| Webhook URL | text (readonly+copy) | Sim | NOVO — mostrar URL do API Gateway |
| Modo | toggle | Sim | NOVO — Produção/Desenvolvimento |
| Status | badge | — | NOVO — Conectado/Desconectado/Erro |

### Backend
- GET `/admin/configuracoes/whatsapp` — retorna todos os campos (token mascarado)
- PUT `/admin/configuracoes/whatsapp` — salva WABA ID, Phone Number ID, Token, Modo
- GET `/admin/configuracoes/whatsapp/status` — healthcheck real (chama GET /v17.0/{phone_id} na Graph API)

### DynamoDB
```
PK: TENANT#<id>
SK: CONFIG#WHATSAPP
attributes: waba_id, phone_number_id, verify_token, modo, webhook_url, status, updated_at
```
Token permanente → SSM: `/mbf/<tenant_id>/whatsapp/token`

## Critérios de Aceite
- [ ] Tela mostra todos os 7 campos da tabela acima
- [ ] Token mascarado no GET, input type=password
- [ ] Verify Token gerado automaticamente (UUID) e readonly
- [ ] Webhook URL mostra endpoint real do API Gateway + botão copiar
- [ ] Toggle Produção/Desenvolvimento funcional
- [ ] Badge de status atualiza ao clicar "Reconectar"

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CFG-05: WhatsApp — campos faltantes.

1. Na tela de Configurações > Integrações > WhatsApp (frontend), adicione os campos:
   - Token Permanente (input type=password com eye-toggle)
   - Verify Token (readonly, gerado automaticamente, com botão copiar)
   - Webhook URL (readonly, mostra URL real do API Gateway, botão copiar)
   - Toggle Modo: Produção/Desenvolvimento
   - Badge de status: Conectado (green) / Desconectado (red) / Erro (amber)

2. Backend em admin-whatsapp.js ou admin-configuracoes.js:
   - GET /admin/configuracoes/whatsapp → retorna config completa (token mascarado)
   - PUT /admin/configuracoes/whatsapp → salva, token vai para SSM
   - GET /admin/configuracoes/whatsapp/status → chama Graph API para healthcheck

3. DynamoDB: PK TENANT#<id>, SK CONFIG#WHATSAPP

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
