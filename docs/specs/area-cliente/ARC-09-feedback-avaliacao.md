# ARC-09 — Feedback (Avaliação + Autorização)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | ARC-09 |
| **Tipo** | Feature |
| **Prioridade** | P2 |
| **Impacto** | Médio — fecha ciclo, alimenta depoimentos do site |
| **Esforço** | Baixo |

## Contexto
Após evento concluído, o cliente é convidado a avaliar (1-5 estrelas + comentário). Double-gate: (1) autoriza publicação do nome, (2) fotógrafo marca como depoimento. Aqui o cliente faz a parte dele: avalia + decide se autoriza.

## Escopo
- **Frontend:** `FeedbackPage.jsx` (aba no EventoDetalhe, visível só pós-evento)
- **Lambda:** `getFeedbackCliente` — retorna feedback existente ou formulário
- **Lambda:** `enviarFeedback` — salva avaliação + autorização
- **API Gateway:** `GET /cliente/eventos/:id/feedback`, `POST /cliente/eventos/:id/feedback`

## Fora de Escopo (NÃO TOCAR)
- Curadoria de depoimentos pelo admin (§12)
- Exibição no site público (STP-03 consome depoimentos)
- Follow-up para pedir avaliação (FLW-*)
- Edição após envio (decisão: feedback é imutável)

## Spec Técnica

### Lambda enviarFeedback
- Auth: JWT cliente
- Body:
```json
{
  "estrelas": 5,
  "comentario": "Trabalho incrível! Superou expectativas.",
  "autoriza_publico": true
}
```
- Valida: estrelas 1-5, comentário max 1000 chars, autoriza boolean
- Idempotente: se já enviou, retorna 409 "Feedback já registrado"
- Salva no DynamoDB com `marcado_depoimento: false` (admin decide depois)

### Lambda getFeedbackCliente
- Se evento não concluído → retorna `{ disponivel: false, motivo: "evento_em_andamento" }`
- Se já enviado → retorna feedback existente (read-only)
- Se disponível → retorna `{ disponivel: true, ja_enviado: false }`

### Estrutura da Página
```
<FeedbackPage>
  <Indisponivel> (se evento não concluído)
    - "A avaliação será liberada após a conclusão do evento."
  </Indisponivel>
  <Formulario> (se disponível e não enviado)
    - Estrelas: 1-5 clicáveis (visual dourado)
    - Textarea: "Conte como foi sua experiência" (max 1000)
    - Checkbox: "Autorizo a publicação no site (com primeiro nome)"
    - Botão "Enviar Avaliação"
  </Formulario>
  <FeedbackEnviado> (se já enviou)
    - Mostra estrelas + comentário + data
    - "Obrigado pela sua avaliação! ❤️"
    - Informa se autorizou publicação
  </FeedbackEnviado>
</FeedbackPage>
```

## Critérios de Aceite
- Feedback só disponível após evento concluído
- Estrelas obrigatórias (1-5), comentário opcional
- Autorização de publicação é checkbox explícito
- Após envio, não pode editar (imutável)
- Feedback duplicado → 409, frontend mostra o existente
- Evento em andamento → mensagem informativa sem formulário

## Prompt Pronto para o Kiro CLI
```
Implemente a spec ARC-09 (Feedback — Avaliação + Autorização).

Crie:
1. src/functions/cliente/getFeedbackCliente/index.mjs — verifica disponibilidade + retorna feedback
2. src/functions/cliente/enviarFeedback/index.mjs — salva avaliação (idempotente, imutável)
3. Rotas GET e POST /cliente/eventos/:id/feedback no template.yaml
4. src/pages/cliente/FeedbackPage.jsx — estrelas + comentário + autorização + estados

Estrelas 1-5, comentário max 1000, autoriza_publico boolean.
Imutável após envio (409 se duplicado). marcado_depoimento=false (admin decide).
Disponível APENAS pós-evento concluído.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
