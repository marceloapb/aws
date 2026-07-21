# SPEC-CAT-002 — Short Form de Onboarding pós-registro do Cliente

## META

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-CAT-002 |
| **TIPO** | Feature |
| **TÍTULO** | Short Form de Onboarding pós-registro — Gate de perfil mínimo antes do orçamento |
| **PRIORIDADE** | P0 |
| **IMPACTO** | Alto — sem dados mínimos, Follow-up/WhatsApp não funciona, Contrato não preenche, NF fica bloqueada |
| **ESFORÇO** | Baixo — 1 rota nova no backend + 1 tela simples no frontend + flag no DynamoDB |

---

## CONTEXTO

O fluxo atual é:

```
Cadastro (email+senha) → Login → Central do Cliente (perfil vazio)
```

O cliente pode iniciar um orçamento sem ter nome, telefone ou tipo PF/PJ. Isso causa:

- Follow-up (§20) e WhatsApp (§24) falham — sem telefone.
- Contrato (§8) não preenche variáveis automáticas — sem nome completo.
- Nota Fiscal (§28) bloqueada — sem CPF/CNPJ (mas esse não é obrigatório no short form).
- ADM recebe orçamento de um "fantasma" sem dados de contato.

**Fluxo proposto:**

```
Cadastro (email+senha) → Login → Short Form (nome + telefone + PF/PJ)
                                        ↓
                              perfil_completo = true
                                        ↓
                         Redireciona para destino original
                         (geralmente Orçamento ou Central)
```

---

## ESCOPO (arquivos e recursos afetados)

### DynamoDB — Atributo novo no CLIENTE

```
CLIENTE
└── perfil_completo : Boolean (default false)
```

Setado para `true` após o short form ser submetido com sucesso.

### Backend — Rota nova

- **Arquivo:** `apps/api/src/routes/client-auth.js` (ou novo `client-onboarding.js`)
- **Rota:** `POST /api/client/onboarding/complete`
- **Auth:** JWT (cliente autenticado)
- **Body:**
  ```json
  {
    "nome_completo": "string (obrigatório, min 3 chars)",
    "telefone": "string (obrigatório, formato brasileiro)",
    "tipo_pessoa": "PF | PJ (obrigatório)"
  }
  ```
- **Comportamento:**
  1. Valida campos obrigatórios.
  2. Atualiza o CLIENTE no DynamoDB com os dados + `perfil_completo: true`.
  3. Retorna `{ success: true, perfil_completo: true }`.

### Backend — Middleware ou enriquecimento no login

- **Arquivo:** `apps/api/src/routes/client-auth.js`
- **Mudança:** No response do login (POST /api/client/auth/login ou similar), incluir `perfil_completo` no payload do token ou na resposta JSON, para que o frontend saiba se deve redirecionar.

### Backend — Rota de verificação (GET)

- **Rota:** `GET /api/client/onboarding/status`
- **Response:** `{ perfil_completo: boolean, campos_faltando: ["nome_completo", "telefone", "tipo_pessoa"] }`
- Útil para o frontend verificar ao carregar.

### Frontend — Tela Short Form

- **Rota:** `/cliente/completar-cadastro` (ou `/onboarding`)
- **Comportamento:**
  - Tela focada, sem menu lateral, layout centralizado (max-w-md).
  - Campos:
    - Nome completo (input texto, obrigatório)
    - Telefone/WhatsApp (input com máscara brasileira, obrigatório)
    - Tipo Pessoa (toggle/radio: PF ou PJ)
  - Botão "Continuar" → POST /api/client/onboarding/complete
  - Sucesso → redirect para `returnUrl` (query param) ou `/cliente` (Central)

### Frontend — Guard/Middleware de rota

- Em toda rota protegida do cliente (`/cliente/*`), verificar:
  ```
  SE user.perfil_completo === false:
      redirect para /cliente/completar-cadastro?returnUrl={rota_atual}
  ```
- Exceção: a própria rota `/cliente/completar-cadastro` não deve redirecionar para si mesma.

---

## FORA DE ESCOPO (NÃO TOCAR)

- Tela "Meus Dados" (§13) — continua existindo para dados complementares (endereço, foto, CPF/CNPJ)
- Fluxo de orçamento (§6) — não muda; só recebe clientes com perfil completo
- Fluxo de cadastro (criação da conta) — não muda
- Contrato, Pagamento, NF — não mudam
- admin-catalogo.js, admin-orcamentos.js — não mudam
- template.yaml — não muda

---

## SPEC TÉCNICA

### DynamoDB

Atributo `perfil_completo` (Boolean) no item CLIENTE existente. Default: `false` ao criar conta.

### Validação do telefone

```javascript
function validarTelefone(tel) {
  const limpo = tel.replace(/\D/g, '');
  return limpo.length === 10 || limpo.length === 11; // fixo ou celular
}
```

### Resposta do login (enriquecida)

```json
{
  "token": "...",
  "user": {
    "id": "...",
    "email": "...",
    "nome": "...",
    "perfil_completo": false
  }
}
```

### Guard no frontend (pseudo-código)

```javascript
// Em router guard ou layout wrapper
const user = useAuth();
if (user && !user.perfil_completo && route.path !== '/cliente/completar-cadastro') {
  redirect(`/cliente/completar-cadastro?returnUrl=${route.fullPath}`);
}
```

---

## CRITÉRIOS DE ACEITE

1. ✅ Cliente novo (email+senha) faz login e é redirecionado automaticamente para o short form.
2. ✅ Short form exige nome completo, telefone e tipo PF/PJ — não permite submeter sem preencher.
3. ✅ Após submeter, `perfil_completo` vira `true` e cliente é redirecionado para destino original.
4. ✅ Cliente com `perfil_completo=true` NUNCA vê o short form — acessa normalmente.
5. ✅ Qualquer rota protegida (`/cliente/*`) redireciona para o form se perfil incompleto.
6. ✅ A rota do short form não redireciona para si mesma (loop prevention).
7. ✅ Dados salvos no DynamoDB são recuperáveis em "Meus Dados" depois.
8. ✅ Login response inclui `perfil_completo` para o frontend consumir.

---

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar a feature SPEC-CAT-002: Short Form de Onboarding pós-registro do Cliente.

CONTEXTO: Quando um cliente novo cria conta (email+senha) e faz login, ele deve ser obrigado a preencher um formulário mínimo (nome completo, telefone, tipo PF/PJ) antes de acessar qualquer funcionalidade. Isso garante que Follow-up, Contrato e comunicação funcionem.

ARQUIVOS A ALTERAR/CRIAR:

1. `apps/api/src/routes/client-auth.js`
   - No response do login: incluir campo `perfil_completo` (boolean) no objeto user retornado.
   - Ao criar conta (register): setar `perfil_completo: false` no DynamoDB.

2. `apps/api/src/routes/client-onboarding.js` (NOVO)
   - POST /api/client/onboarding/complete
     - Auth: JWT cliente
     - Body: { nome_completo (string, obrigatório, min 3), telefone (string, obrigatório, 10-11 dígitos), tipo_pessoa ("PF"|"PJ", obrigatório) }
     - Valida campos, atualiza CLIENTE no DynamoDB com dados + perfil_completo=true
     - Response: { success: true, perfil_completo: true }
   - GET /api/client/onboarding/status
     - Auth: JWT cliente
     - Response: { perfil_completo: boolean, campos_faltando: [] }

3. `apps/api/src/app.js`
   - Registrar nova rota: app.use('/api/client/onboarding', require('./routes/client-onboarding'))

4. Frontend: Nova tela `/cliente/completar-cadastro`
   - Layout focado (sem sidebar, centralizado, max-w-md)
   - Campos: nome_completo, telefone (máscara brasileira), tipo_pessoa (radio PF/PJ)
   - Submit → POST /api/client/onboarding/complete
   - Sucesso → redirect para query param returnUrl ou /cliente

5. Frontend: Guard de rota
   - Em todas as rotas /cliente/* (exceto /cliente/completar-cadastro):
     SE user.perfil_completo === false → redirect /cliente/completar-cadastro?returnUrl={atual}

REGRAS:
- perfil_completo default false ao criar conta.
- Telefone validado: 10 ou 11 dígitos após remover formatação.
- tipo_pessoa aceita apenas "PF" ou "PJ".
- Guard NÃO redireciona a própria tela de onboarding (evita loop).
- Dados salvos são os mesmos campos que "Meus Dados" usa — não duplicar.

PADRÕES:
- Seguir padrões de client-auth.js (Express Router, JWT middleware, async handlers).
- Usar dynamodb.js existente para update.

FORA DE ESCOPO — NÃO TOCAR:
- Tela "Meus Dados" existente (§13)
- Fluxo de orçamento (§6)
- admin-*.js (rotas admin)
- template.yaml
- src/functions/ (Lambdas legadas)

Alterar SOMENTE os arquivos listados. Não refatorar, renomear ou mexer em mais nada.
```
