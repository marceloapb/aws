# ALB-04: Trava dos 70% — Bloquear Publicação

## Metadados
- **ID:** ALB-04
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Baixo
- **Dependência:** ALB-01

## Contexto
Regra de negócio crítica: o álbum só pode ser publicado (disponibilizado ao cliente) se o percentual pago do contrato/orçamento associado for >= 70%. Isso protege o fotógrafo de entregar trabalho sem pagamento adequado.

## Escopo
- `apps/backend/src/handlers/album/publicarAlbum.js` — NOVO
- `apps/frontend/src/pages/admin/AlbumDetalhe.jsx` — botão publicar com validação
- API: POST /admin/albuns/:id/publicar

## Fora de Escopo (NÃO TOCAR)
- Cálculo de percentual pago (já existe no módulo Financeiro)
- Albuns.jsx (listagem)
- Processamento de fotos

## Spec Técnica

### Regra
```
SE album.status == 'pronto' E percentual_pago >= 70%:
  → Permitir publicação
  → album.status = 'publicado'
  → album.disponivel_em = now()
  → Gerar slug único
  → Disparar notificação ao cliente

SE percentual_pago < 70%:
  → Bloquear (HTTP 422)
  → Retornar: { error: 'pagamento_insuficiente', percentual_atual, percentual_minimo: 70 }
```

### Backend — publicarAlbum
```js
async function handler(event) {
  const { albumId } = event.pathParameters
  const album = await getAlbum(albumId)
  
  // Validações
  if (album.status !== 'pronto') throw new Error('album_nao_pronto')
  if (album.total_fotos === 0) throw new Error('album_vazio')
  
  // Buscar percentual pago do orçamento/contrato
  const percentual = await getPercentualPago(album.orcamento_id)
  
  if (percentual < 70) {
    return {
      statusCode: 422,
      body: JSON.stringify({
        error: 'pagamento_insuficiente',
        percentual_atual: percentual,
        percentual_minimo: 70,
        mensagem: `Pagamento em ${percentual}%. Mínimo para publicar: 70%.`
      })
    }
  }
  
  // Publicar
  await updateAlbum(albumId, {
    status: 'publicado',
    disponivel_em: new Date().toISOString(),
    slug: gerarSlug(album.titulo)
  })
  
  // Disparar notificação
  await notificarCliente(album.cliente_id, 'album_publicado', { album })
  
  return { statusCode: 200, body: JSON.stringify({ success: true, slug: album.slug }) }
}
```

### Frontend — AlbumDetalhe.jsx
- Botão "Publicar Álbum" (verde) — só visível se status == 'pronto'
- Se % < 70: botão desabilitado + tooltip com percentual atual
- Badge com percentual pago sempre visível
- Modal de confirmação antes de publicar
- Após sucesso: exibir link do álbum para compartilhar

### Percentual Pago
- Consulta: GET /admin/orcamentos/:id/pagamentos-resumo
- Retorno: `{ total, pago, percentual }`
- Se álbum não tem orcamento_id: admin define manualmente

## Critérios de Aceite
- [ ] Publicação bloqueada se % < 70 (HTTP 422)
- [ ] Mensagem clara com percentual atual vs mínimo
- [ ] Botão desabilitado no frontend com tooltip
- [ ] Badge de percentual visível no detalhe
- [ ] Publicação funciona se % >= 70
- [ ] Status muda para 'publicado'
- [ ] disponivel_em preenchido
- [ ] Slug gerado (único)
- [ ] Notificação ao cliente disparada
- [ ] Modal de confirmação antes de publicar

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-04: Trava dos 70%.

1. Crie handlers/album/publicarAlbum.js: validar status, buscar percentual pago, bloquear se < 70%, publicar se OK.
2. Em AlbumDetalhe.jsx: botão publicar com validação, badge percentual, tooltip, modal confirmação.
3. Rota POST /admin/albuns/{id}/publicar no SAM.
4. Notificação ao cliente após publicação.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
