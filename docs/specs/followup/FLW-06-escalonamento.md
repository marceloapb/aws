# FLW-06: Escalonamento de Canal (email → WhatsApp por tentativa)

## Metadados
- **ID:** FLW-06
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** FLW-04, FLW-05

## Contexto
Se o canal da tentativa falha (email sem abertura, bounce), o motor pode escalonar automaticamente para o próximo canal disponível. Lógica: email falhou → tenta WhatsApp na mesma tentativa (se telefone disponível).

## Escopo
- `apps/backend/src/handlers/followup/escalonamento.js` — NOVO
- Modifica lógica de registro de DISPARO

## Fora de Escopo (NÃO TOCAR)
- Motor de varredura (FLW-03)
- Disparo email (FLW-04)
- Disparo WhatsApp (FLW-05)
- Teto (FLW-07)

## Spec Técnica

### Regras de Escalonamento
| Situação | Ação |
|---|---|
| Email enviado + bounce | Escalonar para WhatsApp |
| Email sem abertura em 24h | Escalonar para WhatsApp na próxima tentativa |
| WhatsApp falhou (sem telefone) | Tentar email |
| Ambos canais falharam | Marcar tentativa como falha total |

### Lógica
```js
async function verificarEscalonamento(tenantId, gatilhoId) {
  const gatilho = await getGatilho(tenantId, gatilhoId)
  const ultimoDisparo = await getUltimoDisparo(gatilhoId)
  
  if (!ultimoDisparo) return null
  
  // Se último disparo foi email e falhou
  if (ultimoDisparo.canal === 'email' && ultimoDisparo.status === 'falha') {
    // Verificar se cliente tem telefone
    const cliente = await getCliente(tenantId, gatilho.cliente_id)
    if (cliente?.telefone) {
      return {
        escalonar: true,
        novo_canal: 'whatsapp',
        motivo: 'email_falhou'
      }
    }
  }
  
  // Se último disparo foi whatsapp e falhou (sem telefone)
  if (ultimoDisparo.canal === 'whatsapp' && ultimoDisparo.status === 'falha') {
    if (ultimoDisparo.erro === 'telefone_nao_encontrado') {
      const cliente = await getCliente(tenantId, gatilho.cliente_id)
      if (cliente?.email) {
        return {
          escalonar: true,
          novo_canal: 'email',
          motivo: 'whatsapp_sem_telefone'
        }
      }
    }
  }
  
  return { escalonar: false }
}
```

### Integração com Motor (FLW-03)
```js
// No motor de varredura, antes de enviar para fila:
async function decidirCanal(tenantId, gatilho, tentativaConfig) {
  // Verificar se precisa escalonar
  const escalonamento = await verificarEscalonamento(tenantId, gatilho.id)
  
  if (escalonamento?.escalonar) {
    return escalonamento.novo_canal
  }
  
  // Canal padrão da régua
  return tentativaConfig.canal
}
```

### Registro de Escalonamento
```json
{
  "PK": "GATILHO#gat_001",
  "SK": "DISPARO#2#2026-07-20T09:00:00Z",
  "tentativa": 2,
  "canal": "whatsapp",
  "canal_original": "email",
  "escalonado": true,
  "motivo_escalonamento": "email_falhou",
  "status": "enviado"
}
```

### Regras
- Escalonamento só acontece se canal alternativo disponível
- Não conta como nova tentativa (é retry do mesmo step)
- Máximo 1 escalonamento por tentativa
- Registrar motivo e canal original
- Se ambos falharam: marcar tentativa como falha

## Critérios de Aceite
- [ ] Email falhou → tenta WhatsApp
- [ ] WhatsApp falhou → tenta email
- [ ] Não conta como nova tentativa
- [ ] Máximo 1 escalonamento por tentativa
- [ ] Registra canal_original e motivo
- [ ] Se ambos falharam: falha total

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FLW-06: Escalonamento de Canal.

1. Crie handlers/followup/escalonamento.js: verificarEscalonamento().
2. Se email falhou e tem telefone: escalonar para WhatsApp.
3. Se WhatsApp falhou e tem email: escalonar para email.
4. Não contar como nova tentativa.
5. Registrar canal_original + motivo no DISPARO.
6. Máximo 1 escalonamento por tentativa.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
