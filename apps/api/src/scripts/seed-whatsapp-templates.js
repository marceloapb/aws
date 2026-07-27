/**
 * ══════════════════════════════════════════════════════════════
 * SEED WHATSAPP TEMPLATES — Cria todos os templates na Meta
 * ══════════════════════════════════════════════════════════════
 *
 * USO:
 *   node apps/api/src/scripts/seed-whatsapp-templates.js
 *
 * PRE-REQUISITOS:
 *   - Variáveis de ambiente: WHATSAPP_ACCESS_TOKEN, WHATSAPP_WABA_ID
 *   - Ou configurar nos parâmetros SSM (/mbf/prod/WHATSAPP_ACCESS_TOKEN)
 *
 * NOTA:
 *   Templates precisam ser APROVADOS pela Meta antes de funcionar.
 *   Após rodar este script, aguarde a aprovação no Meta Business Suite.
 */

const WABA_ID = process.env.WHATSAPP_WABA_ID || '2163797757810981';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('❌ WHATSAPP_ACCESS_TOKEN não configurado. Defina a variável de ambiente.');
  process.exit(1);
}

// ══════════ DEFINIÇÃO DOS TEMPLATES ══════════

const TEMPLATES = [
  {
    name: 'notificacao_geral',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '📸 Marcelo Bloise Fotografia',
      },
      {
        type: 'BODY',
        text: '*{{1}}*\n\n{{2}}',
        example: { body_text: [['Novo orçamento recebido', 'João solicitou orçamento para Casamento. Acesse o sistema.']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },
  {
    name: 'novo_orcamento',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '📋 Nova Solicitação de Orçamento',
      },
      {
        type: 'BODY',
        text: '*{{1}}*\n\n{{2}}',
        example: { body_text: [['Nova solicitação!', 'Maria solicitou orçamento para Ensaio Gestante.']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },
  {
    name: 'lembrete_evento',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '📅 Lembrete de Sessão',
      },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 👋\n\nLembrando que sua sessão de *{{2}}* está marcada para o dia *{{3}}* às *{{4}}*.\n\nQualquer dúvida, é só responder aqui! 😊',
        example: { body_text: [['Maria', 'Ensaio Gestante', '15/03/2026', '14:00']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },
  {
    name: 'orcamento_pronto',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '💰 Seu Orçamento está Pronto!',
      },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 👋\n\nSeu orçamento no valor de *{{2}}* está pronto para visualização.\n\nAcesse pelo link abaixo para conferir todos os detalhes:\n{{3}}',
        example: { body_text: [['João', 'R$ 3.500,00', 'https://mbfoto.com.br/orcamento/abc123']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },
  {
    name: 'album_pronto',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '📸 Suas Fotos estão Prontas!',
      },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 🎉\n\nSeu álbum *{{2}}* está disponível para visualização e download!\n\nAcesse pelo link:\n{{3}}\n\nEspero que goste! ❤️',
        example: { body_text: [['Maria', 'Casamento - Maria & João', 'https://mbfoto.com.br/album/maria-joao']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },
  {
    name: 'pagamento_confirmado',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '✅ Pagamento Confirmado',
      },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*!\n\nConfirmamos o recebimento do pagamento de *{{2}}*.\n\nStatus: *{{3}}*\n\nObrigado pela confiança! 🙏',
        example: { body_text: [['João', 'R$ 1.500,00', 'confirmado']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },
  {
    name: 'contrato_assinatura',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '📋 Contrato para Assinatura',
      },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 👋\n\nSeu contrato está pronto para revisão e assinatura digital.\n\nAcesse pelo link abaixo:\n{{2}}\n\nQualquer dúvida, é só responder! 😊',
        example: { body_text: [['Maria', 'https://mbfoto.com.br/contrato/abc123']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },
  {
    name: 'pagamento_vencido',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '⚠️ Pagamento Pendente',
      },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*!\n\nIdentificamos que o pagamento de *{{2}}* com vencimento em *{{3}}* ainda não foi realizado.\n\nPor favor, regularize quando possível. Se já pagou, pode desconsiderar.\n\nDúvidas? Responda aqui! 🙂',
        example: { body_text: [['João', 'R$ 1.000,00', '10/03/2026']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },
  {
    name: 'contrato_assinado_aviso',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '🎉 Contrato Assinado!',
      },
      {
        type: 'BODY',
        text: '*{{1}}*\n\n{{2}}',
        example: { body_text: [['Contrato assinado!', 'Maria assinou o contrato. Verifique os próximos passos.']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },
  {
    name: 'evento_confirmado',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '✅ Sessão Confirmada!',
      },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 🎉\n\nSua sessão de *{{2}}* no dia *{{3}}* está confirmada!\n\nNos vemos em breve! 📸',
        example: { body_text: [['Maria', 'Ensaio Gestante', '15/03/2026']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },
  {
    name: 'feedback_solicitacao',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '⭐ Como foi sua experiência?',
      },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 👋\n\nGostaríamos de saber sua opinião sobre o serviço.\n\nDeixe sua avaliação pelo link:\n{{2}}\n\nSua opinião é muito importante! ❤️',
        example: { body_text: [['Maria', 'https://mbfoto.com.br/feedback/abc123']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },
];

// ══════════ EXECUÇÃO ══════════

async function criarTemplate(template) {
  const url = `https://graph.facebook.com/v20.0/${WABA_ID}/message_templates`;

  const body = {
    name: template.name,
    category: template.category,
    language: template.language,
    components: template.components,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (response.ok) {
    return { success: true, id: data.id, name: template.name };
  } else {
    const msg = data.error?.message || JSON.stringify(data);
    // Template já existe = não é erro crítico
    if (msg.includes('already exists') || msg.includes('name already used')) {
      return { success: true, name: template.name, already_exists: true };
    }
    return { success: false, name: template.name, error: msg };
  }
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  SEED WHATSAPP TEMPLATES');
  console.log(`  WABA ID: ${WABA_ID}`);
  console.log(`  Templates: ${TEMPLATES.length}`);
  console.log('═══════════════════════════════════════\n');

  let created = 0;
  let existing = 0;
  let errors = 0;

  for (const template of TEMPLATES) {
    process.stdout.write(`  📤 ${template.name}... `);
    const result = await criarTemplate(template);

    if (result.success && result.already_exists) {
      console.log('✅ (já existe)');
      existing++;
    } else if (result.success) {
      console.log(`✅ criado (id: ${result.id})`);
      created++;
    } else {
      console.log(`❌ ${result.error}`);
      errors++;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`  ✅ Criados: ${created}`);
  console.log(`  ℹ️  Já existiam: ${existing}`);
  console.log(`  ❌ Erros: ${errors}`);
  console.log('═══════════════════════════════════════');
  console.log('\n⚠️  Lembre-se: templates precisam ser APROVADOS pela Meta antes de funcionar.');
  console.log('   Acesse: https://business.facebook.com/wa/manage/message-templates/\n');
}

main().catch(err => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
