# ALB-13: Watermark Automático

## Metadados
- **ID:** ALB-13
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** ALB-03

## Contexto
Antes do pagamento completo, as fotos exibidas ao cliente devem ter watermark (marca d'água) para proteger o trabalho do fotógrafo. O watermark é aplicado nas versões média e thumb; o original permanece intacto.

## Escopo
- `apps/backend/src/handlers/album/processarFoto.js` — ALTERAR (adicionar watermark)
- `apps/backend/src/config/watermark.js` — NOVO (configuração)
- S3: imagem do watermark em path dedicado
- DynamoDB: campo `watermark_aplicado: boolean` na FOTO

## Fora de Escopo (NÃO TOCAR)
- Frontend (fotos já exibem a versão com watermark)
- Original no S3 (nunca alterado)
- Publicação/download

## Spec Técnica

### Configuração do Watermark
```json
{
  "watermark_ativo": true,
  "watermark_tipo": "imagem",
  "watermark_s3_key": "config/watermark.png",
  "watermark_posicao": "center",
  "watermark_opacidade": 0.3,
  "watermark_tamanho_percentual": 40,
  "watermark_remover_apos_pagamento": true
}
```

### Posições Disponíveis
| Posição | Descrição |
|---|---|
| center | Centro da imagem |
| bottom-right | Canto inferior direito |
| bottom-left | Canto inferior esquerdo |
| diagonal | Repetido em diagonal |
| tiled | Repetido em grid |

### Aplicação (no processarFoto.js)
```js
// Após gerar versões média e thumb:
if (config.watermark_ativo) {
  const watermarkBuffer = await s3.getObject(config.watermark_s3_key)
  
  const mediaComWm = await sharp(mediaBuffer)
    .composite([{
      input: watermarkBuffer,
      gravity: config.watermark_posicao,
      blend: 'over'
    }])
    .toBuffer()
  
  // Salvar versão com watermark no path padrão (media/ e thumb/)
  // Original NÃO é alterado
}
```

### Remoção do Watermark
- Quando pagamento atinge 100% (ou threshold configurável):
  - Re-processar fotos SEM watermark
  - Atualizar URLs no DynamoDB
  - Ou: manter 2 versões (com/sem WM) e trocar URL servida

### Upload do Watermark (Admin)
- Em ConfigEmpresa → aba Álbuns/Entrega
- Upload de PNG transparente
- Preview em tempo real sobre foto de exemplo
- Salvos em: `{tenant_id}/config/watermark.png`

## Critérios de Aceite
- [ ] Watermark aplicado na versão média
- [ ] Watermark aplicado na versão thumb
- [ ] Original NUNCA alterado
- [ ] Posição configurável
- [ ] Opacidade configurável
- [ ] Preview no admin
- [ ] Toggle ativo/inativo
- [ ] Remoção automática após pagamento completo
- [ ] Upload de watermark customizado

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-13: Watermark Automático.

1. Em processarFoto.js: após gerar média/thumb, aplicar watermark com sharp.composite().
2. Crie config/watermark.js: configuração (posição, opacidade, tamanho).
3. Upload do watermark PNG em ConfigEmpresa.
4. Remoção automática: re-processar sem WM após pagamento 100%.
5. Original NUNCA é alterado.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
