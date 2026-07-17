# UX-03 — Onboarding / Wizard de Primeiro Uso (P1)

| Campo | Valor |
|-------|-------|
| **ID** | UX-03 |
| **Tipo** | Melhoria UX |
| **Título** | Criar wizard de onboarding para novos usuários |
| **Prioridade** | P1 |
| **Impacto** | Alto — define se o fotógrafo vai adotar ou abandonar |
| **Esforço** | Médio |

---

## Contexto

O sistema tem 16+ módulos no menu. Um fotógrafo abrindo pela primeira vez não sabe por onde começar. Sem orientação, ele olha, não entende o valor imediato, e fecha. A taxa de abandono de SaaS sem onboarding é 60-80% nos primeiros 7 dias.

Meta: fotógrafo enviar o primeiro orçamento em menos de 10 minutos após o cadastro.

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/pages/admin/Onboarding.jsx` — página do wizard
- `apps/frontend/src/components/onboarding/StepEmpresa.jsx` — step 1
- `apps/frontend/src/components/onboarding/StepCatalogo.jsx` — step 2
- `apps/frontend/src/components/onboarding/StepAgenda.jsx` — step 3
- `apps/frontend/src/components/onboarding/StepCliente.jsx` — step 4
- `apps/frontend/src/components/onboarding/StepConclusao.jsx` — step 5
- `apps/frontend/src/components/onboarding/OnboardingProgress.jsx` — barra de progresso
- `apps/frontend/src/components/OnboardingChecklist.jsx` — refatorar existente

### Arquivos a ALTERAR
- `apps/frontend/src/App.js` — rota /admin/onboarding + redirect condicional
- `apps/frontend/src/components/Layout.jsx` — exibir checklist persistente

---

## Spec Técnica

### Fluxo de Ativação

1. Primeiro login detectado (flag `onboarding_completed: false` no DynamoDB)
2. Redireciona para `/admin/onboarding`
3. Wizard de 5 passos (pode pular qualquer um)
4. Ao concluir: flag `onboarding_completed: true`, redireciona para Dashboard
5. Checklist permanece visível no dashboard até todos os itens estarem completos

### Step 1 — Sua Empresa (StepEmpresa.jsx)
- Campos mínimos: Nome Fantasia, WhatsApp, Cidade
- Upload de logo (opcional, pode pular)
- Copy: "Em 5 minutos seu sistema estará funcionando. Vamos lá?"
- CTA: "Próximo"

### Step 2 — Seu Primeiro Serviço (StepCatalogo.jsx)
- Templates pré-prontos para escolher (NÃO criar do zero):
  - Ensaio (Casal / Gestante / Família / Newborn / 15 Anos)
  - Casamento (Completo / Parcial / Civil)
  - Corporativo (Evento / Retrato / Produto)
  - Aniversário
- Fotógrafo seleciona 1+, cada template vem com:
  - Nome, descrição, itens inclusos, faixa de preço sugerida
  - Fotógrafo edita preço e descrição (campos pré-preenchidos)
- Copy: "Escolha o que você fotografa. Pode ajustar tudo depois."
- CTA: "Próximo" / "Pular por enquanto"

### Step 3 — Sua Agenda (StepAgenda.jsx)
- Opção 1: Conectar Google Calendar (OAuth — se já implementado)
- Opção 2: Criar primeiro evento manualmente (data, tipo, cliente placeholder)
- Opção 3: "Vou configurar depois"
- Copy: "Nunca mais esqueça um evento."

### Step 4 — Seu Primeiro Cliente (StepCliente.jsx)
- Formulário simplificado: Nome, WhatsApp, Tipo de evento interessado
- Copy: "Cadastre aquele lead que entrou em contato recentemente."
- Opção: "Pular — vou cadastrar quando chegar o primeiro contato"

### Step 5 — Pronto! (StepConclusao.jsx)
- Animação de celebração (confetti ou check animado)
- Resumo do que foi configurado
- 3 ações sugeridas:
  - "Enviar meu primeiro orçamento" — navega para Orçamentos
  - "Explorar o sistema" — navega para Dashboard
  - "Convidar meu assistente" — convite de usuário
- Copy: "Seu sistema está pronto. Quando quiser ajustar algo, vá em Configurações."

### Barra de Progresso (OnboardingProgress.jsx)
- 5 dots/steps no topo com label
- Step atual highlighted
- Animação suave entre steps
- Botão "Voltar" em todos (exceto step 1)
- Botão "Pular tudo" (link sutil no footer)

### Checklist Persistente (OnboardingChecklist.jsx)
- Card no Dashboard (até 100% completo)
- Itens:
  - Completar dados da empresa
  - Cadastrar primeiro serviço no catálogo
  - Cadastrar primeiro cliente
  - Enviar primeiro orçamento
  - Configurar WhatsApp
  - Subir primeiro álbum
- Cada item é link para a tela correspondente
- Barra de progresso: "4 de 6 concluídos"
- Botão "Dispensar" (oculta permanentemente)

### API (mínimo necessário)
- `GET /api/admin/onboarding/status` — retorna { completed: bool, steps: {} }
- `PATCH /api/admin/onboarding/complete` — marca como concluído
- Templates de catálogo: dados estáticos no frontend (JSON local)

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/` — backend (exceto 2 endpoints mínimos acima se não existirem)
- `template.yaml`, `infra/`
- Outras pages existentes
- OAuth Google Calendar (referência futura)

---

## Critérios de Aceite
1. Primeiro login redireciona para /admin/onboarding
2. Wizard funciona em 5 steps com navegação back/next/skip
3. Templates de serviço pré-prontos aparecem no step 2
4. Pular qualquer step não bloqueia o fluxo
5. Ao concluir, flag é marcada e redireciona para Dashboard
6. Checklist aparece no Dashboard até 100%
7. Segundo login NÃO redireciona mais para onboarding
8. Mobile-friendly (steps em full-screen, botões grandes)

---

## Prompt Pronto para o Kiro CLI

```
Implemente a UX-03 conforme docs/specs/UX-03-onboarding-wizard.md.

Crie wizard de onboarding em 5 steps para novos usuários.
Inclua templates pré-prontos de serviços fotográficos (dados estáticos JSON).
Refatore OnboardingChecklist.jsx para persistir no dashboard.
Redirecione primeiro login para /admin/onboarding.

Arquivos a criar:
- apps/frontend/src/pages/admin/Onboarding.jsx
- apps/frontend/src/components/onboarding/StepEmpresa.jsx
- apps/frontend/src/components/onboarding/StepCatalogo.jsx
- apps/frontend/src/components/onboarding/StepAgenda.jsx
- apps/frontend/src/components/onboarding/StepCliente.jsx
- apps/frontend/src/components/onboarding/StepConclusao.jsx
- apps/frontend/src/components/onboarding/OnboardingProgress.jsx

Arquivos a alterar:
- apps/frontend/src/App.js
- apps/frontend/src/components/Layout.jsx
- apps/frontend/src/components/OnboardingChecklist.jsx

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
