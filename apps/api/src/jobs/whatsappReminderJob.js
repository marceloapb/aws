const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { enviarLembreteEvento, enviarLembreteAdmin } = require('../services/whatsappService');

const TENANT = process.env.TENANT_ID || '1';

/**
 * Busca o telefone do admin nas configurações do tenant
 */
async function getAdminPhone() {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'CONFIG#' },
  }));

  const configs = {};
  for (const item of (result.Items || [])) {
    configs[item.chave] = item.valor;
  }

  return configs.whatsappBusiness || configs.phone || null;
}

/**
 * Notifica o admin sobre eventos que acontecem amanhã
 */
async function notificarAdminEventosAmanha() {
  const agora = new Date();
  const amanha = new Date(agora);
  amanha.setDate(amanha.getDate() + 1);
  const dataAmanha = amanha.toISOString().split('T')[0]; // YYYY-MM-DD

  const adminPhone = await getAdminPhone();
  if (!adminPhone) {
    console.log('[WHATSAPP JOB] Telefone do admin não configurado, pulando notificação admin.');
    return;
  }

  // Buscar eventos de amanhã que ainda não tiveram notificação admin enviada
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    FilterExpression: 'data_evento = :amanha AND (attribute_not_exists(lembrete_admin_enviado) OR lembrete_admin_enviado = :false) AND (#s <> :cancelado)',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':pk': `TENANT#${TENANT}`, ':sk': 'AGENDA#',
      ':amanha': dataAmanha,
      ':false': false,
      ':cancelado': 'cancelado',
    },
  }));

  const eventos = result.Items || [];
  console.log(`[WHATSAPP JOB] Encontrados ${eventos.length} evento(s) para amanhã (${dataAmanha}) para notificar admin.`);

  for (const evento of eventos) {
    try {
      const tipoEvento = evento.tipo_evento || evento.titulo || 'Sessão';
      const nomeCliente = evento.cliente_nome || 'Cliente não informado';
      const dataFormatada = new Date(evento.data_evento + 'T12:00:00').toLocaleDateString('pt-BR');
      const horario = evento.horario_inicio || '09:00';
      const local = evento.local || evento.endereco || '';

      const resultado = await enviarLembreteAdmin(adminPhone, tipoEvento, nomeCliente, dataFormatada, horario, local);

      if (resultado.success) {
        await dynamo.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: evento.PK, SK: evento.SK },
          UpdateExpression: 'SET lembrete_admin_enviado = :l, lembrete_admin_enviado_em = :d',
          ExpressionAttributeValues: {
            ':l': true,
            ':d': new Date().toISOString(),
          },
        }));
        console.log(`[WHATSAPP JOB] Lembrete admin enviado: ${tipoEvento} - ${nomeCliente} em ${dataFormatada} ${horario}`);
      }
    } catch (err) {
      console.error(`[WHATSAPP JOB] Erro ao enviar lembrete admin para evento ${evento.id}:`, err.message);
    }
  }
}

/**
 * Envia lembretes para clientes com base na antecedência configurada (lógica original)
 */
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

const handler = async () => {
  // 1. Notificar admin sobre eventos de amanhã
  await notificarAdminEventosAmanha();

  // 2. Enviar lembretes aos clientes (lógica existente)
  await verificarLembretes();
};

module.exports = { handler };
module.exports.default = { handler };
