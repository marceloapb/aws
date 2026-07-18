# STP-11 — Migração Domínio + Redirects Wix

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | STP-11 |
| **Tipo** | Melhoria |
| **Prioridade** | P3 |
| **Impacto** | Alto — sem isso, SEO acumulado do Wix se perde |
| **Esforço** | Alto (depende de DNS, CloudFront, mapeamento de URLs) |

## Contexto
O domínio atual (marcelobloisefotografia.com.br) está no Wix desde 2015. Ao cortar para o novo sistema, precisa de: (1) apontar DNS para CloudFront, (2) certificado SSL via ACM, (3) redirects 301 das URLs antigas do Wix para as novas (preserva juice de SEO). Provedor de DNS: Hostinger.

## Escopo
- **DNS (Hostinger):** apontar A/CNAME para distribuição CloudFront
- **ACM:** certificado SSL para o domínio (us-east-1, obrigatório para CloudFront)
- **CloudFront:** distribuição com domínio custom + certificado + origin S3
- **Lambda@Edge ou CloudFront Functions:** regras de redirect 301 para URLs antigas do Wix
- **Mapeamento de URLs:** tabela Wix→Novo (ex: /casamentos → /portfolio/casamento)
- **SAM:** recurso CloudFront + ACM no template.yaml

## Fora de Escopo (NÃO TOCAR)
- Conteúdo do site (STP-01 a STP-09)
- DNS de e-mail (SES, MX — já configurado separado)
- Subdomínio admin (se houver)
- Google Search Console (manual do admin após migração)

## Spec Técnica

### DNS (Hostinger)
```
Tipo    Nome                      Valor
CNAME   www                       d1234567.cloudfront.net
A       @                         (alias para CloudFront via redirect)
```
Nota: registro A raiz pode exigir redirect via Hostinger para www (CNAME flattening não é universal).

### ACM (us-east-1)
- Domínio: marcelobloisefotografia.com.br + *.marcelobloisefotografia.com.br
- Validação: DNS (CNAME de validação na Hostinger)
- Nota: bloise.com.br é o domínio principal do usuário, pode ser adicionado como SAN

### CloudFront
```yaml
# template.yaml (trecho)
SiteDistribution:
  Type: AWS::CloudFront::Distribution
  Properties:
    DistributionConfig:
      Aliases:
        - marcelobloisefotografia.com.br
        - www.marcelobloisefotografia.com.br
      ViewerCertificate:
        AcmCertificateArn: !Ref SiteCertificate
        SslSupportMethod: sni-only
      DefaultCacheBehavior:
        ViewerProtocolPolicy: redirect-to-https
      Origins:
        - DomainName: !GetAtt SiteBucket.DomainName
          S3OriginConfig:
            OriginAccessIdentity: ...
```

### Redirects 301 (CloudFront Function)
```javascript
// Mapeamento URLs Wix → Novo
var redirects = {
  '/casamentos': '/portfolio/casamento',
  '/aniversarios': '/portfolio/aniversario',
  '/ensaios': '/portfolio/ensaio',
  '/sobre': '/sobre',
  '/contato': '/contato',
  '/blog': '/novidades',
  '/blog/*': '/novidades'  // posts individuais exigem mapeamento por slug
};
// Se URL match → 301 redirect; senão → passa adiante
```

### Checklist de Migração (ordem)
1. Certificado ACM emitido e validado
2. CloudFront criado com domínio custom
3. Testar acesso via CloudFront URL (d1234567.cloudfront.net)
4. Configurar redirects 301 (CloudFront Function)
5. Apontar DNS na Hostinger
6. Validar HTTPS + redirects
7. Submeter novo sitemap no Google Search Console
8. Monitorar 404s por 30 dias (CloudWatch + alarme)

## Critérios de Aceite
- Site acessível via HTTPS no domínio final
- URLs antigas do Wix retornam 301 para as novas correspondentes
- URL sem mapeamento → serve 404 custom (não 403 do S3)
- Certificado SSL válido e auto-renovável (ACM)
- www e raiz funcionam (com redirect canônico www→raiz ou vice-versa)

## Prompt Pronto para o Kiro CLI
```
Implemente a spec STP-11 (Migração Domínio + Redirects Wix).

Crie/modifique:
1. template.yaml — adicionar recurso AWS::CloudFront::Distribution com domínio custom + ACM
2. template.yaml — adicionar AWS::CertificateManager::Certificate (us-east-1)
3. src/functions/edge/redirectsWix.js — CloudFront Function com mapeamento 301
4. docs/runbook/migracao-dominio.md — checklist passo a passo (DNS Hostinger, validação, cutover)

Domínio: marcelobloisefotografia.com.br (+ www). Provedor DNS: Hostinger.
Redirects: /casamentos→/portfolio/casamento, /blog→/novidades, etc.
Fallback: URL sem match → passa para origin (SPA router).

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
