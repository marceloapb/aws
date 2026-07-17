# ALB-09: Download Granular

## Metadados
- **ID:** ALB-09
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** ALB-07

## Contexto
O admin controla se o cliente pode baixar fotos e em quais condições. Opções: download individual, download em ZIP (selecionadas ou todas), e toggle global por álbum.

## Escopo
- `apps/backend/src/handlers/album/download.js` — NOVO
- `apps/frontend/src/pages/cliente/AlbumView.jsx` — botões de download
- API: GET /c/:slug/download/:fotoId, POST /c/:slug/download/zip

## Fora de Escopo (NÃO TOCAR)
- Upload/processamento
- Seleção (ALB-08)
- Watermark (ALB-13)

## Spec Técnica

### Controles do Admin (por álbum)
- `permite_download: boolean` — toggle global
- `download_resolucao: 'original' | 'media'` — qual versão entregar
- `download_apos_selecao: boolean` — só libera download após seleção confirmada

### Download Individual
- Rota: GET /c/:slug/download/:fotoId
- Gera presigned URL do S3 (download, não inline)
- Content-Disposition: attachment; filename="{nome_original}"
- Expiração: 5 minutos
- Validações: álbum publicado, não expirado, download habilitado

### Download ZIP
- Rota: POST /c/:slug/download/zip
- Body: `{ foto_ids: ['foto_001', 'foto_002'] }` ou `{ todas: true }`
- Processo:
  1. Lambda inicia Step Function (ou Lambda longa) para gerar ZIP
  2. Retorna 202 Accepted com jobId
  3. ZIP gerado no S3 (presigned URL, expiração 1h)
  4. Frontend poll: GET /c/:slug/download/zip/:jobId → status + URL quando pronto
- Limite: 500 fotos ou 5GB por ZIP

### Frontend — AlbumView.jsx
- Botão download individual em cada foto (se habilitado)
- Botão "Baixar Selecionadas" (se seleção confirmada)
- Botão "Baixar Todas" (se admin permitiu)
- Progress/spinner para ZIP: "Preparando download... {progresso}%"
- Link do ZIP quando pronto (expira em 1h)

### Logging/Analytics
- Registrar cada download: foto_id, timestamp, IP
- Para saber quantas vezes o cliente baixou

## Critérios de Aceite
- [ ] Toggle permite_download funciona
- [ ] Download individual via presigned URL
- [ ] Content-Disposition correto (filename original)
- [ ] ZIP funciona para selecionadas
- [ ] ZIP funciona para todas
- [ ] Limite de 500 fotos/5GB respeitado
- [ ] Job assíncrono com status polling
- [ ] URL do ZIP expira em 1h
- [ ] Download bloqueado se álbum expirado
- [ ] Log de downloads registrado

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-09: Download Granular.

1. Crie handlers/album/download.js: download individual (presigned URL) + ZIP (Step Function).
2. Em AlbumView.jsx: botões download individual, selecionadas, todas.
3. Job ZIP: Lambda gera ZIP no S3, polling de status, URL com 1h expiração.
4. Validações: permite_download, não expirado, seleção confirmada (se configurado).
5. Log de downloads no DynamoDB.
6. SAM: rotas GET /c/{slug}/download/{fotoId}, POST /c/{slug}/download/zip.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
