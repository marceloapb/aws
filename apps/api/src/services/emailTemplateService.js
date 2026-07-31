// ══════════════════════════════════════════════════════════════
// SERVICES/EMAIL-TEMPLATE-SERVICE.JS — Gerenciamento de templates de e-mail
// ══════════════════════════════════════════════════════════════

const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { v4: uuid } = require('uuid');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME || 'mbf-backend-v3-table';
const TENANT = process.env.TENANT_ID || 'default';

// Tipos de template disponíveis com suas variáveis
const TEMPLATE_TYPES = {
  contrato_assinatura: {
    nome: 'Contrato - Assinatura',
    descricao: 'Enviado quando um contrato é disponibilizado para assinatura digital',
    variaveis: ['{{cliente_nome}}', '{{tipo_evento}}', '{{data_evento}}', '{{link_assinatura}}', '{{empresa_nome}}'],
  },
  contrato_token: {
    nome: 'Contrato - Código de Verificação',
    descricao: 'Enviado com o código (token) para validar a assinatura do contrato',
    variaveis: ['{{cliente_nome}}', '{{codigo}}', '{{empresa_nome}}'],
  },
  contrato_pronto: {
    nome: 'Contrato - Pronto para Assinar',
    descricao: 'Notificação ao cliente de que o contrato está pronto e aguardando assinatura',
    variaveis: ['{{cliente_nome}}', '{{tipo_evento}}', '{{data_evento}}', '{{link_assinatura}}', '{{empresa_nome}}'],
  },
  orcamento_novo: {
    nome: 'Orçamento - Novo',
    descricao: 'Enviado quando um orçamento é criado e disponibilizado ao cliente',
    variaveis: ['{{cliente_nome}}', '{{tipo_evento}}', '{{valor_total}}', '{{data_evento}}', '{{link_orcamento}}', '{{empresa_nome}}'],
  },
  album_publicado: {
    nome: 'Álbum - Publicado',
    descricao: 'Enviado quando um álbum de fotos é publicado para o cliente',
    variaveis: ['{{cliente_nome}}', '{{album_titulo}}', '{{qtd_fotos}}', '{{link_album}}', '{{data_expiracao}}', '{{empresa_nome}}'],
  },
  lembrete_pagamento: {
    nome: 'Lembrete - Pagamento',
    descricao: 'Enviado como lembrete de pagamento pendente ou próximo do vencimento',
    variaveis: ['{{cliente_nome}}', '{{valor}}', '{{data_vencimento}}', '{{link_pagamento}}', '{{empresa_nome}}'],
  },
  boas_vindas: {
    nome: 'Boas-vindas',
    descricao: 'Enviado ao cliente quando ele é cadastrado no sistema',
    variaveis: ['{{cliente_nome}}', '{{email_cliente}}', '{{link_portal}}', '{{empresa_nome}}'],
  },
  followup: {
    nome: 'Follow-up',
    descricao: 'Enviado como follow-up automático após evento ou interação',
    variaveis: ['{{cliente_nome}}', '{{tipo_evento}}', '{{data_evento}}', '{{link_feedback}}', '{{empresa_nome}}'],
  },
  notificacao_geral: {
    nome: 'Notificação Geral',
    descricao: 'Template genérico para notificações diversas',
    variaveis: ['{{cliente_nome}}', '{{titulo}}', '{{mensagem}}', '{{link}}', '{{empresa_nome}}'],
  },
};

// Templates padrão (HTML) para cada tipo
const DEFAULT_TEMPLATES = {
  contrato_assinatura: {
    assunto: 'Contrato pronto para assinatura - {{empresa_nome}}',
    corpo: `<div style="text-align:center;margin-bottom:20px;">{{logo}}</div>
<h2 style="color:#1f2937;">Olá {{cliente_nome}}!</h2>
<p style="color:#4b5563;line-height:1.6;">Seu contrato para <strong>{{tipo_evento}}</strong> está pronto para assinatura digital.</p>
<p style="color:#4b5563;">Data do evento: <strong>{{data_evento}}</strong></p>
<div style="text-align:center;margin:25px 0;">
  <a href="{{link_assinatura}}" style="display:inline-block;padding:12px 28px;background:#EA580C;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Assinar Contrato</a>
</div>
<p style="color:#6b7280;font-size:13px;">Se você não solicitou este serviço, por favor ignore este e-mail.</p>`,
  },
  contrato_token: {
    assunto: 'Código de verificação para assinatura - {{empresa_nome}}',
    corpo: `<div style="text-align:center;margin-bottom:20px;">{{logo}}</div>
<h2 style="color:#1f2937;">Olá {{cliente_nome}}!</h2>
<p style="color:#4b5563;line-height:1.6;">Seu código de verificação para assinar o contrato é:</p>
<div style="text-align:center;margin:25px 0;">
  <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#EA580C;background:#FFF7ED;padding:15px 30px;border-radius:8px;border:2px dashed #EA580C;">{{codigo}}</span>
</div>
<p style="color:#6b7280;font-size:13px;">Este código é válido por <strong>10 minutos</strong>. Por segurança, não compartilhe com terceiros.</p>`,
  },
  contrato_pronto: {
    assunto: 'Seu contrato está pronto! - {{empresa_nome}}',
    corpo: `<div style="text-align:center;margin-bottom:20px;">{{logo}}</div>
<h2 style="color:#1f2937;">Olá {{cliente_nome}}!</h2>
<p style="color:#4b5563;line-height:1.6;">Seu contrato para <strong>{{tipo_evento}}</strong> foi preparado e está aguardando sua assinatura.</p>
<p style="color:#4b5563;">Data do evento: <strong>{{data_evento}}</strong></p>
<p style="color:#4b5563;">O processo é simples e rápido — basta clicar no botão abaixo e seguir as instruções.</p>
<div style="text-align:center;margin:25px 0;">
  <a href="{{link_assinatura}}" style="display:inline-block;padding:12px 28px;background:#EA580C;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Assinar Contrato</a>
</div>
<p style="color:#6b7280;font-size:13px;">Se tiver dúvidas, responda este e-mail ou entre em contato pelo WhatsApp.</p>`,
  },
  orcamento_novo: {
    assunto: 'Seu orçamento está pronto! - {{empresa_nome}}',
    corpo: `<div style="text-align:center;margin-bottom:20px;">{{logo}}</div>
<h2 style="color:#1f2937;">Olá {{cliente_nome}}!</h2>
<p style="color:#4b5563;line-height:1.6;">Preparamos um orçamento para <strong>{{tipo_evento}}</strong>.</p>
<p style="color:#4b5563;">Valor: <strong>R$ {{valor_total}}</strong></p>
<p style="color:#4b5563;">Data do evento: <strong>{{data_evento}}</strong></p>
<div style="text-align:center;margin:25px 0;">
  <a href="{{link_orcamento}}" style="display:inline-block;padding:12px 28px;background:#EA580C;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Ver Orçamento</a>
</div>`,
  },
  album_publicado: {
    assunto: 'Suas fotos estão prontas! 📸 - {{empresa_nome}}',
    corpo: `<div style="text-align:center;margin-bottom:20px;">{{logo}}</div>
<h2 style="color:#1f2937;">Olá {{cliente_nome}}!</h2>
<p style="color:#4b5563;line-height:1.6;">Seu álbum <strong>{{album_titulo}}</strong> está pronto com <strong>{{qtd_fotos}} fotos</strong>!</p>
<div style="text-align:center;margin:25px 0;">
  <a href="{{link_album}}" style="display:inline-block;padding:12px 28px;background:#EA580C;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Ver Álbum</a>
</div>
<p style="color:#6b7280;font-size:13px;">Este link expira em {{data_expiracao}}.</p>`,
  },
  lembrete_pagamento: {
    assunto: 'Lembrete de pagamento - {{empresa_nome}}',
    corpo: `<div style="text-align:center;margin-bottom:20px;">{{logo}}</div>
<h2 style="color:#1f2937;">Olá {{cliente_nome}}!</h2>
<p style="color:#4b5563;line-height:1.6;">Este é um lembrete sobre seu pagamento:</p>
<p style="color:#4b5563;">Valor: <strong>R$ {{valor}}</strong></p>
<p style="color:#4b5563;">Vencimento: <strong>{{data_vencimento}}</strong></p>
<div style="text-align:center;margin:25px 0;">
  <a href="{{link_pagamento}}" style="display:inline-block;padding:12px 28px;background:#EA580C;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Pagar Agora</a>
</div>`,
  },
  boas_vindas: {
    assunto: 'Bem-vindo(a)! - {{empresa_nome}}',
    corpo: `<div style="text-align:center;margin-bottom:20px;">{{logo}}</div>
<h2 style="color:#1f2937;">Bem-vindo(a), {{cliente_nome}}! 🎉</h2>
<p style="color:#4b5563;line-height:1.6;">Estamos felizes em tê-lo(a) como nosso cliente!</p>
<p style="color:#4b5563;">Você já pode acessar seu portal para acompanhar orçamentos, contratos e álbuns de fotos.</p>
<div style="text-align:center;margin:25px 0;">
  <a href="{{link_portal}}" style="display:inline-block;padding:12px 28px;background:#EA580C;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Acessar Portal</a>
</div>`,
  },
  followup: {
    assunto: 'Como foi sua experiência? - {{empresa_nome}}',
    corpo: `<div style="text-align:center;margin-bottom:20px;">{{logo}}</div>
<h2 style="color:#1f2937;">Olá {{cliente_nome}}!</h2>
<p style="color:#4b5563;line-height:1.6;">Esperamos que tenha tido uma ótima experiência no seu <strong>{{tipo_evento}}</strong> em <strong>{{data_evento}}</strong>!</p>
<p style="color:#4b5563;">Gostaríamos muito de ouvir seu feedback.</p>
<div style="text-align:center;margin:25px 0;">
  <a href="{{link_feedback}}" style="display:inline-block;padding:12px 28px;background:#EA580C;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Deixar Feedback</a>
</div>`,
  },
  notificacao_geral: {
    assunto: '{{titulo}} - {{empresa_nome}}',
    corpo: `<div style="text-align:center;margin-bottom:20px;">{{logo}}</div>
<h2 style="color:#1f2937;">Olá {{cliente_nome}}!</h2>
<p style="color:#4b5563;line-height:1.6;">{{mensagem}}</p>
<div style="text-align:center;margin:25px 0;">
  <a href="{{link}}" style="display:inline-block;padding:12px 28px;background:#EA580C;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Ver no Sistema</a>
</div>`,
  },
};

/**
 * Buscar todos os templates salvos
 */
async function listarTemplates() {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'EMAIL_TEMPLATE#' },
  }));

  const salvos = (result.Items || []).reduce((acc, item) => {
    acc[item.tipo] = item;
    return acc;
  }, {});

  // Retornar todos os tipos, mesclando com defaults
  return Object.entries(TEMPLATE_TYPES).map(([tipo, meta]) => {
    const salvo = salvos[tipo];
    return {
      tipo,
      ...meta,
      assunto: salvo?.assunto || DEFAULT_TEMPLATES[tipo]?.assunto || '',
      corpo: salvo?.corpo || DEFAULT_TEMPLATES[tipo]?.corpo || '',
      ativo: salvo?.ativo !== undefined ? salvo.ativo : true,
      customizado: !!salvo,
      updated: salvo?.updated || null,
    };
  });
}

/**
 * Buscar template por tipo
 */
async function buscarTemplate(tipo) {
  if (!TEMPLATE_TYPES[tipo]) {
    throw new Error(`Tipo de template inválido: ${tipo}`);
  }

  const result = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `TENANT#${TENANT}`, SK: `EMAIL_TEMPLATE#${tipo}` },
  }));

  const salvo = result.Item;
  return {
    tipo,
    ...TEMPLATE_TYPES[tipo],
    assunto: salvo?.assunto || DEFAULT_TEMPLATES[tipo]?.assunto || '',
    corpo: salvo?.corpo || DEFAULT_TEMPLATES[tipo]?.corpo || '',
    ativo: salvo?.ativo !== undefined ? salvo.ativo : true,
    customizado: !!salvo,
    updated: salvo?.updated || null,
  };
}

/**
 * Salvar/atualizar template
 */
async function salvarTemplate(tipo, { assunto, corpo, ativo }) {
  if (!TEMPLATE_TYPES[tipo]) {
    throw new Error(`Tipo de template inválido: ${tipo}`);
  }

  const now = new Date().toISOString();
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `TENANT#${TENANT}`,
      SK: `EMAIL_TEMPLATE#${tipo}`,
      GSI1PK: `TENANT#${TENANT}`,
      GSI1SK: `EMAIL_TEMPLATE#${now}`,
      tipo,
      assunto,
      corpo,
      ativo: ativo !== false,
      updated: now,
    },
  }));

  return { success: true, tipo, updated: now };
}

/**
 * Resetar template ao padrão
 */
async function resetarTemplate(tipo) {
  if (!TEMPLATE_TYPES[tipo]) {
    throw new Error(`Tipo de template inválido: ${tipo}`);
  }

  await ddb.send(new DeleteCommand({
    TableName: TABLE,
    Key: { PK: `TENANT#${TENANT}`, SK: `EMAIL_TEMPLATE#${tipo}` },
  }));

  return { success: true, tipo, message: 'Template resetado ao padrão' };
}

/**
 * Buscar configuração de remetente
 */
async function buscarConfigEmail() {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'CONFIG#email_' },
  }));

  const config = {};
  for (const item of (result.Items || [])) {
    config[item.chave] = item.valor;
  }

  return {
    remetente_nome: config.email_remetente_nome || '',
    remetente_email: process.env.SES_FROM_EMAIL || 'contato@bloise.com.br',
    logo_url: config.email_logo_url || '',
    logo_key: config.email_logo_key || '',
    cor_primaria: config.email_cor_primaria || '#EA580C',
    rodape_texto: config.email_rodape_texto || '',
  };
}

/**
 * Salvar configuração de remetente
 */
async function salvarConfigEmail({ remetente_nome, logo_url, logo_key, cor_primaria, rodape_texto }) {
  const now = new Date().toISOString();
  const configs = {
    email_remetente_nome: remetente_nome || '',
    email_logo_url: logo_url || '',
    email_logo_key: logo_key || '',
    email_cor_primaria: cor_primaria || '#EA580C',
    email_rodape_texto: rodape_texto || '',
  };

  for (const [chave, valor] of Object.entries(configs)) {
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `TENANT#${TENANT}`,
        SK: `CONFIG#${chave}`,
        chave,
        valor: String(valor),
        updated: now,
      },
    }));
  }

  return { success: true, message: 'Configurações de e-mail salvas' };
}

/**
 * Renderizar template com variáveis
 */
async function renderizarTemplate(tipo, variaveis = {}) {
  const template = await buscarTemplate(tipo);
  const config = await buscarConfigEmail();

  if (!template.ativo) {
    return null; // Template desativado
  }

  // Montar logo HTML
  let logoHtml = '';
  if (config.logo_key) {
    const cdnDomain = process.env.CDN_DOMAIN || process.env.CF_DOMAIN || 'd2112x4m4e89fv.cloudfront.net';
    const logoUrl = `https://${cdnDomain}/${config.logo_key}`;
    logoHtml = `<img src="${logoUrl}" alt="${config.remetente_nome || 'Logo'}" style="max-height:60px;max-width:200px;" />`;
  } else if (config.logo_url) {
    logoHtml = `<img src="${config.logo_url}" alt="${config.remetente_nome || 'Logo'}" style="max-height:60px;max-width:200px;" />`;
  }

  // Substituir variáveis no assunto e corpo
  let assunto = template.assunto;
  let corpo = template.corpo;

  // Variáveis do sistema
  const todasVariaveis = {
    ...variaveis,
    empresa_nome: config.remetente_nome || variaveis.empresa_nome || 'MBFoto',
    logo: logoHtml,
  };

  for (const [key, value] of Object.entries(todasVariaveis)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    assunto = assunto.replace(regex, value || '');
    corpo = corpo.replace(regex, value || '');
  }

  // Limpar variáveis não substituídas
  assunto = assunto.replace(/{{[^}]+}}/g, '');
  corpo = corpo.replace(/{{[^}]+}}/g, '');

  // Montar HTML completo do e-mail com layout
  const corPrimaria = config.cor_primaria || '#EA580C';
  const htmlCompleto = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:${corPrimaria};padding:20px;border-radius:8px 8px 0 0;text-align:center;">
      ${logoHtml || `<h2 style="color:white;margin:0;font-size:20px;">${config.remetente_nome || 'MBFoto'}</h2>`}
    </div>
    <div style="background:white;padding:30px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
      ${corpo}
    </div>
    <div style="text-align:center;padding:15px;color:#9ca3af;font-size:12px;">
      ${config.rodape_texto || `Você recebeu este email pois está cadastrado no sistema ${config.remetente_nome || 'MBFoto'}.`}
    </div>
  </div>
</body>
</html>`;

  return {
    assunto,
    html: htmlCompleto,
    texto: corpo.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    remetente_nome: config.remetente_nome,
    remetente_email: config.remetente_email,
  };
}

module.exports = {
  TEMPLATE_TYPES,
  DEFAULT_TEMPLATES,
  listarTemplates,
  buscarTemplate,
  salvarTemplate,
  resetarTemplate,
  buscarConfigEmail,
  salvarConfigEmail,
  renderizarTemplate,
};
