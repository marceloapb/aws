/**
 * Salva os templates WhatsApp no DynamoDB (sistema local)
 * NÃO envia para a Meta — o usuário fará isso pela tela do admin com imagem
 *
 * Execução: node apps/api/src/scripts/save-templates-local.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE = 'mbf-backend-v3-table';
const TENANT = 'default';

const TEMPLATES = [
  {
    name: 'mbf_notificacao_geral_img',
    category: 'UTILITY',
    language: 'pt_BR',
    header_type: 'IMAGE',
    body: '*{{1}}*\n\n{{2}}',
    footer: 'Marcelo Bloise Fotografia',
    variaveis: [
      { indice: 1, descricao: 'Título da notificação', exemplo: 'Novo orçamento recebido' },
      { indice: 2, descricao: 'Mensagem', exemplo: 'João solicitou orçamento para Casamento.' },
    ],
  },
  {
    name: 'mbf_novo_orcamento_img',
    category: 'UTILITY',
    language: 'pt_BR',
    header_type: 'IMAGE',
    body: '📋 *Nova Solicitação de Orçamento*\n\nCliente: *{{1}}*\nDetalhes: {{2}}',
    footer: 'Marcelo Bloise Fotografia',
    variaveis: [
      { indice: 1, descricao: 'Nome do cliente', exemplo: 'Maria Silva' },
      { indice: 2, descricao: 'Detalhes', exemplo: 'Ensaio Gestante - Data: 15/03/2026' },
    ],
  },
  {
    name: 'mbf_lembrete_evento_img',
    category: 'UTILITY',
    language: 'pt_BR',
    header_type: 'IMAGE',
    body: 'Olá *{{1}}*! 👋\n\nLembrando que sua sessão de *{{2}}* está marcada para o dia *{{3}}* às *{{4}}*.\n\nQualquer dúvida, é só responder aqui! 😊',
    footer: 'Marcelo Bloise Fotografia',
    variaveis: [
      { indice: 1, descricao: 'Nome do cliente', exemplo: 'Maria' },
      { indice: 2, descricao: 'Tipo da sessão', exemplo: 'Ensaio Gestante' },
      { indice: 3, descricao: 'Data', exemplo: '15/03/2026' },
      { indice: 4, descricao: 'Hora', exemplo: '14:00' },
    ],
  },
  {
    name: 'mbf_orcamento_pronto_img',
    category: 'UTILITY',
    language: 'pt_BR',
    header_type: 'IMAGE',
    body: 'Olá *{{1}}*! 👋\n\nSeu orçamento no valor de *{{2}}* está pronto para visualização.\n\nAcesse pelo link abaixo para conferir todos os detalhes:\n{{3}}',
    footer: 'Marcelo Bloise Fotografia',
    variaveis: [
      { indice: 1, descricao: 'Nome do cliente', exemplo: 'João' },
      { indice: 2, descricao: 'Valor', exemplo: 'R$ 3.500,00' },
      { indice: 3, descricao: 'Link', exemplo: 'https://www.marcelobloisefotografia.com.br/orcamento/abc123' },
    ],
  },
  {
    name: 'mbf_fotos_prontas_img',
    category: 'UTILITY',
    language: 'pt_BR',
    header_type: 'IMAGE',
    body: 'Olá *{{1}}*! 🎉\n\nSeu álbum *{{2}}* está disponível para visualização e download!\n\nSão *{{3}}* fotos que ficarão disponíveis por *{{4}} dias*.\n\nAcesse e aproveite! ❤️',
    footer: 'Marcelo Bloise Fotografia',
    variaveis: [
      { indice: 1, descricao: 'Nome do cliente', exemplo: 'Maria' },
      { indice: 2, descricao: 'Título do álbum', exemplo: 'Casamento' },
      { indice: 3, descricao: 'Quantidade de fotos', exemplo: '150' },
      { indice: 4, descricao: 'Dias disponível', exemplo: '30' },
    ],
  },
  {
    name: 'mbf_pagamento_confirmado_img',
    category: 'UTILITY',
    language: 'pt_BR',
    header_type: 'IMAGE',
    body: 'Olá *{{1}}*!\n\n✅ Confirmamos o recebimento do pagamento de *{{2}}*.\n\nStatus: *{{3}}*\n\nObrigado pela confiança! 🙏',
    footer: 'Marcelo Bloise Fotografia',
    variaveis: [
      { indice: 1, descricao: 'Nome do cliente', exemplo: 'João' },
      { indice: 2, descricao: 'Valor', exemplo: 'R$ 1.500,00' },
      { indice: 3, descricao: 'Status', exemplo: 'Confirmado' },
    ],
  },
  {
    name: 'mbf_pagamento_vencido_img',
    category: 'UTILITY',
    language: 'pt_BR',
    header_type: 'IMAGE',
    body: 'Olá *{{1}}*!\n\n⚠️ Identificamos que o pagamento de *{{2}}* está pendente.\n\n{{3}}\n\nSe já pagou, pode desconsiderar. Dúvidas? Responda aqui! 🙂',
    footer: 'Marcelo Bloise Fotografia',
    variaveis: [
      { indice: 1, descricao: 'Nome do cliente', exemplo: 'João' },
      { indice: 2, descricao: 'Valor', exemplo: 'R$ 1.000,00' },
      { indice: 3, descricao: 'Detalhes', exemplo: 'Vencimento: 10/03/2026. Por favor, regularize.' },
    ],
  },
  {
    name: 'mbf_contrato_assinatura_img',
    category: 'UTILITY',
    language: 'pt_BR',
    header_type: 'IMAGE',
    body: 'Olá *{{1}}*! 👋\n\nSeu contrato está pronto para revisão e assinatura digital.\n\n{{2}}\n\nQualquer dúvida, é só responder! 😊',
    footer: 'Marcelo Bloise Fotografia',
    variaveis: [
      { indice: 1, descricao: 'Nome do cliente', exemplo: 'Maria' },
      { indice: 2, descricao: 'Instruções', exemplo: 'Acesse o link enviado por e-mail para assinar.' },
    ],
  },
  {
    name: 'mbf_contrato_assinado_img',
    category: 'UTILITY',
    language: 'pt_BR',
    header_type: 'IMAGE',
    body: '🎉 *{{1}}*\n\n{{2}}',
    footer: 'Marcelo Bloise Fotografia',
    variaveis: [
      { indice: 1, descricao: 'Título', exemplo: 'Contrato Assinado!' },
      { indice: 2, descricao: 'Detalhes', exemplo: 'Maria assinou o contrato. Verifique os próximos passos.' },
    ],
  },
  {
    name: 'mbf_evento_confirmado_img',
    category: 'UTILITY',
    language: 'pt_BR',
    header_type: 'IMAGE',
    body: 'Olá *{{1}}*! 🎉\n\nSua sessão de *{{2}}* está confirmada!\n\n{{3}}\n\nNos vemos em breve! 📸',
    footer: 'Marcelo Bloise Fotografia',
    variaveis: [
      { indice: 1, descricao: 'Nome do cliente', exemplo: 'Maria' },
      { indice: 2, descricao: 'Tipo da sessão', exemplo: 'Ensaio Gestante' },
      { indice: 3, descricao: 'Detalhes', exemplo: 'Data: 15/03/2026 às 14:00. Local: Parque Ibirapuera.' },
    ],
  },
  {
    name: 'mbf_feedback_img',
    category: 'UTILITY',
    language: 'pt_BR',
    header_type: 'IMAGE',
    body: 'Olá *{{1}}*! 👋\n\nGostaríamos de saber sua opinião sobre o serviço.\n\n{{2}}\n\nSua opinião é muito importante! ❤️',
    footer: 'Marcelo Bloise Fotografia',
    variaveis: [
      { indice: 1, descricao: 'Nome do cliente', exemplo: 'Maria' },
      { indice: 2, descricao: 'Instruções', exemplo: 'Deixe sua avaliação respondendo aqui ou acesse nosso site.' },
    ],
  },
  {
    name: 'mbf_codigo_verificacao_img',
    category: 'AUTHENTICATION',
    language: 'pt_BR',
    header_type: 'IMAGE',
    body: '*{{1}}* é seu código de verificação.\n\nPara sua segurança, não compartilhe este código.',
    footer: 'Este código expira em 10 minutos.',
    variaveis: [
      { indice: 1, descricao: 'Código', exemplo: '482913' },
    ],
  },
  {
    name: 'mbf_lembrete_admin_img',
    category: 'UTILITY',
    language: 'pt_BR',
    header_type: 'IMAGE',
    body: '📅 *{{1}}*\n\n{{2}}',
    footer: 'Marcelo Bloise Fotografia',
    variaveis: [
      { indice: 1, descricao: 'Título', exemplo: 'Evento Amanhã: Ensaio Gestante' },
      { indice: 2, descricao: 'Detalhes', exemplo: 'Maria Silva - 15/03/2026 às 14:00' },
    ],
  },
  {
    name: 'mbf_boas_vindas_img',
    category: 'UTILITY',
    language: 'pt_BR',
    header_type: 'IMAGE',
    body: 'Olá *{{1}}*! 👋\n\nBem-vindo(a) ao portal da Marcelo Bloise Fotografia!\n\nSua senha temporária: *{{2}}*\n\nNo primeiro acesso, você será solicitado(a) a criar uma nova senha.\n\nAcesse: www.marcelobloisefotografia.com.br/login',
    footer: 'Marcelo Bloise Fotografia',
    variaveis: [
      { indice: 1, descricao: 'Nome do cliente', exemplo: 'Maria' },
      { indice: 2, descricao: 'Senha temporária', exemplo: 'Xk9mP2z' },
    ],
  },
  {
    name: 'mbf_album_pronto_img',
    category: 'UTILITY',
    language: 'pt_BR',
    header_type: 'IMAGE',
    body: 'Olá *{{1}}*! 🎉\n\nSeu álbum *{{2}}* está pronto!\n\n{{3}}\n\nEspero que goste! ❤️',
    footer: 'Marcelo Bloise Fotografia',
    variaveis: [
      { indice: 1, descricao: 'Nome do cliente', exemplo: 'Maria' },
      { indice: 2, descricao: 'Nome do álbum', exemplo: 'Ensaio Gestante' },
      { indice: 3, descricao: 'Instruções', exemplo: 'Acesse o link enviado por e-mail para visualizar.' },
    ],
  },
];

async function salvarNoSistema() {
  const now = new Date().toISOString();

  // Primeiro limpar templates antigos do DynamoDB
  console.log('Limpando templates antigos do DynamoDB...');
  const existentes = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'WA_TPL#' },
  }));
  for (const item of (existentes.Items || [])) {
    await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: item.PK, SK: item.SK } }));
  }
  console.log(`  Removidos: ${(existentes.Items || []).length}`);

  // Salvar novos
  console.log('\nSalvando templates no sistema...');
  for (const tpl of TEMPLATES) {
    const item = {
      PK: `TENANT#${TENANT}`,
      SK: `WA_TPL#${tpl.name}`,
      GSI1PK: 'WA_TPL',
      GSI1SK: `WA_TPL#${tpl.name}`,
      name: tpl.name,
      category: tpl.category,
      language: tpl.language,
      header_type: tpl.header_type,
      body: tpl.body,
      footer: tpl.footer,
      variaveis: tpl.variaveis,
      status: 'rascunho', // Não foi enviado para Meta ainda
      header_image_key: null, // Será preenchido pelo usuário na tela
      header_image_url: null,
      meta_template_id: null,
      created_at: now,
      updated_at: now,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    console.log(`  ✅ ${tpl.name} (${tpl.variaveis.length} vars)`);
  }

  console.log(`\n✅ ${TEMPLATES.length} templates salvos no sistema!`);
  console.log('\nPróximos passos:');
  console.log('  1. Acesse /admin/comunicacao → aba Templates');
  console.log('  2. Para cada template, faça upload da imagem');
  console.log('  3. Clique Salvar → envia para Meta com a imagem');
  console.log('  4. Aguarde aprovação da Meta (minutos)');
}

salvarNoSistema().catch(err => { console.error('Erro:', err); process.exit(1); });

module.exports = { TEMPLATES };
