# SPEC-CAT-001 — Campos de Fornecedor e Precificação por Custo+Margem para Produtos

## META

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-CAT-001 |
| **TIPO** | Feature |
| **TÍTULO** | Campos de Fornecedor e Precificação por Custo+Margem para Produtos (Álbuns) |
| **PRIORIDADE** | P1 |
| **IMPACTO** | Alto — elimina risco de prejuízo silencioso por precificação de cabeça; centraliza info de fornecedor que hoje vive em anotações esparsas |
| **ESFORÇO** | Médio — novo grupo de atributos condicionais no ITEM existente + lógica de cálculo simples + upload de fotos via serviço de mídia já previsto |

---

## CONTEXTO

O ITEM do Catálogo (§5) hoje tem campos genéricos: `nome, tipo, categoria, valor_base, descrição, ativo, exibir_ao_cliente`. Para itens do tipo **Produto** (especialmente álbuns físicos), o ADM precisa:

1. Saber de QUAL fornecedor vem e como ele chama esse produto lá.
2. Ter fotos de exemplo do produto para referência própria e futura exibição ao cliente.
3. Calcular o preço de venda a partir do **custo real** (compra + frete + extras) + **margem desejada**, em vez de chutar o `valor_base` manualmente.

Hoje isso vive na cabeça ou em anotações fora do sistema → risco de vender abaixo do custo sem perceber.

---

## ESCOPO (arquivos e recursos afetados)

### DynamoDB — Atributos novos no ITEM (tipo=Produto)

Atributos condicionais — só existem quando `tipo = Produto` E a categoria estiver marcada como `tem_fornecedor = true`:

```
ITEM (atributos adicionais para Produto com fornecedor)
├── fornecedor_nome        : String       (obrigatório)
├── fornecedor_link        : String (URL) (opcional)
├── nome_no_fornecedor     : String       (opcional)
├── fotos_exemplo[]        : List<Object> (max 5, { id, key, url_thumb, url_web })
├── preco_custo            : Number       (obrigatório, centavos)
├── frete                  : Number       (obrigatório, default 0)
├── outros_custos          : Number       (opcional, default 0)
├── margem_percentual      : Number       (obrigatório, ex: 60 = 60%)
├── valor_base_calculado   : Number       (derivado, read-only)
└── valor_base_override    : Number|null  (se preenchido, substitui o calculado)
```

O `valor_base` efetivo do ITEM passa a ser:
```
SE valor_base_override != null:
    valor_base = valor_base_override
SENÃO:
    custo_total = preco_custo + frete + outros_custos
    valor_base  = ROUND(custo_total × (1 + margem_percentual / 100))
```

### CATEGORIA — Novo atributo

```
CATEGORIA (§5)
└── tem_fornecedor : Boolean (default false)
```

Quando `true`, a UI do cadastro de ITEM (tipo=Produto) dessa categoria exibe o bloco de fornecedor/custo. Categorias sugeridas para marcar: "Álbuns", "Impressos", "Quadros".

### Backend — Rotas (Express monolítico)

- **Arquivo:** `apps/api/src/routes/admin-catalogo.js`
- **Mudanças:**
  - No POST/PUT de item: aceitar os novos atributos; calcular `valor_base_calculado` no backend (não confiar no front); salvar ambos.
  - Validação: se categoria `tem_fornecedor=true` e tipo=Produto → `fornecedor_nome`, `preco_custo`, `margem_percentual` são obrigatórios.
  - No GET de item: retornar todos os campos, incluindo `valor_base_calculado` separado do efetivo.
  - No POST/PUT de categoria: aceitar novo campo `tem_fornecedor` (boolean, default false).

### Rotas novas — Upload de fotos de exemplo

- Reusa o `mediaUploadService.js` existente com contexto `catalogo_exemplo`:
  - Chave S3: `catalogo/${itemId}/exemplo/${uuid}.${ext}`
  - Máx 5 fotos por item.
- **Rotas:**
  - `POST /api/admin/catalogo/items/:id/fotos-exemplo/presigned` → retorna URL pré-assinada.
  - `DELETE /api/admin/catalogo/items/:id/fotos-exemplo/:fotoId` → remove foto do S3 e do array.

### Service novo

- **Arquivo:** `apps/api/src/services/catalogoPrecificacaoService.js`
- Funções:
  - `calcularValorBase(item)` — fórmula de custo+margem
  - `resolverValorBase(item)` — retorna override ou calculado

### Frontend — Tela de cadastro de ITEM

- Bloco condicional "Fornecedor e Custo" aparece quando:
  - `tipo === 'Produto'` **E**
  - a categoria selecionada tem `tem_fornecedor === true`
- Campos do bloco:
  - Nome do fornecedor (input texto, obrigatório)
  - Link do fornecedor (input URL, opcional, com botão "Abrir")
  - Nome no fornecedor (input texto, placeholder: "Como o fornecedor chama este produto")
  - Preço de custo (input monetário R$)
  - Frete (input monetário R$, default 0)
  - Outros custos (input monetário R$, default 0, tooltip: "embalagem, acabamento especial...")
  - Margem de lucro (input %, com slider visual 0-200%)
  - **Preço final calculado** (read-only, destaque visual, atualiza em tempo real)
  - Checkbox "Sobrescrever preço manualmente" → habilita campo de override
- Upload de fotos de exemplo: grade de thumbs + botão "Adicionar foto" (máx 5), com preview e remover.

### Frontend — Tela de cadastro de CATEGORIA

- Novo toggle: "Produtos desta categoria têm fornecedor?" (controla `tem_fornecedor`).

---

## FORA DE ESCOPO (NÃO TOCAR)

- Lógica de congelamento no orçamento (já existe, continua copiando `valor_base` efetivo — não muda)
- Serviço de Mídia genérico (já existe em mediaUploadService.js — esta spec só CONSOME)
- Pacotes (não afetados — pacote referencia `valor_base` do ITEM, que continua existindo)
- Entidades de outros domínios (Contrato, Pagamento, Agenda)
- Nota Fiscal (calcula sobre valor final do orçamento, não sobre custo)
- Tela de Lista de Preços (continua lendo `valor_base` efetivo, transparente)
- apps/api/src/routes/admin-albuns.js (álbuns de fotos digitais — domínio diferente)
- template.yaml (não precisa mudar — Express monolítico)
- Qualquer arquivo em src/functions/ (Lambdas standalone legadas)

---

## SPEC TÉCNICA — Resumo por recurso

### DynamoDB

Sem nova tabela. Atributos extras no ITEM existente (schema flexível). Atributo `tem_fornecedor` na CATEGORIA existente.

### Cálculo (catalogoPrecificacaoService.js)

```javascript
function calcularValorBase(item) {
  if (item.preco_custo == null || item.margem_percentual == null) return null;
  const custoTotal = item.preco_custo + (item.frete || 0) + (item.outros_custos || 0);
  return Math.round(custoTotal * (1 + item.margem_percentual / 100));
}

function resolverValorBase(item) {
  return item.valor_base_override ?? calcularValorBase(item);
}

module.exports = { calcularValorBase, resolverValorBase };
```

### Rota API — presigned URL

```
POST /api/admin/catalogo/items/:id/fotos-exemplo/presigned
Auth: JWT (ADM)
Body: { "content_type": "image/jpeg", "filename": "frente-album.jpg" }
Response: { "upload_url": "https://s3...", "foto_id": "uuid", "key": "..." }
```

---

## CRITÉRIOS DE ACEITE

1. ✅ Ao criar/editar um Item tipo Produto com categoria `tem_fornecedor=true`, o bloco de fornecedor aparece e os campos obrigatórios são validados.
2. ✅ O `valor_base` é calculado automaticamente pela fórmula `(custo + frete + outros) × (1 + margem/100)` e exibido em tempo real.
3. ✅ O ADM pode sobrescrever o preço calculado com um valor manual (override).
4. ✅ Fotos de exemplo fazem upload via presigned URL e aparecem na grade (máx 5).
5. ✅ Remover foto de exemplo deleta do S3 e remove da lista.
6. ✅ Itens tipo Serviço Principal e Adicional NÃO mostram o bloco de fornecedor.
7. ✅ Categorias sem `tem_fornecedor=true` NÃO mostram o bloco, mesmo para Produtos.
8. ✅ O congelamento no orçamento continua copiando `valor_base` efetivo — sem regressão.
9. ✅ Lista de Preços continua funcional (lê `valor_base` efetivo).

---

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar a feature SPEC-CAT-001: Campos de Fornecedor e Precificação por Custo+Margem para Produtos no Catálogo.

CONTEXTO: O projeto usa Express monolítico (apps/api/src/app.js) com DynamoDB. O ITEM do Catálogo (tipo=Produto) precisa de campos extras condicionais para fornecedor e precificação automática por custo+margem.

ARQUIVOS A ALTERAR:

1. `apps/api/src/routes/admin-catalogo.js`
   - Nas rotas POST/PUT de item: aceitar os novos campos condicionais (fornecedor_nome, fornecedor_link, nome_no_fornecedor, preco_custo, frete, outros_custos, margem_percentual, valor_base_override, fotos_exemplo).
   - Validação: se a categoria do item tem `tem_fornecedor === true` E tipo === 'Produto', então fornecedor_nome, preco_custo e margem_percentual são obrigatórios.
   - Calcular no backend antes de salvar:
     valor_base_calculado = Math.round((preco_custo + (frete || 0) + (outros_custos || 0)) * (1 + margem_percentual / 100))
     valor_base = valor_base_override ?? valor_base_calculado
   - No GET de item: retornar todos os campos novos + valor_base_calculado separado.
   - Na rota POST/PUT de categoria: aceitar novo campo booleano `tem_fornecedor` (default false).
   - Novas rotas:
     POST /api/admin/catalogo/items/:id/fotos-exemplo/presigned
     DELETE /api/admin/catalogo/items/:id/fotos-exemplo/:fotoId

2. `apps/api/src/services/catalogoPrecificacaoService.js` (NOVO)
   - calcularValorBase(item) e resolverValorBase(item)

REGRAS:
- Valores monetários em CENTAVOS (inteiros).
- margem_percentual é número inteiro (60 = 60%).
- fotos_exemplo é array de objetos: [{ id, key, url_thumb, url_web }]. Máx 5.
- Reusar mediaUploadService.js e s3Service.js existentes.
- Seguir padrões de admin-catalogo.js (Express Router, async, try/catch).

FORA DE ESCOPO — NÃO TOCAR:
- admin-albuns.js, admin-orcamentos.js, admin-contratos.js
- followupService.js, contratoService.js
- template.yaml
- src/functions/ (Lambdas legadas)
- Frontend (spec separada)

Alterar SOMENTE os arquivos listados. Não refatorar, renomear ou mexer em mais nada.
```
