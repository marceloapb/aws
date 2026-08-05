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
    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: 'CONFIG#nfse' },
    }));
    const config = result.Item || {};
    // Não retornar dados sensíveis
    delete config.PK;
    delete config.SK;
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

    // Validar que o PFX é válido
    try {
      const forge = require('node-forge');
      const pfxDer = Buffer.from(pfx_base64, 'base64').toString('binary');
      const p12Asn1 = forge.asn1.fromDer(pfxDer);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase);

      // Extrair informações do certificado
      let certInfo = {};
      for (const sc of p12.safeContents) {
        for (const bag of sc.safeBags) {
          if (bag.type === forge.pki.oids.certBag && bag.cert) {
            const cert = bag.cert;
            certInfo = {
              subject: cert.subject.getField('CN')?.value || '',
              issuer: cert.issuer.getField('CN')?.value || '',
              validade: cert.validity.notAfter.toISOString(),
              serial: cert.serialNumber,
            };
          }
        }
      }

      // Salvar no SSM
      const { SSMClient, PutParameterCommand } = require('@aws-sdk/client-ssm');
      const ssm = new SSMClient({ region: 'us-east-1' });
      const PREFIX = process.env.SSM_PREFIX || '/mbf/prod';

      await Promise.all([
        ssm.send(new PutParameterCommand({
          Name: `${PREFIX}/NFSE_CERT_PFX_BASE64`,
          Value: pfx_base64,
          Type: 'SecureString',
          Overwrite: true,
        })),
        ssm.send(new PutParameterCommand({
          Name: `${PREFIX}/NFSE_CERT_PASSPHRASE`,
          Value: passphrase,
          Type: 'SecureString',
          Overwrite: true,
        })),
      ]);

      invalidateConfigCache();
      res.json({ success: true, message: 'Certificado salvo', data: certInfo });
    } catch (certErr) {
      return res.status(400).json({ success: false, message: `Certificado inválido: ${certErr.message}` });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
