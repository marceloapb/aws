# SPEC-06 — Criar template.yaml SAM

**ID:** 06  
**TIPO:** Melhoria  
**PRIORIDADE:** P1  
**IMPACTO:** Operacional | **ESFORÇO:** Médio  

## CONTEXTO

`infra/cloudformation.yml` é genérico e não define Lambda/APIGW/DynamoDB. Precisa de um `template.yaml` SAM completo como fundação IaC.

## ESCOPO

- Criar `apps/api/template.yaml` (SAM)
- Definir: HTTP API, Lambda principal, DynamoDB Table, S3 Bucket, Cognito User Pool
- `infra/cloudformation.yml` → manter como referência mas marcar como deprecated

## FORA DE ESCOPO (NÃO TOCAR)

- Frontend deploy (SPEC-12)
- Jobs (SPEC-05 adiciona ao template)
- Código de aplicação

## SPEC TÉCNICA

- Transform: `AWS::Serverless-2016-10-31`
- Globals: Runtime `nodejs20.x`, Timeout 30, MemorySize 256, Tracing Active
- ApiFunction: Handler `src/handler.handler`, Events: HttpApi catch-all `/{proxy+}`
- DynamoDB: `HorizonsTable`, PAY_PER_REQUEST, PK/SK + 2 GSIs
- S3: `HorizonsFotosBucket`, private, lifecycle rule 365 dias para IA
- Cognito: UserPool `HorizonsUserPool` com email como username
- Outputs: ApiUrl, TableName, BucketName, UserPoolId

## CRITÉRIOS DE ACEITE

- `sam validate` passa sem erros
- `sam build` compila com sucesso
- `sam deploy --guided` cria stack funcional

## PROMPT PRONTO PARA O KIRO CLI

```
Crie o template SAM completo para o backend serverless.

1. Crie `apps/api/template.yaml` com:
   ```yaml
   AWSTemplateFormatVersion: '2010-09-09'
   Transform: AWS::Serverless-2016-10-31
   Description: Horizons Photography System - Serverless Backend

   Globals:
     Function:
       Runtime: nodejs20.x
       Timeout: 30
       MemorySize: 256
       Tracing: Active
       Environment:
         Variables:
           DYNAMODB_TABLE_NAME: !Ref HorizonsTable
           S3_BUCKET_NAME: !Ref FotosBucket
           COGNITO_USER_POOL_ID: !Ref UserPool
           STAGE: !Ref AWS::StackName

   Resources:
     ApiFunction:
       Type: AWS::Serverless::Function
       Properties:
         Handler: src/handler.handler
         CodeUri: .
         Policies:
           - DynamoDBCrudPolicy:
               TableName: !Ref HorizonsTable
           - S3CrudPolicy:
               BucketName: !Ref FotosBucket
         Events:
           Api:
             Type: HttpApi
             Properties:
               Path: /{proxy+}
               Method: ANY

     HorizonsTable:
       Type: AWS::DynamoDB::Table
       Properties:
         TableName: !Sub ${AWS::StackName}-table
         BillingMode: PAY_PER_REQUEST
         AttributeDefinitions:
           - AttributeName: PK
             AttributeType: S
           - AttributeName: SK
             AttributeType: S
           - AttributeName: GSI1PK
             AttributeType: S
           - AttributeName: GSI1SK
             AttributeType: S
           - AttributeName: GSI2PK
             AttributeType: S
           - AttributeName: GSI2SK
             AttributeType: S
         KeySchema:
           - AttributeName: PK
             KeyType: HASH
           - AttributeName: SK
             KeyType: RANGE
         GlobalSecondaryIndexes:
           - IndexName: GSI1
             KeySchema:
               - AttributeName: GSI1PK
                 KeyType: HASH
               - AttributeName: GSI1SK
                 KeyType: RANGE
             Projection:
               ProjectionType: ALL
           - IndexName: GSI2
             KeySchema:
               - AttributeName: GSI2PK
                 KeyType: HASH
               - AttributeName: GSI2SK
                 KeyType: RANGE
             Projection:
               ProjectionType: ALL

     FotosBucket:
       Type: AWS::S3::Bucket
       Properties:
         BucketName: !Sub ${AWS::StackName}-fotos
         LifecycleConfiguration:
           Rules:
             - Id: TransitionToIA
               Status: Enabled
               Transitions:
                 - StorageClass: STANDARD_IA
                   TransitionInDays: 365

     UserPool:
       Type: AWS::Cognito::UserPool
       Properties:
         UserPoolName: !Sub ${AWS::StackName}-users
         AutoVerifiedAttributes:
           - email
         UsernameAttributes:
           - email
         Policies:
           PasswordPolicy:
             MinimumLength: 8
             RequireUppercase: true
             RequireLowercase: true
             RequireNumbers: true

     UserPoolClient:
       Type: AWS::Cognito::UserPoolClient
       Properties:
         UserPoolId: !Ref UserPool
         ClientName: !Sub ${AWS::StackName}-client
         ExplicitAuthFlows:
           - ALLOW_USER_PASSWORD_AUTH
           - ALLOW_REFRESH_TOKEN_AUTH

   Outputs:
     ApiUrl:
       Value: !Sub "https://${ServerlessHttpApi}.execute-api.${AWS::Region}.amazonaws.com"
     TableName:
       Value: !Ref HorizonsTable
     BucketName:
       Value: !Ref FotosBucket
     UserPoolId:
       Value: !Ref UserPool
     UserPoolClientId:
       Value: !Ref UserPoolClient
   ```

2. Crie `apps/api/samconfig.toml`:
   ```toml
   version = 0.1
   [default.deploy.parameters]
   stack_name = "horizons-prod"
   region = "sa-east-1"
   confirm_changeset = false
   capabilities = "CAPABILITY_IAM"
   ```

Altere SOMENTE: `apps/api/template.yaml` (criar), `apps/api/samconfig.toml` (criar). Não refatore, renomeie ou mexa em mais nada.
```
