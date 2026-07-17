# IG-04: Publicar Carrossel (2-10 fotos)

## Metadados
- **ID:** IG-04
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** IG-03, IG-10

## Contexto
Carrossel permite publicar 2 a 10 fotos em um único post. Fluxo da Meta: criar container individual para cada foto → criar container carrossel referenciando os containers → publicar.

## Escopo
- `apps/backend/src/services/instagramPublisher.js` — ALTERAR (adicionar publicarCarrossel)
- `apps/frontend/src/pages/admin/InstagramPublicar.jsx` — ALTERAR (seleção múltipla)
- API: POST /admin/instagram/publicar (tipo: carrossel)

## Fora de Escopo (NÃO TOCAR)
- Post único (IG-03 — já existe)
- Stories (IG-11)
- Agendamento (IG-05)

## Spec Técnica

### Fluxo Carrossel (Graph API)
```
1. Para cada foto (2-10):
   a. Gerar URL assinada (IG-10)
   b. Criar container individual:
      POST /{ig_user_id}/media
      Body: { image_url, is_carousel_item: true, access_token }
      Response: { id: item_container_id }
2. Aguardar todos os containers ficarem FINISHED (polling)
3. Criar container carrossel:
   POST /{ig_user_id}/media
   Body: { media_type: 'CAROUSEL', children: [id1, id2, ...], caption, access_token }
   Response: { id: carousel_container_id }
4. Publicar carrossel:
   POST /{ig_user_id}/media_publish
   Body: { creation_id: carousel_container_id, access_token }
   Response: { id: ig_media_id }
```

### API — POST /admin/instagram/publicar
```json
{
  "tipo": "carrossel",
  "fotos_s3_keys": [
    "albuns/alb_001/foto_001.jpg",
    "albuns/alb_001/foto_002.jpg",
    "albuns/alb_001/foto_003.jpg"
  ],
  "caption": "Melhores momentos do casamento 💍\n\n#casamento",
  "album_id": "alb_001",
  "cliente_id": "cli_001"
}
```

### Regras
- Mínimo 2 fotos, máximo 10
- Todas as fotos devem ter containers FINISHED antes de criar carrossel
- Se 1 container falha: abortar e reportar qual foto falhou
- Caption é única para o carrossel todo (não por foto)
- Ordem das fotos importa (mesma ordem do array)

### Frontend
- Seleção múltipla de fotos (checkbox ou drag)
- Reordenar arrastando
- Preview de todas as fotos selecionadas
- Indicador: "3/10 fotos selecionadas"
- Erro se < 2 ou > 10

## Critérios de Aceite
- [ ] Carrossel publicado com 2+ fotos
- [ ] Containers individuais criados
- [ ] Polling de todos os containers
- [ ] Ordem respeitada
- [ ] Erro se foto falha
- [ ] Min 2, max 10
- [ ] Frontend: seleção múltipla + reordenar

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-04: Publicar Carrossel.

1. Em instagramPublisher.js: publicarCarrossel (containers individuais → carrossel → publish).
2. Em InstagramPublicar.jsx: seleção múltipla, reordenar, preview.
3. Polling paralelo dos containers individuais.
4. Min 2, max 10 fotos.
5. Abortar se qualquer container falhar.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
