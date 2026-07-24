# SIG-05: Fallback de Canal OTP

## Metadados
- **ID:** SIG-05
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** SIG-02


## Contexto
O canal primário de envio do OTP é WhatsApp (SIG-02). Porém, há cenários em que o WhatsApp falha (número inválido, API indisponível, cliente sem WhatsApp). O sistema deve oferecer canais de fallback: **E-mail** (secundário) e **SMS** (terciário). O cliente pode escolher o canal ou o sistema seleciona automaticamente em caso de falha.

## Escopo
- `apps/api/src/services/otpService.js` — ALTERAR (adicionar canais)
- `apps/api/src/services/otpChannels.js` — NOVO
- `apps/api/src/routes/public-contratos.js` — ALTERAR (parâmetro canal)

## Fora de Escopo (NÃO TOCAR)
- Lógica base do OTP (SIG-02 — manter intacta)
- UI do input (SIG-07)
- Templates de email (módulo separado)
- Integração SMS com terceiros (usar SNS simples)


## Spec Técnica

### Hierarquia de Canais
```
1. WhatsApp (primário) — Meta Cloud API
2. E-mail (secundário) — Amazon SES
3. SMS (terciário) — Amazon SNS

Lógica:
- Cliente pode escolher o canal no frontend
- Se não escolher: usa WhatsApp
- Se WhatsApp falhar: tenta e-mail automaticamente
- Se e-mail falhar: tenta SMS
- Se todos falharem: erro com orientação
```

### Disponibilidade por Dados do Cliente
```
Canal      | Dado necessário | Fallback se ausente
-----------|-----------------|--------------------
WhatsApp   | telefone        | → E-mail
E-mail     | email           | → SMS
SMS        | telefone        | → Erro
```

### Serviço — otpChannels.js
```js
const { enviarMensagemWhatsapp } = require('../lib/whatsapp/client')
const { enviarEmail } = require('../adapters/notificacoes/emailAdapter')
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns')

const snsClient = new SNSClient({ region: 'us-east-1' })

const CANAIS = {
  whatsapp: {
    nome: 'WhatsApp',
    prioridade: 1,
    campo_cliente: 'telefone',
    enviar: async (destino, codigo) => {
      await enviarMensagemWhatsapp(destino, {
        template: 'otp_contrato',
        params: { codigo }
      })
    }
  },
  email: {
    nome: 'E-mail',
    prioridade: 2,
    campo_cliente: 'email',
    enviar: async (destino, codigo) => {
      await enviarEmail({
        to: destino,
        subject: 'Código de verificação — Assinatura de Contrato',
        html: `
          <h2>Seu código de verificação</h2>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${codigo}</p>
          <p>Este código expira em 10 minutos.</p>
          <p>Se você não solicitou, ignore este e-mail.</p>
        `
      })
    }
  },
  sms: {
    nome: 'SMS',
    prioridade: 3,
    campo_cliente: 'telefone',
    enviar: async (destino, codigo) => {
      await snsClient.send(new PublishCommand({
        PhoneNumber: destino,
        Message: `Seu codigo de verificacao: ${codigo}. Expira em 10 min. Nao compartilhe.`,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' }
        }
      }))
    }
  }
}

async function enviarOTPComFallback(cliente, codigo, canalPreferido = 'whatsapp') {
  const ordemTentativa = Object.values(CANAIS)
    .sort((a, b) => a.prioridade - b.prioridade)

  // Se canal preferido, começa por ele
  if (canalPreferido && CANAIS[canalPreferido]) {
    const idx = ordemTentativa.findIndex(c => c === CANAIS[canalPreferido])
    if (idx > 0) {
      ordemTentativa.splice(idx, 1)
      ordemTentativa.unshift(CANAIS[canalPreferido])
    }
  }

  for (const canal of ordemTentativa) {
    const destino = cliente[canal.campo_cliente]
    if (!destino) continue

    try {
      await canal.enviar(destino, codigo)
      return {
        sucesso: true,
        canal: Object.keys(CANAIS).find(k => CANAIS[k] === canal),
        destino_parcial: mascararDestino(destino, canal.campo_cliente)
      }
    } catch (erro) {
      console.warn(`Falha ao enviar OTP via ${canal.nome}:`, erro.message)
      continue
    }
  }

  throw new Error('Não foi possível enviar o código por nenhum canal. Verifique seus dados de contato.')
}

function mascararDestino(destino, tipo) {
  if (tipo === 'telefone') return '***' + destino.slice(-6)
  if (tipo === 'email') {
    const [user, domain] = destino.split('@')
    return user.slice(0, 2) + '***@' + domain
  }
  return '***'
}

module.exports = { enviarOTPComFallback, CANAIS }
```


### Alteração no otpService.js (SIG-02)
```js
// Substituir envio direto por envio com fallback:
const { enviarOTPComFallback } = require('./otpChannels')

async function criarOTP(contratoId, clienteId, canalPreferido = 'whatsapp') {
  const cliente = await getCliente(clienteId)
  const codigo = gerarCodigo6Digitos()

  // ... criar registro OTP ...

  // Enviar com fallback
  const resultado = await enviarOTPComFallback(cliente, codigo, canalPreferido)

  // Atualizar OTP com canal efetivo
  await atualizarOTP(otp.id, { canal: resultado.canal })

  return {
    id: otp.id,
    expira_em: otp.expira_em,
    canal: resultado.canal,
    destino_parcial: resultado.destino_parcial
  }
}
```

### API — POST /public/contratos/:id/enviar-otp (atualizada)
```json
// Input (canal agora é opcional)
{
  "token": "jwt_xxx",
  "canal": "email"  // opcional: "whatsapp" | "email" | "sms"
}

// Response 200
{
  "sucesso": true,
  "otp_id": "otp_uuid_001",
  "canal": "email",
  "destino_parcial": "an***@gmail.com",
  "expira_em": "2026-07-18T15:38:00Z",
  "mensagem": "Código enviado por E-mail",
  "canais_disponiveis": ["whatsapp", "email"]
}
```

### Endpoint Canais Disponíveis
```
GET /public/contratos/:id/canais-otp

Response:
{
  "canais": [
    { "id": "whatsapp", "nome": "WhatsApp", "destino_parcial": "***887766", "disponivel": true },
    { "id": "email", "nome": "E-mail", "destino_parcial": "an***@gmail.com", "disponivel": true },
    { "id": "sms", "nome": "SMS", "destino_parcial": "***887766", "disponivel": true }
  ]
}
```

### Frontend — Seleção de Canal
```
┌─────────────────────────────────────┐
│  Como deseja receber o código?      │
│                                     │
│  ● WhatsApp (***887766)             │
│  ○ E-mail (an***@gmail.com)         │
│  ○ SMS (***887766)                  │
│                                     │
│  [Enviar código]                    │
│                                     │
│  Não recebeu? Tente outro canal ↑   │
└─────────────────────────────────────┘
```

### Regras
- WhatsApp SEMPRE é o canal padrão (mais confiável + gratuito)
- E-mail como fallback principal (SES, custo baixo)
- SMS como último recurso (custo por mensagem via SNS)
- Cliente pode escolher canal na UI antes do envio
- Se canal escolhido falha: tenta próximo automaticamente
- Rate limit se aplica por contrato (não por canal)
- Canal efetivo é registrado no OTP e no audit log
- Se cliente não tem telefone NEM email: erro + orientação

## Critérios de Aceite
- [ ] 3 canais implementados: WhatsApp, E-mail, SMS
- [ ] Fallback automático em caso de falha
- [ ] Cliente pode escolher canal na UI
- [ ] GET /public/contratos/:id/canais-otp retorna opções
- [ ] Destino mascarado (privacidade)
- [ ] Canal efetivo salvo no OTP_CONTRATO
- [ ] Registrado no audit log (SIG-03)
- [ ] Erro claro se nenhum canal disponível

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SIG-05: Fallback de Canal OTP.

1. Crie services/otpChannels.js: envio via WhatsApp, E-mail (SES), SMS (SNS).
2. Altere otpService.js: usar enviarOTPComFallback em vez de envio direto.
3. Fallback automático: WhatsApp → E-mail → SMS.
4. GET /public/contratos/:id/canais-otp — listar canais disponíveis.
5. Parâmetro "canal" opcional no POST enviar-otp.
6. Mascarar destinos (privacidade).
7. Registrar canal efetivo no OTP e audit log.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
