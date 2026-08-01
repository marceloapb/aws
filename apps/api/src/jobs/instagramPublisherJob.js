const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { publicarCarrossel, publicarFotoUnica } = require('../services/instagramService');
const { INSTAGRAM_STATUS } = require('../config/constants');

async function processarPublicacoes() {
  const agora = new Date().toISOString();

  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    FilterExpression: '#s = :status AND agendado_para <= :agora',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':pk': 'INSTAGRAM', ':status': INSTAGRAM_STATUS.AGENDADO, ':agora': agora },
  }));

  for (const pub of (result.Items || [])) {
    try {
      await dynamo.send(new UpdateCommand({
        TableName: TABLE, Key: { PK: pub.PK, SK: pub.SK },
        UpdateExpression: 'SET #s = :s', ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': INSTAGRAM_STATUS.PUBLICANDO },
      }));

      // Buscar fotos do álbum
      let fotosKeys = [];
      if (pub.album_id) {
        const fotosResults = await Promise.all(pub.fotos_ids.map(fid =>
          dynamo.send(new GetCommand({ TableName: TABLE, Key: { PK: `ALBUM#${pub.album_id}`, SK: `FOTO#${fid}` } }))
        ));
        fotosKeys = fotosResults.filter(r => r.Item).map(r => r.Item.s3_key_original || r.Item.s3_key_media || r.Item.s3_key).filter(Boolean);
      } else {
        const fotosResults = await Promise.all(pub.fotos_ids.map(fid =>
          dynamo.send(new QueryCommand({ TableName: TABLE, IndexName: 'GSI1', KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk', ExpressionAttributeValues: { ':pk': 'FOTO', ':sk': `FOTO#${fid}` } }))
        ));
        fotosKeys = fotosResults.flatMap(r => (r.Items || []).map(f => f.s3_key)).filter(Boolean);
      }

      const resultado = fotosKeys.length === 1
        ? await publicarFotoUnica(fotosKeys[0], pub.caption || '')
        : await publicarCarrossel(fotosKeys, pub.caption || '');

      if (resultado.success) {
        await dynamo.send(new UpdateCommand({
          TableName: TABLE, Key: { PK: pub.PK, SK: pub.SK },
          UpdateExpression: 'SET #s = :s, publicado_em = :pe, instagram_post_id = :pi, instagram_permalink = :pp',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':s': INSTAGRAM_STATUS.PUBLICADO, ':pe': new Date().toISOString(), ':pi': resultado.instagram_post_id, ':pp': resultado.instagram_permalink },
        }));
      } else {
        throw new Error(resultado.error || 'Erro desconhecido');
      }
    } catch (error) {
      await dynamo.send(new UpdateCommand({
        TableName: TABLE, Key: { PK: pub.PK, SK: pub.SK },
        UpdateExpression: 'SET #s = :s, erro_mensagem = :e', ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': INSTAGRAM_STATUS.ERRO, ':e': error.message },
      }));
      console.error(`[INSTAGRAM JOB] Erro pub ${pub.id}:`, error.message);
    }
  }
}

const handler = async () => {
  // Renovar token a cada execução do dia 1 e 15 do mês (2x/mês, nunca expira)
  const dia = new Date().getDate();
  if (dia === 1 || dia === 15) {
    try {
      const { refreshToken } = require('../lib/instagram/client');
      await refreshToken();
    } catch (err) {
      console.error('[INSTAGRAM] Erro ao renovar token:', err.message);
    }
  }

  await processarPublicacoes();
};

module.exports = { handler };
