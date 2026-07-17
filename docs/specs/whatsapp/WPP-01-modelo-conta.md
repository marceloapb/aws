# WPP-01: Modelo ContaWhatsApp + Credenciais (SSM)

## Metadados
- **ID:** WPP-01
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
Fundação do módulo WhatsApp. Cada tenant tem uma ContaWhatsApp com referências a credenciais seguras (SSM). Suporta modo teste e produção. Credenciais NUNCA no DynamoDB.

## Escopo
- `apps/backend/src/models/whatsapp.js` — NOVO
- DynamoDB: entidade CONTA_WHATSAPP
- SSM Parameter Store: token, phone_number_id

## Fora de Escopo (NÃO TOCAR)
- Tela de conexão (WPP-02)
- Templates (WPP-03)
- Envio (WPP-06)

## Spec Técnica

### Entidade CONTA_WHATSAPP
```json
{
  "PK": "TENANT#t123",
  "SK": "WHATSAPP#CONTA",
  "waba_id": "2163797757810981",
  "phone_number_id": "REFERENCIA_SSM",
  "display_phone": "+55 11 99999-9999",
  "nome_exibicao": "Studio MBF",
  "token_ssm_path": "/mbf/t123/whatsapp/token",
  "phone_id_ssm_path": "/mbf/t123/whatsapp/phone_number_id",
  "webhook_verify_token_ssm": "/mbf/t123/whatsapp/webhook_verify",
  "modo": "producao",
  "status_verificacao": "verificado",
  "numero_admin": "+5511988887777",
  "limite_conversas_24h": 1000,
  "ativo": true,
  "created_at": "2026-07-17T10:00:00Z",
  "updated_at": "2026-07-17T10:00:00Z"
}
```

### Status de Verificação
| Status | Descrição |
|---|---|
| nao_verificado | Conta criada, sem verificação |
| pendente | Verificação submetida à Meta |
| verificado | Aprovado (limite 1000 conversas/24h) |
| negado | Meta rejeitou verificação |

### Modo
| Modo | Descrição |
|---|---|
| teste | Usa sandbox da Meta, só números registrados |
| producao | Cloud API real, qualquer número |

### Credenciais SSM
```
/mbf/{tenant_id}/whatsapp/token          → Bearer token (System User)
/mbf/{tenant_id}/whatsapp/phone_number_id → Phone Number ID
/mbf/{tenant_id}/whatsapp/webhook_verify  → Verify token do webhook
```
- Tipo: SecureString
- Nunca expostas no GET da API

## Critérios de Aceite
- [ ] Entidade CONTA_WHATSAPP no DynamoDB
- [ ] Credenciais em SSM (nunca no banco)
- [ ] Model helper com get/create/update
- [ ] Modo teste/producao
- [ ] Status verificação funcional
- [ ] Número admin separado

## Prompt Pronto para o Kiro CLI

```
Implemente a spec WPP-01: Modelo ContaWhatsApp.

1. Crie apps/backend/src/models/whatsapp.js com helpers CRUD.
2. Entidade: PK=TENANT#id, SK=WHATSAPP#CONTA.
3. Credenciais em SSM Parameter Store (SecureString).
4. Modo: teste/producao. Status: nao_verificado/pendente/verificado/negado.
5. Número admin separado para avisos.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
