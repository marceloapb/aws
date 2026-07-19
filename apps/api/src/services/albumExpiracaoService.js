// ══════════════════════════════════════════════════════════════
// ALB-10: Album Expiration Notification Service
// ══════════════════════════════════════════════════════════════

const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { emitirEvento } = require('./eventBus');
const { ALBUM_STATUS } = require('../config/constants');

const AVISOS_DIAS = [30, 15, 7, 1];

/**
 * Retorna álbuns que expiram dentro de N dias
 * @param {number} dias - Número de dias até expiração
 * @returns {Promise<Array>} Lista de álbuns expirando
 */
async function getAlbunsExpirando(dias) {
  const hoje = new Date();
  const limite = new Date(hoje.getTime() + dias * 86400000);
  const limiteStr = limite.toISOString().split('T')[0];
  const hojeStr = hoje.toISOString().split('T')[0];

  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    FilterExpression: '#s = :ativo AND data_expiracao <= :limite AND data_expiracao >= :hoje',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':pk': 'ALBUM',
      ':ativo': ALBUM_STATUS.ATIVO,
      ':limite': limiteStr,
      ':hoje': hojeStr,
    },
  }));

  return result.Items || [];
}

/**
 * Envia avisos de expiração para álbuns prestes a expirar.
 * Chamado pelo job de retenção. Evita duplicatas usando last_aviso_dias.
 */
async function enviarAvisosExpiracao() {
  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];

  // Buscar todos os álbuns ativos com data_expiracao
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    FilterExpression: '#s = :ativo AND attribute_exists(data_expiracao)',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':pk': 'ALBUM',
      ':ativo': ALBUM_STATUS.ATIVO,
    },
  }));

  const albuns = result.Items || [];
  let notificados = 0;

  for (const album of albuns) {
    if (!album.data_expiracao) continue;

    const expiracao = new Date(album.data_expiracao + 'T23:59:59Z');
    const diffMs = expiracao.getTime() - hoje.getTime();
    const diasRestantes = Math.ceil(diffMs / 86400000);

    // Verificar qual faixa de aviso se aplica
    const faixaAviso = AVISOS_DIAS.find(d => diasRestantes <= d);
    if (!faixaAviso) continue;

    // Evitar duplicatas: verificar se já notificou nesta faixa
    if (album.last_aviso_dias && album.last_aviso_dias <= faixaAviso) continue;

    try {
      // Emitir evento de expiração
      await emitirEvento('mbf.albuns', 'album.expirando', {
        album_id: album.id,
        dias_restantes: diasRestantes,
        cliente_id: album.cliente_id,
        titulo: album.titulo,
        data_expiracao: album.data_expiracao,
        recurso_id: album.id,
      });

      // Atualizar last_aviso_dias para evitar reenvio
      await dynamo.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: album.PK, SK: album.SK },
        UpdateExpression: 'SET last_aviso_dias = :dias, last_aviso_em = :now',
        ExpressionAttributeValues: {
          ':dias': faixaAviso,
          ':now': new Date().toISOString(),
        },
      }));

      notificados++;
      console.log(`[ALB-10] Aviso enviado: ${album.titulo} (${diasRestantes} dias restantes)`);
    } catch (error) {
      console.error(`[ALB-10] Erro ao notificar album ${album.id}:`, error.message);
    }
  }

  return { notificados, total_avaliados: albuns.length };
}

module.exports = { getAlbunsExpirando, enviarAvisosExpiracao };
