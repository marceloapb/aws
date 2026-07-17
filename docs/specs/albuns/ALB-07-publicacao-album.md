# ALB-07: Publicação do Álbum

## Metadados
- **ID:** ALB-07
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** ALB-04

## Contexto
Após aprovação da trava dos 70% (ALB-04), o álbum é publicado: ganha um slug único, URL compartilhável, data de disponibilização e notificação ao cliente.

## Escopo
- `apps/backend/src/handlers/album/publicarAlbum.js` — já esboçado em ALB-04, completar
- `apps/frontend/src/pages/admin/AlbumDetalhe.jsx` — link compartilhável, QR code
- `apps/frontend/src/pages/cliente/AlbumView.jsx` — NOVO (vitrine do cliente)
- API: GET /c/:slug (rota pública)

## Fora de Escopo (NÃO TOCAR)
- Trava dos 70% (ALB-04 — já implementada)
- Upload/processamento
- Download (ALB-09)

## Spec Técnica

### Slug
- Formato: `{titulo-sanitizado}-{random6}` (ex: casamento-ana-joao-a7b3c1)
- Único globalmente (verificar antes de salvar)
- Imutável após publicação

### URL Pública
- Formato: `https://app.dominio.com.br/c/{slug}`
- Não requer login do cliente (link direto)
- Opcionalmente: proteger com senha (campo `senha_album`)

### Backend
```js
// Completar publicarAlbum.js:
// 1. Gerar slug
// 2. Verificar unicidade
// 3. Atualizar status → publicado
// 4. Gravar disponivel_em
// 5. Disparar notificação (email/WhatsApp)
// 6. Retornar slug + URL
```

### Frontend — AlbumDetalhe.jsx (admin)
- Após publicação:
  - Exibir URL do álbum (copiável)
  - Botão "Copiar Link"
  - QR Code gerado (para impressão)
  - Botão "Despublicar" (reverter para 'pronto')
  - Botão "Compartilhar via WhatsApp" (pré-formata mensagem)

### Frontend — AlbumView.jsx (cliente)
- Rota pública: /c/:slug
- Layout: capa + galerias + fotos em grid
- Verificações:
  - Se expirado: mensagem "Álbum indisponível"
  - Se protegido por senha: pedir senha antes
  - Se disponivel_em > now(): "Disponível em {data}"
- Sem header admin / sem menu

### Notificação ao Cliente
- Canal: email (SES) + WhatsApp (se configurado)
- Template: "Seu álbum {titulo} está disponível! Acesse: {url}"
- Variáveis: {nome_cliente}, {titulo}, {url}, {prazo_expiracao}

## Critérios de Aceite
- [ ] Slug gerado e único
- [ ] URL pública funciona sem login
- [ ] Link copiável no admin
- [ ] QR code gerado
- [ ] Despublicar funciona
- [ ] Notificação enviada (email)
- [ ] AlbumView.jsx renderiza galerias e fotos
- [ ] Verificação de expiração funciona
- [ ] Senha opcional funciona
- [ ] Botão WhatsApp funciona

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-07: Publicação do Álbum.

1. Completar publicarAlbum.js: gerar slug único, atualizar status, gravar disponivel_em.
2. Em AlbumDetalhe.jsx: exibir URL, copiar link, QR code, despublicar, compartilhar WhatsApp.
3. Crie pages/cliente/AlbumView.jsx: rota pública /c/:slug, verificar expiração/senha, exibir galerias.
4. Notificação via SES ao cliente.
5. SAM: rota GET /c/{slug} (pública, sem auth).

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
