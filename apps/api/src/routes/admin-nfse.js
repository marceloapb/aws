// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-NFSE.JS — Gestão NFS-e Padrão Nacional
// ══════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { dynamo, TABLE } = require('../config/dynamodb');
const { GetCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { emitirNFSe, getConfig, invalidateConfigCache } = require('../services/nfseService');

const TENANT = process.env.TENANT_ID || 'default';

// GET /api/admin/nfse/config — Retorna configuração atual
router.get('/config', async (req, res) => {
  try {
    const [configResult, certResult] = await Promise.all([
      dynamo.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `TENANT#${TENANT}`, SK: 'CONFIG#nfse' },
      })),
      dynamo.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `TENANT#${TENANT}`, SK: 'CONFIG#nfse_certificado' },
      })),
    ]);
    const config = configResult.Item || {};
    const cert = certResult.Item || {};
    delete config.PK;
    delete config.SK;
    config.tem_certificado = cert.tem_certificado || false;
    config.cert_info = cert.cert_info || null;
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/nfse/config — Salvar configuração
router.put('/config', async (req, res) => {
  try {
    const {
      cnpj, inscricao_municipal, razao_social, codigo_municipio, uf,
      cnae, codigo_trib_nacional, serie, ambiente, emissao_automatica,
    } = req.body;

    const item = {
      PK: `TENANT#${TENANT}`,
      SK: 'CONFIG#nfse',
      cnpj: (cnpj || '').replace(/\D/g, ''),
      inscricao_municipal: inscricao_municipal || '',
      razao_social: razao_social || '',
      codigo_municipio: codigo_municipio || '3550308',
      uf: uf || 'SP',
      cnae: (cnae || '7420001').replace(/[^0-9]/g, ''),
      codigo_trib_nacional: codigo_trib_nacional || '13.03.01.00',
      serie: serie || 'NFSE',
      ambiente: ambiente || '2',
      emissao_automatica: emissao_automatica !== false,
      updated: new Date().toISOString(),
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    invalidateConfigCache();
    res.json({ success: true, message: 'Configuração NFS-e salva' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/nfse/certificado — Upload do certificado A1 (base64)
router.post('/certificado', async (req, res) => {
  try {
    const { pfx_base64, passphrase } = req.body;
    if (!pfx_base64 || !passphrase) {
      return res.status(400).json({ success: false, message: 'pfx_base64 e passphrase são obrigatórios' });
    }

    // Validar que é base64 válido e tem tamanho razoável (certificados: 2-10KB)
    const decoded = Buffer.from(pfx_base64, 'base64');
    if (decoded.length < 500 || decoded.length > 50000) {
      return res.status(400).json({ success: false, message: 'Arquivo de certificado com tamanho inválido' });
    }

    // Tentar validar com node-forge se disponível
    let certInfo = {};
    try {
      const forge = require('node-forge');
      const pfxDer = decoded.toString('binary');
      const p12Asn1 = forge.asn1.fromDer(pfxDer);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase);

      for (const sc of p12.safeContents) {
        for (const bag of sc.safeBags) {
          if (bag.type === forge.pki.oids.certBag && bag.cert) {
            certInfo = {
              subject: bag.cert.subject.getField('CN')?.value || '',
              issuer: bag.cert.issuer.getField('CN')?.value || '',
              validade: bag.cert.validity.notAfter.toISOString(),
            };
          }
        }
      }
    } catch (forgeErr) {
      // Se node-forge não disponível ou senha errada
      if (forgeErr.message && (forgeErr.message.includes('Invalid password') || forgeErr.message.includes('PKCS#12'))) {
        return res.status(400).json({ success: false, message: 'Senha do certificado incorreta' });
      }
      // Se node-forge não instalado, salvar mesmo assim
      console.warn('[NFSE] node-forge indisponível para validação, salvando certificado sem validar:', forgeErr.message);
    }

    // Salvar certificado no S3 (criptografado) e senha no SSM
    const { SSMClient, PutParameterCommand } = require('@aws-sdk/client-ssm');
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const ssmClient = new SSMClient({ region: 'us-east-1' });
    const s3Client = new S3Client({ region: 'us-east-1' });
    const PREFIX_SSM = process.env.SSM_PREFIX || '/mbf/prod';
    const BUCKET = process.env.BUCKET_NAME || 'mbf-backend-v3-fotos';
    const certS3Key = `certificates/nfse-cert-a1.pfx`;

    await Promise.all([
      // Certificado PFX binário no S3 (server-side encryption)
      s3Client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: certS3Key,
        Body: decoded,
        ContentType: 'application/x-pkcs12',
        ServerSideEncryption: 'AES256',
      })),
      // Senha no SSM
      ssmClient.send(new PutParameterCommand({
        Name: `${PREFIX_SSM}/NFSE_CERT_PASSPHRASE`,
        Value: passphrase,
        Type: 'SecureString',
        Overwrite: true,
      })),
      // Referência ao S3 key no SSM
      ssmClient.send(new PutParameterCommand({
        Name: `${PREFIX_SSM}/NFSE_CERT_S3_KEY`,
        Value: certS3Key,
        Type: 'String',
        Overwrite: true,
      })),
    ]);

    // Salvar info na config
    const { PutCommand } = require('@aws-sdk/lib-dynamodb');
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `TENANT#${TENANT}`,
        SK: 'CONFIG#nfse_certificado',
        tem_certificado: true,
        cert_info: certInfo,
        uploaded_at: new Date().toISOString(),
      },
    }));

    invalidateConfigCache();
    res.json({ success: true, message: 'Certificado salvo com sucesso', data: certInfo });
  } catch (error) {
    console.error('[NFSE] Erro ao salvar certificado:', error.message);
    res.status(400).json({ success: false, message: `Erro: ${error.message}` });
  }
});

// POST /api/admin/nfse/emitir — Emissão manual de NFS-e
router.post('/emitir', async (req, res) => {
  try {
    const resultado = await emitirNFSe(req.body);
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/admin/nfse — Listar NFS-e emitidas
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'NFSE' },
      ScanIndexForward: false,
      Limit: Number(limit),
    }));

    let items = result.Items || [];
    if (status) items = items.filter(i => i.status === status);

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/nfse/:id — Detalhe de uma NFS-e
router.get('/:id', async (req, res) => {
  try {
    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `NFSE#${req.params.id}` },
    }));
    if (!result.Item) return res.status(404).json({ success: false, message: 'NFS-e não encontrada' });
    res.json({ success: true, data: result.Item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/nfse/status/resumo — KPIs
router.get('/status/resumo', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'NFSE' },
    }));

    const items = result.Items || [];
    const mesAtual = new Date().toISOString().slice(0, 7);
    const doMes = items.filter(i => i.created?.startsWith(mesAtual));

    res.json({
      success: true,
      data: {
        total: items.length,
        autorizadas: items.filter(i => i.status === 'autorizada').length,
        rejeitadas: items.filter(i => i.status === 'rejeitada').length,
        totalMes: doMes.length,
        valorMes: doMes.filter(i => i.status === 'autorizada').reduce((s, i) => s + (i.valor || 0), 0),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
