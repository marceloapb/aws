// ══════════════════════════════════════════════════════════════
// SERVICES/OTP-SERVICE.JS
// Serviço de envio de OTP com redundância (RNF04)
// Fallback: WhatsApp → SMS → Email
// ══════════════════════════════════════════════════════════════

const { enviarWhatsApp } = require('../adapters/notificacoes/whatsappAdapter');
const { enviarEmail } = require('../adapters/notificacoes/emailAdapter');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const logger = require('../config/logger');

const sns = new SNSClient({});

// Canais disponíveis em ordem de prioridade
const CANAIS = ['whatsapp', 'sms', 'email'];

/**
 * RNF04: Envia OTP com mecanismo de redundância
 * Em caso de falha no canal preferido, tenta fallback automático
 * 
 * @param {Object} opts
 * @param {Object} opts.cliente - Dados do cliente (nome, email, whatsapp_numero, telefone)
 * @param {string} opts.codigo - Código OTP de 6 dígitos
 * @param {string} opts.canalPreferido - Canal preferido: 'whatsapp', 'sms' ou 'email'
 * @param {string} opts.contratoId - ID do contrato para referência
 * @returns {Promise<Object>} Resultado com canal utilizado e máscara do destino
 */
async function enviarOTP({ cliente, codigo, canalPreferido = 'whatsapp', contratoId }) {
  const canaisOrdenados = ordenarCanais(canalPreferido);
  let ultimoErro = null;

  for (const canal of canaisOrdenados) {
    try {
      const resultado = await tentarEnvio(canal, cliente, codigo, contratoId);
      
      logger.info({
        action: 'otp_enviado_sucesso',
        canal,
        contratoId,
        clienteId: cliente.id,
      });

      return resultado;
    } catch (error) {
      ultimoErro = error;
      logger.warn({
        action: 'otp_envio_falhou',
        canal,
        contratoId,
        clienteId: cliente.id,
        erro: error.message,
        tentandoProximo: true,
      });
    }
  }

  // Todos os canais falharam
  logger.error({
    action: 'otp_todos_canais_falharam',
    contratoId,
    clienteId: cliente.id,
    ultimoErro: ultimoErro?.message,
  });

  throw new Error('Não foi possível enviar o código de verificação. Tente novamente em alguns minutos.');
}

/**
 * Ordena canais com o preferido primeiro, seguido dos demais como fallback
 */
function ordenarCanais(canalPreferido) {
  const canais = [canalPreferido, ...CANAIS.filter(c => c !== canalPreferido)];
  return [...new Set(canais)];
}

/**
 * Tenta enviar OTP pelo canal especificado
 */
async function tentarEnvio(canal, cliente, codigo, contratoId) {
  switch (canal) {
    case 'whatsapp':
      return await enviarViaWhatsApp(cliente, codigo, contratoId);
    case 'sms':
      return await enviarViaSMS(cliente, codigo, contratoId);
    case 'email':
      return await enviarViaEmail(cliente, codigo, contratoId);
    default:
      throw new Error(`Canal não suportado: ${canal}`);
  }
}

/**
 * Envio via WhatsApp Cloud API
 */
async function enviarViaWhatsApp(cliente, codigo, contratoId) {
  const numero = cliente.whatsapp_numero || cliente.telefone;
  if (!numero) throw new Error('Cliente não possui número de WhatsApp cadastrado');

  await enviarWhatsApp({
    numero,
    template: 'contrato_otp_codigo',
    parametros: [cliente.nome || 'Cliente', codigo],
  });

  return {
    canalUtilizado: 'whatsapp',
    mascaraDestino: mascararTelefone(numero),
  };
}

/**
 * Envio via SMS (usando SNS)
 */
async function enviarViaSMS(cliente, codigo, contratoId) {
  const numero = cliente.telefone || cliente.whatsapp_numero;
  if (!numero) throw new Error('Cliente não possui telefone cadastrado');

  // Formatar número para E.164
  const numeroFormatado = formatarE164(numero);

  const mensagem = `MBFoto - Seu codigo de assinatura do contrato: ${codigo}. Valido por 10 min. Nao compartilhe.`;

  await sns.send(new PublishCommand({
    PhoneNumber: numeroFormatado,
    Message: mensagem,
    MessageAttributes: {
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        StringValue: 'Transactional',
      },
      'AWS.SNS.SMS.SenderID': {
        DataType: 'String',
        StringValue: 'MBFoto',
      },
    },
  }));

  return {
    canalUtilizado: 'sms',
    mascaraDestino: mascararTelefone(numero),
  };
}

/**
 * Envio via Email (usando SES)
 */
async function enviarViaEmail(cliente, codigo, contratoId) {
  const email = cliente.email;
  if (!email) throw new Error('Cliente não possui email cadastrado');

  await enviarEmail({
    destinatario: email,
    titulo: 'Código de verificação para assinatura do contrato',
    corpo: `
      <p>Olá, <strong>{{nome}}</strong>!</p>
      <p>Seu código de verificação para assinar o contrato é:</p>
      <div style="text-align:center;margin:20px 0;">
        <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#EA580C;background:#FFF7ED;padding:15px 30px;border-radius:8px;border:2px dashed #EA580C;">
          {{codigo}}
        </span>
      </div>
      <p style="color:#6b7280;font-size:14px;">
        Este código é válido por <strong>10 minutos</strong>.<br>
        Se você não solicitou este código, ignore este email.
      </p>
      <p style="color:#9ca3af;font-size:12px;margin-top:20px;">
        Por segurança, nunca compartilhe este código com terceiros.
      </p>
    `,
    templateData: {
      nome: cliente.nome || 'Cliente',
      codigo,
    },
  });

  return {
    canalUtilizado: 'email',
    mascaraDestino: mascararEmail(email),
  };
}

// ═══ Funções utilitárias ═══

/**
 * Mascara telefone para exibição: (11) *****-1234
 */
function mascararTelefone(telefone) {
  if (!telefone) return '***';
  const limpo = telefone.replace(/\D/g, '');
  if (limpo.length < 4) return '***';
  const ultimos4 = limpo.slice(-4);
  return `(XX) XXXXX-${ultimos4}`;
}

/**
 * Mascara email para exibição: m***@gmail.com
 */
function mascararEmail(email) {
  if (!email || !email.includes('@')) return '***@***';
  const [local, dominio] = email.split('@');
  const mascarado = local[0] + '***';
  return `${mascarado}@${dominio}`;
}

/**
 * Formata número para padrão E.164 (Brasil)
 */
function formatarE164(numero) {
  const limpo = numero.replace(/\D/g, '');
  if (limpo.startsWith('55')) return `+${limpo}`;
  if (limpo.length === 11 || limpo.length === 10) return `+55${limpo}`;
  return `+${limpo}`;
}

module.exports = { enviarOTP };
