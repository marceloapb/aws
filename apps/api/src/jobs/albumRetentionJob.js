const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, UpdateCommand, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { deleteAlbumFolder } = require('../services/s3Service');
const { ALBUM_STATUS } = require('../config/constants');
const { enviarAvisosExpiracao } = require('../services/albumExpiracaoService');

const TENANT = process.env.TENANT_ID || '1';

async function getRetencaoDias() {
  try {
    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: 'CONFIG#ALBUM' },
    }));
    return result.Item?.retencao_dias || 14;
  } catch {
    return 14;
  }
}

async function processarRetencao() {
  const hoje = new Date();
  const retencaoDias = await getRetencaoDias();

  // ALB-10: Enviar avisos de expiração ANTES das transições de status
  try {
    const resultado = await enviarAvisosExpiracao();
    console.log(`[ALBUM RETENTION] Avisos de expiração: ${resultado.notificados} enviados de ${resultado.total_avaliados} avaliados`);
  } catch (error) {
    console.error('[ALBUM RETENTION] Erro ao enviar avisos de expiração:', error.message);
  }

  // Buscar todos os álbuns via GSI1
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'ALBUM' },
  }));
  const albuns = result.Items || [];

  // 1. Ativos → Expirado (só álbuns publicados — que têm disponivel_em e data_expiracao)
  for (const album of albuns.filter(a => a.status === ALBUM_STATUS.ATIVO && !a.protegido && a.disponivel_em && a.data_expiracao && a.data_expiracao <= hoje.toISOString().split('T')[0])) {
    await dynamo.send(new UpdateCommand({ TableName: TABLE, Key: { PK: album.PK, SK: album.SK }, UpdateExpression: 'SET #s = :s', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': ALBUM_STATUS.EXPIRADO } }));
  }

  // 2. Expirado → Em Graça (metade do período de retenção)
  const metadeRetencao = Math.floor(retencaoDias / 2);
  const dataGraca = new Date(hoje.getTime() - metadeRetencao * 86400000).toISOString().split('T')[0];
  for (const album of albuns.filter(a => a.status === ALBUM_STATUS.EXPIRADO && !a.protegido && a.data_expiracao && a.data_expiracao <= dataGraca)) {
    await dynamo.send(new UpdateCommand({ TableName: TABLE, Key: { PK: album.PK, SK: album.SK }, UpdateExpression: 'SET #s = :s', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': ALBUM_STATUS.EM_GRACA } }));
  }

  // 3. Em Graça → Pronto Exclusão (período de retenção completo)
  const dataExclusao = new Date(hoje.getTime() - retencaoDias * 86400000).toISOString().split('T')[0];
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
