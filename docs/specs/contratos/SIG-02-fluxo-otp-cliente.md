# SIG-02: Fluxo OTP Cliente

## Metadados
- **ID:** SIG-02
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Alto
- **Dependência:** CT-05

## Contexto
Para reforçar a autenticidade da assinatura eletrônica, o cliente deve confirmar um código OTP (One-Time Password) de 6 dígitos enviado por WhatsApp (canal primário) antes de finalizar o aceite. O OTP substitui a simples confirmação por checkbox como prova de identidade, tornando o aceite juridicamente mais robusto.

## Escopo
- `apps/api/src/services/otpService.js` — NOVO
- `apps/api/src/routes/public-contratos.js` — ALTERAR (novos endpoints)
- `apps/api/src/handlers/contratos/aceitar.js` — ALTERAR (exigir OTP)
- DynamoDB: entidade OTP_CONTRATO

## Fora de Escopo (NÃO TOCAR)
- UI do input OTP (SIG-07)
- Fallback de canal (SIG-05)
- Aceite sem OTP (CT-05 será deprecado após SIG-02)

## Spec Técnica

### Fluxo Completo
```
1. Cliente chega na tela de aceite (CT-05 Passo 3)
2. Antes de "Assinar Contrato", sistema envia OTP
3. POST /public/contratos/:id/enviar-otp
   → Gera código 6 dígitos
   → Salva no DynamoDB (TTL 10 min)
   → Envia via WhatsApp (canal primário)
4. Cliente digita código no input (SIG-07)
5. POST /public/contratos/:id/verificar-otp
   → Valida código + TTL
   → Se válido: marca OTP como verificado
6. POST /public/contratos/:id/aceitar
   → Agora exige otp_verificado = true
   → Fluxo CT-05 continua normalmente
```

### Entidade DynamoDB — OTP_CONTRATO
```json
{
  "PK": "CONTRATO#ct_001",
  "SK": "OTP#otp_uuid_001",
  "id": "otp_uuid_001",
  "contrato_id": "ct_001",
  "cliente_id": "cli_001",
  "codigo": "482917",
  "canal": "whatsapp",
  "telefone": "+5511999887766",
  "tentativas": 0,
  "max_tentativas": 3,
  "verificado": false,
  "expirado": false,
  "created_at": "2026-07-18T15:28:00Z",
  "expira_em": "2026-07-18T15:38:00Z",
  "ttl": 1721316480
}
```

### Serviço — otpService.js
```js
const crypto = require('crypto')
const { v4: uuid } = require('uuid')
const { enviarMensagemWhatsapp } = require('../lib/whatsapp/client')

function gerarCodigo6Digitos() {
  return crypto.randomInt(100000, 999999).toString()
}

async function criarOTP(contratoId, clienteId, telefone, canal = 'whatsapp') {
  const codigo = gerarCodigo6Digitos()
  const agora = new Date()
  const expiraEm = new Date(agora.getTime() + 10 * 60 * 1000) // 10 min

  const otp = {
    PK: `CONTRATO#${contratoId}`,
    SK: `OTP#${uuid()}`,
    id: uuid(),
    contrato_id: contratoId,
    cliente_id: clienteId,
    codigo,
    canal,
    telefone,
    tentativas: 0,
    max_tentativas: 3,
    verificado: false,
    expirado: false,
    created_at: agora.toISOString(),
    expira_em: expiraEm.toISOString(),
    ttl: Math.floor(expiraEm.getTime() / 1000)
  }

  await salvarOTP(otp)
  await enviarOTP(otp)

  return { id: otp.id, expira_em: otp.expira_em, canal }
}

async function enviarOTP(otp) {
  if (otp.canal === 'whatsapp') {
    await enviarMensagemWhatsapp(otp.telefone, {
      template: 'otp_contrato',
      params: { codigo: otp.codigo }
    })
  }
  // Outros canais em SIG-05
}

async function verificarOTP(contratoId, codigoInformado) {
  const otp = await getOTPAtivo(contratoId)

  if (!otp) throw new Error('Nenhum OTP ativo encontrado')
  if (otp.verificado) throw new Error('OTP já verificado')
  if (new Date() > new Date(otp.expira_em)) {
    await marcarExpirado(otp)
    throw new Error('OTP expirado. Solicite um novo código.')
  }
  if (otp.tentativas >= otp.max_tentativas) {
    throw new Error('Máximo de tentativas excedido. Solicite um novo código.')
  }

  await incrementarTentativa(otp)

  if (otp.codigo !== codigoInformado) {
    const restantes = otp.max_tentativas - (otp.tentativas + 1)
    throw new Error(`Código incorreto. ${restantes} tentativa(s) restante(s).`)
  }

  await marcarVerificado(otp)
  return { verificado: true }
}

module.exports = { criarOTP, verificarOTP, gerarCodigo6Digitos }
```

### API — POST /public/contratos/:id/enviar-otp
```json
// Input
{
  "token": "jwt_xxx"
}

// Response 200
{
  "sucesso": true,
  "otp_id": "otp_uuid_001",
  "canal": "whatsapp",
  "telefone_parcial": "***887766",
  "expira_em": "2026-07-18T15:38:00Z",
  "mensagem": "Código enviado por WhatsApp"
}

// Response 429 (rate limit)
{
  "erro": "Aguarde 60 segundos para solicitar novo código"
}
```

### API — POST /public/contratos/:id/verificar-otp
```json
// Input
{
  "token": "jwt_xxx",
  "codigo": "482917"
}

// Response 200
{
  "verificado": true,
  "mensagem": "Código verificado com sucesso"
}

// Response 400
{
  "erro": "Código incorreto. 2 tentativa(s) restante(s)."
}

// Response 410
{
  "erro": "OTP expirado. Solicite um novo código."
}
```

### Alteração no aceitar.js (CT-05)
```js
// Adicionar validação antes do aceite:
async function aceitarContrato(contratoId, payload, request) {
  // ... validações existentes ...

  // NOVO: Verificar se OTP foi confirmado
  const otpVerificado = await verificarOTPConfirmado(contratoId)
  if (!otpVerificado) {
    throw new Error('Código OTP não verificado. Confirme o código antes de assinar.')
  }

  // ... resto do fluxo CT-05 ...

  // Adicionar ao registro de aceite:
  await criarAceite(contratoId, {
    // ... dados existentes ...
    otp_verificado: true,
    otp_canal: 'whatsapp',
    otp_data_verificacao: otpVerificado.verificado_em
  })
}
```

### Rate Limiting
- Máximo 1 OTP a cada 60 segundos por contrato
- Máximo 5 OTPs por hora por contrato
- Máximo 3 tentativas por OTP
- Após 3 OTPs falhados consecutivos: bloquear por 30 minutos

### Mensagem WhatsApp (Template)
```
Seu código de verificação para assinar o contrato é: *482917*

⚠️ Este código expira em 10 minutos.
Não compartilhe com ninguém.

Se você não solicitou, ignore esta mensagem.
```

### Regras
- OTP obrigatório para aceite (não pode pular)
- 6 dígitos numéricos (sem letras)
- TTL 10 minutos (DynamoDB TTL para limpeza automática)
- Máximo 3 tentativas por código
- Canal primário: WhatsApp (fallback em SIG-05)
- Telefone do cliente obtido do cadastro (CLIENTE#)
- Se cliente não tem telefone: erro + orientar a atualizar cadastro
- OTP verificado fica salvo no ACEITE_CONTRATO como prova

## Critérios de Aceite
- [ ] OTP de 6 dígitos gerado com crypto.randomInt
- [ ] Enviado via WhatsApp (template aprovado)
- [ ] TTL 10 minutos funcional
- [ ] Máximo 3 tentativas por código
- [ ] Rate limit: 1 por 60s, 5 por hora
- [ ] Aceite só prossegue com OTP verificado
- [ ] OTP verificado registrado no ACEITE_CONTRATO
- [ ] Telefone parcial retornado (privacidade)
- [ ] Erros claros: expirado, tentativas excedidas, incorreto

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SIG-02: Fluxo OTP Cliente.

1. Crie services/otpService.js: gerar, enviar, verificar OTP 6 dígitos.
2. Entidade OTP_CONTRATO no DynamoDB com TTL.
3. POST /public/contratos/:id/enviar-otp — gerar + enviar WhatsApp.
4. POST /public/contratos/:id/verificar-otp — validar código.
5. Altere aceitar.js: exigir OTP verificado antes do aceite.
6. Rate limit: 60s entre envios, 3 tentativas por código.
7. Registrar otp_verificado no ACEITE_CONTRATO.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
