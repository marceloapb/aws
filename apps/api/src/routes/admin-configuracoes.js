import { Router } from 'express';
import { dynamo, TABLE } from '../config/dynamodb.js';
import { QueryCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const router = Router();
const TENANT = process.env.TENANT_ID || 'default';

// GET /api/admin/configuracoes
router.get('/', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'CONFIG#' },
    }));

    const resultado = {};
    for (const item of (result.Items || [])) {
      resultado[item.chave] = item.valor;
    }

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/configuracoes
router.put('/', async (req, res) => {
  try {
    const dados = req.body;
    for (const [chave, valor] of Object.entries(dados)) {
      await dynamo.send(new PutCommand({
        TableName: TABLE,
        Item: {
          PK: `TENANT#${TENANT}`,
          SK: `CONFIG#${chave}`,
          chave,
          valor: String(valor),
          updated: new Date().toISOString(),
        },
      }));
    }
    res.json({ success: true, message: 'Configurações atualizadas' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/admin/configuracoes/gateways
router.get('/gateways', async (req, res) => {
  try {
    const gateways = [
      { id: 'asaas', nome: 'Asaas', configurado: !!process.env.ASAAS_API_KEY },
      { id: 'stripe', nome: 'Stripe', configurado: !!process.env.STRIPE_SECRET_KEY },
      { id: 'mercadopago', nome: 'MercadoPago', configurado: !!process.env.MERCADOPAGO_ACCESS_TOKEN },
      { id: 'pagarme', nome: 'Pagar.me', configurado: !!process.env.PAGARME_API_KEY },
      { id: 'pagbank', nome: 'PagBank', configurado: !!process.env.PAGBANK_TOKEN },
      { id: 'picpay', nome: 'PicPay', configurado: !!process.env.PICPAY_TOKEN },
      { id: 'sumup', nome: 'SumUp', configurado: !!process.env.SUMUP_API_KEY },
      { id: 'banco-inter', nome: 'Banco Inter', configurado: !!process.env.BANCO_INTER_CLIENT_ID },
      { id: 'stone', nome: 'Stone', configurado: !!process.env.STONE_API_KEY },
      { id: 'infinitepay', nome: 'InfinitePay', configurado: !!process.env.INFINITEPAY_API_KEY },
    ];
    res.json({ success: true, data: gateways });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
