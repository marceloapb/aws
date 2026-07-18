# SAT-03: Tela Pública de Avaliação (Cliente)

## Metadados
- **ID:** SAT-03
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** SAT-02

## Contexto
Tela pública (sem login) onde o cliente avalia o serviço: estrelas (1-5), comentário, e checkbox de autorização para exibição pública do depoimento.

## Escopo
- `apps/backend/src/handlers/satisfacao/responderFeedback.js` — NOVO
- `apps/frontend/src/pages/public/FeedbackForm.jsx` — NOVO
- API: GET /public/feedback/:id, POST /public/feedback/:id/responder

## Fora de Escopo (NÃO TOCAR)
- Disparo (SAT-02)
- Painel admin (SAT-04)
- Curadoria (SAT-05)

## Spec Técnica

### API — GET /public/feedback/:id?token=xxx
```json
{
  "feedback_id": "fb_001",
  "fotografo": {
    "nome": "Marcelo APB Fotografia",
    "logo_url": "https://..."
  },
  "cliente_nome": "Ana",
  "tipo_evento": "Casamento",
  "ja_respondido": false
}
```

### API — POST /public/feedback/:id/responder
```json
// Input
{
  "token": "xxx",
  "estrelas": 5,
  "comentario": "Fotos incríveis! Superou todas as expectativas. Recomendo demais!",
  "autoriza_publico": true,
  "nome_exibicao": "Ana C."
}

// Response
{
  "sucesso": true,
  "mensagem": "Obrigado pela sua avaliação! ⭐"
}
```

### Frontend — FeedbackForm.jsx
- **Header:** Logo do fotógrafo + "Como foi sua experiência?"
- **Estrelas:** 5 estrelas clicáveis (animação)
  - 1★ Péssimo, 2★ Ruim, 3★ Regular, 4★ Bom, 5★ Excelente
- **Comentário:** Textarea (opcional, max 500 chars)
  - Placeholder dinâmico baseado nas estrelas:
    - 5★: "O que mais te encantou?"
    - 4★: "O que poderia ser ainda melhor?"
    - 1-3★: "O que podemos melhorar?"
- **Autorização LGPD:** Checkbox "Autorizo exibir minha avaliação publicamente"
  - Se marcado: input "Nome para exibição" (sugestão: primeiro nome + inicial)
- **Botão:** "Enviar Avaliação"
- **Tela de agradecimento:** "Obrigado, {nome}! Sua opinião é muito importante 💛"

### Validações
- Estrelas: obrigatório (1-5)
- Comentário: opcional, max 500 chars
- Se autoriza_publico: nome_exibicao obrigatório
- Token: validar JWT

### Estados
| Estado | Tela |
|---|---|
| Pendente | Formulário normal |
| Já respondido | "Você já enviou sua avaliação. Obrigado!" |
| Expirado | "Este link não está mais disponível" |

### Regras
- Sem login (rota pública)
- Responder apenas 1 vez
- LGPD: consentimento explícito para exibição pública
- Responsivo (mobile-first)

## Critérios de Aceite
- [ ] Estrelas clicáveis (1-5)
- [ ] Comentário opcional (max 500)
- [ ] Checkbox autorização LGPD
- [ ] Nome de exibição se autorizar
- [ ] Token validado
- [ ] Responder apenas 1 vez
- [ ] Tela de agradecimento
- [ ] Responsivo

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SAT-03: Tela Pública de Avaliação.

1. Crie handlers/satisfacao/responderFeedback.js: GET info + POST responder.
2. Crie pages/public/FeedbackForm.jsx: estrelas, comentário, LGPD.
3. Validar token JWT.
4. Estrelas obrigatórias, comentário opcional.
5. Checkbox autorização + nome_exibicao.
6. Não permitir responder 2x.
7. SAM: rotas públicas GET/POST.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
