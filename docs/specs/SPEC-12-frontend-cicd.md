# SPEC-12 — Frontend Deploy S3 + CloudFront + GitHub Actions

**ID:** 12  
**TIPO:** Melhoria  
**PRIORIDADE:** P2  
**IMPACTO:** Operacional | **ESFORÇO:** Baixo  

## CONTEXTO

Frontend Vite+Tailwind gera build estático. Deploy ideal: S3 + CloudFront. Automatizar via GitHub Actions.

## ESCOPO

- Criar `.github/workflows/deploy-frontend.yml`
- Configurar S3 bucket para hosting estático no template
- CloudFront distribution para o frontend (SPA)

## FORA DE ESCOPO (NÃO TOCAR)

- Backend deploy (SPEC-14)
- Código do frontend
- Outras workflows existentes

## SPEC TÉCNICA

- Trigger: push na branch `main` com changes em `apps/web/**`
- Steps: checkout → setup node → npm ci → npm run build → aws s3 sync → cloudfront invalidation
- S3 bucket: `horizons-web-{stage}`
- CloudFront: SPA config (redirect 404 → index.html)

## CRITÉRIOS DE ACEITE

- Push em `apps/web/` dispara deploy automático
- Site acessível via CloudFront URL
- Cache invalidado após deploy

## PROMPT PRONTO PARA O KIRO CLI

```
Crie pipeline de deploy automático para o frontend.

1. Crie `.github/workflows/deploy-frontend.yml`:
   ```yaml
   name: Deploy Frontend
   on:
     push:
       branches: [main]
       paths: ['apps/web/**']

   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
         - run: cd apps/web && npm ci && npm run build
         - uses: aws-actions/configure-aws-credentials@v4
           with:
             aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
             aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
             aws-region: sa-east-1
         - run: aws s3 sync apps/web/dist s3://${{ vars.WEB_BUCKET_NAME }} --delete
         - run: aws cloudfront create-invalidation --distribution-id ${{ vars.CF_DISTRIBUTION_ID }} --paths "/*"
   ```

2. No `template.yaml`, adicione bucket e CDN para frontend:
   ```yaml
   WebBucket:
     Type: AWS::S3::Bucket
     Properties:
       BucketName: !Sub ${AWS::StackName}-web

   WebCDN:
     Type: AWS::CloudFront::Distribution
     Properties:
       DistributionConfig:
         Origins:
           - DomainName: !GetAtt WebBucket.RegionalDomainName
             Id: WebS3Origin
             OriginAccessControlId: !Ref WebOAC
             S3OriginConfig:
               OriginAccessIdentity: ''
         DefaultCacheBehavior:
           TargetOriginId: WebS3Origin
           ViewerProtocolPolicy: redirect-to-https
           CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
         CustomErrorResponses:
           - ErrorCode: 404
             ResponseCode: 200
             ResponsePagePath: /index.html
         DefaultRootObject: index.html
         Enabled: true

   WebOAC:
     Type: AWS::CloudFront::OriginAccessControl
     Properties:
       OriginAccessControlConfig:
         Name: HorizonsWebOAC
         OriginAccessControlOriginType: s3
         SigningBehavior: always
         SigningProtocol: sigv4
   ```

Altere SOMENTE: `.github/workflows/deploy-frontend.yml` (criar), `template.yaml`. Não refatore, renomeie ou mexa em mais nada.
```
