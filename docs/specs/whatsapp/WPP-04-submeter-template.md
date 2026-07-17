# WPP-04: Submeter Template à Meta (Cloud API)

## Metadados
- **ID:** WPP-04
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** WPP-03

## Contexto
Após criar o template localmente (rascunho), o admin submete à Meta para aprovação. A Lambda chama a Cloud API, registra o meta_template_id e acompanha o status.

## Escopo
- `apps/backend/src/handlers/whatsapp/submeterTemplate.js` — NOVO
- API: POST /admin/whatsapp/templates/:id/submeter

## Fora de Escopo (NÃO TOCAR)
- CRUD local (WPP-03 — já feito)
- Envio de mensagem (WPP-06)
- Webhook de status (tratado em WPP-05)

## Spec Técnica

### API — POST /admin/whatsapp/templates/:id/submeter
```json
{
  "sucesso": true,
  "meta_template_id": "123456789",
  "status": "PENDING"
}
```

### Fluxo
```
1. Buscar template local (status=rascunho ou rejeitado)
2. Buscar credenciais SSM (token + waba_id)
3. Montar payload conforme spec da Meta
4. POST https://graph.facebook.com/v21.0/{waba_id}/message_templates
5. Se 200: salvar meta_template_id, status='pendente'
6. Se erro: salvar motivo, manter status='rascunho'
```

### Payload Meta
```json
{
  "name": "orcamento_enviado",
  "language": "pt_BR",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "📸 Seu orçamento está pronto!"
    },
    {
      "type": "BODY",
      "text": "Olá {{1}}, seu orçamento para {{2}} está pronto! Acesse: {{3}}",
      "example": { "body_text": [["Ana", "Casamento", "https://link.com"]] }
    },
    {
      "type": "FOOTER",
      "text": "Studio MBF • Responda para falar conosco"
    },
    {
      "type": "BUTTONS",
      "buttons": [{ "type": "URL", "text": "Ver Orçamento", "url": "https://{{1}}" }]
    }
  ]
}
```

### Regras
- Só submeter se status='rascunho' ou 'rejeitado'
- Se já aprovado: erro "Template já aprovado"
- Se pendente: erro "Aguardando aprovação da Meta"
- Nome do template: lowercase, underscores, sem espaços
- Exemplos obrigatórios para variáveis (Meta exige)

## Critérios de Aceite
- [ ] Submeter template à Meta via Cloud API
- [ ] meta_template_id salvo
- [ ] Status muda para 'pendente'
- [ ] Erro tratado (token inválido, nome duplicado)
- [ ] Só submete rascunho ou rejeitado
- [ ] Payload correto com examples

## Prompt Pronto para o Kiro CLI

```
Implemente a spec WPP-04: Submeter Template à Meta.

1. Crie handlers/whatsapp/submeterTemplate.js: montar payload, POST Cloud API.
2. Salvar meta_template_id e status='pendente'.
3. Validar: só rascunho/rejeitado pode submeter.
4. Examples obrigatórios nas variáveis.
5. SAM: rota POST /admin/whatsapp/templates/{id}/submeter.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
