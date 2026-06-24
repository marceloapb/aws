# SPEC-11 — CloudFront Signed URLs para Entrega de Álbuns

**ID:** 11  
**TIPO:** Feature  
**PRIORIDADE:** P2  
**IMPACTO:** Segurança | **ESFORÇO:** Médio  

## CONTEXTO

Fotos de clientes no S3 precisam de controle de acesso. Sem signed URLs/cookies, qualquer pessoa com o link acessa as fotos. CloudFront signed URLs garantem acesso temporário e controlado.

## ESCOPO

- `apps/api/src/services/s3Service.js` → adicionar método `generateViewUrl()`
- `apps/api/src/routes/client-albuns.js` → retornar URLs assinadas nas fotos do álbum
- `template.yaml` → CloudFront Distribution com OAC para o bucket

## FORA DE ESCOPO (NÃO TOCAR)

- Upload (SPEC-10)
- Admin view (admin pode ter acesso direto)
- Frontend

## SPEC TÉCNICA

- CloudFront Distribution com Origin Access Control (OAC) para S3
- Key pair para assinatura: armazenar private key no SSM SecureString
- `@aws-sdk/cloudfront-signer` para gerar signed URLs
- Expiração: 24h para visualização, 1h para download
- Endpoint: `GET /client/albuns/:id/fotos` retorna array com `signedUrl` por foto

## CRITÉRIOS DE ACEITE

- Fotos acessíveis apenas via signed URL
- URL expira após período configurado
- Acesso direto ao S3 retorna 403

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente entrega segura de fotos via CloudFront signed URLs.

1. Em `apps/api/src/services/s3Service.js`, adicione:
   ```js
   const { getSignedUrl } = require('@aws-sdk/cloudfront-signer');

   function generateViewUrl(key, expiresInHours = 24) {
     const url = `${process.env.CLOUDFRONT_DOMAIN}/${key}`;
     const signedUrl = getSignedUrl({
       url,
       keyPairId: process.env.CF_KEY_PAIR_ID,
       privateKey: process.env.CF_PRIVATE_KEY,
       dateLessThan: new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString(),
     });
     return signedUrl;
   }
   ```

2. Em `apps/api/src/routes/client-albuns.js`, no endpoint que lista fotos do álbum:
   - Para cada foto, gere `signedUrl` via `generateViewUrl(foto.s3Key)`
   - Retorne no response: `{ ...foto, url: signedUrl }`

3. No `template.yaml`, adicione CloudFront Distribution:
   ```yaml
   FotosCDN:
     Type: AWS::CloudFront::Distribution
     Properties:
       DistributionConfig:
         Origins:
           - DomainName: !GetAtt FotosBucket.RegionalDomainName
             Id: S3Origin
             OriginAccessControlId: !Ref FotosOAC
             S3OriginConfig:
               OriginAccessIdentity: ''
         DefaultCacheBehavior:
           TargetOriginId: S3Origin
           ViewerProtocolPolicy: redirect-to-https
           TrustedKeyGroups:
             - !Ref CFKeyGroup
         Enabled: true

   FotosOAC:
     Type: AWS::CloudFront::OriginAccessControl
     Properties:
       OriginAccessControlConfig:
         Name: HorizonsOAC
         OriginAccessControlOriginType: s3
         SigningBehavior: always
         SigningProtocol: sigv4
   ```

4. Adicione `@aws-sdk/cloudfront-signer` ao `package.json`.

5. Adicione env vars `CLOUDFRONT_DOMAIN`, `CF_KEY_PAIR_ID` ao template (valores via SSM).

Altere SOMENTE: `apps/api/src/services/s3Service.js`, `apps/api/src/routes/client-albuns.js`, `template.yaml`, `apps/api/package.json`. Não refatore, renomeie ou mexa em mais nada.
```
