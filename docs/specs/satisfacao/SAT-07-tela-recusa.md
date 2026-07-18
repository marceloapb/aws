# SAT-07: Pesquisa de Recusa — Tela Pública (Motivos)

## Metadados
- **ID:** SAT-07
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** SAT-06

## Contexto
Tela pública onde o cliente informa por que recusou o orçamento. Motivos pré-definidos (checkbox múltiplo) + campo aberto. Rápido de responder (< 30 segundos).

## Escopo
- `apps/backend/src/handlers/satisfacao/responderRecusa.js` — NOVO
- `apps/frontend/src/pages/public/PesquisaRecusa.jsx` — NOVO
- API: GET /public/pesquisa-recusa/:id, POST /public/pesquisa-recusa/:id/responder

## Fora de Escopo (NÃO TOCAR)
- Disparo (SAT-06)
- Dashboard (SAT-08)
- Feedback pós-entrega (SAT-02/03)

## Spec Técnica

### API — GET /public/pesquisa-recusa/:id?token=xxx
```json
{
  "pesquisa_id": "pr_001",
  "fotografo": {
    "nome": "Marcelo APB Fotografia",
    "logo_url": "https://..."
  },
  "cliente_nome": "João",
  "tipo_evento": "Aniversário",
  "ja_respondido": false,
  "motivos_disponiveis": [
    { "codigo": "preco", "label": "Preço acima do esperado" },
    { "codigo": "prazo_entrega", "label": "Prazo de entrega longo" },
    { "codigo": "disponibilidade", "label": "Fotógrafo indisponível na data" },
    { "codigo": "outro_profissional", "label": "Escolhi outro profissional" },
    { "codigo": "desistiu_evento", "label": "Desisti/adiei o evento" },
    { "codigo": "atendimento", "label": "Não me senti bem atendido" },
    { "codigo": "portfolio", "label": "Estilo não combinou comigo" },
    { "codigo": "outro", "label": "Outro motivo" }
  ]
}
```

### API — POST /public/pesquisa-recusa/:id/responder
```json
// Input
{
  "token": "xxx",
  "motivos_selecionados": ["preco", "prazo_entrega"],
  "motivo_principal": "preco",
  "comentario_aberto": "Achei o valor acima do que esperava para esse tipo de evento"
}

// Response
{
  "sucesso": true,
  "mensagem": "Obrigado pelo feedback! Sua opinião nos ajuda a melhorar."
}
```

### Frontend — PesquisaRecusa.jsx
- **Header:** Logo + "Podemos melhorar?"
- **Texto empático:** "Sentimos que não conseguimos atender sua necessidade desta vez. Sua opinião é muito importante para nós."
- **Motivos:** Checkboxes (múltipla escolha)
  - Ao selecionar, destacar em azul
  - Se selecionou > 1: perguntar "Qual foi o principal?"
- **Campo aberto:** Textarea (opcional)
  - Placeholder: "Quer nos contar mais? (opcional)"
- **Botão:** "Enviar Feedback"
- **Tela de agradecimento:** "Obrigado! Usaremos seu feedback para melhorar nossos serviços 💙"

### Design
- Mobile-first
- Resposta rápida (< 30s)
- Sem login
- Tom empático e não-agressivo
- Máximo 1 tela (sem scroll longo)

### Regras
- Ao menos 1 motivo obrigatório
- Motivo principal: obrigatório se > 1 selecionado
- Comentário: opcional (max 300 chars)
- Responder apenas 1 vez
- Token JWT validado
- Emitir evento 'pesquisa_recusa.respondida'

## Critérios de Aceite
- [ ] Checkboxes de motivos funcionam
- [ ] Motivo principal se > 1 selecionado
- [ ] Comentário opcional
- [ ] Token validado
- [ ] Responder apenas 1 vez
- [ ] Tela de agradecimento
- [ ] Mobile-first, < 30s para responder
- [ ] Evento emitido

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SAT-07: Tela Pesquisa de Recusa.

1. Crie handlers/satisfacao/responderRecusa.js: GET info + POST responder.
2. Crie pages/public/PesquisaRecusa.jsx: checkboxes + campo aberto.
3. Motivos pré-definidos (8 opções).
4. Motivo principal se > 1 selecionado.
5. Validar token, não duplicar resposta.
6. Emitir evento 'pesquisa_recusa.respondida'.
7. SAM: rotas públicas GET/POST.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
