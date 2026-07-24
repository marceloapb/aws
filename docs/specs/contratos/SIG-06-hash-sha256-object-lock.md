# SIG-06: Hash SHA-256 + S3 Object Lock

## Metadados
- **ID:** SIG-06
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Crítico
- **Esforço:** Médio
- **Dependência:** CT-06, SIG-04


## Contexto
Para garantir a **integridade e imutabilidade** dos documentos assinados, o sistema calcula o hash SHA-256 de cada arquivo gerado (contrato PDF + manifesto PDF) e aplica S3 Object Lock (modo COMPLIANCE) para impedir exclusão ou modificação por 5 anos. O hash é armazenado no DynamoDB e pode ser verificado publicamente.

## Escopo
- `apps/api/src/services/integrityService.js` — NOVO
- `apps/api/src/handlers/contratos/gerarPDF.js` — ALTERAR (adicionar hash + lock)
- `apps/api/src/handlers/contratos/gerarManifesto.js` — ALTERAR (adicionar hash + lock)
- `apps/api/src/routes/public-contratos.js` — ALTERAR (endpoint verificação)
- S3: bucket com Object Lock habilitado
- SAM template: configuração do bucket

## Fora de Escopo (NÃO TOCAR)
- Geração do PDF em si (CT-06)
- Conteúdo do manifesto (SIG-04)
- Assinatura digital ICP-Brasil
- Blockchain (overkill para este cenário)


## Spec Técnica

### Fluxo de Integridade
```
1. PDF gerado (CT-06) ou Manifesto gerado (SIG-04)
2. Calcular SHA-256 do buffer antes do upload
3. Upload S3 com metadados (hash no x-amz-meta-sha256)
4. Aplicar Object Lock (COMPLIANCE, 5 anos)
5. Salvar hash no DynamoDB (contrato + aceite)
6. Endpoint público para verificação de integridade
```

### Serviço — integrityService.js
```js
const crypto = require('crypto')
const { S3Client, PutObjectCommand, PutObjectRetentionCommand, GetObjectCommand }
  = require('@aws-sdk/client-s3')

const s3 = new S3Client({ region: 'us-east-1' })
const BUCKET = process.env.CONTRATOS_BUCKET

function calcularHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

async function uploadComIntegridade(key, buffer, contentType = 'application/pdf') {
  const hash = calcularHash(buffer)

  // Upload com hash nos metadados
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: {
      'sha256': hash,
      'gerado-em': new Date().toISOString()
    },
    ChecksumAlgorithm: 'SHA256',
    ChecksumSHA256: Buffer.from(
      crypto.createHash('sha256').update(buffer).digest()
    ).toString('base64')
  }))

  // Aplicar Object Lock (COMPLIANCE = ninguém pode deletar, nem root)
  const retainUntil = new Date()
  retainUntil.setFullYear(retainUntil.getFullYear() + 5)

  await s3.send(new PutObjectRetentionCommand({
    Bucket: BUCKET,
    Key: key,
    Retention: {
      Mode: 'COMPLIANCE',
      RetainUntilDate: retainUntil
    }
  }))

  return { hash, retain_until: retainUntil.toISOString() }
}

async function verificarIntegridade(key, hashEsperado) {
  const response = await s3.send(new GetObjectCommand({
    Bucket: BUCKET,
    Key: key
  }))

  const chunks = []
  for await (const chunk of response.Body) {
    chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks)
  const hashAtual = calcularHash(buffer)

  return {
    integro: hashAtual === hashEsperado,
    hash_esperado: hashEsperado,
    hash_atual: hashAtual,
    metadata_hash: response.Metadata?.sha256 || null
  }
}

module.exports = { calcularHash, uploadComIntegridade, verificarIntegridade }
```


### Integração com gerarPDF.js (CT-06)
```js
const { uploadComIntegridade } = require('../services/integrityService')

// Substituir s3.putObject por:
const s3Key = `tenants/${tenantId}/contratos/${contratoId}.pdf`
const { hash, retain_until } = await uploadComIntegridade(s3Key, pdfBuffer)

// Salvar hash no contrato
await atualizarContrato(contratoId, {
  pdf_s3_key: s3Key,
  pdf_sha256: hash,
  pdf_lock_until: retain_until
})
```

### Integração com gerarManifesto.js (SIG-04)
```js
const manifestoKey = `tenants/${tenantId}/contratos/${contratoId}-manifesto.pdf`
const { hash, retain_until } = await uploadComIntegridade(manifestoKey, pdfBuffer)

await atualizarContrato(contratoId, {
  manifesto_s3_key: manifestoKey,
  manifesto_sha256: hash,
  manifesto_lock_until: retain_until
})
```

### Entidade DynamoDB — Campos Adicionais no CONTRATO
```json
{
  "pdf_sha256": "a7f3b2c9d1e4f6a8b3c5d7e9f1a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8",
  "pdf_lock_until": "2031-07-18T15:30:05Z",
  "manifesto_sha256": "b8c4d3e5f2a1b7c9d3e5f7a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1",
  "manifesto_lock_until": "2031-07-18T15:31:00Z"
}
```

### API — GET /public/verificar-integridade/:contratoId
```json
// Response 200
{
  "contrato_id": "ct_001",
  "verificacao": {
    "pdf": {
      "integro": true,
      "hash_sha256": "a7f3b2c9...",
      "lock_mode": "COMPLIANCE",
      "lock_until": "2031-07-18T15:30:05Z"
    },
    "manifesto": {
      "integro": true,
      "hash_sha256": "b8c4d3e5...",
      "lock_mode": "COMPLIANCE",
      "lock_until": "2031-07-18T15:31:00Z"
    }
  },
  "verificado_em": "2026-07-20T10:00:00Z",
  "mensagem": "Documentos íntegros. Nenhuma alteração detectada."
}

// Response 409 (integridade comprometida)
{
  "contrato_id": "ct_001",
  "verificacao": {
    "pdf": {
      "integro": false,
      "hash_esperado": "a7f3b2c9...",
      "hash_atual": "xxxxxxxx...",
      "alerta": "DOCUMENTO ADULTERADO"
    }
  },
  "mensagem": "ALERTA: Integridade comprometida!"
}
```


### Configuração S3 — Object Lock
```yaml
# SAM template.yaml — Bucket com Object Lock
ContratosLockBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: !Sub "${AWS::StackName}-contratos-lock"
    ObjectLockEnabled: true
    ObjectLockConfiguration:
      ObjectLockEnabled: Enabled
      Rule:
        DefaultRetention:
          Mode: COMPLIANCE
          Years: 5
    VersioningConfiguration:
      Status: Enabled
    LifecycleConfiguration:
      Rules:
        - Id: TransitionToGlacier
          Status: Enabled
          Transitions:
            - StorageClass: GLACIER
              TransitionInDays: 90
```

### Importante sobre Object Lock
- **COMPLIANCE mode**: ninguém pode deletar/sobrescrever (nem root)
- **Versionamento obrigatório**: bucket deve ter versioning enabled
- **Bucket separado**: não usar o bucket de fotos para contratos
- **Custo**: Object Lock não tem custo adicional, mas Glacier depois de 90 dias reduz custo de storage
- **Implicação**: se upload falhar e precisar retry, não há conflito pois é objeto novo

### Regras
- Hash calculado ANTES do upload (garantir consistência)
- SHA-256 é o padrão (não usar MD5)
- Object Lock COMPLIANCE por 5 anos (Art. 206, §5º, CC — prescrição)
- ChecksumSHA256 no upload para validação server-side pela AWS
- Hash salvo no DynamoDB para verificação rápida (sem baixar o S3)
- Endpoint público de verificação (qualquer um pode confirmar integridade)
- Se verificação falhar: ALERTA no audit log + notificação ao admin
- Transição para Glacier após 90 dias (economia)

## Critérios de Aceite
- [ ] SHA-256 calculado para PDF e manifesto
- [ ] Hash salvo como metadado S3 + campo DynamoDB
- [ ] Object Lock COMPLIANCE 5 anos aplicado
- [ ] Bucket com versioning habilitado
- [ ] Endpoint público de verificação de integridade
- [ ] ChecksumSHA256 no upload (validação AWS)
- [ ] Transição para Glacier após 90 dias
- [ ] Alerta se integridade comprometida

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SIG-06: Hash SHA-256 + S3 Object Lock.

1. Crie services/integrityService.js: calcular hash + upload + lock + verificar.
2. Altere gerarPDF.js: usar uploadComIntegridade em vez de putObject.
3. Altere gerarManifesto.js: idem.
4. Salvar pdf_sha256 e manifesto_sha256 no contrato.
5. Object Lock COMPLIANCE 5 anos.
6. GET /public/verificar-integridade/:contratoId — verificação pública.
7. SAM: bucket com ObjectLockEnabled + Versioning + Glacier lifecycle.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
