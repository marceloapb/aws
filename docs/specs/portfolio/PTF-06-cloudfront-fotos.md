# PTF-06 — CloudFront para Servir Fotos do Portfólio

**TIPO:** Melhoria  
**PRIORIDADE:** P2  
**IMPACTO:** Médio — performance + proteção leve  
**ESFORÇO:** Médio  

## CONTEXTO

Fotos do portfólio são conteúdo público (vitrine), mas servir direto do S3 é mais caro e lento. CloudFront na frente do bucket com origin access control (OAC) — o bucket fica privado, o CDN serve. Sem URLs assinadas aqui (diferente do álbum), pois portfólio é público por natureza.

## ESCOPO

- `template.yaml` — CloudFront Distribution + OAC + BucketPolicy
- Env var `CDN_BASE_URL` injetada nas Lambdas que montam URLs públicas

## FORA DE ESCOPO (NÃO TOCAR)

- Bucket de álbuns (privado, URLs assinadas — outro módulo)
- Lambdas de processamento (só usam S3 direto)
- Frontend

## SPEC TÉCNICA

**CloudFront Distribution (SAM):**
- Origin: bucket `mbf-media-${Stage}`, path pattern `/1/portfolio/*`
- Origin Access Control (OAC) — substitui OAI legado.
- BucketPolicy: AllowCloudFrontServicePrincipal para GetObject no prefixo `1/portfolio/*/web.jpg` e `1/portfolio/*/thumb.jpg`.
- Default TTL: 86400 (1 dia). O conteúdo do portfólio muda raramente.
- Cache Policy: CachingOptimized (managed).
- Viewer Protocol: redirect-to-https.
- Price Class: PriceClass_100 (mais barato, NA+EU suficiente pro BR).

**BucketPolicy (adicionar ao bucket existente):**
```json
{
  "Effect": "Allow",
  "Principal": { "Service": "cloudfront.amazonaws.com" },
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::mbf-media-${Stage}/1/portfolio/*/web.jpg",
  "Condition": { "StringEquals": { "AWS:SourceArn": "<DistributionArn>" } }
}
```
(Repetir para `*/thumb.jpg`.)

**Env var:** `CDN_BASE_URL = https://<distribution-domain>` → injetada via `!GetAtt Distribution.DomainName` no SAM.

**Invalidação (futuro):** ao excluir ou substituir foto, criar invalidation `/1/portfolio/{cat}/{foto}/*`. Pode ser feito na Lambda de excluir (PTF-04) — item de refinamento, não bloqueia.

## CRITÉRIOS DE ACEITE

1. Fotos acessíveis via `https://<cdn>/1/portfolio/{cat}/{foto}/web.jpg`.
2. Acesso direto ao S3 (sem CDN) retorna 403.
3. HTTPS obrigatório.
4. TTL de 1 dia verificável via header `Age`.
5. CDN_BASE_URL disponível como variável de ambiente nas Lambdas que montam URL pública.

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente o CloudFront para servir fotos do portfólio conforme spec PTF-06. No template.yaml: crie CloudFront Distribution com OAC apontando para o bucket mbf-media-${Stage}, path pattern /1/portfolio/*, cache TTL 86400, PriceClass_100, redirect-to-https. Adicione BucketPolicy permitindo GetObject do CloudFront nos sufixos web.jpg e thumb.jpg. Exporte CDN_BASE_URL (DomainName da distribution) como env var para as funções que montam URL pública (listar-portfolio). ALTERE SOMENTE template.yaml; não refatore, renomeie ou mexa em mais nada.
```
