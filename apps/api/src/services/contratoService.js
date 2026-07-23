const crypto = require('crypto');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { enviarTemplate } = require('./whatsappService');
const { enviarEmail } = require('../adapters/notificacoes/emailAdapter');
const { gerarHashDocumento, CONTRACT_LINK_EXPIRATION_HOURS } = require('./assinaturaEletronicaService');
const { env } = require('../config/env');
const logger = require('../config/logger');

const TEMPLATES = {
  casamento: 'contrato_casamento',
  ensaio: 'contrato_ensaio',
  aniversario: 'contrato_aniversario',
  '15anos': 'contrato_15anos',
  batizado: 'contrato_batizado',
  corporativo: 'contrato_corporativo',
  default: 'contrato_padrao',
};

/**
 * RF01: Gera contrato em formato digital consolidando informações do evento
 * Integrado com assinatura eletrônica avançada
 */
async function gerarContrato(orcamentoId) {
  // Buscar orçamento
  const orcResult = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'ORCAMENTO', ':sk': `ORCAMENTO#${orcamentoId}` },
  }));
  const orcamento = orcResult.Items?.[0];
  if (!orcamento) throw new Error('Orçamento não encontrado');

  // Buscar cliente
  const cliResult = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${orcamento.cliente_id}` },
  }));
  const cliente = cliResult.Items?.[0];
  if (!cliente) throw new Error('Cliente não encontrado no orçamento');

  // Buscar template de configuração
  const TENANT = process.env.TENANT_ID || 'default';
  const templateKey = TEMPLATES[orcamento.tipo_evento] || TEMPLATES.default;
  const cfgResult = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': `CONFIG#${templateKey}` },
  }));
  let conteudo = cfgResult.Items?.[0]?.valor || getTemplateDefault(orcamento.tipo_evento);

  conteudo = conteudo
    .replace(/{{cliente_nome}}/g, cliente.nome)
    .replace(/{{cliente_cpf}}/g, cliente.cpf || '')
    .replace(/{{cliente_email}}/g, cliente.email || '')
    .replace(/{{cliente_endereco}}/g, cliente.endereco || '')
    .replace(/{{cliente_telefone}}/g, cliente.whatsapp_numero || cliente.telefone || '')
    .replace(/{{tipo_evento}}/g, orcamento.tipo_evento)
    .replace(/{{data_evento}}/g, orcamento.data_evento || '')
    .replace(/{{local_evento}}/g, orcamento.local || '')
    .replace(/{{valor_total}}/g, `R$ ${orcamento.valor_total?.toFixed(2)}`)
    .replace(/{{data_hoje}}/g, new Date().toLocaleDateString('pt-BR'));

  const id = crypto.randomUUID();
  const tokenAssinatura = crypto.randomUUID();
  const now = new Date();
  const expiraEm = new Date(now.getTime() + CONTRACT_LINK_EXPIRATION_HOURS * 60 * 60 * 1000);

  // RNF03: Gerar hash do conteúdo original para verificação de integridade
  const hashOriginal = gerarHashDocumento(conteudo);

  const contrato = {
    id,
    PK: `CLIENTE#${cliente.id}`,
    SK: `CONTRATO#${id}`,
    GSI1PK: 'CONTRATO',
    GSI1SK: `CONTRATO#${id}`,
    cliente_id: cliente.id,
    orcamento_id: orcamentoId,
    tipo_evento: orcamento.tipo_evento,
    conteudo_html: conteudo,
    status: 'rascunho',
    token_assinatura: tokenAssinatura,
    hash_conteudo_original: hashOriginal,
    algoritmo_hash: 'SHA-256',
    metodo_assinatura: 'assinatura_eletronica_avancada',
    link_expira_em: expiraEm.toISOString(),
    created: now.toISOString(),
  };

  await dynamo.send(new PutCommand({ TableName: TABLE, Item: contrato }));

  logger.info({
    action: 'contrato_gerado',
    contratoId: id,
    clienteId: cliente.id,
    orcamentoId,
    tipoEvento: orcamento.tipo_evento,
  });

  return contrato;
}

/**
 * RF01: Envia link de visualização único e seguro para o cliente
 * Disparo via WhatsApp com fallback para email
 */
async function enviarParaAssinatura(contratoId) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'CONTRATO', ':sk': `CONTRATO#${contratoId}` },
  }));
  const contrato = result.Items?.[0];
  if (!contrato) throw new Error('Contrato não encontrado');

  if (contrato.status === 'assinado') throw new Error('Contrato já foi assinado');

  const cliResult = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${contrato.cliente_id}` },
  }));
  const cliente = cliResult.Items?.[0];
  if (!cliente) throw new Error('Cliente não encontrado');

  // Gerar link público de visualização (RF01)
  const link = `${env.FRONTEND_URL}/contrato/${contrato.token_assinatura}`;

  // Atualizar status e data de envio
  const now = new Date();
  const expiraEm = new Date(now.getTime() + CONTRACT_LINK_EXPIRATION_HOURS * 60 * 60 * 1000);

  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: contrato.PK, SK: contrato.SK },
    UpdateExpression: 'SET #s = :s, enviado_em = :e, link_expira_em = :exp',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':s': 'enviado',
      ':e': now.toISOString(),
      ':exp': expiraEm.toISOString(),
    },
  }));

  let enviadoWhatsapp = false;
  let enviadoEmail = false;

  // RF01: Disparar via WhatsApp (canal principal)
  if (cliente.whatsapp_numero) {
    try {
      await enviarTemplate(cliente.whatsapp_numero, 'contrato_assinatura_eletronica', [
        cliente.nome,
        link,
        `${CONTRACT_LINK_EXPIRATION_HOURS}h`,
      ]);
      enviadoWhatsapp = true;
    } catch (error) {
      logger.warn({ action: 'contrato_whatsapp_falhou', error: error.message, contratoId });
    }
  }

  // RF01: Fallback/complemento via Email
  if (cliente.email) {
    try {
      await enviarEmail({
        destinatario: cliente.email,
        titulo: 'Contrato disponível para assinatura eletrônica',
        corpo: `
          <p>Olá, <strong>{{nome}}</strong>!</p>
          <p>Seu contrato de serviços fotográficos está pronto para assinatura.</p>
          <p>Clique no botão abaixo para visualizar e assinar eletronicamente:</p>
          <div style="text-align:center;margin:25px 0;">
            <a href="{{link}}" style="display:inline-block;background:#EA580C;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
              Visualizar e Assinar Contrato
            </a>
          </div>
          <p style="color:#6b7280;font-size:14px;">
            Este link é válido por {{validade}}.<br>
            Ao assinar, você receberá um código de verificação por WhatsApp ou SMS para confirmar sua identidade.
          </p>
          <p style="color:#9ca3af;font-size:12px;margin-top:20px;">
            Assinatura eletrônica conforme Lei nº 14.063/2020.
          </p>
        `,
        templateData: {
          nome: cliente.nome || 'Cliente',
          link,
          validade: `${CONTRACT_LINK_EXPIRATION_HOURS} horas`,
        },
      });
      enviadoEmail = true;
    } catch (error) {
      logger.warn({ action: 'contrato_email_falhou', error: error.message, contratoId });
    }
  }

  logger.info({
    action: 'contrato_enviado_para_assinatura',
    contratoId,
    clienteId: contrato.cliente_id,
    enviadoWhatsapp,
    enviadoEmail,
  });

  return {
    link,
    enviado_whatsapp: enviadoWhatsapp,
    enviado_email: enviadoEmail,
    expira_em: expiraEm.toISOString(),
  };
}

/**
 * @deprecated Use assinaturaEletronicaService.validarOTPEAssinar para novo fluxo com OTP
 * Mantida para retrocompatibilidade com contratos antigos
 */
async function assinarContrato(token, dadosAssinatura) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    FilterExpression: 'token_assinatura = :token',
    ExpressionAttributeValues: { ':pk': 'CONTRATO', ':token': token },
  }));
  if (!result.Items || result.Items.length === 0) throw new Error('Contrato não encontrado');
  const contrato = result.Items[0];
  if (contrato.status === 'assinado') throw new Error('Contrato já foi assinado');

  // Para o fluxo legado, manter comportamento original
  const hashDocumento = gerarHashDocumento(contrato.conteudo_html);

  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: contrato.PK, SK: contrato.SK },
    UpdateExpression: 'SET #s = :s, assinado_em = :a, ip_assinatura = :ip, user_agent_assinatura = :ua, assinatura_hash = :h, hash_documento = :hd',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':s': 'assinado',
      ':a': new Date().toISOString(),
      ':ip': dadosAssinatura.ip,
      ':ua': dadosAssinatura.userAgent,
      ':h': dadosAssinatura.hash || hashDocumento,
      ':hd': hashDocumento,
    },
  }));

  return { success: true, hashDocumento };
}

function getTemplateDefault(tipoEvento) {
  return `<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS</h1>
<p><strong>CONTRATANTE:</strong> {{cliente_nome}}</p>
<p><strong>CPF:</strong> {{cliente_cpf}}</p>
<p><strong>E-mail:</strong> {{cliente_email}}</p>
<p><strong>Endereço:</strong> {{cliente_endereco}}</p>
<hr/>
<h2>OBJETO DO CONTRATO</h2>
<p>Prestação de serviços de fotografia profissional para o evento descrito abaixo:</p>
<p><strong>Tipo de evento:</strong> {{tipo_evento}}</p>
<p><strong>Data do evento:</strong> {{data_evento}}</p>
<p><strong>Local:</strong> {{local_evento}}</p>
<hr/>
<h2>VALOR E CONDIÇÕES DE PAGAMENTO</h2>
<p><strong>Valor total:</strong> {{valor_total}}</p>
<hr/>
<h2>DISPOSIÇÕES GERAIS</h2>
<p>As partes declaram que este contrato é firmado por meio de assinatura eletrônica avançada,
conforme disposto na Lei nº 14.063/2020 e na Medida Provisória nº 2.200-2/2001,
possuindo validade jurídica equivalente à assinatura manuscrita.</p>
<p><strong>Data de emissão:</strong> {{data_hoje}}</p>`;
}

module.exports = { gerarContrato, enviarParaAssinatura, assinarContrato };
