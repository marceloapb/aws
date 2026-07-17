# CT-08: Notificações (Gerado + Assinado)

## Metadados
- **ID:** CT-08
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** CT-05

## Contexto
Notificar as partes em eventos-chave do contrato: (1) contrato gerado → cliente recebe link, (2) contrato assinado → admin notificado + cliente recebe cópia PDF.

## Escopo
- `apps/backend/src/handlers/contratos/notificar.js` — NOVO
- Consome eventos: 'contrato.gerado', 'contrato.assinado', 'contrato.pdf_gerado'

## Fora de Escopo (NÃO TOCAR)
- Follow-up automático (CT-09)
- WhatsApp (WPP-* — se integrado, consome os mesmos eventos)
- PDF (CT-06)

## Spec Técnica

### Eventos → Notificações
| Evento | Para | Canal | Conteúdo |
|---|---|---|---|
| contrato.gerado | Cliente | Email + WhatsApp | Link para assinar |
| contrato.gerado | Admin | In-app | "Contrato enviado para Ana" |
| contrato.assinado | Admin | Email + WhatsApp + In-app | "Ana assinou o contrato!" |
| contrato.pdf_gerado | Cliente | Email | PDF anexo |
| contrato.expirado | Admin | In-app | "Contrato expirou" |

### Email — Contrato Gerado (para cliente)
```
Assunto: Seu contrato está pronto para assinatura — {nome_fotografo}
Corpo:
  Olá {nome_cliente},
  
  Seu contrato para {tipo_evento} está pronto!
  Clique no link abaixo para visualizar e assinar:
  
  [Assinar Contrato]({link_contrato})
  
  Prazo para assinatura: {prazo_dias} dias ({data_expiracao})
  
  Dúvidas? Responda este email.
  
  {nome_fotografo}
```

### Email — Contrato Assinado (PDF para cliente)
```
Assunto: ✅ Contrato assinado — cópia em anexo
Corpo:
  Olá {nome_cliente},
  
  Seu contrato foi assinado com sucesso em {data_aceite}!
  Em anexo está sua cópia em PDF.
  
  Próximos passos:
  - Aguarde confirmação do pagamento
  - Entraremos em contato sobre os detalhes do evento
  
  {nome_fotografo}
  
Anexo: contrato_{id}.pdf
```

### WhatsApp (se WPP configurado)
- Contrato gerado: template 'contrato_pronto' com link
- Contrato assinado: texto livre (janela aberta pelo evento)

### Regras
- Email via SES
- WhatsApp opcional (só se módulo WPP configurado)
- Rate limit: não enviar mais de 1 notificação/minuto por cliente
- Se email falha: log + retry

## Critérios de Aceite
- [ ] Email enviado ao cliente (contrato gerado)
- [ ] Email enviado ao cliente (PDF pós-aceite)
- [ ] Admin notificado (in-app + email)
- [ ] WhatsApp se configurado
- [ ] Rate limit respeitado
- [ ] Eventos consumidos corretamente

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CT-08: Notificações de Contrato.

1. Crie handlers/contratos/notificar.js: consumir eventos.
2. Email SES: contrato gerado (link), contrato assinado (PDF).
3. Notificação in-app para admin.
4. WhatsApp se módulo configurado.
5. SAM: triggers EventBridge para os 3 eventos.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
