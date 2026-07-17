# IG-03: Publicar Post Único (Feed)

## Metadados
- **ID:** IG-03
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** IG-02, IG-10

## Contexto
Publicar uma foto no feed do Instagram via Graph API. Usa o fluxo de 2 passos da Meta: criar container → publicar. A imagem deve estar acessível via URL pública temporária (IG-10).

## Escopo
- `apps/backend/src/handlers/instagram/publicar.js` — NOVO
- `apps/backend/src/services/instagramPublisher.js` — NOVO
- `apps/frontend/src/pages/admin/InstagramPublicar.jsx` — NOVO
- API: POST /admin/instagram/publicar

## Fora de Escopo (NÃO TOCAR)
- Carrossel (IG-04)
- Agendamento (IG-05)
- Stories (IG-11)

## Spec Técnica

### Fluxo de Publicação (Graph API)
```
1. Gerar URL assinada da foto (IG-10)
2. Criar container:
   POST https://graph.facebook.com/v21.0/{ig_user_id}/media
   Body: { image_url, caption, access_token }
   Response: { id: container_id }
3. Verificar status do container (polling):
   GET https://graph.facebook.com/v21.0/{container_id}?fields=status_code
   Aguardar status_code = 'FINISHED'
4. Publicar:
   POST https://graph.facebook.com/v21.0/{ig_user_id}/media_publish
   Body: { creation_id: container_id, access_token }
   Response: { id: ig_media_id }
5. Buscar permalink:
   GET https://graph.facebook.com/v21.0/{ig_media_id}?fields=permalink
6. Salvar POST_INSTAGRAM com status='publicado'
```

### API — POST /admin/instagram/publicar
```json
// Input
{
  "foto_s3_key": "albuns/alb_001/foto_001.jpg",
  "caption": "Casamento Ana & Pedro 💍✨\n\n#casamento #fotografia #noiva",
  "album_id": "alb_001",
  "cliente_id": "cli_001"
}

// Response
{
  "sucesso": true,
  "post_id": "post_001",
  "ig_media_id": "17890000000000001",
  "permalink": "https://www.instagram.com/p/ABC123/"
}
```

### Polling do Container
```js
async function aguardarContainer(containerId, token, maxTentativas = 10) {
  for (let i = 0; i < maxTentativas; i++) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${token}`)
    const data = await res.json()
    
    if (data.status_code === 'FINISHED') return true
    if (data.status_code === 'ERROR') throw new Error('Container falhou')
    
    await sleep(3000) // 3s entre checks
  }
  throw new Error('Timeout: container não ficou pronto')
}
```

### Frontend — InstagramPublicar.jsx
- Seletor de foto (do álbum ou upload)
- Preview da foto
- Campo caption (textarea, max 2200 chars)
- Sugestão de hashtags (baseado no tipo de evento)
- Botão "Publicar Agora" ou "Agendar" (IG-05)
- Feedback: loading → sucesso (link do post) ou erro

### Regras
- Caption max 2200 caracteres
- Max 30 hashtags
- Imagem: JPEG/PNG, min 320px, max 1440px largura
- Rate limit: max 25 posts/24h (API da Meta)
- Se container falha: salvar status='falho' + erro

## Critérios de Aceite
- [ ] Publicar foto no feed funciona
- [ ] Container criado e publicado
- [ ] Permalink salvo
- [ ] POST_INSTAGRAM registrado
- [ ] Erro tratado (token expirado, rate limit)
- [ ] Caption com hashtags
- [ ] Preview da foto antes de publicar

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-03: Publicar Post Único.

1. Crie services/instagramPublisher.js: criar container, polling, publish.
2. Crie handlers/instagram/publicar.js: API endpoint.
3. Crie pages/admin/InstagramPublicar.jsx: seletor foto, caption, preview.
4. Fluxo: URL assinada → container → poll → publish → salvar.
5. SAM: rota POST /admin/instagram/publicar.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
