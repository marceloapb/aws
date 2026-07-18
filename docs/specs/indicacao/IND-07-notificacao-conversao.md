# IND-07 — Notificação ao Indicador na Conversão

**ID:** IND-07  
**TIPO:** Feature  
**PRIORIDADE:** P2  
**IMPACTO:** Médio | **ESFORÇO:** Baixo  

---

## Contexto

Quando a indicação é confirmada, o indicador deve ser notificado (motivação para indicar mais). O sistema usa WhatsApp Cloud API (§29) e SES. Sem notificação, o indicador só descobre o novo % se entrar na Central.

---

## Escopo

- `src/handlers/indicacoes/confirmarIndicacao.mjs` (adicionar dispatch de notificação)
- `src/handlers/notificacoes/` (reutilizar dispatcher existente)

## Fora de Escopo (NÃO TOCAR)

- Templates de WhatsApp no Meta Business (criação manual).
- Handler de cadastro.
- Config do SES.

---

## Spec Técnica

### Após confirmação bem-sucedida no confirmarIndicacao.mjs

1. Buscar dados do indicador (nome, whatsapp).
2. Enviar mensagem via SQS para fila de notificações (padrão existente no projeto):

```json
{
  "tipo": "indicacao_confirmada",
  "destinatario_id": "<indicador_id>",
  "canal": "whatsapp",
  "dados": {
    "nome_indicado": "<nome>",
    "novo_percentual": "<desconto_indicacao_acumulado atualizado>",
    "total_indicacoes": "<count>"
  }
}
```

3. O dispatcher de notificações (já existente) consome a fila e formata a mensagem.

### Template sugerido (WhatsApp)

> "🎉 Boa, {{nome_indicador}}! {{nome_indicado}} fechou contrato e sua indicação foi confirmada. Seu desconto agora é de {{novo_percentual}}%. Continue indicando!"

---

## Critérios de Aceite

1. Indicador recebe WhatsApp quando indicação confirma.
2. Mensagem inclui nome do indicado e novo %.
3. Falha na notificação NÃO impede a confirmação (fire-and-forget via SQS).

---

## Prompt para o Kiro

```
No handler `src/handlers/indicacoes/confirmarIndicacao.mjs`, após atualização
bem-sucedida do status e incremento, envie mensagem SQS para a fila de notificações
com tipo="indicacao_confirmada", contendo indicador_id, nome_indicado, novo_percentual.
Use o SQS client já configurado no projeto. Falha no envio deve ser logada mas não
deve lançar exceção. Altere SOMENTE este handler.
```
