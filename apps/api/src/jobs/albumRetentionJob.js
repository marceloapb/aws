const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { deleteAlbumFolder } = require('../services/s3Service');
const { ALBUM_STATUS } = require('../config/constants');

const DIAS_GRACA = 7;
const TENANT = process.env.TENANT_ID || 'default';

async function processarRetencao() {
  const hoje = new Date();

  // Buscar todos os álbuns via GSI1
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'ALBUM' },
  }));
  const albuns = result.Items || [];

  // 1. Ativos → Expirado
  for (const album of albuns.filter(a => a.status === ALBUM_STATUS.ATIVO && !a.protegido && a.data_expiracao && a.data_expiracao <= hoje.toISOString().split('T')[0])) {
    await dynamo.send(new UpdateCommand({ TableName: TABLE, Key: { PK: album.PK, SK: album.SK }, UpdateExpression: 'SET #s = :s', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': ALBUM_STATUS.EXPIRADO } }));
  }

  // 2. Expirado → Em Graça
  const dataGraca = new Date(hoje.getTime() - DIAS_GRACA * 86400000).toISOString().split('T')[0];
  for (const album of albuns.filter(a => a.status === ALBUM_STATUS.EXPIRADO && !a.protegido && a.data_expiracao && a.data_expiracao <= dataGraca)) {
    await dynamo.send(new UpdateCommand({ TableName: TABLE, Key: { PK: album.PK, SK: album.SK }, UpdateExpression: 'SET #s = :s', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': ALBUM_STATUS.EM_GRACA } }));
  }

  // 3. Em Graça → Pronto Exclusão
  const dataExclusao = new Date(hoje.getTime() - DIAS_GRACA * 2 * 86400000).toISOString().split('T')[0];
  for (const album of albuns.filter(a => a.status === ALBUM_STATUS.EM_GRACA && !a.protegido && a.data_expiracao && a.data_expiracao <= dataExclusao)) {
    await dynamo.send(new UpdateCommand({ TableName: TABLE, Key: { PK: album.PK, SK: album.SK }, UpdateExpression: 'SET #s = :s', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': ALBUM_STATUS.PRONTO_EXCLUSAO } }));
  }

  // 4. Deletar prontos
  for (const album of albuns.filter(a => a.status === ALBUM_STATUS.PRONTO_EXCLUSAO)) {
    try {
      await deleteAlbumFolder(album.id);
      const fotos = await dynamo.send(new QueryCommand({ TableName: TABLE, KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)', ExpressionAttributeValues: { ':pk': `ALBUM#${album.id}`, ':sk': 'FOTO#' } }));
      for (const foto of (fotos.Items || [])) {
        await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: foto.PK, SK: foto.SK } }));
      }
      await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: album.PK, SK: album.SK } }));
      console.log(`[ALBUM RETENTION] Álbum ${album.titulo} DELETADO`);
    } catch (error) {
      console.error(`[ALBUM RETENTION] Erro ao deletar ${album.titulo}:`, error.message);
    }
  }
}

const handler = async () => { await processarRetencao(); };

module.exports = { handler };
module.exports.default = { handler };
