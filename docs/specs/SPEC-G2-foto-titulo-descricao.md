# SPEC G2

**ID:** G2  
**TIPO:** Correção  
**TÍTULO:** Adicionar campos `titulo` e `descricao` à entidade FOTO  
**PRIORIDADE:** P2  
**IMPACTO:** Médio — funcionalidade "editar foto a foto" (Camada 2.5) não tem onde persistir  
**ESFORÇO:** Baixo (ajuste de schema + 1 Lambda de update)

## CONTEXTO

O arquivo `FUNCIONALIDADES-album-adm.md` seção 2 lista "Editar foto a foto — título e descrição individuais por foto". A spec §11 Camada 2.5 confirma: "editar título/descrição por foto". Porém o modelo de dados consolidado (MODELO-DE-DADOS.md) define FOTO como `id, galeria_id, url_original, url_thumb, url_media, ordem, favoritada` — **sem titulo nem descricao**.

## ESCOPO (arquivos e recursos)

### DynamoDB — evolução da entidade FOTO

```
FOTO (PK: GALERIA#<galeria_id>, SK: FOTO#<foto_id>)
  + titulo: String (optional, max 120 chars)
  + descricao: String (optional, max 500 chars)
```
Campos opcionais, nullable. Não quebra registros existentes.

### Lambda — `updateFotoMeta`
- PATCH /admin/album/galeria/{galeriaId}/foto/{fotoId}
- Body: `{ titulo?, descricao? }`
- Validação: titulo max 120, descricao max 500. Rejeita campos extras.
- UpdateExpression condicional (só SET campos presentes no body).
- Retorna a foto atualizada.

### API Gateway — HTTP API
- PATCH /admin/album/galeria/{galeriaId}/foto/{fotoId} → updateFotoMeta (auth: admin)

### IAM
- Role `updateFotoMetaRole`: dynamodb:UpdateItem na tabela principal, condition key prefix GALERIA#.

### SAM (template.yaml) — adições
- 1 função Lambda + role + rota.

## FORA DE ESCOPO (NÃO TOCAR)

- Upload de fotos (serviço de mídia, inexistente).
- Ordenação/mover fotos (handlers separados).
- Frontend de edição (protótipo já existe).
- Entidade GALERIA e ALBUM — nenhuma alteração.

## CRITÉRIOS DE ACEITE

1. PATCH com `{ titulo: "Beijo dos noivos" }` persiste; GET da foto retorna o título.
2. PATCH com titulo > 120 chars retorna 400.
3. PATCH sem titulo nem descricao retorna 400 (body vazio).
4. Fotos existentes sem titulo/descricao continuam funcionando (campos opcionais).
5. Não há side-effect em outras entidades.

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente a spec G2 — Adicionar titulo e descricao à entidade FOTO.

Crie:
1. Lambda updateFotoMeta (PATCH /admin/album/galeria/{galeriaId}/foto/{fotoId}) — recebe { titulo?, descricao? }, valida (titulo max 120, descricao max 500, pelo menos 1 campo presente), faz UpdateItem condicional no DynamoDB (SET apenas campos presentes), retorna foto atualizada.
2. IAM role updateFotoMetaRole com dynamodb:UpdateItem, condition key prefix GALERIA#.
3. Adicione a rota e função ao template.yaml.

Não é necessário migração — campos são opcionais (schema-less DynamoDB). Fotos antigas sem esses campos continuam válidas.

Altere SOMENTE: template.yaml, src/handlers/album/updateFotoMeta.mjs, e o arquivo de role IAM correspondente. NÃO refatore, renomeie ou mexa em mais nada.
```
