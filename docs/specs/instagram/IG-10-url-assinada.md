# IG-10: URL Assinada Temporária (S3 → Meta)

## Metadados
- **ID:** IG-10
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
A Graph API exige que a imagem esteja acessível via URL pública. Como as fotos estão em S3 privado, geramos uma URL assinada (presigned URL) temporária (15min) para a Meta baixar a imagem durante a criação do container.

## Escopo
- `apps/backend/src/services/s3Presign.js` — NOVO
- Usado por: IG-03, IG-04, IG-11

## Fora de Escopo (NÃO TOCAR)
- CloudFront signed URLs (para clientes — já existe)
- Upload de fotos (módulo Álbuns)
- Publicação (IG-03 consome este serviço)

## Spec Técnica

### Gerar URL Assinada
```js
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

async function gerarUrlAssinada(bucket, key, expiresIn = 900) {
  const client = new S3Client({})
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  const url = await getSignedUrl(client, command, { expiresIn })
  return url
}
```

### Parâmetros
| Param | Valor | Motivo |
|---|---|---|
| expiresIn | 900 (15min) | Tempo suficiente para Meta baixar |
| Bucket | process.env.MEDIA_BUCKET | Bucket de fotos dos álbuns |
| Key | path completo no S3 | Ex: albuns/alb_001/foto_001.jpg |

### Validações
- Verificar que o objeto existe antes de assinar (HeadObject)
- Se não existe: erro 404 "Foto não encontrada"
- Se key fora do tenant: erro 403 (tenant isolation)

### Segurança
```js
function validarKeyDoTenant(tenantId, key) {
  // Key deve começar com o prefixo do tenant
  const prefixoValido = `tenants/${tenantId}/`
  if (!key.startsWith(prefixoValido)) {
    throw new Error('ACESSO_NEGADO: Key fora do escopo do tenant')
  }
}
```

### IAM (Lambda)
```yaml
Policies:
  - Statement:
      - Effect: Allow
        Action:
          - s3:GetObject
          - s3:HeadObject
        Resource: !Sub 'arn:aws:s3:::${MediaBucket}/tenants/*'
```

## Critérios de Aceite
- [ ] URL assinada gerada com sucesso
- [ ] Expira em 15min
- [ ] Validação de existência do objeto
- [ ] Tenant isolation (não acessa fotos de outro tenant)
- [ ] IAM com privilégio mínimo
- [ ] Funciona com IG-03 (publish)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-10: URL Assinada Temporária.

1. Crie services/s3Presign.js: gerarUrlAssinada(bucket, key, expiresIn).
2. Validar existência (HeadObject) antes de assinar.
3. Tenant isolation: key deve começar com tenants/{tenantId}/.
4. Expira em 15min (900s).
5. IAM: s3:GetObject + s3:HeadObject no bucket de mídia.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
