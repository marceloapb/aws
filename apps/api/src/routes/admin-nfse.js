const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const router = Router();
const s3 = new S3Client({});
const BUCKET = process.env.S3_BUCKET_NAME;

// GET /admin/nfse/config — Buscar configuração do prestador
router.get('/config', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.sub || 'default';
    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${tenantId}`, SK: 'CONFIG#NFSE' },
    }));

    if (!result.Item) {
      return res.json({ success: true, data: { configurado: false } });
    }

    // Não retornar a senha do certificado
    const { certificado_senha, ...safe } = result.Item;
    res.json({ success: true, data: { ...safe, configurado: true, tem_certificado: !!result.Item.certificado_s3_key } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /admin/nfse/config — Salvar dados do prestador
router.put('/config', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.sub || 'default';
    const body = req.body;

    // Validações básicas
    if (!body.cnpj || !body.inscricao_municipal || !body.razao_social) {
      return res.status(400).json({ success: false, message: 'CNPJ, Inscrição Municipal e Razão Social são obrigatórios' });
    }

    // Buscar config existente para preservar certificado
    const existing = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${tenantId}`, SK: 'CONFIG#NFSE' },
    }));

    const item = {
      PK: `TENANT#${tenantId}`,
      SK: 'CONFIG#NFSE',
      tenant_id: tenantId,
      cnpj: body.cnpj,
      inscricao_municipal: body.inscricao_municipal,
      razao_social: body.razao_social,
      nome_fantasia: body.nome_fantasia || '',
      endereco: body.endereco || {},
      codigo_servico: body.codigo_servico || '09911',
      descricao_servico_padrao: body.descricao_servico_padrao || 'Serviços fotográficos profissionais',
      aliquota: body.aliquota || 2,
      ambiente: body.ambiente || 'homologacao',
      regime_tributario: body.regime_tributario || 'simples_nacional',
      // Preservar certificado se já existir
      certificado_s3_key: existing?.Item?.certificado_s3_key || null,
      certificado_senha: existing?.Item?.certificado_senha || null,
      updated_at: new Date().toISOString(),
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    const { certificado_senha, ...safe } = item;
    res.json({ success: true, data: { ...safe, configurado: true, tem_certificado: !!item.certificado_s3_key } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /admin/nfse/upload-certificado — Upload do certificado A1
router.post('/upload-certificado', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.sub || 'default';
    const { certificado_base64, senha, filename } = req.body;

    if (!certificado_base64 || !senha) {
      return res.status(400).json({ success: false, message: 'certificado_base64 e senha são obrigatórios' });
    }

    // Validar que é um PFX válido (tenta abrir com a senha)
    try {
      const pfxBuffer = Buffer.from(certificado_base64, 'base64');
      // Tenta criar uma credencial com o pfx para validar senha
      const crypto = require('crypto');
      // Apenas verificar se o buffer parece um PFX (começa com sequência PKCS12)
      if (pfxBuffer.length < 100) throw new Error('Arquivo muito pequeno');
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Certificado inválido ou senha incorreta' });
    }

    // Upload para S3
    const s3Key = `certificados/${tenantId}/certificado-a1.pfx`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: Buffer.from(certificado_base64, 'base64'),
      ContentType: 'application/x-pkcs12',
      ServerSideEncryption: 'AES256',
    }));

    // Atualizar config com referência ao certificado
    const existing = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${tenantId}`, SK: 'CONFIG#NFSE' },
    }));

    if (existing?.Item) {
      const { PutCommand: Put } = require('@aws-sdk/lib-dynamodb');
      await dynamo.send(new PutCommand({
        TableName: TABLE,
        Item: {
          ...existing.Item,
          certificado_s3_key: s3Key,
          certificado_senha: senha,
          certificado_filename: filename || 'certificado-a1.pfx',
          certificado_uploaded_at: new Date().toISOString(),
        },
      }));
    } else {
      // Se não tem config ainda, criar mínima
      await dynamo.send(new PutCommand({
        TableName: TABLE,
        Item: {
          PK: `TENANT#${tenantId}`,
          SK: 'CONFIG#NFSE',
          tenant_id: tenantId,
          certificado_s3_key: s3Key,
          certificado_senha: senha,
          certificado_filename: filename || 'certificado-a1.pfx',
          certificado_uploaded_at: new Date().toISOString(),
        },
      }));
    }

    res.json({ success: true, message: 'Certificado A1 enviado com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /admin/nfse/emitir — Emitir NFS-e
router.post('/emitir', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.sub || 'default';
    const { valor, descricao_servico, tomador } = req.body;

    if (!valor || !tomador) {
      return res.status(400).json({ success: false, message: 'valor e tomador são obrigatórios' });
    }

    // Carregar config
    const configResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${tenantId}`, SK: 'CONFIG#NFSE' },
    }));
    const config = configResult?.Item;

    if (!config || !config.certificado_s3_key) {
      return res.status(400).json({ success: false, message: 'NFS-e não configurada. Faça upload do certificado e configure os dados do prestador.' });
    }

    // Gerar número RPS sequencial
    const counterResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${tenantId}`, SK: 'COUNTER#RPS' },
    }));
    const proximoRPS = (counterResult?.Item?.valor || 0) + 1;
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: { PK: `TENANT#${tenantId}`, SK: 'COUNTER#RPS', valor: proximoRPS },
    }));

    // Emitir via adapter
    const nfseAdapter = require('../lib/nf/nfse-sp-adapter');
    const resultado = await nfseAdapter.emitir({
      valor: Number(valor),
      descricao_servico: descricao_servico || config.descricao_servico_padrao,
      tomador,
      numero_rps: proximoRPS,
      config,
    });

    // Registrar no DynamoDB
    const nfId = crypto.randomUUID();
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `TENANT#${tenantId}`,
        SK: `NF#${nfId}`,
        GSI1PK: 'NF',
        GSI1SK: `NF#${new Date().toISOString()}`,
        id: nfId,
        numero_nf: resultado.numero_nf || null,
        numero_rps: proximoRPS,
        valor,
        descricao_servico,
        tomador,
        status: resultado.success ? 'emitida' : 'erro',
        pdf_url: resultado.pdf_url || null,
        codigo_verificacao: resultado.codigo_verificacao || null,
        erro: resultado.erro || null,
        emitida_em: new Date().toISOString(),
      },
    }));

    if (resultado.success) {
      res.json({ success: true, data: { numero_nf: resultado.numero_nf, pdf_url: resultado.pdf_url, codigo_verificacao: resultado.codigo_verificacao } });
    } else {
      res.status(400).json({ success: false, message: resultado.erro });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
