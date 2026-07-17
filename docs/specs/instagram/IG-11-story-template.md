# IG-11: Stories com IA — Modo Template

## Metadados
- **ID:** IG-11
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Alto
- **Esforço:** Alto
- **Dependência:** IG-13, IG-14, IG-15

## Contexto
O admin seleciona um template de story pré-configurado, escolhe a foto do álbum, e o sistema usa IA para gerar o design final (texto overlay, composição, filtros) e publica como Story no Instagram.

## Escopo
- `apps/backend/src/handlers/instagram/storyTemplate.js` — NOVO
- `apps/frontend/src/pages/admin/InstagramStoryTemplate.jsx` — NOVO
- API: POST /admin/instagram/stories/template

## Fora de Escopo (NÃO TOCAR)
- Modo IA livre (IG-12)
- CRUD templates (IG-15 — já existe)
- Adapter LLM (IG-13 — já existe)

## Spec Técnica

### Fluxo
```
1. Admin seleciona template + foto do álbum
2. Sistema monta prompt (template.prompt_base + contexto do cliente)
3. LLM gera texto para overlay (IG-13)
4. Gerador de arte cria imagem final 1080x1920 (IG-14)
5. Upload imagem para S3
6. Publicar como Story via Graph API
7. Salvar STORY_IG com custo_ia
```

### API — POST /admin/instagram/stories/template
```json
// Input
{
  "template_id": "stpl_001",
  "foto_s3_key": "albuns/alb_001/foto_001.jpg",
  "cliente_id": "cli_001",
  "contexto": {
    "nome_casal": "Ana & Pedro",
    "tipo_evento": "Casamento",
    "data_evento": "2026-08-15"
  }
}

// Response
{
  "story_id": "story_001",
  "preview_url": "https://...",
  "status": "publicado",
  "ig_media_id": "17890000000000002",
  "custo_ia": 0.04
}
```

### Publicar Story (Graph API)
```js
async function publicarStory(igUserId, imageUrl, token) {
  // Criar container de story
  const container = await fetch(
    `https://graph.facebook.com/v21.0/${igUserId}/media`,
    {
      method: 'POST',
      body: JSON.stringify({
        image_url: imageUrl,
        media_type: 'STORIES',
        access_token: token
      })
    }
  )
  
  // Publicar
  const result = await fetch(
    `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
    {
      method: 'POST',
      body: JSON.stringify({
        creation_id: container.id,
        access_token: token
      })
    }
  )
  
  return result.id
}
```

### Regras
- Story 1080x1920 (9:16)
- Story expira em 24h (Meta gerencia)
- Preview obrigatório antes de publicar
- Custo IA registrado (LLM + geração arte)
- Se IA falha: oferecer publicar sem overlay (foto pura)

## Critérios de Aceite
- [ ] Selecionar template + foto
- [ ] LLM gera texto overlay
- [ ] Imagem final 1080x1920 gerada
- [ ] Story publicado no Instagram
- [ ] Custo IA registrado
- [ ] Preview antes de publicar
- [ ] Fallback: publicar sem overlay se IA falha

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-11: Stories com IA — Modo Template.

1. Crie handlers/instagram/storyTemplate.js: orquestrar fluxo completo.
2. Crie pages/admin/InstagramStoryTemplate.jsx: seletor template+foto, preview.
3. Usar IG-13 (LLM) para texto + IG-14 (arte) para imagem.
4. Publicar como STORIES via Graph API.
5. Registrar STORY_IG + CUSTO_IA_IG.
6. Fallback: publicar foto pura se IA falha.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
