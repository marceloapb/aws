// ══════════════════════════════════════════════════════════════
// SPEC G1: Solicitar Extensão de Álbum (lado cliente)
// Mounted at /client/album/:albumId/extensao
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { GetCommand, PutCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { ALBUM_STATUS, COBRANCA_STATUS } = require('../config/constants');
const crypto = require('crypto');

const router = Router({ mergeParams: true });

// POST /client/album/:albumId/extensao
router.post('/', async (req, res) => {
  try {
    const { albumId } = req.params;
    const { faixa_meses, meio_pagamento } = req.body;

    if (!faixa_meses || !meio_pagamento) {
      return res.status(400).json({ success: false, message: 'faixa_meses e meio_pagamento são obrigatórios' });
    }

    if (!['gateway', 'manual'].includes(meio_pagamento)) {
      return res.status(400).json({ success: false, message: 'meio_pagamento deve ser "gateway" ou "manual"' });
    }

    // Buscar o álbum
    const albumResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${albumId}` },
    }));

    if (!albumResult.Items || albumResult.Items.length === 0) {
      return res.status(404).json({ success: false, message: 'Álbum não encontrado' });
    }

    const album = albumResult.Items[0];

    // Validar que o álbum está expirado
    if (album.status !== ALBUM_STATUS.EXPIRADO) {
      return res.status(409).json({ success: false, message: 'Álbum não está expirado. Extensão só é permitida para álbuns expirados.' });
    }

    // Buscar config global do tenant
    const tenantId = album.tenant_id || '1';
    const configResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${tenantId}`, SK: 'CONFIG#ALBUM' },
    }));

    const config = configResult.Item || null;
    const faixas = config?.faixas_extensao || [];
    const faixaEscolhida = faixas.find(f => f.meses === Number(faixa_meses) && f.ativo);

    if (!faixaEscolhida) {
      return res.status(422).json({ success: false, message: `Faixa de ${faixa_meses} meses não está disponível ou inativa` });
    }

    // Criar COBRANCA tipo extensao
    const cobrancaId = crypto.randomUUID();
    const now = new Date().toISOString();

    const cobranca = {
      PK: `ALBUM#${albumId}`,
      SK: `COBRANCA#${cobrancaId}`,
      GSI1PK: 'COBRANCA',
      GSI1SK: `COBRANCA#${cobrancaId}`,
      id: cobrancaId,
      tipo: 'extensao',
      album_id: albumId,
      tenant_id: tenantId,
      faixa_meses: faixaEscolhida.meses,
      valor: faixaEscolhida.preco,
      meio_pagamento,
      status: meio_pagamento === 'gateway' ? COBRANCA_STATUS.PENDENTE : 'em_analise',
      created_at: now,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: cobranca }));

    // Atualizar status do álbum
    if (meio_pagamento === 'gateway') {
      // TODO: Chamar adapter gateway (§21) aqui para gerar link de pagamento
      await dynamo.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: album.PK, SK: album.SK },
        UpdateExpression: 'SET #s = :status, extensao_pendente_id = :cid',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':status': 'aguardando_pagamento_extensao',
          ':cid': cobrancaId,
        },
      }));
    }
    // Se manual, álbum NÃO reativa — fica expirado até confirmação do admin

    res.status(201).json({ success: true, data: cobranca });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /client/album/:albumId/extensao/confirmar — Webhook/Admin confirma pagamento
// Chamado pelo webhook de pagamento ou pelo admin manualmente
router.post('/confirmar', async (req, res) => {
  try {
    const { albumId } = req.params;
    const { cobranca_id } = req.body;

    if (!cobranca_id) {
      return res.status(400).json({ success: false, message: 'cobranca_id é obrigatório' });
    }

    // Buscar cobrança
    const cobrancaResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `ALBUM#${albumId}`, SK: `COBRANCA#${cobranca_id}` },
    }));

    if (!cobrancaResult.Item) {
      return res.status(404).json({ success: false, message: 'Cobrança não encontrada' });
    }

    const cobranca = cobrancaResult.Item;

    if (cobranca.status === COBRANCA_STATUS.PAGO) {
      return res.status(409).json({ success: false, message: 'Cobrança já foi confirmada' });
    }

    // Marcar cobrança como paga
    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `ALBUM#${albumId}`, SK: `COBRANCA#${cobranca_id}` },
      UpdateExpression: 'SET #s = :status, pago_em = :now',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':status': COBRANCA_STATUS.PAGO,
        ':now': new Date().toISOString(),
      },
    }));

    // Recalcular expira_em = now + faixa_meses
    const novaExpiracao = new Date();
    novaExpiracao.setMonth(novaExpiracao.getMonth() + cobranca.faixa_meses);
    const novaExpiracaoStr = novaExpiracao.toISOString().split('T')[0];

    // Buscar álbum para obter PK/SK
    const albumResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${albumId}` },
    }));

    if (!albumResult.Items || albumResult.Items.length === 0) {
      return res.status(404).json({ success: false, message: 'Álbum não encontrado' });
    }

    const album = albumResult.Items[0];

    // Reativar álbum
    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: album.PK, SK: album.SK },
      UpdateExpression: 'SET #s = :status, data_expiracao = :exp REMOVE extensao_pendente_id, last_aviso_dias',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':status': ALBUM_STATUS.ATIVO,
        ':exp': novaExpiracaoStr,
      },
    }));

    res.json({
      success: true,
      data: { album_id: albumId, nova_expiracao: novaExpiracaoStr, status: 'ativo' },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
