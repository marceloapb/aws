# SPEC MD-04 — Thumbnail Automático (S3 Event → Lambda)

**ID:** MD-04
**TIPO:** Melhoria
**TÍTULO:** Geração automática de thumbnail ao receber avatar
**PRIORIDADE:** P2
**IMPACTO:** Médio — performance no frontend, menor transferência
**ESFORÇO:** Médio — Lambda Layer com Sharp

## CONTEXTO

Quando o cliente faz upload de avatar (ex: 3 MB, 4000x3000), servir a imagem original como avatar de 80px é desperdício. Um trigger S3 gera thumbnail (200x200 webp, ~10 KB) automaticamente.

## ESCOPO

- `src/functions/clients/avatar-resize/index.mjs` (NOVO)
- `infra/cloudformation.yml` (Lambda + S3 Event + Layer)

## FORA DE ESCOPO (NÃO TOCAR)

- Handlers de clients existentes
- Lambda de presigned URL (MD-03)
- Fotos de galerias (pipeline separado)

## SPEC TÉCNICA

**Lambda:** `ClientAvatarResizeFunction`
**Trigger:** S3 Event `s3:ObjectCreated:*` no prefixo `avatars/` (excluir prefixo `avatars/*/thumb*`)
**Runtime:** Node.js 20.x
**Layer:** Sharp (arm64, ~10 MB)

**Lógica:**
1. Receber evento S3 com key `avatars/<sub>/<timestamp>.<ext>`
2. GetObject da imagem original
3. Sharp: resize 200x200, format webp, quality 80
4. PutObject com key `avatars/<sub>/thumb.webp`
5. (Opcional) Deletar versões antigas de thumb

**IAM Role:** `ClientAvatarResizeRole`
- `s3:GetObject` em `arn:aws:s3:::mbf-assets/avatars/*`
- `s3:PutObject` em `arn:aws:s3:::mbf-assets/avatars/*/thumb.webp`

**CDN URL final do avatar:** `https://cdn.mbfsystems.com/avatars/<sub>/thumb.webp`

## CRITÉRIOS DE ACEITE

- [ ] Thumbnail gerado em < 3s após upload
- [ ] Formato webp, 200x200, < 50 KB
- [ ] Não entra em loop (filtro exclui thumb*)
- [ ] Imagem corrompida → log de erro, não quebra

## PROMPT PRONTO PARA O KIRO CLI

```
Crie src/functions/clients/avatar-resize/index.mjs.
Trigger: S3 Event s3:ObjectCreated:* no prefixo avatars/ do bucket env ASSETS_BUCKET. Configurar suffix filter para excluir arquivos com "thumb" no nome.
Leia o objeto S3 do evento. Use Sharp (via Lambda Layer) para resize 200x200 webp quality 80.
Salve como avatars/{sub}/thumb.webp no mesmo bucket.
Adicione no cloudformation.yml: Lambda ClientAvatarResizeFunction (arm64, 512MB memory, 30s timeout), Layer Sharp, S3 NotificationConfiguration, role com s3:GetObject e s3:PutObject restritos ao prefixo avatars/.
Altere SOMENTE: src/functions/clients/avatar-resize/index.mjs (novo) e infra/cloudformation.yml. Não refatore, renomeie ou mexa em mais nada.
```
