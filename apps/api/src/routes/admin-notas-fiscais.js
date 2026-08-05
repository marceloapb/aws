// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-NOTAS-FISCAIS.JS — Notas Fiscais (NFS-e Padrão Nacional)
// ══════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { emitirNFSe } = require('../services/nfseService');
const nfseSP = require('../lib/nf/nfse-sp-adapter');

const TENANT = process.env.TENANT_ID || 'default';

// GET /admin/notas-fiscais — Listar notas emitidas
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'NFSE' },
      ScanIndexForward: false,
      Limit: 100,
    }));

    let items = (result.Items || []).map(item => ({
      id: item.id,
      numero_nf: item.numero_nfse || item.numero_dps || '',
      cliente_nome: item.cliente_nome || '',
      descricao_servico: item.descricao || item.descricao_servico || '',
      valor: item.valor || 0,
      status: item.status === 'autorizada' ? 'emitida' : item.status === 'rejeitada' ? 'erro' : (item.status || 'pendente'),
      chave_nfse: item.chave_nfse || '',
      cStat: item.cStat || '',
      xMotivo: item.xMotivo || '',
      created: item.created || '',
    }));

    if (status && status !== 'todas') {
      items = items.filter(i => i.status === status);
    }

    const totalValor = items.filter(i => i.status === 'emitida').reduce((s, i) => s + (i.valor || 0), 0);

    res.json({ success: true, data: items, total: items.length, totalValor });
  } catch (error) {
    console.error('[NOTAS-FISCAIS] Erro ao listar:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /admin/notas-fiscais — Emitir NFS-e manual
router.post('/', async (req, res) => {
  try {
    const { descricao_servico, valor, cliente_cpf, cliente_nome, cliente_email, orcamento_id } = req.body;

    if (!valor || Number(valor) <= 0) {
      return res.status(400).json({ success: false, message: 'Valor é obrigatório e deve ser maior que zero' });
    }
    if (!descricao_servico) {
      return res.status(400).json({ success: false, message: 'Descrição do serviço é obrigatória' });
    }

    // Se informou cliente_cpf, buscar dados do cliente
    let clienteData = { nome: cliente_nome || '', cpf_cnpj: cliente_cpf || '', email: cliente_email || '' };
    if (orcamento_id) {
      try {
        // Buscar orçamento para pegar dados do cliente
        const orcResult = await dynamo.send(new QueryCommand({
          TableName: TABLE,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
          ExpressionAttributeValues: { ':pk': 'ORCAMENTO', ':sk': `ORCAMENTO#${orcamento_id}` },
        }));
        const orc = orcResult.Items?.[0];
        if (orc) {
          clienteData.nome = clienteData.nome || orc.cliente_nome || '';
          clienteData.cpf_cnpj = clienteData.cpf_cnpj || orc.cliente_cpf || '';
        }
      } catch {}
    }

    // Delegar emissão para a rota /admin/nfse/emitir que gerencia provedores (SP vs Nacional)
    // Simular chamada interna
    const { default: fetch } = await import('node-fetch').catch(() => ({ default: null }));
    
    // Emitir via provedor configurado (buscar config para saber qual)
    const configResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: 'CONFIG#nfse' },
    }));
    const dbConfig = configResult.Item || {};
    const provedor = dbConfig.provedor || 'sp';

    let resultado;
    if (provedor === 'sp') {
      // Emitir via NF Paulistana
      const nfseSP = require('../lib/nf/nfse-sp-adapter');
      const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
      const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
      const ssmClient = new SSMClient({ region: 'us-east-1' });
      const s3Client = new S3Client({ region: 'us-east-1' });
      const PREFIX = process.env.SSM_PREFIX || '/mbf/prod';

      const passParam = await ssmClient.send(new GetParameterCommand({ Name: `${PREFIX}/NFSE_CERT_PASSPHRASE`, WithDecryption: true }));
      const s3KeyParam = await ssmClient.send(new GetParameterCommand({ Name: `${PREFIX}/NFSE_CERT_S3_KEY`, WithDecryption: false }));
      const s3Resp = await s3Client.send(new GetObjectCommand({ Bucket: process.env.BUCKET_NAME || 'mbf-backend-v3-fotos', Key: s3KeyParam.Parameter.Value }));
      const chunks = []; for await (const c of s3Resp.Body) chunks.push(c);
      const pfxBase64 = Buffer.concat(chunks).toString('base64');

      // Próximo número RPS
      const seqResult = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { PK: `TENANT#${TENANT}`, SK: 'NFSE_SEQUENCIA' } }));
      const proximoRPS = (seqResult.Item?.ultimo_numero || 0) + 1;
      await dynamo.send(new PutCommand({ TableName: TABLE, Item: { PK: `TENANT#${TENANT}`, SK: 'NFSE_SEQUENCIA', ultimo_numero: proximoRPS, updated: new Date().toISOString() } }));

      resultado = await nfseSP.emitir({
        numero_rps: proximoRPS,
        valor: Number(valor),
        descricao_servico,
        codigo_servico: dbConfig.codigo_servico || '09911',
        aliquota: Number(dbConfig.aliquota || 0),
        tributacao: 'T',
        iss_retido: false,
        tomador: {
          nome: clienteData.nome,
          cpf: clienteData.cpf_cnpj?.length === 11 ? clienteData.cpf_cnpj : undefined,
          cnpj: clienteData.cpf_cnpj?.length === 14 ? clienteData.cpf_cnpj : undefined,
          email: clienteData.email,
        },
        config: {
          cnpj: dbConfig.cnpj || '',
          inscricao_municipal: dbConfig.inscricao_municipal || '',
          razao_social: dbConfig.razao_social || '',
          serie_rps: dbConfig.serie_rps || 'BB',
          ambiente: dbConfig.ambiente || 'homologacao',
          certificado_pfx_base64: pfxBase64,
          certificado_senha: passParam.Parameter.Value,
        },
      });
    } else {
      // Emitir via Padrão Nacional
      resultado = await emitirNFSe({
        cliente_nome: clienteData.nome,
        cliente_cpf_cnpj: clienteData.cpf_cnpj,
        cliente_email: clienteData.email,
        valor_servico: Number(valor),
        descricao_servico,
        cobranca_id: orcamento_id || null,
      });
    }

    if (resultado.success) {
      res.json({ success: true, data: resultado, message: `NFS-e #${resultado.numero_dps} autorizada` });
    } else {
      res.json({ success: false, message: `Rejeitada: ${resultado.xMotivo}`, data: resultado });
    }
  } catch (error) {
    console.error('[NOTAS-FISCAIS] Erro ao emitir:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /admin/notas-fiscais/:id — Detalhe
router.get('/:id', async (req, res) => {
  try {
    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `NFSE#${req.params.id}` },
    }));
    if (!result.Item) return res.status(404).json({ success: false, message: 'Nota não encontrada' });
    res.json({ success: true, data: result.Item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /admin/notas-fiscais/:id/cancelar — Cancelar nota (TODO: implementar evento cancelamento na SEFIN)
router.put('/:id/cancelar', async (req, res) => {
  try {
    const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `NFSE#${req.params.id}` },
      UpdateExpression: 'SET #s = :s, cancelado_em = :now',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'cancelada', ':now': new Date().toISOString() },
    }));
    res.json({ success: true, message: 'Nota cancelada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
