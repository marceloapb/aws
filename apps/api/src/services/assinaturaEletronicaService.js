// ══════════════════════════════════════════════════════════════
// SERVICES/ASSINATURA-ELETRONICA-SERVICE.JS
// Módulo de Assinatura Eletrônica Avançada (Lei 14.063/2020)
// ══════════════════════════════════════════════════════════════

const crypto = require('crypto');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { enviarOTP } = require('./otpService');
const { registrarAudit, EVENTOS } = require('./auditLogService');
const { gerarCodigoVerificacao } = require('./seloAssinaturaService');
const { notificarContratoAssinado } = require('./notificationService');
const logger = require('../config/logger');

// Configurações do módulo
const OTP_EXPIRATION_MINUTES = 10;
const OTP_LENGTH = 6;
const MAX_OTP_ATTEMPTS = 3;
const CONTRACT_LINK_EXPIRATION_HOURS = 72;
const OTP_COOLDOWN_SECONDS = 60; // Mínimo 60s entre envios
const OTP_MAX_PER_HOUR = 5; // Máximo 5 envios por hora por contrato

/**
 * RF02: Gera um OTP de 6 dígitos e envia para o canal do cliente
 * RNF04: Implementa fallback WhatsApp → SMS
 * SIG-02: Rate limiting server-side (60s entre envios, 5/hora)
 */
async function gerarEEnviarOTP(contratoId, canalPreferido = 'whatsapp') {
  // Buscar contrato
  const contrato = await buscarContratoPorId(contratoId);
  if (!contrato) throw new Error('Contrato não encontrado');
  if (contrato.status === 'assinado') throw new Error('Contrato já foi assinado');

  // Buscar cliente
  const cliente = await buscarCliente(contrato.cliente_id);
  if (!cliente) throw new Error('Cliente não encontrado');

  // SIG-02: Rate limiting — verificar cooldown e limite por hora
  await verificarRateLimitOTP(contratoId);

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
    tokenAssinatura: contrato.token_assinatura || '',
  });

  logger.info({
    action: 'otp_gerado_enviado',
    contratoId,
    clienteId: contrato.cliente_id,
    canal: resultado.canalUtilizado,
    otpId,
  });

  // SIG-03: Registrar evento de auditoria
  await registrarAudit(contratoId, EVENTOS.OTP_SOLICITADO, {
    cliente_id: contrato.cliente_id,
    detalhes: { canal: resultado.canalUtilizado, otp_id: otpId },
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
    // SIG-03: Registrar tentativa falha
    await registrarAudit(contratoId, EVENTOS.OTP_TENTATIVA, {
      ip_address: metadados.ip,
      user_agent: metadados.userAgent,
      detalhes: { sucesso: false, tentativas_restantes: restantes },
    });
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
    contratoId,
    enderecoIP: metadados.ip || 'N/A',
    timestamp: new Date().toISOString(),
    autenticacao: {
      metodo: 'OTP_6_DIGITOS',
      canal: otpAtivo.canalEnvio,
      validadoEm: new Date().toISOString(),
      otpId: otpAtivo.id,
    },
    signatario: {
      nomeCompleto: metadados.nomeInformado || cliente.nome || '',
      cpf: cliente.cpf || '',
      email: cliente.email || '',
      telefone: cliente.whatsapp_numero || cliente.telefone || '',
    },
    aceiteTermos: metadados.aceiteTermos || false,
    nomeInformado: metadados.nomeInformado || '',
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
      assinatura_metodo = :metodo, otp_validado = :otpVal, aceite = :aceite`,
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
      ':aceite': {
        nome: metadados.nomeInformado || cliente.nome || '',
        aceite_termos: metadados.aceiteTermos || false,
        data: new Date().toISOString(),
        ip: metadados.ip || '',
        user_agent: metadados.userAgent || '',
      },
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

  // SIG-03: Registrar OTP verificado e aceite confirmado
  await registrarAudit(contratoId, EVENTOS.OTP_VERIFICADO, {
    cliente_id: contrato.cliente_id,
    ip_address: metadados.ip,
    user_agent: metadados.userAgent,
    detalhes: { canal: otpAtivo.canalEnvio, otp_id: otpAtivo.id },
  });
  await registrarAudit(contratoId, EVENTOS.ACEITE_CONFIRMADO, {
    cliente_id: contrato.cliente_id,
    ip_address: metadados.ip,
    user_agent: metadados.userAgent,
    detalhes: { hash_documento: hashDocumento, metodo: 'assinatura_eletronica_avancada' },
  });

  // Notificar admin (WhatsApp + email + in_app)
  try {
    const TENANT = process.env.TENANT_ID || '1';
    const configResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'CONFIG#' },
    }));
    const configs = {};
    (configResult.Items || []).forEach(item => { configs[item.chave] = item.valor; });
    const adminEmail = configs.email || process.env.SES_FROM_EMAIL;
    const adminWhatsapp = configs.whatsappBusiness || configs.phone || '';
    const adminId = TENANT;
    const clienteNome = metadados.nomeInformado || cliente.nome || 'Cliente';
    await notificarContratoAssinado(adminEmail, adminWhatsapp, adminId, clienteNome);
  } catch (notifErr) {
    logger.error({ action: 'notificacao_contrato_assinado_erro', error: notifErr.message, contratoId });
  }

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

/**
 * SIG-02: Rate limiting server-side para OTP
 * - Mínimo 60 segundos entre envios para o mesmo contrato
 * - Máximo 5 envios por hora por contrato
 */
async function verificarRateLimitOTP(contratoId) {
  const agora = new Date();
  const umaHoraAtras = new Date(agora.getTime() - 60 * 60 * 1000);

  // Buscar todos os OTPs do contrato na última hora
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `CONTRATO#${contratoId}`,
      ':sk': 'OTP#',
    },
    ScanIndexForward: false, // Mais recente primeiro
  }));

  const otpsUltimaHora = (result.Items || []).filter(item => {
    const criado = new Date(item.criadoEm);
    return criado >= umaHoraAtras;
  });

  // Verificar limite por hora (máximo 5)
  if (otpsUltimaHora.length >= OTP_MAX_PER_HOUR) {
    throw new Error('Limite de envios atingido. Tente novamente em 1 hora.');
  }

  // Verificar cooldown (mínimo 60 segundos entre envios)
  if (otpsUltimaHora.length > 0) {
    const maisRecente = otpsUltimaHora[0];
    const criadoEm = new Date(maisRecente.criadoEm);
    const segundosDesdeUltimo = Math.floor((agora - criadoEm) / 1000);

    if (segundosDesdeUltimo < OTP_COOLDOWN_SECONDS) {
      const restante = OTP_COOLDOWN_SECONDS - segundosDesdeUltimo;
      throw new Error(`Aguarde ${restante} segundos antes de solicitar um novo código.`);
    }
  }
}

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
  const timestamp = logAuditoria.timestamp;
  const contratoId = logAuditoria.contratoId || 'unknown';
  const codigoVerificacao = gerarCodigoVerificacao(contratoId, timestamp);

  const dados = {
    tipo: 'ASSINATURA_ELETRONICA_AVANCADA',
    lei: 'Lei 14.063/2020 - Art. 4º, II',
    mp: 'MP 2.200-2/2001',
    signatario: logAuditoria.signatario.nomeCompleto,
    cpf: mascararCPF(logAuditoria.signatario.cpf),
    data: timestamp,
    hash: logAuditoria.hashDocumento,
    algoritmo: logAuditoria.algoritmoHash,
    autenticacao: `OTP via ${logAuditoria.autenticacao.canal}`,
    ip: logAuditoria.enderecoIP,
    id: crypto.randomUUID(),
    codigo_verificacao: codigoVerificacao,
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
  // Padrão 1: GSI1 com GSI1PK=CLIENTE (clientes com GSI populado)
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${clienteId}` },
  }));
  if (result.Items?.[0]) return result.Items[0];

  // Padrão 2: CLIENT#<id> / PROFILE (clientes self-signup via Cognito)
  const cli2 = await dynamo.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `CLIENT#${clienteId}`, SK: 'PROFILE' },
  }));
  if (cli2.Item) return { ...cli2.Item, id: clienteId };

  // Padrão 3: TENANT#1 / CLIENTE#<id> (clientes criados pelo admin)
  const TENANT = process.env.TENANT_ID || '1';
  const cli3 = await dynamo.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `TENANT#${TENANT}`, SK: `CLIENTE#${clienteId}` },
  }));
  if (cli3.Item) return { ...cli3.Item, id: clienteId };

  return null;
}

async function buscarOTPAtivo(contratoId) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `CONTRATO#${contratoId}`,
      ':sk': 'OTP#',
    },
  }));
  // Retornar o OTP mais recente que esteja pendente (ordenar por criadoEm desc)
  const pendentes = (result.Items || [])
    .filter(item => item.status === 'pendente')
    .sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
  return pendentes[0] || null;
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
