# MID-01 — Buckets S3 + CloudFront (Infra Base)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | MID-01 |
| **Tipo** | Feature |
| **Prioridade** | P0 |
| **Impacto** | Alto — tudo depende desta infra |
| **Esforço** | Médio |

## Contexto
Dois buckets S3 (privado + público) com políticas de acesso distintas. CloudFront na frente do bucket público para cache e performance global. OAC (Origin Access Control) garante que ninguém acessa o bucket diretamente.

## Escopo
- **S3:** bucket `mbf-media-private` (Block Public Access = ON, sem website hosting)
- **S3:** bucket `mbf-media-public` (Block Public Access = ON, acesso só via CloudFront OAC)
- **CloudFront:** distribuição com OAC apontando para `mbf-media-public`
- **SAM:** recursos no template.yaml
- **Encryption:** SSE-S3 (custo zero)
- **CORS:** configuração para upload via browser (presigned PUT)

## Fora de Escopo (NÃO TOCAR)
- Presigned URLs (MID-02 e MID-05)
- Processamento de imagem (MID-03)
- Lifecycle rules (MID-07)
- Domínio custom no CloudFront (STP-11)

## Spec Técnica

### S3 Bucket Privado
```yaml
MediaPrivateBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: !Sub "mbf-media-private-${AWS::AccountId}"
    PublicAccessBlockConfiguration:
      BlockPublicAcls: true
      BlockPublicPolicy: true
      IgnorePublicAcls: true
      RestrictPublicBuckets: true
    BucketEncryption:
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault:
            SSEAlgorithm: AES256
    CorsConfiguration:
      CorsRules:
        - AllowedHeaders: ["*"]
          AllowedMethods: [PUT]
          AllowedOrigins: ["https://*.marcelobloisefotografia.com.br", "http://localhost:*"]
          MaxAge: 3600
    NotificationConfiguration:
      QueueConfigurations:
        - Event: "s3:ObjectCreated:*"
          Filter:
            S3Key:
              Rules:
                - Name: suffix
                  Value: "-original"
          Queue: !GetAtt MediaProcessingQueue.Arn
```

### S3 Bucket Público
```yaml
MediaPublicBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: !Sub "mbf-media-public-${AWS::AccountId}"
    PublicAccessBlockConfiguration:
      BlockPublicAcls: true
      BlockPublicPolicy: true
      IgnorePublicAcls: true
      RestrictPublicBuckets: true
    BucketEncryption:
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault:
            SSEAlgorithm: AES256
```

### CloudFront + OAC
```yaml
MediaCDN:
  Type: AWS::CloudFront::Distribution
  Properties:
    DistributionConfig:
      Origins:
        - DomainName: !GetAtt MediaPublicBucket.DomainName
          Id: S3PublicOrigin
          S3OriginConfig:
            OriginAccessIdentity: ""
          OriginAccessControlId: !GetAtt MediaOAC.Id
      DefaultCacheBehavior:
        TargetOriginId: S3PublicOrigin
        ViewerProtocolPolicy: redirect-to-https
        CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6"
        Compress: true
      Enabled: true
      HttpVersion: http2and3

MediaOAC:
  Type: AWS::CloudFront::OriginAccessControl
  Properties:
    OriginAccessControlConfig:
      Name: mbf-media-oac
      OriginAccessControlOriginType: s3
      SigningBehavior: always
      SigningProtocol: sigv4
```

### Política do Bucket Público
```yaml
MediaPublicBucketPolicy:
  Type: AWS::S3::BucketPolicy
  Properties:
    Bucket: !Ref MediaPublicBucket
    PolicyDocument:
      Statement:
        - Effect: Allow
          Principal:
            Service: cloudfront.amazonaws.com
          Action: s3:GetObject
          Resource: !Sub "${MediaPublicBucket.Arn}/*"
          Condition:
            StringEquals:
              AWS:SourceArn: !Sub "arn:aws:cloudfront::${AWS::AccountId}:distribution/${MediaCDN}"
```

## Critérios de Aceite
- Bucket privado: Block Public Access ON, nenhum acesso direto
- Bucket público: acesso SOMENTE via CloudFront (403 se acessar URL do S3)
- CloudFront serve imagens com HTTPS + compressão
- CORS permite upload via presigned PUT do domínio
- Encryption at rest habilitado (SSE-S3)
- S3 Event no privado dispara para fila SQS (MID-03)

## Prompt Pronto para o Kiro CLI
```
Implemente a spec MID-01 (Buckets S3 + CloudFront — infra base de mídia).

Crie/modifique:
1. template.yaml — recurso MediaPrivateBucket (S3, Block Public, CORS, Event→SQS)
2. template.yaml — recurso MediaPublicBucket (S3, Block Public)
3. template.yaml — recurso MediaCDN (CloudFront + OAC) + BucketPolicy
4. template.yaml — Output com CDN domain name

Privado: CORS para PUT, event notification para fila SQS (suffix -original).
Público: acesso só via CloudFront OAC. Encryption: SSE-S3 em ambos.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
