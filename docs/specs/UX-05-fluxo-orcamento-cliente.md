# UX-05 — Fluxo de Orçamento do Cliente — Feedback de Progresso (P1)

| Campo | Valor |
|-------|-------|
| **ID** | UX-05 |
| **Tipo** | Correção UX |
| **Título** | Adicionar feedback visual de progresso na jornada do cliente |
| **Prioridade** | P1 |
| **Impacto** | Alto — taxa de conversão de orçamentos |
| **Esforço** | Baixo |

---

## Contexto

O cliente solicita orçamento em 4 etapas (serviço, evento, adicionais, enviar) sem ver preço. Após enviar, fica em "limbo" sem saber quando terá resposta. Resultado: desiste e busca outro fotógrafo.

Clientes de fotografia são ansiosos (casamento, gestante) e comparam 3-5 fotógrafos simultaneamente. Quem responde primeiro com clareza fecha.

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/components/cliente/StepProgress.jsx` — barra de progresso de steps
- `apps/frontend/src/components/cliente/WaitingStatus.jsx` — tela de espera pós-envio
- `apps/frontend/src/components/cliente/MicroCopy.jsx` — textos motivacionais
- `apps/frontend/src/components/cliente/StatusTracker.jsx` — rastreador tipo iFood

### Arquivos a ALTERAR
- `apps/frontend/src/pages/cliente/MeusOrcamentos.jsx` — adicionar status tracker

---

## Spec Técnica

### Step Progress (StepProgress.jsx)
- Barra horizontal com 4 steps:
  1. "Escolha o serviço" (ícone câmera)
  2. "Conte sobre o evento" (ícone calendário)
  3. "Personalize" (ícone sparkles)
  4. "Enviar solicitação" (ícone send)
- Step atual: cor accent, ícone preenchido, label bold
- Steps completos: check verde
- Steps futuros: cinza, ícone outline
- Animação de transição entre steps (slide + fade)
- Mobile: text truncado, mostra apenas ícones + step atual com texto

### Micro-Copy Motivacional (MicroCopy.jsx)
Textos que aparecem abaixo da progress bar em cada step:
- Step 1: "Perfeito! Vamos encontrar o melhor pacote para você."
- Step 2: "Legal! Com esses detalhes vou preparar algo especial."
- Step 3: "Quase lá! Personalize do seu jeito."
- Step 4: "Pronto! Sua solicitação será analisada com carinho."

Regras:
- Tom: acolhedor, pessoal, como se o fotógrafo estivesse falando
- Personalizável nas configurações (SPEC-37)
- Animação: fade-in ao entrar no step

### Tela de Espera Pós-Envio (WaitingStatus.jsx)
Após enviar a solicitação:
- Animação de sucesso (check animado, confetti sutil)
- Texto principal: "Recebemos sua solicitação!"
- Texto secundário: "Você receberá uma proposta personalizada em até {{prazo}} horas via WhatsApp."
  - {{prazo}} vem das configurações (prazo de resposta a leads)
- O que acontece agora (timeline):
  1. Solicitação recebida (agora) - check
  2. Fotógrafo analisando seu evento (em breve) - circle
  3. Proposta personalizada no seu WhatsApp - circle
- CTA: "Adicionar ao contato" (vCard download do fotógrafo)
- CTA secundário: "Tem urgência? Fale comigo no WhatsApp" (link direto)

### Status Tracker (StatusTracker.jsx)
Na Central do Cliente (MeusOrcamentos.jsx), cada orçamento mostra:
- Timeline vertical tipo rastreamento:
  - Solicitação enviada — DD/MM às HH:MM (check)
  - Fotógrafo visualizou — DD/MM às HH:MM (se lido) (check)
  - Proposta em preparação (se status = analisando) (circle pulsante)
  - Proposta enviada — DD/MM (se status = enviado) (check)
  - Aguardando sua decisão (se status = enviado) (circle)
- Cores: verde para concluído, azul pulsante para etapa atual, cinza para futuro
- Se orçamento respondido:
  - Exibe valor total em destaque
  - Botões: "Aceitar proposta" / "Tenho dúvidas" / "Recusar"
  - Validade: "Válida até DD/MM" com countdown se < 3 dias

### Animações e Feedback
- Transição entre steps: 300ms ease, slide horizontal
- Ao completar cada step: micro-animação de check (200ms)
- Ao enviar: loading, check, confetti (sequência 1.5s)
- Hover/tap em step completo: mostra resumo do que preencheu

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/` — backend
- `template.yaml`, `infra/`
- Lógica de envio de orçamento (já existe)
- Telas admin

---

## Critérios de Aceite
1. Progress bar com 4 steps aparece na solicitação de orçamento
2. Micro-copy muda em cada step
3. Tela pós-envio exibe prazo de resposta das configurações
4. Status tracker na Central mostra timeline do orçamento
5. Countdown de validade aparece quando < 3 dias
6. Animações funcionam sem lag em mobile
7. "Fale no WhatsApp" abre conversa com número do fotógrafo

---

## Prompt Pronto para o Kiro CLI

```
Implemente a UX-05 conforme docs/specs/UX-05-fluxo-orcamento-cliente.md.

Crie componentes de feedback visual para a jornada do cliente:
1. StepProgress.jsx — barra de 4 steps com animação
2. MicroCopy.jsx — textos motivacionais por step
3. WaitingStatus.jsx — tela pós-envio com timeline
4. StatusTracker.jsx — rastreador tipo iFood em MeusOrcamentos

Arquivos a criar:
- apps/frontend/src/components/cliente/StepProgress.jsx
- apps/frontend/src/components/cliente/WaitingStatus.jsx
- apps/frontend/src/components/cliente/MicroCopy.jsx
- apps/frontend/src/components/cliente/StatusTracker.jsx

Arquivos a alterar:
- apps/frontend/src/pages/cliente/MeusOrcamentos.jsx

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
