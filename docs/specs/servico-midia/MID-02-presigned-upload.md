# MID-02 — Presigned URL de Upload (por contexto)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | MID-02 |
| **Tipo** | Feature |
| **Prioridade** | P0 |
| **Impacto** | Alto — gateway de entrada de toda mídia |
| **Esforço** | Médio |

## Contexto
Toda mídia entra no sistema via presigned PUT URL. O browser sobe direto pro S3, sem passar pela Lambda (zero bandwidth cost). A Lambda apenas valida contexto, tipo, tamanho e gera a URL com metadados corretos.

## Escopo
- **Lambda:** `getUploadUrl` — gera presigned PUT URL baseado no contexto
- **API Gateway:** `POST /admin/media/upload-url` (admin) + `POST /cliente/media/upload-url` (cliente, só perfil)
- **Contextos:** album, portfolio, novidades, perfil, config
- **Validações:** tipo MIME (image/jpeg, image/png, image/webp), tamanho max por contexto, extensão
- **Chave S3:** monta path correto por contexto/tenant/entidade

## Fora de Escopo (NÃO TOCAR)
- Upload de fato (browser → S3 direto)
- Processamento pós-upload (MID-03)
- Registro de mídia no DynamoDB (MID-04, disparado pelo processamento)
- Vídeo

## Spec Técnica

### Lambda getUploadUrl
- Auth: JWT (admin ou cliente dependendo da rota)
- Body:
```json
{
  "contexto": "album",
  "entidade_id": "ev123",
  "filename": "DSC_0001.jpg",
  "content_type": "image/jpeg",
  "size_bytes": 15000000
}
```
- Validação por contexto:

| Contexto | Bucket | Max Size | Tipos | Sufixo Gerado |
|---|---|---|---|---|
| album | private | 50MB | jpeg, png | -original |
| portfolio | public | 30MB | jpeg, png, webp | -original |
| novidades | public | 10MB | jpeg, png, webp | -original |
| perfil | public | 5MB | jpeg, png | -original |
| config | public | 2MB | jpeg, png, svg+xml | (sem sufixo) |

- Chave gerada:
```
{tenant_id}/{contexto}/{entidade_id}/{ulid}-original.{ext}
```
- Retorna:
```json
{
  "upload_url": "https://mbf-media-private-123.s3.amazonaws.com/1/album/ev123/01J...-original.jpg?X-Amz-...",
  "key": "1/album/ev123/01J5ABC-original.jpg",
  "expires_in": 300
}
```

### Presigned PUT Config
- TTL: 5 minutos
- Content-Type: forçado (deve match no upload)
- Content-Length: max size por contexto
- Metadata: `x-amz-meta-tenant`, `x-amz-meta-contexto`, `x-amz-meta-entidade`

## Critérios de Aceite
- Content-type inválido → 400 + mensagem clara
- Size acima do max → 400
- Contexto inválido → 400
- URL gerada permite upload direto do browser
- Upload com content-type diferente do presigned → 403 do S3
- Chave segue padrão multi-tenant
- Admin pode gerar para qualquer contexto; cliente só para perfil

## Prompt Pronto para o Kiro CLI
```
Implemente a spec MID-02 (Presigned URL de Upload por contexto).

Crie:
1. src/functions/media/getUploadUrl/index.mjs — valida contexto/tipo/tamanho, gera presigned PUT
2. Rotas POST /admin/media/upload-url e POST /cliente/media/upload-url no template.yaml
3. IAM role com s3:PutObject nos dois buckets (paths restritos por tenant)

Contextos: album (private, 50MB), portfolio/novidades (public, 30/10MB), perfil (public, 5MB), config (public, 2MB).
Chave: {tenant}/{contexto}/{entidade}/{ulid}-original.{ext}. TTL 5min.
Metadata S3: tenant, contexto, entidade.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
