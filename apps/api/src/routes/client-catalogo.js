const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router();

/**
 * GET /client/catalogo/pacotes
 * Returns active packages visible to clients (exibir_ao_cliente = true)
 */
router.get('/pacotes', async (req, res) => {
  try {
    const result = await dynamo.send(new ScanCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      FilterExpression: 'GSI1SK = :sk AND ativo = :ativo AND exibir_ao_cliente = :exibir',
      ExpressionAttributeValues: {
        ':sk': 'PACOTE_CATALOGO#ACTIVE',
        ':ativo': true,
        ':exibir': true,
      },
    }));

    const data = (result.Items || []).map(p => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao || '',
      itens: (p.itens || []).map(i => ({
        nome: i.nome,
        descricao: i.descricao || '',
        tipo: i.tipo || '',
        quantidade: i.quantidade || 1,
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
    const result = await dynamo.send(new ScanCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      FilterExpression: 'GSI1SK = :sk AND ativo = :ativo AND exibir_ao_cliente = :exibir',
      ExpressionAttributeValues: {
        ':sk': 'ITEM_CATALOGO#ACTIVE',
        ':ativo': true,
        ':exibir': true,
      },
    }));

    const items = result.Items || [];

    const servicos_principais = [];
    const produtos = [];
    const adicionais = [];

    items.forEach(item => {
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
