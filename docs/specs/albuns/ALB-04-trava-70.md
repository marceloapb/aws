# ALB-04: Trava dos 70% — Bloquear Publicação se Pagamento < 70%

## Metadados
- **ID:** ALB-04
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Baixo
- **Dependência:** ALB-01

## Contexto
Regra de negócio crítica: o álbum NÃO pode ser publicado (tornado visível ao cliente) se o percentual de pagamento do contrato/orçamento associado for inferior a 70%. Isso protege o fotógrafo de entregar o trabalho sem receber.

## Escopo
- `apps/backend/src/handlers/album/publishAlbum.js` — NOVO (ou no updateAlbum)
- `apps/frontend/src/pages/admin/AlbumDetalhe.jsx` — feedback visual da trava
- DynamoDB: campo `percentual_pago` no ALBUM

## Fora de Escopo (NÃO TOCAR)
- Módulo Financeiro/Pagamentos (já fornece o %)
- Cálculo do percentual (vem do financeiro)
- Albuns.jsx (listagem)
- Outros módulos

## Spec Técnica

### Regra
```js
function podePublicar(album) {
  const TRAVA_MINIMA = 0.70 // 70%
  return album.percentual_pago >= TRAVA_MINIMA
}
```

### Backend — publishAlbum
1. Recebe request PUT /admin/albuns/:id/publicar
2. Busca álbum no DynamoDB
3. Busca percentual_pago do financeiro (ou campo no álbum atualizado por evento)
4. Se < 70%: retorna 403 com mensagem clara
5. Se >= 70%: atualiza status → "publicado", grava `disponivel_em`

### Sincronização do Percentual
- Quando um pagamento é registrado no financeiro, um evento (EventBridge ou DynamoDB Stream) atualiza o campo `percentual_pago` no ALBUM.
- Isso evita query cross-module no momento da publicação.

### Frontend — AlbumDetalhe.jsx
- Botão "Publicar Álbum":
  - Se >= 70%: botão ativo (verde)
  - Se < 70%: botão desabilitado (cinza) + tooltip: "Necessário 70% do pagamento (atual: XX%)"
- Barra de progresso visual do pagamento no topo
- Badge: "Trava: XX% pago" com cor (vermelho < 70%, verde >= 70%)

### Configuração do Percentual
- Default: 70% (global)
- Futuro: permitir override por álbum (exceção manual do admin)
- Configuração em: ConfigEmpresa → aba Álbuns/Entrega

## Critérios de Aceite
- [ ] Publicação bloqueada quando < 70% pago
- [ ] Retorna 403 com mensagem "Pagamento insuficiente (XX%)"
- [ ] Publicação permitida quando >= 70%
- [ ] Botão desabilitado visualmente no frontend
- [ ] Tooltip mostra percentual atual
- [ ] Barra de progresso de pagamento visível
- [ ] Percentual sincronizado via evento do financeiro
- [ ] Percentual padrão (70%) configurável globalmente

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-04: Trava dos 70%.

1. Crie/atualize handler publishAlbum: verificar percentual_pago >= 70% antes de publicar.
2. Se < 70%: retornar 403 com mensagem clara.
3. Em AlbumDetalhe.jsx: botão desabilitado + tooltip + barra de progresso.
4. Sincronizar percentual_pago via evento do financeiro (DynamoDB Stream ou EventBridge).
5. Rota: PUT /admin/albuns/:id/publicar.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
