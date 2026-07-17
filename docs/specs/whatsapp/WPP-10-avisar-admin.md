# WPP-10: Avisar Admin no Número Pessoal

## Metadados
- **ID:** WPP-10
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** WPP-06

## Contexto
O sistema envia avisos relevantes no WhatsApp pessoal do admin (número_admin configurado em WPP-01). Exemplos: novo orçamento aceito, pagamento confirmado, cliente respondeu. Usa o mesmo adapter de envio com template específico.

## Escopo
- `apps/backend/src/handlers/whatsapp/avisarAdmin.js` — NOVO
- Template interno: aviso_admin

## Fora de Escopo (NÃO TOCAR)
- Conversas com clientes (WPP-06/07)
- Webhook (WPP-11)
- Configuração (WPP-02)

## Spec Técnica

### Avisos ao Admin
| Evento | Mensagem |
|---|---|
| orcamento_aceito | "🎉 Ana Silva aceitou o orçamento 'Casamento' (R$ 4.500)" |
| pagamento_recebido | "💰 Pagamento de R$ 1.500 confirmado - Ana Silva (1/3)" |
| cliente_respondeu | "💬 Ana Silva respondeu no WhatsApp: '{preview}'" |
| album_expirado | "⚠️ Álbum de Ana Silva expira em 3 dias" |
| nova_mensagem_site | "📩 Nova mensagem do site: João (casamento)" |

### Fluxo
```js
async function avisarAdmin(tenantId, evento, dados) {
  const conta = await getContaWhatsApp(tenantId)
  if (!conta.numero_admin || !conta.ativo) return // silencioso se não configurado
  
  await enviarTemplate(conta.numero_admin, 'aviso_admin', {
    "1": formatarAviso(evento, dados)
  })
}
```

### Regras
- Avisos são OPCIONAIS (admin configura quais quer em WPP-02)
- Se número admin não configurado: silencioso (não quebra)
- Rate limit: max 10 avisos/hora para o admin (evitar spam)
- Agrupamento: se vários eventos em 5min, agrupar em 1 mensagem

### Template Genérico
```
Nome: aviso_admin
Categoria: utility
Corpo: "📋 *Notificação MBF*\n\n{{1}}\n\n_Gerado automaticamente_"
```

## Critérios de Aceite
- [ ] Aviso enviado ao número admin
- [ ] Silencioso se não configurado
- [ ] Rate limit 10/hora
- [ ] Template genérico de aviso
- [ ] Eventos mapeados corretamente
- [ ] Configuração de quais avisos quer

## Prompt Pronto para o Kiro CLI

```
Implemente a spec WPP-10: Avisar Admin no WhatsApp.

1. Crie handlers/whatsapp/avisarAdmin.js: função de aviso.
2. Template genérico 'aviso_admin'.
3. Silencioso se número não configurado.
4. Rate limit: max 10/hora.
5. Eventos: aceite, pagamento, resposta, expiração.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
