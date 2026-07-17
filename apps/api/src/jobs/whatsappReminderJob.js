const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { enviarLembreteEvento } = require('../services/whatsappService');

const TENANT = process.env.TENANT_ID || 'default';

async function verificarLembretes() {
  const agora = new Date();

  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    FilterExpression: 'aviso_whatsapp_ativo = :ativo AND lembrete_enviado = :enviado AND #s = :status AND data_evento >= :hoje',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':pk': `TENANT#${TENANT}`, ':sk': 'AGENDA#',
      ':ativo': true, ':enviado': false, ':status': 'ocupada',
      ':hoje': agora.toISOString().split('T')[0],
    },
  }));

  for (const evento of (result.Items || [])) {
    const antecedencia = evento.antecedencia_minutos || 60;
    const dataEvento = new Date(`${evento.data_evento}T${evento.horario_inicio || '09:00'}:00`);
    const momentoEnvio = new Date(dataEvento.getTime() - antecedencia * 60 * 1000);

    if (agora >= momentoEnvio && evento.cliente_id) {
      // Buscar cliente
      const cliResult = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
        ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${evento.cliente_id}` },
      }));
      const cliente = cliResult.Items?.[0];

      if (cliente?.whatsapp_numero) {
        const resultado = await enviarLembreteEvento(
          cliente.whatsapp_numero, cliente.nome, evento.tipo_evento,
          new Date(evento.data_evento).toLocaleDateString('pt-BR'),
          evento.horario_inicio || '09:00'
        );
        if (resultado.success) {
          await dynamo.send(new UpdateCommand({
            TableName: TABLE, Key: { PK: evento.PK, SK: evento.SK },
            UpdateExpression: 'SET lembrete_enviado = :l',
            ExpressionAttributeValues: { ':l': true },
          }));
          console.log(`[WHATSAPP JOB] Lembrete enviado para ${cliente.nome}`);
        }
      }
    }
  }
}

const handler = async () => { await verificarLembretes(); };

module.exports = { handler };
module.exports.default = { handler };
