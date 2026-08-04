/**
 * ══════════════════════════════════════════════════════════════
 * SEED WHATSAPP TEMPLATES — Define todos os templates para a Meta
 * ══════════════════════════════════════════════════════════════
 *
 * TODOS os templates usam header IMAGE para consistência visual.
 * O sufixo _img indica que o template requer uma imagem no header.
 *
 * FLUXO:
 *   1. Rodar este script para submeter os templates à Meta
 *   2. Acessar Meta Business Suite → Message Templates
 *   3. Para cada template, fazer upload da imagem de header
 *   4. Aguardar aprovação da Meta
 *
 * USO:
 *   WHATSAPP_ACCESS_TOKEN=xxx node apps/api/src/scripts/seed-whatsapp-templates.js
 *
 * NOTA:
 *   - Cada template precisa de uma imagem de header (JPEG/PNG, max 5MB)
 *   - A imagem deve ser enviada no Meta Business Suite ao criar o template
 *   - Após aprovação, o código já está pronto para enviar com imagens via CDN
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
 * ══════════════════════════════════════════════════════════════
 */

const WABA_ID = process.env.WHATSAPP_WABA_ID || '2163797757810981';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('❌ WHATSAPP_ACCESS_TOKEN não configurado. Defina a variável de ambiente.');
  process.exit(1);
}

// ══════════ DEFINIÇÃO DOS TEMPLATES ══════════
// Todos com header IMAGE + body + footer

const TEMPLATES = [
  // ─────────────────────────────────────────────
  // 1. NOTIFICAÇÃO GERAL (catch-all para admin)
  // ─────────────────────────────────────────────
  {
    name: 'mbf_notificacao_geral_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        // Imagem: logo ou ícone de notificação
      },
      {
        type: 'BODY',
        text: '*{{1}}*\n\n{{2}}',
        example: { body_text: [['Novo orçamento recebido', 'João solicitou orçamento para Casamento. Acesse o sistema para montar a proposta.']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 2. NOVO ORÇAMENTO SOLICITADO (notifica admin)
  // ─────────────────────────────────────────────
  {
    name: 'mbf_novo_orcamento_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        // Imagem: ícone de orçamento/proposta
      },
      {
        type: 'BODY',
        text: '📋 *Nova Solicitação de Orçamento*\n\nCliente: *{{1}}*\nDetalhes: {{2}}',
        example: { body_text: [['Maria Silva', 'Ensaio Gestante - Data: 15/03/2026']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 3. LEMBRETE DE EVENTO (envia para cliente)
  // ─────────────────────────────────────────────
  {
    name: 'mbf_lembrete_evento_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        // Imagem: calendário ou câmera
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

  // ─────────────────────────────────────────────
  // 4. ORÇAMENTO PRONTO (envia para cliente)
  // ─────────────────────────────────────────────
  {
    name: 'mbf_orcamento_pronto_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        // Imagem: proposta/orçamento
      },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 👋\n\nSeu orçamento no valor de *{{2}}* está pronto para visualização.\n\nAcesse pelo link abaixo para conferir todos os detalhes:\n{{3}}',
        example: { body_text: [['João', 'R$ 3.500,00', 'https://www.marcelobloisefotografia.com.br/orcamento/abc123']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 5. ÁLBUM / FOTOS PRONTAS (envia para cliente)
  // ─────────────────────────────────────────────
  {
    name: 'mbf_fotos_prontas_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        // Imagem: câmera, álbum de fotos
      },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 🎉\n\nSeu álbum *{{2}}* está disponível para visualização e download!\n\nSão *{{3}}* fotos que ficarão disponíveis por *{{4}} dias*.\n\nAcesse e aproveite! ❤️',
        example: { body_text: [['Maria', 'Casamento - Maria & João', '150', '30']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 6. PAGAMENTO CONFIRMADO (envia para cliente)
  // ─────────────────────────────────────────────
  {
    name: 'mbf_pagamento_confirmado_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        // Imagem: check/confirmação de pagamento
      },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*!\n\n✅ Confirmamos o recebimento do pagamento de *{{2}}*.\n\nStatus: *{{3}}*\n\nObrigado pela confiança! 🙏',
        example: { body_text: [['João', 'R$ 1.500,00', 'Confirmado']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 7. PAGAMENTO VENCIDO (envia para cliente)
  // ─────────────────────────────────────────────
  {
    name: 'mbf_pagamento_vencido_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        // Imagem: alerta/aviso de pagamento
      },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*!\n\n⚠️ Identificamos que o pagamento de *{{2}}* está pendente.\n\n{{3}}\n\nSe já pagou, pode desconsiderar. Dúvidas? Responda aqui! 🙂',
        example: { body_text: [['João', 'R$ 1.000,00', 'Vencimento: 10/03/2026. Por favor, regularize quando possível.']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 8. CONTRATO PARA ASSINATURA (envia para cliente)
  // ─────────────────────────────────────────────
  {
    name: 'mbf_contrato_assinatura_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        // Imagem: documento/contrato
      },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 👋\n\nSeu contrato está pronto para revisão e assinatura digital.\n\n{{2}}\n\nQualquer dúvida, é só responder! 😊',
        example: { body_text: [['Maria', 'Acesse o link enviado por e-mail para assinar.']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 9. CONTRATO ASSINADO (notifica admin)
  // ─────────────────────────────────────────────
  {
    name: 'mbf_contrato_assinado_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        // Imagem: check/sucesso
      },
      {
        type: 'BODY',
        text: '🎉 *{{1}}*\n\n{{2}}',
        example: { body_text: [['Contrato Assinado!', 'Maria assinou o contrato para Ensaio Gestante. Verifique os próximos passos no sistema.']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 10. EVENTO CONFIRMADO (envia para cliente)
  // ─────────────────────────────────────────────
  {
    name: 'mbf_evento_confirmado_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        // Imagem: calendário com check
      },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 🎉\n\nSua sessão de *{{2}}* está confirmada!\n\n{{3}}\n\nNos vemos em breve! 📸',
        example: { body_text: [['Maria', 'Ensaio Gestante', 'Data: 15/03/2026 às 14:00. Local: Parque Ibirapuera.']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 11. FEEDBACK / AVALIAÇÃO (envia para cliente)
  // ─────────────────────────────────────────────
  {
    name: 'mbf_feedback_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        // Imagem: estrelas/avaliação
      },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 👋\n\nGostaríamos de saber sua opinião sobre o serviço.\n\n{{2}}\n\nSua opinião é muito importante! ❤️',
        example: { body_text: [['Maria', 'Deixe sua avaliação respondendo aqui ou acesse nosso site.']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 12. CÓDIGO DE VERIFICAÇÃO (envia para cliente)
  // ─────────────────────────────────────────────
  {
    name: 'mbf_codigo_verificacao_img',
    category: 'AUTHENTICATION',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        // Imagem: cadeado/segurança
      },
      {
        type: 'BODY',
        text: '*{{1}}* é seu código de verificação.\n\nPara sua segurança, não compartilhe este código.',
        example: { body_text: [['482913']] },
      },
      {
        type: 'FOOTER',
        text: 'Este código expira em 10 minutos.',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 13. LEMBRETE ADMIN (notifica admin sobre eventos de amanhã)
  // ─────────────────────────────────────────────
  {
    name: 'mbf_lembrete_admin_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        // Imagem: calendário/agenda
      },
      {
        type: 'BODY',
        text: '📅 *{{1}}*\n\n{{2}}',
        example: { body_text: [['Evento Amanhã: Ensaio Gestante', 'Maria Silva - 15/03/2026 às 14:00 | Parque Ibirapuera']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 14. BOAS-VINDAS (envia para cliente novo)
  // ─────────────────────────────────────────────
  {
    name: 'mbf_boas_vindas_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        // Imagem: boas-vindas/logo com saudação
      },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 👋\n\nBem-vindo(a) ao portal da Marcelo Bloise Fotografia!\n\nSua senha temporária: *{{2}}*\n\nNo primeiro acesso, você será solicitado(a) a criar uma nova senha.\n\nAcesse: www.marcelobloisefotografia.com.br/login',
        example: { body_text: [['Maria', 'Xk9#mP2']] },
      },
      {
        type: 'FOOTER',
        text: 'Marcelo Bloise Fotografia',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 15. ÁLBUM PRONTO (genérico - notifica sobre álbum)
  // ─────────────────────────────────────────────
  {
    name: 'mbf_album_pronto_img',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        // Imagem: álbum/galeria de fotos
      },
      {
        type: 'BODY',
        text: 'Olá *{{1}}*! 🎉\n\nSeu álbum *{{2}}* está pronto!\n\n{{3}}\n\nEspero que goste! ❤️',
        example: { body_text: [['Maria', 'Ensaio Gestante', 'Acesse o link enviado por e-mail para visualizar e baixar suas fotos.']] },
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
  const url = `https://graph.facebook.com/v21.0/${WABA_ID}/message_templates`;

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
    if (msg.includes('already exists') || msg.includes('name already used')) {
      return { success: true, name: template.name, already_exists: true };
    }
    return { success: false, name: template.name, error: msg };
  }
}

async function deletarTemplate(name) {
  const url = `https://graph.facebook.com/v21.0/${WABA_ID}/message_templates?name=${name}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
  });

  const data = await response.json();
  return response.ok ? { success: true, name } : { success: false, name, error: data.error?.message };
}

// Templates antigos para deletar (nomes que serão substituídos)
const TEMPLATES_ANTIGOS = [
  'notificacao_geral',
  'notificacao_geral_img',
  'novo_orcamento',
  'novo_orcamento_img',
  'lembrete_evento',
  'orcamento_pronto',
  'album_pronto',
  'album_pronto_img_v2',
  'fotos_prontas',
  'pagamento_confirmado',
  'pagamento_confirmado_img',
  'pagamento_vencido',
  'pagamento_vencido_img',
  'contrato_assinatura',
  'contrato_assinatura_img',
  'contrato_assinado_aviso',
  'contrato_assinado_aviso_img',
  'evento_confirmado',
  'evento_confirmado_img',
  'evento_confirmado_img_v2',
  'feedback_solicitacao',
  'mbfoto_codigo_verificacao',
];

async function main() {
  const mode = process.argv[2]; // --delete, --create, ou vazio (ambos)

  console.log('═══════════════════════════════════════════════════');
  console.log('  SEED WHATSAPP TEMPLATES - Marcelo Bloise Fotografia');
  console.log(`  WABA ID: ${WABA_ID}`);
  console.log(`  Mode: ${mode || '--all (delete antigos + criar novos)'}`);
  console.log('═══════════════════════════════════════════════════\n');

  // ── FASE 1: Deletar templates antigos ──
  if (!mode || mode === '--delete' || mode === '--all') {
    console.log('🗑️  DELETANDO templates antigos...\n');
    for (const name of TEMPLATES_ANTIGOS) {
      process.stdout.write(`  🗑️  ${name}... `);
      const result = await deletarTemplate(name);
      if (result.success) {
        console.log('✅ deletado');
      } else {
        console.log(`⚠️  ${result.error || 'não encontrado'}`);
      }
    }
    console.log('');
  }

  // ── FASE 2: Criar templates novos ──
  if (!mode || mode === '--create' || mode === '--all') {
    console.log('📤 CRIANDO templates novos (todos com header IMAGE)...\n');

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

    console.log('\n═══════════════════════════════════════════════════');
    console.log(`  ✅ Criados: ${created}`);
    console.log(`  ℹ️  Já existiam: ${existing}`);
    console.log(`  ❌ Erros: ${errors}`);
    console.log('═══════════════════════════════════════════════════');
  }

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  PRÓXIMOS PASSOS:                                           ║
║                                                             ║
║  1. Acesse: https://business.facebook.com/wa/manage/        ║
║     message-templates/                                      ║
║                                                             ║
║  2. Para CADA template:                                     ║
║     - Clique no template                                    ║
║     - Faça upload da imagem de header                       ║
║     - Salve (isso submete para aprovação da Meta)           ║
║                                                             ║
║  3. Aguarde aprovação (geralmente minutos a horas)          ║
║                                                             ║
║  4. Após aprovação, o sistema já está pronto para enviar!   ║
╚══════════════════════════════════════════════════════════════╝

📁 Imagens devem ser PNG/JPEG, tamanho recomendado: 800x418px
   Após upload no Meta, coloque as mesmas imagens no S3:
   s3://seu-bucket/template-headers/{nome}.png
   (O CDN CloudFront serve de: https://d2112x4m4e89fv.cloudfront.net/template-headers/)
`);
}

main().catch(err => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
