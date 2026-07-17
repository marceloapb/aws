# ALB-08: Seleção de Fotos pelo Cliente

## Metadados
- **ID:** ALB-08
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Alto
- **Dependência:** ALB-07

## Contexto
O cliente acessa o álbum publicado e pode selecionar/favoritar fotos até uma cota definida. Ao confirmar a seleção, o admin é notificado. A seleção é a base para a entrega final (apenas as selecionadas serão tratadas/entregues em alta).

## Escopo
- `apps/backend/src/handlers/album/selecaoCliente.js` — NOVO
- `apps/frontend/src/pages/cliente/AlbumView.jsx` — adicionar lógica de seleção
- `apps/frontend/src/components/album/SelecaoBar.jsx` — NOVO (barra de progresso)
- API: POST /c/:slug/selecao, PUT /c/:slug/selecao/confirmar

## Fora de Escopo (NÃO TOCAR)
- Upload/processamento (P0)
- Publicação (ALB-07)
- Download (ALB-09)

## Spec Técnica

### Configuração (por álbum)
- `permite_selecao: boolean` — habilita/desabilita
- `cota_selecao: number` — máximo de fotos selecionáveis (ex: 50, 100)
- `selecao_confirmada: boolean` — true após cliente confirmar

### Fluxo
```
1. Cliente abre álbum publicado → vê fotos com botão favoritar (coração)
2. Cada click favorita/desfavorita uma foto
3. Barra de progresso: "X de {cota} selecionadas"
4. Ao atingir cota (ou antes): botão "Confirmar Seleção"
5. Confirmação é irreversível (ou requer contato com fotógrafo)
6. Após confirmar: admin notificado, seleção travada
```

### Backend — selecaoCliente.js
```js
// POST /c/:slug/selecao — toggle favoritar
{ foto_id: 'foto_001', selecionada: true }

// Validações:
- Album publicado e não expirado
- Seleção não confirmada ainda
- Se selecionada=true: verificar se cota não foi atingida

// PUT /c/:slug/selecao/confirmar
// Validações:
- Pelo menos 1 foto selecionada
- Seleção não confirmada ainda
// Ações:
- album.selecao_confirmada = true
- Notificar admin (email + push interno)
- Timestamp da confirmação
```

### Frontend — AlbumView.jsx (seleção)
- Coração em cada foto (toggle)
- Contador flutuante: "32 / 50 selecionadas"
- Barra de progresso visual
- Botão "Confirmar Seleção" (aparece quando >= 1)
- Modal de confirmação: "Você selecionou X fotos. Após confirmar, a seleção será enviada ao fotógrafo."
- Após confirmar: fotos marcadas com check verde, sem edição

### Frontend — SelecaoBar.jsx
- Sticky na parte inferior da tela
- Mostra: progresso (X/cota), botão confirmar
- Animação ao favoritar
- Cor muda quando atinge cota (amarelo → verde)

### Notificação ao Admin
- Canal: email + notificação in-app
- Template: "O cliente {nome} confirmou a seleção do álbum {titulo} ({X} fotos selecionadas)"

## Critérios de Aceite
- [ ] Favoritar/desfavoritar funciona
- [ ] Cota respeitada (não permite exceder)
- [ ] Barra de progresso X/cota
- [ ] Confirmação irreversível
- [ ] Admin notificado após confirmação
- [ ] Seleção travada após confirmar
- [ ] Funciona sem login (via slug)
- [ ] Modal de confirmação
- [ ] Persistência: seleção salva entre sessões

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-08: Seleção de Fotos pelo Cliente.

1. Crie handlers/album/selecaoCliente.js: toggle seleção, validar cota, confirmar seleção.
2. Em AlbumView.jsx: coração em cada foto, toggle, contador, botão confirmar.
3. Crie components/album/SelecaoBar.jsx: barra sticky com progresso e botão.
4. Após confirmação: travar seleção, notificar admin.
5. Rotas: POST /c/{slug}/selecao, PUT /c/{slug}/selecao/confirmar.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
