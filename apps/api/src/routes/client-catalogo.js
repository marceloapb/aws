const { Router } = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

const router = Router();

/**
 * GET /client/catalogo/pacotes
 * Returns active packages visible to clients (exibir_ao_cliente = true)
 */
router.get('/pacotes', async (req, res) => {
  try {
    const photographerId = req.photographerId || req.user?.photographerId;
    if (!photographerId) {
      return res.status(400).json({ success: false, message: 'photographerId não encontrado' });
    }

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'PACOTE_CATALOGO#',
      },
    }));

    const pacotes = (result.Items || []).filter(
      (p) => p.ativo !== false && p.exibir_ao_cliente !== false
    );

    // Return only public fields
    const data = pacotes.map((p) => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao || '',
      itens: (p.itens || []).map((i) => ({
        nome: i.nome,
        descricao: i.descricao || '',
        tipo: i.tipo || '',
      })),
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /client/catalogo/servicos
 * Returns active catalog items visible to clients grouped by type
 */
router.get('/servicos', async (req, res) => {
  try {
    const photographerId = req.photographerId || req.user?.photographerId;
    if (!photographerId) {
      return res.status(400).json({ success: false, message: 'photographerId não encontrado' });
    }

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PHOTOGRAPHER#${photographerId}`,
        ':sk': 'ITEM_CATALOGO#',
      },
    }));

    const items = (result.Items || []).filter(
      (i) => i.ativo !== false && i.exibir_ao_cliente !== false
    );

    // Group by type
    const servicos_principais = [];
    const produtos = [];
    const adicionais = [];

    items.forEach((item) => {
      const entry = {
        id: item.id,
        nome: item.nome,
        descricao: item.descricao || '',
        tipo: item.tipo,
      };

      switch (item.tipo) {
        case 'servico_principal':
          servicos_principais.push(entry);
          break;
        case 'produto':
          produtos.push(entry);
          break;
        case 'adicional':
          adicionais.push(entry);
          break;
        default:
          servicos_principais.push(entry);
      }
    });

    res.json({
      success: true,
      data: { servicos_principais, produtos, adicionais },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
