/**
 * ══════════════════════════════════════════════════════════════
 * FOLLOW-UP SERVICE — Motor de réguas, varredura, disparo e escalonamento
 * ══════════════════════════════════════════════════════════════
 */

const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { notificar } = require('./notificationService');
const logger = require('../config/logger');

const TENANT = process.env.TENANT_ID || 'default';

// ══════════ STATUS CONSTANTS ══════════
const FOLLOWUP_STATUS = {
  PENDENTE: 'pendente',
  ATIVO: 'ativo',
  DISPARADO: 'disparado',
  RESOLVIDO: 'resolvido',
  ESGOTADO: 'esgotado',
  CANCELADO: 'cancelado',
  SILENCIADO: 'silenciado',
};

const GATILHOS = ['orcamento_enviado', 'contrato_gerado', 'pagamento_atrasado', 'album_publicado'];
const CANAIS = ['email', 'whatsapp', 'in_app'];
const NATUREZAS = ['comercial', 'operacional'];
const PRIORIDADES = { parcela: 1, contrato: 2, orcamento: 3, album: 4 };

// ══════════ CRUD DE RÉGUAS ══════════

async function criarRegua(dados) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const item = {
    PK: `TENANT#${TENANT}`,
    SK: `REGUA#${id}`,
    GSI1PK: `REGUA#${TENANT}`,
    GSI1SK: `REGUA#${dados.gatilho || 'manual'}#${id}`,
    id,
    nome: dados.nome,
    natureza: dados.natureza || 'comercial',
    gatilho: dados.gatilho,
    canal_inicial: dados.canal_inicial || 'email',
    canal_escalonado: dados.canal_escalonado || null,
    tentativa_escalonamento: dados.tentativa_escalonamento || null,
    intervalo_dias: dados.intervalo_dias || 3,
    tentativas_max: dados.tentativas_max || 5,
    template_msg: dados.template_msg || '',
    ao_esgotar_gerar_pendencia: dados.ao_esgotar_gerar_pendencia || false,
    passos: dados.passos || [],
    ativo: true,
    created_at: now,
    updated_at: now,
  };

  await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

async function listarReguas({ ativo, gatilho } = {}) {
  const params = {
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'REGUA#' },
  };

  const filters = [];
  const names = {};

  if (ativo !== undefined) {
    filters.push('ativo = :ativo');
    params.ExpressionAttributeValues[':ativo'] = ativo === 'true' || ativo === true;
  }
  if (gatilho) {
    filters.push('gatilho = :gatilho');
    params.ExpressionAttributeValues[':gatilho'] = gatilho;
  }
  if (filters.length > 0) {
    params.FilterExpression = filters.join(' AND ');
  }
  if (Object.keys(names).length > 0) {
    params.ExpressionAttributeNames = names;
  }

  const result = await dynamo.send(new QueryCommand(params));
  return result.Items || [];
}

async function obterRegua(id) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': `REGUA#${id}` },
  }));
  return result.Items?.[0] || null;
}

async function atualizarRegua(id, dados) {
  const keys = Object.keys(dados).filter(k => !['PK', 'SK', 'id', 'created_at'].includes(k));
  if (keys.length === 0) return null;

  keys.push('updated_at');
  dados.updated_at = new Date().toISOString();

  const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
  const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
  const vals = Object.fromEntries(keys.map((k, i) => [`:v${i}`, dados[k]]));

  const result = await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `TENANT#${TENANT}`, SK: `REGUA#${id}` },
    UpdateExpression: expr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: vals,
    ReturnValues: 'ALL_NEW',
  }));
  return result.Attributes;
}

async function deletarRegua(id) {
  await dynamo.send(new DeleteCommand({
    TableName: TABLE,
    Key: { PK: `TENANT#${TENANT}`, SK: `REGUA#${id}` },
  }));
}

// ══════════ EXECUÇÕES (FOLLOWUP_EXEC) ══════════

async function criarExecucao({ regua_id, referencia_id, referencia_tipo, cliente_id, cliente_nome, cliente_email, cliente_whatsapp }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const timestamp = now.replace(/[-:T]/g, '').slice(0, 14);

  const regua = await obterRegua(regua_id);
  if (!regua) throw new Error(`Régua ${regua_id} não encontrada`);

  const proximoDisparo = calcularProximoDisparo(now, regua.intervalo_dias);

  const item = {
    PK: `TENANT#${TENANT}`,
    SK: `FWEXEC#${timestamp}#${id}`,
    GSI1PK: `FWEXEC#${TENANT}#${FOLLOWUP_STATUS.ATIVO}`,
    GSI1SK: `FWEXEC#${proximoDisparo}`,
    id,
    regua_id,
    regua_nome: regua.nome,
    referencia_id,
    referencia_tipo,
    cliente_id,
    cliente_nome,
    cliente_email: cliente_email || null,
    cliente_whatsapp: cliente_whatsapp || null,
    passo_atual: 0,
    tentativas_max: regua.tentativas_max,
    intervalo_dias: regua.intervalo_dias,
    canal_inicial: regua.canal_inicial,
    canal_escalonado: regua.canal_escalonado,
    tentativa_escalonamento: regua.tentativa_escalonamento,
    template_msg: regua.template_msg,
    ao_esgotar_gerar_pendencia: regua.ao_esgotar_gerar_pendencia,
    natureza: regua.natureza,
    prioridade: PRIORIDADES[referencia_tipo] || 4,
    proximo_disparo_em: proximoDisparo,
    status: FOLLOWUP_STATUS.ATIVO,
    historico: [],
    created_at: now,
    updated_at: now,
  };

  await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
  logger.info({ action: 'followup_exec_created', id, regua_id, referencia_id });
  return item;
}

async function listarExecucoes({ status, referencia_tipo, page = 1, limit = 50 } = {}) {
  const params = {
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'FWEXEC#' },
    ScanIndexForward: false,
  };

  const filters = [];
  const names = {};

  if (status) {
    filters.push('#s = :status');
    names['#s'] = 'status';
    params.ExpressionAttributeValues[':status'] = status;
  }
  if (referencia_tipo) {
    filters.push('referencia_tipo = :rt');
    params.ExpressionAttributeValues[':rt'] = referencia_tipo;
  }
  if (filters.length > 0) {
    params.FilterExpression = filters.join(' AND ');
    params.ExpressionAttributeNames = names;
  }

  const result = await dynamo.send(new QueryCommand(params));
  const items = result.Items || [];

  const total = items.length;
  const start = (Number(page) - 1) * Number(limit);
  const data = items.slice(start, start + Number(limit));

  return { data, pagination: { page: Number(page), totalPages: Math.ceil(total / Number(limit)), totalItems: total } };
}

async function obterExecucao(sk) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': sk },
  }));
  return result.Items?.[0] || null;
}

// ══════════ MOTOR DE VARREDURA ══════════

async function varrerDisparosPendentes() {
  const agora = new Date().toISOString();

  // Query GSI1 por execuções ativas com proximo_disparo <= agora
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK <= :agora',
    ExpressionAttributeValues: {
      ':pk': `FWEXEC#${TENANT}#${FOLLOWUP_STATUS.ATIVO}`,
      ':agora': `FWEXEC#${agora}`,
    },
  }));

  const pendentes = result.Items || [];
  logger.info({ action: 'followup_scan', pendentes: pendentes.length });

  let disparados = 0;
  let esgotados = 0;
  let erros = 0;

  for (const exec of pendentes) {
    try {
      // Teto: 1 mensagem por cliente/dia
      if (await jaDisparouHoje(exec.cliente_id)) {
        logger.info({ action: 'followup_teto_dia', exec_id: exec.id, cliente_id: exec.cliente_id });
        continue;
      }

      const novoPasso = exec.passo_atual + 1;

      if (novoPasso > exec.tentativas_max) {
        // Esgotou tentativas
        await esgotar(exec);
        esgotados++;
      } else {
        // Disparar
        await disparar(exec, novoPasso);
        disparados++;
      }
    } catch (error) {
      logger.error({ action: 'followup_disparo_error', exec_id: exec.id, error: error.message });
      erros++;
    }
  }

  return { disparados, esgotados, erros, total: pendentes.length };
}

// ══════════ DISPARO ══════════

async function disparar(exec, novoPasso) {
  const canal = determinarCanal(exec, novoPasso);
  const mensagem = renderTemplate(exec.template_msg, exec);
  const now = new Date().toISOString();

  // Enviar notificação pelo canal
  await notificar({
    tipo: `followup_${exec.natureza}`,
    titulo: `Follow-up: ${exec.regua_nome}`,
    mensagem,
    destinatario_id: exec.cliente_id,
    destinatario_email: canal === 'email' ? exec.cliente_email : undefined,
    destinatario_whatsapp: canal === 'whatsapp' ? exec.cliente_whatsapp : undefined,
    canais: [canal],
    dados: { regua_id: exec.regua_id, referencia_id: exec.referencia_id },
  });

  const proximoDisparo = calcularProximoDisparo(now, exec.intervalo_dias);
  const historicoEntry = { passo: novoPasso, canal, disparado_em: now, mensagem };

  // Update com conditional write (idempotência)
  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: exec.PK, SK: exec.SK },
    UpdateExpression: 'SET passo_atual = :passo, proximo_disparo_em = :prox, updated_at = :now, historico = list_append(if_not_exists(historico, :empty), :hist), GSI1PK = :gsi1pk, GSI1SK = :gsi1sk',
    ExpressionAttributeValues: {
      ':passo': novoPasso,
      ':prox': proximoDisparo,
      ':now': now,
      ':hist': [historicoEntry],
      ':empty': [],
      ':gsi1pk': `FWEXEC#${TENANT}#${FOLLOWUP_STATUS.ATIVO}`,
      ':gsi1sk': `FWEXEC#${proximoDisparo}`,
      ':expected': novoPasso - 1,
    },
    ConditionExpression: 'passo_atual = :expected',
  }));

  logger.info({ action: 'followup_disparado', exec_id: exec.id, passo: novoPasso, canal });
}

// ══════════ ESCALONAMENTO DE CANAL ══════════

function determinarCanal(exec, passo) {
  if (exec.canal_escalonado && exec.tentativa_escalonamento && passo >= exec.tentativa_escalonamento) {
    return exec.canal_escalonado;
  }
  // Se tem passos definidos na régua, usar o canal do passo
  if (exec.passos && exec.passos[passo - 1] && exec.passos[passo - 1].canal) {
    return exec.passos[passo - 1].canal;
  }
  return exec.canal_inicial || 'email';
}

// ══════════ ESGOTAMENTO ══════════

async function esgotar(exec) {
  const now = new Date().toISOString();

  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: exec.PK, SK: exec.SK },
    UpdateExpression: 'SET #s = :status, updated_at = :now, esgotado_em = :now, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':status': FOLLOWUP_STATUS.ESGOTADO,
      ':now': now,
      ':gsi1pk': `FWEXEC#${TENANT}#${FOLLOWUP_STATUS.ESGOTADO}`,
      ':gsi1sk': `FWEXEC#${now}`,
    },
  }));

  // Gerar pendência manual se configurado
  if (exec.ao_esgotar_gerar_pendencia) {
    const pendId = crypto.randomUUID();
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `TENANT#${TENANT}`,
        SK: `PENDENCIA#${pendId}`,
        id: pendId,
        tipo: 'followup_esgotado',
        titulo: `Follow-up esgotado: ${exec.regua_nome}`,
        descricao: `Cliente ${exec.cliente_nome || exec.cliente_id} não respondeu após ${exec.tentativas_max} tentativas.`,
        referenciaId: exec.referencia_id,
        prioridade: 'alta',
        status: 'pendente',
        origem: 'followup',
        autoGerada: true,
        criadoEm: now,
        atualizadoEm: now,
      },
    }));
  }

  logger.info({ action: 'followup_esgotado', exec_id: exec.id, gerou_pendencia: exec.ao_esgotar_gerar_pendencia });
}

// ══════════ RESOLUÇÃO AUTOMÁTICA ══════════

async function resolverPorEvento(referencia_id, motivo) {
  // Buscar execuções ativas para essa referência
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    FilterExpression: 'referencia_id = :ref AND #s = :status',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':pk': `TENANT#${TENANT}`,
      ':sk': 'FWEXEC#',
      ':ref': referencia_id,
      ':status': FOLLOWUP_STATUS.ATIVO,
    },
  }));

  const execucoes = result.Items || [];
  const now = new Date().toISOString();

  for (const exec of execucoes) {
    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: exec.PK, SK: exec.SK },
      UpdateExpression: 'SET #s = :status, updated_at = :now, resolvido_em = :now, motivo_resolucao = :motivo, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':status': FOLLOWUP_STATUS.RESOLVIDO,
        ':now': now,
        ':motivo': motivo,
        ':gsi1pk': `FWEXEC#${TENANT}#${FOLLOWUP_STATUS.RESOLVIDO}`,
        ':gsi1sk': `FWEXEC#${now}`,
      },
    }));
    logger.info({ action: 'followup_resolvido', exec_id: exec.id, motivo });
  }

  return execucoes.length;
}

// ══════════ CANCELAR / SILENCIAR ══════════

async function cancelarExecucao(sk) {
  const now = new Date().toISOString();
  const result = await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `TENANT#${TENANT}`, SK: sk },
    UpdateExpression: 'SET #s = :status, updated_at = :now, cancelado_em = :now, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':status': FOLLOWUP_STATUS.CANCELADO,
      ':now': now,
      ':gsi1pk': `FWEXEC#${TENANT}#${FOLLOWUP_STATUS.CANCELADO}`,
      ':gsi1sk': `FWEXEC#${now}`,
    },
    ReturnValues: 'ALL_NEW',
  }));
  return result.Attributes;
}

async function silenciarExecucao(sk, dias) {
  const now = new Date();
  const silenciadoAte = new Date(now.getTime() + (dias || 7) * 24 * 60 * 60 * 1000).toISOString();
  const result = await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `TENANT#${TENANT}`, SK: sk },
    UpdateExpression: 'SET #s = :status, updated_at = :now, silenciado_ate = :ate, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':status': FOLLOWUP_STATUS.SILENCIADO,
      ':now': now.toISOString(),
      ':ate': silenciadoAte,
      ':gsi1pk': `FWEXEC#${TENANT}#${FOLLOWUP_STATUS.SILENCIADO}`,
      ':gsi1sk': `FWEXEC#${silenciadoAte}`,
    },
    ReturnValues: 'ALL_NEW',
  }));
  return result.Attributes;
}

// Reativar silenciados que já passaram do prazo
async function reativarSilenciados() {
  const agora = new Date().toISOString();
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK <= :agora',
    ExpressionAttributeValues: {
      ':pk': `FWEXEC#${TENANT}#${FOLLOWUP_STATUS.SILENCIADO}`,
      ':agora': `FWEXEC#${agora}`,
    },
  }));

  for (const exec of (result.Items || [])) {
    const proximoDisparo = calcularProximoDisparo(agora, exec.intervalo_dias || 3);
    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: exec.PK, SK: exec.SK },
      UpdateExpression: 'SET #s = :status, updated_at = :now, proximo_disparo_em = :prox, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk REMOVE silenciado_ate',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':status': FOLLOWUP_STATUS.ATIVO,
        ':now': agora,
        ':prox': proximoDisparo,
        ':gsi1pk': `FWEXEC#${TENANT}#${FOLLOWUP_STATUS.ATIVO}`,
        ':gsi1sk': `FWEXEC#${proximoDisparo}`,
      },
    }));
  }

  return (result.Items || []).length;
}

// ══════════ MÉTRICAS ══════════

async function obterMetricas() {
  const statusList = [FOLLOWUP_STATUS.ATIVO, FOLLOWUP_STATUS.RESOLVIDO, FOLLOWUP_STATUS.ESGOTADO, FOLLOWUP_STATUS.CANCELADO, FOLLOWUP_STATUS.SILENCIADO];

  const counts = {};
  for (const status of statusList) {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': `FWEXEC#${TENANT}#${status}` },
      Select: 'COUNT',
    }));
    counts[status] = result.Count || 0;
  }

  return {
    ativos: counts[FOLLOWUP_STATUS.ATIVO] || 0,
    resolvidos: counts[FOLLOWUP_STATUS.RESOLVIDO] || 0,
    esgotados: counts[FOLLOWUP_STATUS.ESGOTADO] || 0,
    cancelados: counts[FOLLOWUP_STATUS.CANCELADO] || 0,
    silenciados: counts[FOLLOWUP_STATUS.SILENCIADO] || 0,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
  };
}

// ══════════ HELPERS ══════════

function calcularProximoDisparo(dataBase, intervaloDias) {
  const d = new Date(dataBase);
  d.setDate(d.getDate() + (intervaloDias || 3));
  return d.toISOString();
}

function renderTemplate(template, exec) {
  if (!template) return `Follow-up: ${exec.regua_nome}`;
  return template
    .replace(/\{nome\}/g, exec.cliente_nome || '')
    .replace(/\{valor\}/g, exec.valor || '')
    .replace(/\{data\}/g, new Date().toLocaleDateString('pt-BR'))
    .replace(/\{evento\}/g, exec.referencia_tipo || '')
    .replace(/\{passo\}/g, String(exec.passo_atual + 1))
    .replace(/\{max\}/g, String(exec.tentativas_max));
}

async function jaDisparouHoje(clienteId) {
  if (!clienteId) return false;
  const hoje = new Date().toISOString().slice(0, 10);
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    FilterExpression: 'cliente_id = :cid AND contains(updated_at, :hoje) AND #s = :status',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':pk': `TENANT#${TENANT}`,
      ':sk': 'FWEXEC#',
      ':cid': clienteId,
      ':hoje': hoje,
      ':status': FOLLOWUP_STATUS.ATIVO,
    },
    Limit: 1,
  }));
  // Verifica se alguma execução foi disparada hoje checando o histórico
  const items = result.Items || [];
  for (const item of items) {
    const hist = item.historico || [];
    if (hist.some(h => h.disparado_em && h.disparado_em.startsWith(hoje))) {
      return true;
    }
  }
  return false;
}

module.exports = {
  FOLLOWUP_STATUS,
  GATILHOS,
  CANAIS,
  NATUREZAS,
  // CRUD Réguas
  criarRegua,
  listarReguas,
  obterRegua,
  atualizarRegua,
  deletarRegua,
  // Execuções
  criarExecucao,
  listarExecucoes,
  obterExecucao,
  cancelarExecucao,
  silenciarExecucao,
  // Motor
  varrerDisparosPendentes,
  reativarSilenciados,
  resolverPorEvento,
  // Métricas
  obterMetricas,
};
