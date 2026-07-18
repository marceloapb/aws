# ARC-08 — Álbum (Acesso Vitrine + Download)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | ARC-08 |
| **Tipo** | Feature |
| **Prioridade** | P2 |
| **Impacto** | Médio — entrega final, momento de encantamento |
| **Esforço** | Médio |

## Contexto
Após a produção (edição), o fotógrafo libera o álbum para o cliente. O cliente acessa a vitrine de fotos (galeria), pode favoritar e baixar as fotos em resolução contratada. Download condicionado à regra de trava (§11): se trava 70% ativa e não pagou 70%, vê vitrine mas não baixa. Mensagem amigável.

## Escopo
- **Frontend:** `AlbumPage.jsx` (aba no EventoDetalhe)
- **Lambda:** `getAlbumCliente` — retorna fotos do álbum com presigned URLs
- **Lambda:** `downloadFotoCliente` — gera presigned URL de download (valida trava)
- **API Gateway:** `GET /cliente/eventos/:id/album`, `GET /cliente/eventos/:id/album/fotos/:fotoId/download`
- **S3:** presigned URLs (15min TTL) para visualização e download

## Fora de Escopo (NÃO TOCAR)
- Upload de fotos (admin, §11)
- Edição/curadoria do álbum
- Vitrine pública (site público, sem auth)
- Seleção de fotos pelo cliente (feature futura)
- Lógica da trava 70% (§11 — aqui só consulta o flag)

## Spec Técnica

### Lambda getAlbumCliente
- Auth: JWT cliente
- Valida: álbum pertence ao evento do cliente
- Retorna:
```json
{
  "evento_id": "ev123",
  "album_id": "alb456",
  "status": "disponivel",
  "total_fotos": 487,
  "download_liberado": true,
  "fotos": [
    {
      "id": "f001",
      "thumb_url": "<presigned>",
      "web_url": "<presigned>",
      "ordem": 1
    }
  ],
  "mensagem_bloqueio": null
}
```
- Se download_liberado = false:
  - `mensagem_bloqueio`: "As fotos em alta resolução serão liberadas após a confirmação do pagamento. Qualquer dúvida, entre em contato!"
  - Fotos de visualização (thumb/web) funcionam normalmente

### Lambda downloadFotoCliente
- Auth: JWT cliente
- Valida: foto pertence ao álbum do evento do cliente
- Checa flag `download_liberado` (vem da lógica de trava)
- Se liberado: gera presigned URL (resolução alta, S3, TTL 15min)
- Se bloqueado: retorna 403 + mensagem amigável

### Estrutura da Página
```
<AlbumPage>
  <AlbumHeader>
    - Título do evento + total de fotos
    - Botão "Baixar todas" (se liberado, gera zip async — futuro)
  </AlbumHeader>
  <BloqueioMsg> (se download_liberado = false)
    - Banner amarelo com mensagem amigável
    - "Você pode visualizar todas as fotos. O download será liberado após confirmação do pagamento."
  </BloqueioMsg>
  <GaleriaFotos>
    - Grid responsivo de thumbnails (lazy loading)
    - Click: lightbox com versão web
    - Botão download por foto (se liberado)
  </GaleriaFotos>
</AlbumPage>
```

## Critérios de Aceite
- Cliente SEMPRE vê as fotos (thumb/web) mesmo sem download liberado
- Download bloqueado → mensagem amigável (NUNCA menciona "trava 70%")
- Download liberado → presigned URL funcional (15min)
- Presigned URLs expiram → frontend refaz request se necessário
- Galeria com lazy loading (performance em 500+ fotos)
- Lightbox com navegação (setas/swipe)
- Álbum inexistente → "Seu álbum será disponibilizado em breve!"

## Prompt Pronto para o Kiro CLI
```
Implemente a spec ARC-08 (Álbum — Acesso Vitrine + Download).

Crie:
1. src/functions/cliente/getAlbumCliente/index.mjs — lista fotos com presigned URLs (thumb/web)
2. src/functions/cliente/downloadFotoCliente/index.mjs — gera presigned alta res (valida trava)
3. Rotas GET /cliente/eventos/:id/album e .../fotos/:fotoId/download no template.yaml
4. src/pages/cliente/AlbumPage.jsx — galeria + lightbox + botão download + banner bloqueio

Presigned URLs: TTL 15min, S3. Download: checa flag download_liberado.
Bloqueado: 403 + mensagem amigável (NUNCA menciona trava 70%).
Galeria: lazy loading, lightbox, grid responsivo.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
