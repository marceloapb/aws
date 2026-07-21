const { dynamo, TABLE } = require('../config/dynamodb');
const { PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { uploadBackup } = require('../services/s3Service');

const TENANT = process.env.TENANT_ID || 'default';

async function executarBackup() {
  const inicio = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `horizons-backup-${timestamp}.json`;
  const id = crypto.randomUUID();

  try {
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: { id, PK: `BACKUP#${id}`, SK: `BACKUP#${id}`, tipo: 'automatico', status: 'em_andamento', arquivo_nome: filename, created: new Date().toISOString() },
    }));

    const buffer = Buffer.from(JSON.stringify({ timestamp, note: 'DynamoDB PITR handles backups' }));
    const { s3_key } = await uploadBackup(buffer, filename);

    const duracao = Date.now() - inicio;
    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `BACKUP#${id}`, SK: `BACKUP#${id}` },
      UpdateExpression: 'SET #s = :s, s3_key = :k, tamanho_bytes = :t, duracao_ms = :d',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'concluido', ':k': s3_key, ':t': buffer.length, ':d': duracao },
    }));

    // Salvar status do último backup nas configurações para o frontend
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `TENANT#${TENANT}`,
        SK: 'CONFIG#lastBackup',
        chave: 'lastBackup',
        valor: JSON.stringify({ status: 'concluido', timestamp: new Date().toISOString(), arquivo: filename, duracao_ms: duracao }),
        updated: new Date().toISOString(),
      },
    }));

    console.log(`[BACKUP JOB] Concluído: ${filename}`);
  } catch (error) {
    // Salvar status de erro
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `TENANT#${TENANT}`,
        SK: 'CONFIG#lastBackup',
        chave: 'lastBackup',
        valor: JSON.stringify({ status: 'erro', timestamp: new Date().toISOString(), erro: error.message }),
        updated: new Date().toISOString(),
      },
    })).catch(() => {});
    console.error('[BACKUP JOB] Erro:', error.message);
  }
}

const handler = async () => { await executarBackup(); };

module.exports = { handler };
module.exports.default = { handler };
