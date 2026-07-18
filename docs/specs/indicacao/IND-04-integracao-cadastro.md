# IND-04 — Integração §25: Código no Cadastro

**ID:** IND-04  
**TIPO:** Melhoria  
**PRIORIDADE:** P1  
**IMPACTO:** Alto | **ESFORÇO:** Baixo  

---

## Contexto

O link de indicação leva o indicado à porta de entrada (§25). O código precisa ser propagado do URL até o momento do cadastro pra gravar a atribuição. Mecanismo não definido.

---

## Escopo

- `src/handlers/indicacoes/resolverCodigo.mjs` (já criado em IND-02)
- `src/handlers/clientes/cadastroLeve.mjs` (adicionar leitura do `ref` param)
- Frontend: porta de entrada (leitura de query param)

## Fora de Escopo (NÃO TOCAR)

- Fluxo de login de cliente existente.
- Validações de duplicidade (já existem no §25).
- Handlers de orçamento.

---

## Spec Técnica

### Fluxo

1. Link público: `https://<dominio>/i/<codigo>` → resolverCodigo valida → retorna redirect 302 para `https://<dominio>/orcamento?ref=<codigo>`.
2. Frontend §25 (porta de entrada) lê `?ref=<codigo>` da URL e persiste em `sessionStorage`.
3. No cadastro leve (nome, whatsapp, email, senha), frontend envia `ref` no body.
4. Handler `cadastroLeve.mjs` recebe `ref`:
   - Valida código via Query PK=`REFCODE#<codigo>` → pega `indicador_id`.
   - Verifica programa ativo (Query config).
   - Verifica elegibilidade: cliente NÃO existe por email NEM por WhatsApp.
   - Se elegível: grava `indicado_por = indicador_id` no item do novo cliente.
   - Cria item `Indicacao` com status=pendente.
   - Checa auto-indicação (WhatsApp do indicador == WhatsApp do indicado) → se sim, `flag_suspeita = true`.
5. Se código inválido/programa desligado/cliente existente → cadastro prossegue normalmente SEM atribuição.

---

## Critérios de Aceite

1. URL `/i/<codigo>` resolve e redireciona com `?ref=` na query.
2. Cadastro com `ref` válido grava atribuição e cria Indicacao pendente.
3. Cadastro com `ref` inválido ou programa off segue sem erro (graceful degradation).
4. Mesmo WhatsApp gera flag_suspeita=true.

---

## Prompt para o Kiro

```
No handler `src/handlers/clientes/cadastroLeve.mjs`, adicione leitura do campo opcional
`ref` do body. Se presente: valide o código (Query REFCODE), verifique programa ativo e
elegibilidade (não duplicado). Se elegível, grave `indicado_por` no item Cliente e crie
item Indicacao com status=pendente. Se WhatsApp do indicador == indicado, set
flag_suspeita=true. Se código inválido, ignore silenciosamente. No `resolverCodigo.mjs`,
retorne redirect 302 para `/orcamento?ref=<codigo>` quando válido.
Altere SOMENTE esses 2 handlers.
```
