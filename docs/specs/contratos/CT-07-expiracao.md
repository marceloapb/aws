# CT-07: Expiração / Prazo Parametrizável

## Metadados
- **ID:** CT-07
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** CT-05

## Contexto
O contrato tem prazo para assinatura (default 7 dias, configurável por modelo). Após expirar, o status muda para 'expirado' e o cliente não pode mais aceitar. Admin pode re-enviar (gera novo prazo).

## Escopo
- `apps/backend/src/handlers/contratos/expirar.js` — NOVO
- EventBridge: cron diário para verificar expiração

## Fora de Escopo (NÃO TOCAR)
- Aceite (CT-05)
- Follow-up (CT-09)
- Geração (CT-03)

## Spec Técnica

### Cron Diário
```js
async function verificarContratoExpirados() {
  const agora = new Date().toISOString()
  // Query: status='pendente' AND expira_em < agora
  const expirados = await queryContratosExpirados(agora)
  
  for (const contrato of expirados) {
    await atualizarContrato(contrato.id, { status: 'expirado' })
    await emitirEvento('contrato.expirado', {
      tenant_id: contrato.tenant_id,
      contrato_id: contrato.id,
      cliente_id: contrato.cliente_id
    })
  }
}
```

### Re-enviar Contrato
```
POST /admin/contratos/:id/reenviar
→ Gera novo prazo (expira_em = agora + prazo_dias)
→ Status volta para 'pendente'
→ Gera novo link (token renovado)
→ Emite evento 'contrato.reenviado'
```

### Configuração
| Param | Default | Onde |
|---|---|---|
| prazo_assinatura_dias | 7 | MODELO_CONTRATO |
| prazo_maximo_dias | 30 | CONFIG TENANT |
| permitir_reenvio | true | CONFIG TENANT |

### Frontend (na Central de Contratos)
- Badge amarelo: "Expira em 2 dias"
- Badge vermelho: "Expirado"
- Botão "Reenviar" (se permitido)

## Critérios de Aceite
- [ ] Cron diário verifica expiração
- [ ] Status muda para 'expirado'
- [ ] Evento emitido
- [ ] Reenviar funciona (novo prazo + link)
- [ ] Prazo configurável por modelo
- [ ] Não pode aceitar contrato expirado

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CT-07: Expiração de Contrato.

1. Crie handlers/contratos/expirar.js: cron diário.
2. Query contratos pendentes com expira_em < now.
3. Mudar status para 'expirado', emitir evento.
4. Rota POST /admin/contratos/{id}/reenviar: novo prazo + link.
5. SAM: EventBridge schedule diário + rota.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
