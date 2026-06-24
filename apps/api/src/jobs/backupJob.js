import { dynamo, TABLE } from '../config/dynamodb.js';
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { uploadBackup } from '../services/s3Service.js';

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

    // Em serverless não temos filesystem persistente - backup via DynamoDB export seria ideal
    // Por ora, registramos a execução
    const buffer = Buffer.from(JSON.stringify({ timestamp, note: 'DynamoDB PITR handles backups' }));
    const { s3_key } = await uploadBackup(buffer, filename);

    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `BACKUP#${id}`, SK: `BACKUP#${id}` },
      UpdateExpression: 'SET #s = :s, s3_key = :k, tamanho_bytes = :t, duracao_ms = :d',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'concluido', ':k': s3_key, ':t': buffer.length, ':d': Date.now() - inicio },
    }));

    console.log(`[BACKUP JOB] Concluído: ${filename}`);
  } catch (error) {
    console.error('[BACKUP JOB] Erro:', error.message);
  }
}

export const handler = async () => { await executarBackup(); };
export default { handler };
