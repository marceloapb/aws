/**
 * ══════════════════════════════════════════════════════════════
 * DEFINIÇÃO DE TODOS OS TEMPLATES WHATSAPP — Marcelo Bloise Fotografia
 * ══════════════════════════════════════════════════════════════
 *
 * Este arquivo serve como REFERÊNCIA para criar os templates
 * manualmente pela tela do admin (Configurações → Templates WhatsApp).
 *
 * FLUXO PARA CADA TEMPLATE:
 *   1. Abrir tela de Templates no admin
 *   2. Clicar "Novo Template"
 *   3. Preencher nome, corpo, variáveis conforme abaixo
 *   4. Selecionar Header: IMAGE
 *   5. Fazer upload da imagem (820x312px recomendado, JPG/PNG, max 5MB)
 *   6. Salvar → vai para Meta para aprovação
 *
 * CASO QUEIRA USAR VIA SCRIPT (opcional):
 *   WHATSAPP_ACCESS_TOKEN=xxx node apps/api/src/scripts/seed-whatsapp-templates.js
 *
 * ══════════════════════════════════════════════════════════════
 * MAPEAMENTO DE NOMES ANTIGOS → NOVOS:
 *
 *   notificacao_geral          → mbf_notificacao_geral_img
 *   novo_orcamento             → mbf_novo_orcamento_img
 *   lembrete_evento            → mbf_lembrete_evento_img
 *   orcamento_pronto           → mbf_orcamento_pronto_img
 *   album_pronto               → mbf_album_pronto_img
 *   fotos_prontas              → mbf_fotos_prontas_img
 *   pagamento_confirmado       → mbf_pagamento_confirmado_img
 *   pagamento_vencido          → mbf_pagamento_vencido_img
 *   contrato_assinatura        → mbf_contrato_assinatura_img
 *   contrato_assinado_aviso    → mbf_contrato_assinado_img
 *   evento_confirmado          → mbf_evento_confirmado_img
 *   feedback_solicitacao       → mbf_feedback_img
 *   mbfoto_codigo_verificacao  → mbf_codigo_verificacao_img
 *   (novo)                     → mbf_lembrete_admin_img
 *   (novo)                     → mbf_boas_vindas_img
 *
 * TEMPLATES COM BOTÃO URL (_link_img) — Novo! 05/08/2026:
 *   contrato_assinatura + btn  → mbf_contrato_assinatura_link_img
 *   orcamento_pronto + btn     → mbf_orcamento_pronto_link_img
 *   fotos_prontas + btn        → mbf_fotos_prontas_link_img
 *   feedback + btn             → mbf_feedback_link_img
 *   pagamento_vencido + btn    → mbf_pagamento_vencido_link_img
 * ══════════════════════════════════════════════════════════════
 */

const WABA_ID = process.env.WHATSAPP_WABA_ID || '2163797757810981';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

// ══════════ DEFINIÇÃO DOS TEMPLATES ══════════
// Todos com header IMAGE + body + footer

const TEMPLATES = [
  // ─── 1. NOTIFICAÇÃO GERAL (catch-all para admin) ───
  {
    name: 'mbf_notificacao_geral_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: '*{{1}}*\n\n{{2}}',
        example: { body_text: [['Novo orçamento recebido', 'João solicitou orçamento para Casamento. Acesse o sistema para montar a proposta.']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
    ],
  },

  // ─── 2. NOVO ORÇAMENTO SOLICITADO (notifica admin) ───
  {
    name: 'mbf_novo_orcamento_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: '📋 *Nova Solicitação de Orçamento*\n\nCliente: *{{1}}*\nDetalhes: {{2}}',
        example: { body_text: [['Maria Silva', 'Ensaio Gestante - Data: 15/03/2026']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
    ],
  },

  // ─── 3. LEMBRETE DE EVENTO (envia para cliente) ───
  {
    name: 'mbf_lembrete_evento_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 👋\n\nLembrando que sua sessão de *{{2}}* está marcada para o dia *{{3}}* às *{{4}}*.\n\nQualquer dúvida, é só responder aqui! 😊',
        example: { body_text: [['Maria', 'Ensaio Gestante', '15/03/2026', '14:00']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
    ],
  },

  // ─── 4. ORÇAMENTO PRONTO (envia para cliente) ───
  {
    name: 'mbf_orcamento_pronto_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 👋\n\nSeu orçamento no valor de *{{2}}* está pronto para visualização.\n\nAcesse pelo link abaixo para conferir todos os detalhes:\n{{3}}',
        example: { body_text: [['João', 'R$ 3.500,00', 'https://www.marcelobloisefotografia.com.br/orcamento/abc123']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
    ],
  },

  // ─── 5. FOTOS PRONTAS / ÁLBUM DISPONÍVEL (envia para cliente) ───
  {
    name: 'mbf_fotos_prontas_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 🎉\n\nSeu álbum *{{2}}* está disponível para visualização e download!\n\nSão *{{3}}* fotos que ficarão disponíveis por *{{4}} dias*.\n\nAcesse e aproveite! ❤️',
        example: { body_text: [['Maria', 'Casamento - Maria & João', '150', '30']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
    ],
  },

  // ─── 6. PAGAMENTO CONFIRMADO (envia para cliente) ───
  {
    name: 'mbf_pagamento_confirmado_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*!\n\n✅ Confirmamos o recebimento do pagamento de *{{2}}*.\n\nStatus: *{{3}}*\n\nObrigado pela confiança! 🙏',
        example: { body_text: [['João', 'R$ 1.500,00', 'Confirmado']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
    ],
  },

  // ─── 7. PAGAMENTO VENCIDO (envia para cliente) ───
  {
    name: 'mbf_pagamento_vencido_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*!\n\n⚠️ Identificamos que o pagamento de *{{2}}* está pendente.\n\n{{3}}\n\nSe já pagou, pode desconsiderar. Dúvidas? Responda aqui! 🙂',
        example: { body_text: [['João', 'R$ 1.000,00', 'Vencimento: 10/03/2026. Por favor, regularize quando possível.']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
    ],
  },

  // ─── 8. CONTRATO PARA ASSINATURA (envia para cliente) ───
  {
    name: 'mbf_contrato_assinatura_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 👋\n\nSeu contrato está pronto para revisão e assinatura digital.\n\n{{2}}\n\nQualquer dúvida, é só responder! 😊',
        example: { body_text: [['Maria', 'Acesse o link enviado por e-mail para assinar.']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
    ],
  },

  // ─── 9. CONTRATO ASSINADO (notifica admin) ───
  {
    name: 'mbf_contrato_assinado_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: '🎉 *{{1}}*\n\n{{2}}',
        example: { body_text: [['Contrato Assinado!', 'Maria assinou o contrato para Ensaio Gestante. Verifique os próximos passos no sistema.']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
    ],
  },

  // ─── 10. EVENTO CONFIRMADO (envia para cliente) ───
  {
    name: 'mbf_evento_confirmado_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 🎉\n\nSua sessão de *{{2}}* está confirmada!\n\n{{3}}\n\nNos vemos em breve! 📸',
        example: { body_text: [['Maria', 'Ensaio Gestante', 'Data: 15/03/2026 às 14:00. Local: Parque Ibirapuera.']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
    ],
  },

  // ─── 11. FEEDBACK / AVALIAÇÃO (envia para cliente) ───
  {
    name: 'mbf_feedback_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 👋\n\nGostaríamos de saber sua opinião sobre o serviço.\n\n{{2}}\n\nSua opinião é muito importante! ❤️',
        example: { body_text: [['Maria', 'Deixe sua avaliação respondendo aqui ou acesse nosso site.']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
    ],
  },

  // ─── 12. CÓDIGO DE VERIFICAÇÃO (envia para cliente) ───
  {
    name: 'mbf_codigo_verificacao_img',
    category: 'AUTHENTICATION',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: '*{{1}}* é seu código de verificação.\n\nPara sua segurança, não compartilhe este código.',
        example: { body_text: [['482913']] },
      },
      { type: 'FOOTER', text: 'Este código expira em 10 minutos.' },
    ],
  },

  // ─── 13. LEMBRETE ADMIN (eventos de amanhã) ───
  {
    name: 'mbf_lembrete_admin_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: '📅 *{{1}}*\n\n{{2}}',
        example: { body_text: [['Evento Amanhã: Ensaio Gestante', 'Maria Silva - 15/03/2026 às 14:00 | Parque Ibirapuera']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
    ],
  },

  // ─── 14. BOAS-VINDAS (cliente novo + senha) ───
  {
    name: 'mbf_boas_vindas_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 👋\n\nBem-vindo(a) ao portal da Marcelo Bloise Fotografia!\n\nSua senha temporária: *{{2}}*\n\nNo primeiro acesso, você será solicitado(a) a criar uma nova senha.\n\nAcesse: www.marcelobloisefotografia.com.br/login',
        example: { body_text: [['Maria', 'Xk9mP2z']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
    ],
  },

  // ─── 15. ÁLBUM PRONTO (genérico) ───
  {
    name: 'mbf_album_pronto_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 🎉\n\nSeu álbum *{{2}}* está pronto!\n\n{{3}}\n\nEspero que goste! ❤️',
        example: { body_text: [['Maria', 'Ensaio Gestante', 'Acesse o link enviado por e-mail para visualizar e baixar suas fotos.']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // TEMPLATES COM BOTÃO URL (_link_img)
  // Formato: header IMAGE + body params + footer + button type=URL
  // O botão direciona o cliente para a página logada do portal.
  // URL base: https://www.mbfoto.com.br/cliente/{{1}}
  // O suffix {{1}} é preenchido dinamicamente no envio.
  // ═══════════════════════════════════════════════════════════════

  // ─── 16. CONTRATO ASSINATURA com botão (envia para cliente) ───
  {
    name: 'mbf_contrato_assinatura_link_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 👋\n\nSeu contrato para *{{2}}* está pronto para revisão e assinatura digital.\n\nClique no botão abaixo para acessar e assinar:',
        example: { body_text: [['Maria Silva', 'Ensaio Gestante']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
      {
        type: 'BUTTONS',
        buttons: [{
          type: 'URL',
          text: '📝 Assinar Contrato',
          url: 'https://www.mbfoto.com.br/cliente/{{1}}',
          example: ['contratos/abc123-def456'],
        }],
      },
    ],
  },

  // ─── 17. ORÇAMENTO PRONTO com botão (envia para cliente) ───
  {
    name: 'mbf_orcamento_pronto_link_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 👋\n\nSeu orçamento para *{{2}}* está pronto!\n\nClique no botão abaixo para visualizar todos os detalhes:',
        example: { body_text: [['João Santos', 'Casamento']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
      {
        type: 'BUTTONS',
        buttons: [{
          type: 'URL',
          text: '📋 Ver Orçamento',
          url: 'https://www.mbfoto.com.br/cliente/{{1}}',
          example: ['orcamentos/abc123-def456'],
        }],
      },
    ],
  },

  // ─── 18. FOTOS PRONTAS com botão (envia para cliente) ───
  {
    name: 'mbf_fotos_prontas_link_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 🎉\n\nSeu álbum *{{2}}* está disponível com *{{3}}* fotos!\n\nClique no botão abaixo para visualizar e baixar:',
        example: { body_text: [['Maria', 'Casamento - Maria & João', '150']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
      {
        type: 'BUTTONS',
        buttons: [{
          type: 'URL',
          text: '📸 Ver Álbum',
          url: 'https://www.mbfoto.com.br/cliente/{{1}}',
          example: ['albuns/meu-casamento'],
        }],
      },
    ],
  },

  // ─── 19. FEEDBACK com botão (envia para cliente) ───
  {
    name: 'mbf_feedback_link_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 👋\n\nGostaríamos de saber como foi sua experiência com o serviço de *{{2}}*.\n\nSua opinião é muito importante para nós! ❤️\n\nClique abaixo para avaliar:',
        example: { body_text: [['Maria', 'Ensaio Gestante']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
      {
        type: 'BUTTONS',
        buttons: [{
          type: 'URL',
          text: '⭐ Avaliar',
          url: 'https://www.mbfoto.com.br/cliente/{{1}}',
          example: ['feedback/abc123-def456'],
        }],
      },
    ],
  },

  // ─── 20. PAGAMENTO VENCIDO com botão (envia para cliente) ───
  {
    name: 'mbf_pagamento_vencido_link_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      { type: 'HEADER', format: 'IMAGE' },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*!\n\n⚠️ Identificamos que o pagamento de *{{2}}* está pendente desde *{{3}}*.\n\nClique abaixo para verificar e regularizar:',
        example: { body_text: [['João', 'R$ 1.500,00', '10/03/2026']] },
      },
      { type: 'FOOTER', text: 'Marcelo Bloise Fotografia' },
      {
        type: 'BUTTONS',
        buttons: [{
          type: 'URL',
          text: '💳 Ver Pagamento',
          url: 'https://www.mbfoto.com.br/cliente/{{1}}',
          example: ['pagamentos/abc123-def456'],
        }],
      },
    ],
  },
];

// ══════════ EXECUÇÃO (OPCIONAL - só se rodar via CLI) ══════════

if (!ACCESS_TOKEN) {
  // Se não tem token, apenas exibe os templates como referência
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  TEMPLATES WHATSAPP — Marcelo Bloise Fotografia');
  console.log('  Total: ' + TEMPLATES.length + ' templates');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('  Sem WHATSAPP_ACCESS_TOKEN — modo referência.\n');
  console.log('  Para criar pela UI, use a tela Admin → Templates.\n');
  console.log('  Para criar via script:');
  console.log('  WHATSAPP_ACCESS_TOKEN=xxx node apps/api/src/scripts/seed-whatsapp-templates.js\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  for (const tpl of TEMPLATES) {
    const bodyComp = tpl.components.find(c => c.type === 'BODY');
    const varCount = (bodyComp?.text?.match(/\{\{\d+\}\}/g) || []).length;
    console.log(`  📝 ${tpl.name}`);
    console.log(`     Categoria: ${tpl.category} | Variáveis: ${varCount}`);
    console.log(`     Corpo: ${bodyComp?.text?.substring(0, 80)}...`);
    console.log(`     Exemplos: ${JSON.stringify(bodyComp?.example?.body_text?.[0] || [])}`);
    console.log('');
  }
  process.exit(0);
}

// Com token → criar na Meta
async function criarTemplate(template) {
  const url = `https://graph.facebook.com/v21.0/${WABA_ID}/message_templates`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ACCESS_TOKEN}` },
    body: JSON.stringify({ name: template.name, category: template.category, language: template.language, components: template.components }),
  });
  const data = await response.json();
  if (response.ok) return { success: true, id: data.id, name: template.name };
  const msg = data.error?.message || JSON.stringify(data);
  if (msg.includes('already exists') || msg.includes('name already used')) return { success: true, name: template.name, already_exists: true };
  return { success: false, name: template.name, error: msg };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  CRIANDO TEMPLATES NA META');
  console.log(`  WABA ID: ${WABA_ID} | Templates: ${TEMPLATES.length}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  let created = 0, existing = 0, errors = 0;
  for (const template of TEMPLATES) {
    process.stdout.write(`  📤 ${template.name}... `);
    const result = await criarTemplate(template);
    if (result.success && result.already_exists) { console.log('✅ (já existe)'); existing++; }
    else if (result.success) { console.log(`✅ criado (id: ${result.id})`); created++; }
    else { console.log(`❌ ${result.error}`); errors++; }
  }

  console.log(`\n  ✅ Criados: ${created} | ℹ️ Já existiam: ${existing} | ❌ Erros: ${errors}`);
  console.log('\n  ⚠️  Agora entre na tela do admin, faça upload da imagem em cada template e salve!');
  console.log('     Ou acesse: https://business.facebook.com/wa/manage/message-templates/\n');
}

main().catch(err => { console.error('Erro:', err.message); process.exit(1); });

// Export para uso em testes ou referência
module.exports = { TEMPLATES };
