// ══════════════════════════════════════════════════════════════
// SPEC G2: Update Foto titulo/descricao
// Mounted at /admin/album/galeria/:galeriaId/foto/:fotoId
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router({ mergeParams: true });

// PATCH /admin/album/galeria/:galeriaId/foto/:fotoId
router.patch('/', async (req, res) => {
  try {
    const { galeriaId, fotoId } = req.params;
    const { titulo, descricao } = req.body;

    // Validar que pelo menos 1 campo está presente
    if (titulo === undefined && descricao === undefined) {
      return res.status(400).json({ success: false, message: 'Pelo menos um campo (titulo ou descricao) deve ser informado' });
    }

    // Validar tamanhos
    if (titulo !== undefined && typeof titulo === 'string' && titulo.length > 120) {
      return res.status(400).json({ success: false, message: 'titulo deve ter no máximo 120 caracteres' });
    }

    if (descricao !== undefined && typeof descricao === 'string' && descricao.length > 500) {
      return res.status(400).json({ success: false, message: 'descricao deve ter no máximo 500 caracteres' });
    }

    // Montar UpdateExpression condicional (só SET campos presentes)
    const updates = {};
    if (titulo !== undefined) updates.titulo = titulo;
    if (descricao !== undefined) updates.descricao = descricao;
    updates.updated_at = new Date().toISOString();

    const keys = Object.keys(updates);
    const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
    const values = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));

    // Foto pode estar com PK = ALBUM#<albumId> (padrão novo) ou GALERIA#<galeriaId>
    // Tentamos primeiro com ALBUM# pattern buscando pelo GSI
    // Na prática, fotos são armazenadas com PK = ALBUM#<albumId>, SK = FOTO#<fotoId>
    // Mas como recebemos galeriaId, precisamos buscar a foto primeiro para confirmar existência

    // Buscar foto pelo GSI1
    const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
    const fotoResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'FOTO', ':sk': `FOTO#${fotoId}` },
    }));

    if (!fotoResult.Items || fotoResult.Items.length === 0) {
      return res.status(404).json({ success: false, message: 'Foto não encontrada' });
    }

    const foto = fotoResult.Items[0];

    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: foto.PK, SK: foto.SK },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));

    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
