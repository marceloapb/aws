# IND-06 — Formato do Link/Código e URL Pública

**ID:** IND-06  
**TIPO:** Melhoria  
**PRIORIDADE:** P1  
**IMPACTO:** Médio | **ESFORÇO:** Baixo  

---

## Contexto

A spec diz "código único" mas não define formato, comprimento, nem estrutura da URL pública. Impacta UX de compartilhamento (WhatsApp) e segurança (brute-force).

---

## Escopo

- `src/handlers/indicacoes/getMeuCodigo.mjs`
- Documentação na §31

## Fora de Escopo (NÃO TOCAR)

- DNS/CloudFront config.
- Handlers de admin.

---

## Spec Técnica

### Formato do código

- **nanoid** de 8 caracteres, alfanumérico lowercase (charset: `abcdefghijklmnopqrstuvwxyz0123456789`).
- Entropia: 36^8 ≈ 2.8 trilhões de combinações. Inviável brute-force em volume de fotógrafo.
- Exemplo: `a7k2m9xp`

### URL pública

```
https://<dominio>/i/<codigo>
```

- Path curto (`/i/`) pro WhatsApp não truncar.
- Exemplo final: `https://mbf.com.br/i/a7k2m9xp`

### Geração (getMeuCodigo.mjs)

1. Query PK=`CLIENTE#<id>` buscando SK begins_with `REFCODE` → se existe e `ativo=true`, retorna.
2. Se não existe: gera nanoid(8), grava item `PK=REFCODE#<codigo>, SK=REFCODE#<codigo>` + item no cliente `PK=CLIENTE#<id>, SK=REFCODE#<codigo>`.
3. Retry em caso de colisão (PutItem com ConditionExpression `attribute_not_exists(PK)`).

### Response

```json
{ "codigo": "a7k2m9xp", "url": "https://mbf.com.br/i/a7k2m9xp" }
```

---

## Critérios de Aceite

1. Código gerado é alfanumérico lowercase, 8 chars.
2. URL retornada usa path `/i/<codigo>`.
3. Colisão tratada com retry (máx 3 tentativas).
4. Cliente que já tem código recebe o existente (não gera novo).

---

## Prompt para o Kiro

```
No handler `src/handlers/indicacoes/getMeuCodigo.mjs`, implemente geração de código com
nanoid(8, '0123456789abcdefghijklmnopqrstuvwxyz'). Grave em 2 itens DynamoDB
(REFCODE#<codigo> e no Cliente). Use ConditionExpression attribute_not_exists(PK)
com retry até 3x em colisão. Retorne `{ codigo, url }` com URL formato
`https://${DOMAIN}/i/${codigo}`. Adicione nanoid como dependência no package.json.
Altere SOMENTE este handler e o package.json.
```
