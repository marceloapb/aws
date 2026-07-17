# ALB-14: Comentários nas Fotos

## Metadados
- **ID:** ALB-14
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Baixo
- **Dependência:** ALB-07

## Contexto
O cliente pode deixar comentários em fotos individuais (feedback pontual). Útil para ajustes de edição ou observações específicas. O admin vê todos os comentários agregados.

## Escopo
- `apps/backend/src/handlers/album/comentarios.js` — NOVO
- `apps/frontend/src/pages/cliente/AlbumView.jsx` — botão comentar
- `apps/frontend/src/components/album/ComentarioModal.jsx` — NOVO
- API: POST /c/:slug/fotos/:fotoId/comentarios, GET /admin/albuns/:id/comentarios

## Fora de Escopo (NÃO TOCAR)
- Seleção de fotos (ALB-08)
- Lightbox (ALB-12)
- Outros módulos

## Spec Técnica

### Entidade COMENTARIO
```json
{
  "PK": "FOTO#foto_001",
  "SK": "COMENTARIO#com_001",
  "id": "com_001",
  "foto_id": "foto_001",
  "album_id": "alb_001",
  "autor": "cliente",
  "nome_autor": "Ana Silva",
  "texto": "Adorei essa! Pode ajustar a cor?",
  "created_at": "2026-08-01T10:00:00Z"
}
```

### Controles
- `permite_comentarios: boolean` (por álbum)
- Admin pode responder comentários
- Admin pode excluir comentários
- Notificação ao admin quando cliente comenta

### Frontend
- Ícone de balão em cada foto (com badge de quantidade)
- Modal para escrever/ver comentários
- Thread simples (cliente → admin → cliente)
- Max 500 caracteres por comentário

## Critérios de Aceite
- [ ] Cliente pode comentar em fotos
- [ ] Admin vê todos os comentários
- [ ] Admin pode responder
- [ ] Notificação ao admin
- [ ] Toggle permite_comentarios funciona
- [ ] Max 500 chars respeitado
- [ ] Badge com contagem

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-14: Comentários nas Fotos.

1. Crie handlers/album/comentarios.js: criar, listar, responder, excluir.
2. Em AlbumView.jsx: ícone balão em cada foto.
3. Crie components/album/ComentarioModal.jsx: thread de comentários.
4. Notificar admin quando cliente comenta.
5. SAM: rotas POST/GET comentários.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
