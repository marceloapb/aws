# SPEC-53 — Expandir Central do Cliente (P1)

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-53 |
| **Tipo** | Feature |
| **Título** | Expandir e completar a Central do Cliente |
| **Prioridade** | P1 |
| **Impacto** | Alto — experiência do cliente final, diferencial competitivo |
| **Esforço** | Alto (ref: 32.5KB protótipo, atualmente 10.8KB = 33%) |

---

## Contexto

A Central do Cliente é a área onde o cliente final (contratante do fotógrafo) acessa seus dados: orçamentos, contratos, álbuns, pagamentos, feedbacks e aditivos.

Hoje existem apenas 3 telas básicas:
- `MeusAlbuns.jsx` (5.0KB)
- `MeusContratos.jsx` (3.0KB)
- `MeusOrcamentos.jsx` (2.7KB)

Faltam **4 telas** + **1 dashboard** que o backend já suporta:
- `client-pagamentos.js` → MeusPagamentos.jsx ❌
- `client-feedback.js` → MeuFeedback.jsx ❌
- `client-aditivos.js` → MeusAditivos.jsx ❌
- Dashboard consolidado → ClienteDashboard.jsx ❌

Protótipo ref: `docs/prototipos/central-cliente-prototipo.jsx` (32.5KB).

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/pages/cliente/ClienteDashboard.jsx` — home da central
- `apps/frontend/src/pages/cliente/MeusPagamentos.jsx` — parcelas e comprovantes
- `apps/frontend/src/pages/cliente/MeuFeedback.jsx` — deixar depoimento
- `apps/frontend/src/pages/cliente/MeusAditivos.jsx` — aceitar/recusar aditivos
- `apps/frontend/src/components/cliente/TimelineEvento.jsx` — timeline do job
- `apps/frontend/src/components/cliente/PagamentoCard.jsx` — card de parcela

### Arquivos a ALTERAR
- `apps/frontend/src/pages/cliente/MeusAlbuns.jsx` — expandir com download e seleção
- `apps/frontend/src/pages/cliente/MeusContratos.jsx` — expandir com aceite digital
- `apps/frontend/src/pages/cliente/MeusOrcamentos.jsx` — expandir com aceite/recusa
- `apps/frontend/src/App.js` — rotas cliente

---

## Spec Técnica

### Dashboard (ClienteDashboard.jsx)
Página inicial após login do cliente. Mostra resumo consolidado:

- **Saudação**: "Olá, {{nome}}! Aqui está o status do seu evento."
- **Card de Evento** (se houver job ativo):
  - Tipo do evento, data, local
  - Status geral (timeline visual): Orçamento → Contrato → Produção → Entrega
- **Alertas/Ações pendentes** (cards coloridos):
  - "Seu orçamento aguarda aprovação" → link
  - "Contrato disponível para assinatura" → link
  - "Parcela vence em 3 dias" → link
  - "Álbum disponível para visualização" → link
  - "Deixe seu feedback" → link
- **Acesso rápido**: Meus Orçamentos | Meus Contratos | Meus Álbuns | Pagamentos

### MeusPagamentos.jsx
- Lista de parcelas: Número, Valor, Vencimento, Status (pago/pendente/atrasado), Comprovante
- Total: pago / pendente / atrasado
- Para cada parcela pendente:
  - Botão "Pagar" → redireciona para link de pagamento do gateway
  - Ou exibe QR Code PIX inline
  - Ou botão "Enviar comprovante" (upload)
- Para cada parcela paga:
  - Exibe data do pagamento e comprovante (download)
- Resumo: Valor total do contrato, Total pago, Saldo restante

### MeuFeedback.jsx
- Se feedback pendente:
  - Formulário:
    - Nota (estrelas 1-5)
    - Depoimento (textarea, mín 50 caracteres)
    - O que mais gostou (tags opcionais: Atendimento, Pontualidade, Qualidade, Criatividade)
    - Upload de foto favorita (opcional)
    - Autorizar publicação no site (checkbox)
  - Botão "Enviar feedback"
- Se feedback já enviado:
  - Exibe o feedback com nota e texto (readonly)
  - Mensagem: "Obrigado pelo seu feedback! ❤️"
  - Se publicado: "Seu depoimento está no nosso site!"

### MeusAditivos.jsx
- Lista de aditivos pendentes e histórico
- Para cada aditivo pendente:
  - Resumo das alterações (comparativo antes/depois)
  - Impacto financeiro destacado
  - Botões: "Aceitar aditivo" / "Recusar" / "Tenho dúvidas" (envia msg ao fotógrafo)
- Para aditivos aceitos/recusados:
  - Status + data da ação
  - Link para contrato atualizado (se aceito)

### Expandir MeusAlbuns.jsx
Adicionar ao que já existe:
- Download individual de fotos
- Download do álbum completo (zip)
- Seleção de fotos (se habilitado): cliente marca favoritas → fotógrafo recebe seleção
- Contador: "Selecione até X fotos" com barra de progresso
- Compartilhar link do álbum (botão copiar)

### Expandir MeusContratos.jsx
Adicionar ao que já existe:
- Visualização completa do contrato (todas as cláusulas)
- Botão "Aceitar e assinar digitalmente"
  - Confirmação: checkbox "Li e concordo com todos os termos"
  - Captura: nome completo digitado como assinatura
  - Registra: IP, data/hora, user-agent
- Download do PDF do contrato assinado
- Status visual: Pendente assinatura → Assinado

### Expandir MeusOrcamentos.jsx
Adicionar ao que já existe:
- Visualização completa do orçamento (itens, valores, condições)
- Botões: "Aceitar orçamento" / "Recusar" / "Tenho dúvidas"
  - Aceitar: confirma e dispara geração de contrato
  - Recusar: modal com motivo (opcional)
  - Dúvidas: envia mensagem ao fotógrafo via WhatsApp
- Validade do orçamento visível ("Válido até DD/MM/AAAA")
- Badge de expiração se próximo do vencimento

### Timeline do Evento (TimelineEvento.jsx)
Componente visual reutilizável:
- Steps: Orçamento → Contrato → Evento → Edição → Entrega → Feedback
- Step atual destacado com cor
- Steps futuros em cinza
- Steps concluídos com ✓ verde
- Clicável: cada step navega para a tela correspondente

### API Endpoints (já existentes)

**Pagamentos:**
- `GET /api/client/pagamentos` — listar parcelas
- `POST /api/client/pagamentos/:id/comprovante` — upload comprovante
- `GET /api/client/pagamentos/:id/link` — link de pagamento

**Feedback:**
- `GET /api/client/feedback` — verificar status
- `POST /api/client/feedback` — enviar feedback

**Aditivos:**
- `GET /api/client/aditivos` — listar
- `PATCH /api/client/aditivos/:id/aceitar` — aceitar
- `PATCH /api/client/aditivos/:id/recusar` — recusar

**Orçamentos:**
- `GET /api/client/orcamentos` — listar (já usado)
- `PATCH /api/client/orcamentos/:id/aceitar` — aceitar
- `PATCH /api/client/orcamentos/:id/recusar` — recusar

**Contratos:**
- `GET /api/client/contratos` — listar (já usado)
- `POST /api/client/contratos/:id/assinar` — assinatura digital
- `GET /api/client/contratos/:id/pdf` — download PDF

**Álbuns:**
- `GET /api/client/albuns` — listar (já usado)
- `GET /api/client/albuns/:id/fotos` — listar fotos
- `POST /api/client/albuns/:id/selecao` — enviar seleção
- `GET /api/client/albuns/:id/download` — download zip

---

## Padrão de Implementação

- Auth via Cognito (clientAuth middleware — já funciona)
- Layout dedicado para cliente (sem sidebar admin)
- Design limpo, mobile-first (cliente acessa pelo celular)
- Cores: usar accent do fotógrafo (virá das configurações)
- Loading states em todas as telas
- Empty states amigáveis ("Nenhum orçamento no momento")
- Toast de sucesso/erro em ações

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/` — backend pronto
- `template.yaml`, `infra/`
- Pages admin
- `apps/web/` (site público)

---

## Critérios de Aceite
1. Dashboard exibe resumo do evento ativo com timeline
2. Alertas de ações pendentes aparecem corretamente
3. Aceitar orçamento funciona e dispara fluxo
4. Assinar contrato digitalmente registra IP/data
5. Download de PDF do contrato funciona
6. Pagamentos exibe parcelas com botão pagar/enviar comprovante
7. Seleção de fotos no álbum funciona com limite
8. Download zip do álbum funciona
9. Enviar feedback com nota e depoimento funciona
10. Aceitar/recusar aditivo funciona
11. Layout é mobile-first e responsivo

---

## Prompt Pronto para o Kiro CLI

```
Implemente a SPEC-53 conforme docs/specs/SPEC-53-central-cliente-frontend.md.

Crie o ClienteDashboard.jsx como home da central do cliente.
Crie MeusPagamentos.jsx, MeuFeedback.jsx e MeusAditivos.jsx.
Expanda MeusAlbuns.jsx (download + seleção), MeusContratos.jsx (assinatura digital) e MeusOrcamentos.jsx (aceite/recusa).
Crie componentes TimelineEvento.jsx e PagamentoCard.jsx.
Siga docs/prototipos/central-cliente-prototipo.jsx.
Layout mobile-first, sem sidebar admin. Auth via Cognito (clientAuth).

Arquivos a criar:
- apps/frontend/src/pages/cliente/ClienteDashboard.jsx
- apps/frontend/src/pages/cliente/MeusPagamentos.jsx
- apps/frontend/src/pages/cliente/MeuFeedback.jsx
- apps/frontend/src/pages/cliente/MeusAditivos.jsx
- apps/frontend/src/components/cliente/TimelineEvento.jsx
- apps/frontend/src/components/cliente/PagamentoCard.jsx

Arquivos a alterar:
- apps/frontend/src/pages/cliente/MeusAlbuns.jsx
- apps/frontend/src/pages/cliente/MeusContratos.jsx
- apps/frontend/src/pages/cliente/MeusOrcamentos.jsx
- apps/frontend/src/App.js

NÃO TOQUE em nenhum arquivo fora dessa lista. Não altere backend, template.yaml, infra/ ou pages admin.
```
