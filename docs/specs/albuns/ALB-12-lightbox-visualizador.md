# ALB-12: Lightbox / Visualizador

## Metadados
- **ID:** ALB-12
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** ALB-07

## Contexto
Quando o cliente clica em uma foto no álbum publicado, ela abre em um lightbox (visualizador ampliado) com navegação, zoom e ações contextuais.

## Escopo
- `apps/frontend/src/components/album/Lightbox.jsx` — NOVO
- `apps/frontend/src/pages/cliente/AlbumView.jsx` — integrar lightbox

## Fora de Escopo (NÃO TOCAR)
- Backend (sem alteração)
- Upload/processamento
- Download (botão de download no lightbox chama ALB-09)

## Spec Técnica

### Funcionalidades
- **Abrir:** Click na thumbnail → abre versão média (2048px)
- **Navegação:** Setas esquerda/direita + swipe (mobile)
- **Zoom:** Pinch-to-zoom (mobile) + scroll wheel (desktop)
- **Ações:** Favoritar (coração), Download (se habilitado), Comentar (se habilitado)
- **Fechar:** Click fora, ESC, botão X
- **Contador:** "12 / 450"
- **Slideshow:** Auto-play com intervalo configurável
- **Teclado:** Arrow keys para navegar, ESC para fechar

### Carregamento
- Preload: carregar próximas 2 fotos em background
- Lazy: versão média carregada sob demanda
- Placeholder: blur-up da thumbnail enquanto carrega

### Layout
- Full-screen overlay (fundo escuro 90% opacity)
- Foto centralizada, max-width/max-height respeitando viewport
- Barra inferior: ações (favoritar, download, comentar)
- Barra superior: contador, botão fechar
- Thumbnails strip (opcional, toggle)

### Mobile
- Swipe horizontal para navegar
- Swipe vertical para fechar
- Pinch-to-zoom
- Tap para toggle UI

### Performance
- Usar versão `media` (2048px) no lightbox
- Preload next/prev via `<link rel="preload">`
- Transição suave entre fotos (fade ou slide)

## Critérios de Aceite
- [ ] Lightbox abre ao clicar na thumbnail
- [ ] Navegação com setas funciona
- [ ] Zoom funciona (desktop + mobile)
- [ ] Swipe funciona no mobile
- [ ] Favoritar funciona dentro do lightbox
- [ ] Download funciona (se habilitado)
- [ ] Contador de fotos visível
- [ ] ESC fecha o lightbox
- [ ] Preload de próximas fotos
- [ ] Performance: sem lag na navegação

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-12: Lightbox/Visualizador.

1. Crie components/album/Lightbox.jsx: overlay fullscreen, navegação, zoom, ações.
2. Em AlbumView.jsx: integrar lightbox ao clicar na thumbnail.
3. Suporte mobile: swipe, pinch-to-zoom, tap toggle UI.
4. Preload próximas 2 fotos.
5. Ações: favoritar, download (se habilitado), contador.
6. Teclado: arrows, ESC.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
