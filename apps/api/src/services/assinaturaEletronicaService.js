// ══════════════════════════════════════════════════════════════
// SERVICES/ASSINATURA-ELETRONICA-SERVICE.JS
// Módulo de Assinatura Eletrônica Avançada (Lei 14.063/2020)
// ══════════════════════════════════════════════════════════════

const crypto = require('crypto');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { enviarOTP } = require('./otpService');
const logger = require('../config/logger');

// Configurações do módulo
const OTP_EXPIRATION_MINUTES = 10;
const OTP_LENGTH = 6;
const MAX_OTP_ATTEMPTS = 3;
const CONTRACT_LINK_EXPIRATION_HOURS = 72;

/**
 * RF02: Gera um OTP de 6 dígitos e envia para o canal do cliente
 * RNF04: Implementa fallback WhatsApp → SMS
 */
async function gerarEEnviarOTP(contratoId, canalPreferido = 'whatsapp') {
  // Buscar contrato
  const contrato = await buscarContratoPorId(contratoId);
  if (!contrato) throw new Error('Contrato não encontrado');
  if (contrato.status === 'assinado') throw new Error('Contrato já foi assinado');

  // Buscar cliente
  const cliente = await buscarCliente(contrato.cliente_id);
  if (!cliente) throw new Error('Cliente não encontrado');

  // Gerar OTP de 6 dígitos (RF02)
  const otp = gerarCodigoOTP();
  const now = new Date();
  const expiraEm = new Date(now.getTime() + OTP_EXPIRATION_MINUTES * 60 * 1000);

  // Salvar OTP no DynamoDB
  const otpId = crypto.randomUUID();
  const otpItem = {
    PK: `CONTRATO#${contratoId}`,
    SK: `OTP#${otpId}`,
    id: otpId,
    contratoId,
    clienteId: contrato.cliente_id,
    codigo: hashOTP(otp), // Armazenar hash do OTP por segurança
    canalEnvio: canalPreferido,
    tentativas: 0,
    maxTentativas: MAX_OTP_ATTEMPTS,
    status: 'pendente',
    criadoEm: now.toISOString(),
    expiraEm: expiraEm.toISOString(),
    TTL: Math.floor(expiraEm.getTime() / 1000),
  };

  await dynamo.send(new PutCommand({ TableName: TABLE, Item: otpItem }));

  // Enviar OTP com fallback (RNF04)
  const resultado = await enviarOTP({
    cliente,
    codigo: otp,
    canalPreferido,
    contratoId,
  });

  logger.info({
    action: 'otp_gerado_enviado',
    contratoId,
    clienteId: contrato.cliente_id,
    canal: resultado.canalUtilizado,
    otpId,
  });

  return {
    otpId,
    canalUtilizado: resultado.canalUtilizado,
    expiraEm: expiraEm.toISOString(),
    mascaraDestino: resultado.mascaraDestino,
  };
}

/**
 * RF03: Valida o OTP e processa a assinatura eletrônica
 * RNF03: Gera hash SHA-256 do documento
 */
async function validarOTPEAssinar(contratoId, codigoInformado, metadados) {
  // Buscar OTP mais recente e válido
  const otpAtivo = await buscarOTPAtivo(contratoId);
  if (!otpAtivo) throw new Error('Nenhum código de verificação ativo encontrado. Solicite um novo código.');

  // Verificar expiração
  if (new Date() > new Date(otpAtivo.expiraEm)) {
    await marcarOTPExpirado(otpAtivo);
    throw new Error('Código expirado. Solicite um novo código de verificação.');
  }

  // Verificar tentativas
  if (otpAtivo.tentativas >= otpAtivo.maxTentativas) {
    await marcarOTPBloqueado(otpAtivo);
    throw new Error('Número máximo de tentativas excedido. Solicite um novo código.');
  }

  // Incrementar tentativas
  await incrementarTentativas(otpAtivo);

  // Validar código
  const codigoValido = verificarOTP(codigoInformado, otpAtivo.codigo);
  if (!codigoValido) {
    const restantes = otpAtivo.maxTentativas - (otpAtivo.tentativas + 1);
    throw new Error(`Código incorreto. Você tem ${restantes} tentativa(s) restante(s).`);
  }

  // Código válido - processar assinatura
  await marcarOTPUtilizado(otpAtivo);

  // Buscar contrato completo
  const contrato = await buscarContratoPorId(contratoId);
  const cliente = await buscarCliente(contrato.cliente_id);

  // RNF03: Gerar hash SHA-256 do conteúdo do contrato
  const hashDocumento = gerarHashDocumento(contrato.conteudo_html);

  // Montar dados do log de auditoria (Seção 3 da spec)
  const logAuditoria = {
    enderecoIP: metadados.ip || 'N/A',
    timestamp: new Date().toISOString(),
    autenticacao: {
      metodo: 'OTP_6_DIGITOS',
      canal: otpAtivo.canalEnvio,
      validadoEm: new Date().toISOString(),
      otpId: otpAtivo.id,
    },
    signatario: {
      nomeCompleto: cliente.nome || '',
      cpf: cliente.cpf || '',
      email: cliente.email || '',
      telefone: cliente.whatsapp_numero || cliente.telefone || '',
    },
    userAgent: metadados.userAgent || '',
    hashDocumento,
    algoritmoHash: 'SHA-256',
  };

  // Gerar selo de assinatura
  const selo = gerarSeloAssinatura(logAuditoria);

  // Atualizar contrato com assinatura
  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: contrato.PK, SK: contrato.SK },
    UpdateExpression: `SET #s = :s, assinado_em = :a, hash_documento = :h, 
      algoritmo_hash = :ah, selo_assinatura = :selo, log_auditoria = :log, 
      ip_assinatura = :ip, user_agent_assinatura = :ua, 
      assinatura_metodo = :metodo, otp_validado = :otpVal`,
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':s': 'assinado',
      ':a': new Date().toISOString(),
      ':h': hashDocumento,
      ':ah': 'SHA-256',
      ':selo': selo,
      ':log': logAuditoria,
      ':ip': metadados.ip || '',
      ':ua': metadados.userAgent || '',
      ':metodo': 'assinatura_eletronica_avancada',
      ':otpVal': true,
    },
  }));

  // Salvar log de auditoria separado para consulta
  await salvarLogAuditoria(contratoId, contrato.cliente_id, logAuditoria);

  logger.info({
    action: 'contrato_assinado_eletronicamente',
    contratoId,
    clienteId: contrato.cliente_id,
    hashDocumento,
    ip: metadados.ip,
  });

  return {
    success: true,
    hashDocumento,
    selo,
    assinadoEm: logAuditoria.timestamp,
    signatario: logAuditoria.signatario.nomeCompleto,
  };
}

/**
 * Busca contrato por token público de assinatura
 */
async function buscarContratoPorToken(token) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    FilterExpression: 'token_assinatura = :token',
    ExpressionAttributeValues: { ':pk': 'CONTRATO', ':token': token },
  }));
  return result.Items?.[0] || null;
}

/**
 * Verifica integridade do documento assinado (RNF03)
 */
async function verificarIntegridade(contratoId) {
  const contrato = await buscarContratoPorId(contratoId);
  if (!contrato) throw new Error('Contrato não encontrado');
  if (contrato.status !== 'assinado') throw new Error('Contrato ainda não foi assinado');

  const hashAtual = gerarHashDocumento(contrato.conteudo_html);
  const integridadeOk = hashAtual === contrato.hash_documento;

  return {
    integridadeOk,
    hashOriginal: contrato.hash_documento,
    hashAtual,
    algoritmo: contrato.algoritmo_hash,
    assinadoEm: contrato.assinado_em,
    mensagem: integridadeOk
      ? 'Documento íntegro - nenhuma alteração detectada após assinatura.'
      : 'ALERTA: Documento alterado após assinatura! Integridade comprometida.',
  };
}

/**
 * Retorna o log de auditoria completo para manifesto PDF
 */
async function obterLogAuditoria(contratoId) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `CONTRATO#${contratoId}`,
      ':sk': 'AUDITORIA#',
    },
  }));
  return result.Items || [];
}

// ═══ Funções auxiliares ═══

function gerarCodigoOTP() {
  // Gera código OTP seguro de 6 dígitos usando crypto
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0) % 1000000;
  return num.toString().padStart(OTP_LENGTH, '0');
}

function hashOTP(codigo) {
  return crypto.createHash('sha256').update(codigo).digest('hex');
}

function verificarOTP(codigoInformado, hashArmazenado) {
  const hashInformado = hashOTP(codigoInformado);
  return crypto.timingSafeEqual(
    Buffer.from(hashInformado, 'hex'),
    Buffer.from(hashArmazenado, 'hex')
  );
}

function gerarHashDocumento(conteudo) {
  return crypto.createHash('sha256').update(conteudo || '', 'utf8').digest('hex');
}

function gerarSeloAssinatura(logAuditoria) {
  const dados = {
    tipo: 'ASSINATURA_ELETRONICA_AVANCADA',
    lei: 'Lei 14.063/2020 - Art. 4º, II',
    mp: 'MP 2.200-2/2001',
    signatario: logAuditoria.signatario.nomeCompleto,
    cpf: mascararCPF(logAuditoria.signatario.cpf),
    data: logAuditoria.timestamp,
    hash: logAuditoria.hashDocumento,
    algoritmo: logAuditoria.algoritmoHash,
    autenticacao: `OTP via ${logAuditoria.autenticacao.canal}`,
    ip: logAuditoria.enderecoIP,
    id: crypto.randomUUID(),
  };
  // Gerar hash do selo para validação posterior
  dados.seloHash = crypto.createHash('sha256').update(JSON.stringify(dados)).digest('hex');
  return dados;
}

function mascararCPF(cpf) {
  if (!cpf || cpf.length < 11) return '***.***.***-**';
  const limpo = cpf.replace(/\D/g, '');
  return `${limpo.slice(0, 3)}.***.***.${limpo.slice(-2)}`;
}

async function buscarContratoPorId(contratoId) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'CONTRATO', ':sk': `CONTRATO#${contratoId}` },
  }));
  return result.Items?.[0] || null;
}

async function buscarCliente(clienteId) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${clienteId}` },
  }));
  return result.Items?.[0] || null;
}

async function buscarOTPAtivo(contratoId) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `CONTRATO#${contratoId}`,
      ':sk': 'OTP#',
    },
    ScanIndexForward: false, // Mais recente primeiro
  }));
  // Retornar o OTP mais recente que esteja pendente
  return (result.Items || []).find(item => item.status === 'pendente');
}

async function marcarOTPExpirado(otp) {
  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: otp.PK, SK: otp.SK },
    UpdateExpression: 'SET #s = :s',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': 'expirado' },
  }));
}

async function marcarOTPBloqueado(otp) {
  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: otp.PK, SK: otp.SK },
    UpdateExpression: 'SET #s = :s',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': 'bloqueado' },
  }));
}

async function marcarOTPUtilizado(otp) {
  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: otp.PK, SK: otp.SK },
    UpdateExpression: 'SET #s = :s, utilizado_em = :u',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': 'utilizado', ':u': new Date().toISOString() },
  }));
}

async function incrementarTentativas(otp) {
  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: otp.PK, SK: otp.SK },
    UpdateExpression: 'SET tentativas = tentativas + :inc',
    ExpressionAttributeValues: { ':inc': 1 },
  }));
}

async function salvarLogAuditoria(contratoId, clienteId, logAuditoria) {
  const id = crypto.randomUUID();
  await dynamo.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `CONTRATO#${contratoId}`,
      SK: `AUDITORIA#${id}`,
      GSI1PK: 'AUDITORIA',
      GSI1SK: `AUDITORIA#${id}`,
      id,
      contratoId,
      clienteId,
      tipo: 'assinatura_eletronica',
      ...logAuditoria,
      criadoEm: new Date().toISOString(),
    },
  }));
}

module.exports = {
  gerarEEnviarOTP,
  validarOTPEAssinar,
  buscarContratoPorToken,
  verificarIntegridade,
  obterLogAuditoria,
  gerarHashDocumento,
  OTP_EXPIRATION_MINUTES,
  CONTRACT_LINK_EXPIRATION_HOURS,
};
