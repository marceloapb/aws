# CT-04: Visualização Estilizada (Cliente Lê Contrato)

## Metadados
- **ID:** CT-04
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** CT-03

## Contexto
Tela pública (sem login Cognito) onde o cliente visualiza o contrato antes de aceitar. Acesso via link com token. Layout responsivo, estilizado, com marca do fotógrafo.

## Escopo
- `apps/backend/src/handlers/contratos/visualizar.js` — NOVO
- `apps/frontend/src/pages/public/ContratoVisualizar.jsx` — NOVO
- API: GET /public/contratos/:id?token=xxx

## Fora de Escopo (NÃO TOCAR)
- Aceite eletrônico (CT-05)
- Geração (CT-03 — já existe)
- PDF (CT-06)

## Spec Técnica

### API — GET /public/contratos/:id
Query params: `token` (JWT)

```json
{
  "contrato_id": "ct_001",
  "status": "pendente",
  "fotografo": {
    "nome": "Marcelo APB Fotografia",
    "logo_url": "https://..."
  },
  "cliente": {
    "nome": "Ana Carolina Silva"
  },
  "corpo_html": "<h1>CONTRATO DE PRESTAÇÃO...</h1>...",
  "expira_em": "2026-07-24T10:00:00Z",
  "prazo_restante_dias": 7,
  "ja_assinado": false
}
```

### Segurança
- Token JWT no query param (assinado com secret do tenant)
- Validar: token não expirado, contrato_id bate com claim
- Se token inválido: 401 "Link expirado ou inválido"
- Se contrato expirado: exibir mas com banner "Prazo encerrado"
- Rota PÚBLICA (sem Cognito)

### Frontend — ContratoVisualizar.jsx
- **Header:** Logo do fotógrafo + nome do estúdio
- **Info:** "Contrato para: Ana Carolina Silva"
- **Corpo:** HTML renderizado com estilo (fonts, spacing, headers)
- **Footer:** Prazo + botão "Aceitar Contrato" (vai para CT-05)
- **Responsivo:** Funciona em mobile
- **Estados:**
  - Pendente: Exibe normalmente + botão aceitar
  - Assinado: Banner verde "✅ Contrato assinado em 18/07/2026"
  - Expirado: Banner vermelho "⏰ Prazo encerrado" (sem botão)

### Estilização do HTML
```css
/* Aplicar ao corpo do contrato */
.contrato-corpo h1 { font-size: 1.5rem; text-align: center; margin-bottom: 2rem; }
.contrato-corpo h2 { font-size: 1.2rem; margin-top: 1.5rem; border-bottom: 1px solid #eee; }
.contrato-corpo p { line-height: 1.8; text-align: justify; }
.contrato-corpo strong { color: #1a1a1a; }
```

### Regras
- Não exige login do cliente
- Link funciona em qualquer dispositivo
- Se já assinado: não exibir botão (só confirmação)
- Tempo de leitura estimado (baseado no tamanho do texto)
- Scroll tracking: marcar que cliente scrollou até o final (pré-requisito para aceite)

## Critérios de Aceite
- [ ] Visualização pública via link+token
- [ ] Token validado (JWT)
- [ ] HTML renderizado com estilo
- [ ] Logo do fotógrafo
- [ ] Botão aceitar (se pendente)
- [ ] Banner assinado (se já aceito)
- [ ] Banner expirado (se prazo venceu)
- [ ] Responsivo (mobile)
- [ ] Scroll tracking

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CT-04: Visualização de Contrato (Cliente).

1. Crie handlers/contratos/visualizar.js: GET público com validação JWT.
2. Crie pages/public/ContratoVisualizar.jsx: layout estilizado.
3. Token JWT no query param.
4. Estados: pendente (botão), assinado (banner), expirado (banner).
5. Logo do fotógrafo, responsivo, scroll tracking.
6. SAM: rota pública GET /public/contratos/{id}.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
