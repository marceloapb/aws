// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-NFSE.JS — Gestão NFS-e (Padrão Nacional + SP)
// ══════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { dynamo, TABLE } = require('../config/dynamodb');
const { GetCommand, PutCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { emitirNFSe, getConfig, invalidateConfigCache } = require('../services/nfseService');
const nfseSP = require('../lib/nf/nfse-sp-adapter');

const TENANT = process.env.TENANT_ID || '1';

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
      descricao_servico_padrao,
      // Campos SP (NF Paulistana)
      provedor, // 'nacional' ou 'sp'
      codigo_servico, // Código de serviço SP (ex: 09911)
      serie_rps, // Série do RPS (ex: BB)
      aliquota, // Alíquota ISS (ex: 0.05 = 5%)
    } = req.body;

    const item = {
      PK: `TENANT#${TENANT}`,
      SK: 'CONFIG#nfse',
      provedor: provedor || 'sp', // Default: SP (NF Paulistana)
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
      descricao_servico_padrao: descricao_servico_padrao || '',
      // Campos específicos SP
      codigo_servico: codigo_servico || '09911',
      serie_rps: serie_rps || 'BB',
      aliquota: aliquota || 0.05,
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
    // Carregar config para determinar provedor
    const [configResult] = await Promise.all([
      dynamo.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `TENANT#${TENANT}`, SK: 'CONFIG#nfse' },
      })),
    ]);
    const dbConfig = configResult.Item || {};
    const provedor = dbConfig.provedor || 'sp';

    let resultado;
    if (provedor === 'sp') {
      // Emitir via NF Paulistana (Web Service SP)
      resultado = await emitirNFSeSP(req.body, dbConfig);
    } else {
      // Emitir via Padrão Nacional (SEFIN)
      resultado = await emitirNFSe(req.body);
    }

    // Notificar cliente sobre NFS-e emitida (fire and forget)
    const clienteEmail = req.body.cliente_email || resultado?.cliente_email;
    const clienteId = req.body.cliente_id || resultado?.cliente_id;
    if (clienteEmail || clienteId) {
      try {
        const { processarEvento } = require('../services/notificationDispatcher');
        const crypto = require('crypto');
        await processarEvento({
          evento_id: crypto.randomUUID(),
          tipo_evento: 'nfse_emitida',
          tenant_id: TENANT,
          dados: {
            cliente_id: clienteId || '',
            cliente_nome: req.body.cliente_nome || '',
            email: clienteEmail || '',
            valor: req.body.valor || resultado?.valor || 0,
            numero_nf: resultado?.numero_nf || resultado?.numero || '',
            descricao_servico: req.body.descricao_servico || '',
          },
        });
      } catch (notifErr) {
        console.error('[NFSE] Erro ao notificar cliente (nfse_emitida):', notifErr.message);
      }
    }

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
        autorizadas: items.filter(i => i.status === 'autorizada' || i.status === 'emitida').length,
        rejeitadas: items.filter(i => i.status === 'rejeitada' || i.status === 'erro').length,
        canceladas: items.filter(i => i.status === 'cancelada').length,
        totalMes: doMes.length,
        valorMes: doMes.filter(i => i.status === 'autorizada' || i.status === 'emitida').reduce((s, i) => s + (i.valor || 0), 0),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// ROTAS SP (NF Paulistana) — Endpoints adicionais
// ══════════════════════════════════════════════════════════════

// POST /api/admin/nfse/sp/cancelar — Cancelar NFS-e via WS SP
router.post('/sp/cancelar', async (req, res) => {
  try {
    const { numero_nf, id } = req.body;
    if (!numero_nf) return res.status(400).json({ success: false, message: 'numero_nf obrigatorio' });

    const configResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: 'CONFIG#nfse' },
    }));
    const dbConfig = configResult.Item || {};
    const spConfig = buildSPConfig(dbConfig);

    const resultado = await nfseSP.cancelar({ numero_nf, config: spConfig });

    // Atualizar status no DynamoDB se tiver id
    if (resultado.success && id) {
      await dynamo.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `TENANT#${TENANT}`, SK: `NFSE#${id}` },
        UpdateExpression: 'SET #s = :s, data_cancelamento = :dc',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': 'cancelada', ':dc': new Date().toISOString() },
      }));
    }

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/nfse/sp/consultar — Consultar NFS-e no WS SP
router.post('/sp/consultar', async (req, res) => {
  try {
    const { numero_nf, numero_rps, serie_rps, codigo_verificacao } = req.body;
    if (!numero_nf && !numero_rps) {
      return res.status(400).json({ success: false, message: 'Informe numero_nf ou numero_rps' });
    }

    const configResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: 'CONFIG#nfse' },
    }));
    const spConfig = buildSPConfig(configResult.Item || {});

    const resultado = await nfseSP.consultar({
      numero_nf, numero_rps, serie_rps, codigo_verificacao, config: spConfig,
    });

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/nfse/sp/consultar-emitidas — Consultar NFS-e emitidas por periodo
router.post('/sp/consultar-emitidas', async (req, res) => {
  try {
    const { data_inicio, data_fim, pagina } = req.body;
    if (!data_inicio || !data_fim) {
      return res.status(400).json({ success: false, message: 'data_inicio e data_fim obrigatorios' });
    }

    const configResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: 'CONFIG#nfse' },
    }));
    const spConfig = buildSPConfig(configResult.Item || {});

    const resultado = await nfseSP.consultarEmitidas({
      data_inicio, data_fim, pagina, config: spConfig,
    });

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/nfse/sp/testar — Teste de envio (nao gera NFS-e)
router.post('/sp/testar', async (req, res) => {
  try {
    const configResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: 'CONFIG#nfse' },
    }));
    const dbConfig = configResult.Item || {};
    const spConfig = buildSPConfig(dbConfig);

    // Obter proximo numero RPS
    const seqResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: 'NFSE_SEQUENCIA' },
    }));
    const proximoRPS = (seqResult.Item?.ultimo_numero || 0) + 1;

    const rpsData = {
      numero_rps: proximoRPS,
      valor: req.body.valor_servico || req.body.valor || 100,
      descricao_servico: req.body.descricao_servico || dbConfig.descricao_servico_padrao || 'Servicos fotograficos profissionais',
      codigo_servico: dbConfig.codigo_servico || '09911',
      aliquota: dbConfig.aliquota || 0.05,
      tributacao: 'T',
      iss_retido: false,
      tomador: {
        nome: req.body.cliente_nome || 'Teste',
        cpf: req.body.cliente_cpf_cnpj || '',
      },
    };

    const resultado = await nfseSP.testarLote({ config: spConfig, rps_list: [rpsData] });
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

/**
 * Constroi config para o adapter SP a partir do DynamoDB
 */
function buildSPConfig(dbConfig) {
  return {
    cnpj: dbConfig.cnpj || '',
    inscricao_municipal: dbConfig.inscricao_municipal || '',
    razao_social: dbConfig.razao_social || '',
    codigo_servico: dbConfig.codigo_servico || '09911',
    serie_rps: dbConfig.serie_rps || 'BB',
    aliquota: dbConfig.aliquota || 0.05,
    ambiente: dbConfig.ambiente === '1' ? 'producao' : 'homologacao',
    certificado_s3_key: 'certificates/nfse-cert-a1.pfx',
    certificado_senha: null, // Sera preenchido pelo loadCertificate via SSM
  };
}

/**
 * Emite NFS-e via adapter SP (NF Paulistana) e salva no DynamoDB
 */
async function emitirNFSeSP(dados, dbConfig) {
  const spConfig = buildSPConfig(dbConfig);

  // Buscar senha do certificado via SSM
  const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
  const ssm = new SSMClient({ region: 'us-east-1' });
  const PREFIX = process.env.SSM_PREFIX || '/mbf/prod';
  const passParam = await ssm.send(new GetParameterCommand({
    Name: `${PREFIX}/NFSE_CERT_PASSPHRASE`, WithDecryption: true,
  }));
  spConfig.certificado_senha = passParam.Parameter.Value;

  // Obter proximo numero RPS
  const seqResult = await dynamo.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `TENANT#${TENANT}`, SK: 'NFSE_SEQUENCIA' },
  }));
  const proximoRPS = (seqResult.Item?.ultimo_numero || 0) + 1;

  // Atualizar sequencial
  await dynamo.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `TENANT#${TENANT}`, SK: 'NFSE_SEQUENCIA',
      ultimo_numero: proximoRPS, updated: new Date().toISOString(),
    },
  }));

  // Montar dados do RPS
  const rpsData = {
    numero_rps: proximoRPS,
    valor: Number(dados.valor_servico || dados.valor || 0),
    valor_deducoes: Number(dados.valor_deducoes || 0),
    descricao_servico: dados.descricao_servico || dbConfig.descricao_servico_padrao || 'Servicos fotograficos profissionais',
    codigo_servico: dbConfig.codigo_servico || '09911',
    aliquota: dbConfig.aliquota || 0.05,
    tributacao: dados.tributacao || 'T',
    iss_retido: dados.iss_retido || false,
    tomador: {
      nome: dados.cliente_nome || '',
      cpf: (dados.cliente_cpf_cnpj || '').length === 11 ? dados.cliente_cpf_cnpj : undefined,
      cnpj: (dados.cliente_cpf_cnpj || '').length === 14 ? dados.cliente_cpf_cnpj : undefined,
      email: dados.cliente_email || '',
      logradouro: dados.cliente_endereco?.logradouro || '',
      numero: dados.cliente_endereco?.numero || '',
      complemento: dados.cliente_endereco?.complemento || '',
      bairro: dados.cliente_endereco?.bairro || '',
      cidade_ibge: dados.cliente_endereco?.codigo_municipio || '3550308',
      uf: dados.cliente_endereco?.uf || 'SP',
      cep: dados.cliente_endereco?.cep || '',
    },
  };

  // Emitir via adapter SP
  const resultado = await nfseSP.emitir({ ...rpsData, config: spConfig });

  // Salvar no DynamoDB
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await dynamo.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `TENANT#${TENANT}`,
      SK: `NFSE#${id}`,
      GSI1PK: 'NFSE',
      GSI1SK: `NFSE#${now}`,
      id,
      provedor: 'sp',
      numero_rps: proximoRPS,
      serie_rps: dbConfig.serie_rps || 'BB',
      numero_nfse: resultado.numero_nf || null,
      codigo_verificacao: resultado.codigo_verificacao || null,
      status: resultado.success ? 'emitida' : 'erro',
      valor: rpsData.valor,
      cliente_nome: rpsData.tomador.nome,
      cliente_cpf_cnpj: dados.cliente_cpf_cnpj || '',
      descricao: rpsData.descricao_servico,
      cobranca_id: dados.cobranca_id || null,
      cliente_id: dados.cliente_id || null,
      erros: resultado.erros || [],
      alertas: resultado.alertas || [],
      pdf_url: resultado.pdf_url || null,
      xml_retorno: resultado.xml_retorno || null,
      ambiente: spConfig.ambiente,
      created: now,
    },
  }));

  return {
    success: resultado.success,
    id,
    numero_rps: proximoRPS,
    numero_nfse: resultado.numero_nf,
    codigo_verificacao: resultado.codigo_verificacao,
    status: resultado.success ? 'emitida' : 'erro',
    pdf_url: resultado.pdf_url,
    erros: resultado.erros,
    alertas: resultado.alertas,
  };
}

module.exports = router;
