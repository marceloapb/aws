// ══════════════════════════════════════════════════════════════
// SERVICES/NOTIFICATION-DISPATCHER.JS — Processamento de eventos → notificações
// ══════════════════════════════════════════════════════════════

const crypto = require('crypto');
const { QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamo, TABLE } = require('../config/dynamodb');
const { verificarDedup, marcarProcessado } = require('./dedupService');
const { getTemplateImageUrl, resolveTemplateImageUrl, isImageTemplate } = require('./whatsappTemplateCache');

const TENANT = process.env.TENANT_ID || '1';

/**
 * Processa um evento e dispara notificações conforme regras ativas
 * @param {Object} evento - Evento recebido do EventBridge ou chamada direta
 * @returns {Promise<Object>} Resultado do processamento
 */
async function processarEvento(evento) {
  const { evento_id, tipo_evento, tenant_id, dados = {} } = evento;

  // 0) Enriquecer dados com informações do cliente (se cliente_id presente)
  if (dados.cliente_id && !dados.whatsapp) {
    try {
      const { GetCommand: GC } = require('@aws-sdk/lib-dynamodb');
      // Tentar CLIENT#<id>/PROFILE (self-signup)
      let clienteResult = await dynamo.send(new GC({
        TableName: TABLE,
        Key: { PK: `CLIENT#${dados.cliente_id}`, SK: 'PROFILE' },
      }));
      let cliente = clienteResult.Item;
      // Fallback: TENANT#default/CLIENTE#<id> (admin-created)
      if (!cliente) {
        clienteResult = await dynamo.send(new GC({
          TableName: TABLE,
          Key: { PK: `TENANT#${tenant_id || TENANT}`, SK: `CLIENTE#${dados.cliente_id}` },
        }));
        cliente = clienteResult.Item;
      }
      if (cliente) {
        if (!dados.whatsapp) dados.whatsapp = cliente.whatsapp || cliente.telefone || cliente.whatsapp_numero || '';
        if (!dados.email) dados.email = cliente.email || '';
        if (!dados.cliente_nome) dados.cliente_nome = cliente.nome || cliente.name || '';
      }
    } catch {}
  }

  // 1) Verificar idempotência
  const jaDuplicado = await verificarDedup(evento_id);
  if (jaDuplicado) {
    return { success: true, ignorado: true, motivo: 'evento_duplicado' };
  }

  // Marcar como processado (race condition safe)
  const marcou = await marcarProcessado(evento_id);
  if (!marcou) {
    return { success: true, ignorado: true, motivo: 'evento_duplicado_concorrente' };
  }

  // 2) Buscar regras de notificação ativas para o tipo_evento
  // Normalizar: tipo_evento pode ser 'orcamento_criado' ou 'orcamento.criado'
  const tipoComPonto = tipo_evento.replace(/_/g, '.');
  const tipoComUnderscore = tipo_evento.replace(/\./g, '_');

  const regrasResult = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    FilterExpression: '#status = :ativa AND (contains(tipos_evento, :tipo1) OR contains(tipos_evento, :tipo2))',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':pk': `TENANT#${tenant_id || TENANT}`,
      ':sk': 'REGRA_NTF#',
      ':ativa': 'ativa',
      ':tipo1': tipoComPonto,
      ':tipo2': tipoComUnderscore,
    },
  }));

  const regras = regrasResult.Items || [];
  if (regras.length === 0) {
    return { success: true, ignorado: true, motivo: 'sem_regras_ativas' };
  }

  // 3) Para cada regra, despachar para os canais configurados
  const resultados = [];

  for (const regra of regras) {
    const canais = regra.canais || [];

    for (const canal of canais) {
      // Se canal_filtro definido, só dispara para esse canal
      if (evento.canal_filtro && canal !== evento.canal_filtro) continue;

      const entregaId = crypto.randomUUID();
      const now = new Date().toISOString();
      let status = 'enviado';
      let erro = null;

      try {
        await despacharCanal(canal, regra, evento, dados);
      } catch (err) {
        status = 'erro';
        erro = err.message;
      }

      // 4) Registrar log de entrega
      const logItem = {
        PK: `TENANT#${tenant_id || TENANT}`,
        SK: `LOG_NTF#${now}#${entregaId}`,
        GSI1PK: `TENANT#${tenant_id || TENANT}`,
        GSI1SK: `CANAL#${canal}#${now}`,
        id: entregaId,
        evento_id,
        tipo_evento,
        regra_id: regra.id,
        canal,
        status,
        erro,
        destinatario: regra.destinatario,
        created: now,
      };

      await dynamo.send(new PutCommand({ TableName: TABLE, Item: logItem }));
      resultados.push({ canal, status, entrega_id: entregaId, erro });
    }
  }

  return { success: true, evento_id, regras_aplicadas: regras.length, resultados };
}

/**
 * Despacha a notificação para o canal específico
 */
async function despacharCanal(canal, regra, evento, dados) {
  switch (canal) {
    case 'inapp': {
      const notifId = crypto.randomUUID();
      const now = new Date().toISOString();
      await dynamo.send(new PutCommand({
        TableName: TABLE,
        Item: {
          PK: `TENANT#${evento.tenant_id || TENANT}`,
          SK: `NTF#${notifId}`,
          GSI1PK: `TENANT#${evento.tenant_id || TENANT}`,
          GSI1SK: `NTF#${now}`,
          id: notifId,
          tipo: evento.tipo_evento,
          titulo: regra.titulo_template || evento.tipo_evento,
          mensagem: regra.mensagem_template || JSON.stringify(dados),
          lida: false,
          dados,
          evento_id: evento.evento_id,
          created: now,
        },
      }));
      break;
    }

    case 'email': {
      const { enviarEmail } = require('../adapters/notificacoes/emailAdapter');
      await enviarEmail({
        destinatario: regra.email_destinatario || dados.email,
        titulo: regra.titulo_template || evento.tipo_evento,
        corpo: regra.mensagem_template || '',
        templateData: { ...dados, tipo_evento: evento.tipo_evento },
      });
      break;
    }

    case 'whatsapp': {
      const { enviarWhatsApp } = require('../adapters/notificacoes/whatsappAdapter');

      // Textos descritivos por tipo de evento (quando não há template customizado na regra)
      const textosDescritivos = {
        'orcamento_solicitado': {
          titulo: `Novo Orçamento Solicitado`,
          mensagem: `${dados.cliente_nome || 'Um cliente'} solicitou orçamento para ${dados.tipo_evento || dados.nome_evento || 'evento'}. Data: ${dados.data_evento ? new Date(dados.data_evento + 'T00:00').toLocaleDateString('pt-BR') : 'a definir'}. Acesse o sistema para montar a proposta.`,
        },
        'orcamento_criado': {
          titulo: `Novo Orçamento Solicitado`,
          mensagem: `${dados.cliente_nome || 'Um cliente'} solicitou orçamento para ${dados.tipo_evento || dados.nome_evento || 'evento'}. Data: ${dados.data_evento ? new Date(dados.data_evento + 'T00:00').toLocaleDateString('pt-BR') : 'a definir'}. Acesse o sistema para montar a proposta.`,
        },
        'contrato_enviado': {
          titulo: `Contrato Enviado para Assinatura`,
          mensagem: `O contrato de ${dados.cliente_nome || 'cliente'} para ${dados.tipo_evento || 'o evento'} foi enviado e aguarda assinatura digital.`,
        },
        'contrato_assinado': {
          titulo: `Contrato Assinado com Sucesso!`,
          mensagem: `${dados.cliente_nome || 'O cliente'} assinou o contrato para ${dados.tipo_evento || 'o evento'}. Tudo certo para seguir com o planejamento!`,
        },
        'pagamento_confirmado': {
          titulo: `Pagamento Confirmado!`,
          mensagem: `Pagamento de ${dados.cliente_nome || 'cliente'} no valor de R$ ${dados.valor ? Number(dados.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'} foi confirmado com sucesso.`,
        },
        'pagamento_vencido': {
          titulo: `Pagamento Vencido`,
          mensagem: `O pagamento de ${dados.cliente_nome || 'cliente'} no valor de R$ ${dados.valor ? Number(dados.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'} está vencido desde ${dados.data_vencimento || 'data não informada'}. Verifique com o cliente.`,
        },
        'album_publicado': {
          titulo: `Álbum Publicado!`,
          mensagem: `O álbum "${dados.titulo || dados.album_titulo || 'Fotos'}" de ${dados.cliente_nome || 'cliente'} está disponível para visualização e download.`,
        },
        'evento_confirmado': {
          titulo: `Evento Confirmado!`,
          mensagem: `O evento de ${dados.cliente_nome || 'cliente'} (${dados.tipo_evento || 'sessão'}) no dia ${dados.data_evento ? new Date(dados.data_evento + 'T00:00').toLocaleDateString('pt-BR') : '—'} foi confirmado.`,
        },
        'evento_criado': {
          titulo: `Novo Evento Agendado`,
          mensagem: `Evento criado para ${dados.cliente_nome || 'cliente'}: ${dados.tipo_evento || 'sessão'} no dia ${dados.data_evento ? new Date(dados.data_evento + 'T00:00').toLocaleDateString('pt-BR') : '—'}.`,
        },
        'evento_realizado': {
          titulo: `Evento Realizado!`,
          mensagem: `O evento de ${dados.cliente_nome || 'cliente'} (${dados.tipo_evento || 'sessão'}) foi marcado como realizado. Próximos passos: edição e entrega.`,
        },
        'feedback_respondido': {
          titulo: `Novo Feedback Recebido`,
          mensagem: `${dados.cliente_nome || 'Um cliente'} respondeu a pesquisa de satisfação. Confira a avaliação no sistema.`,
        },
      };

      const textoEvento = textosDescritivos[evento.tipo_evento];
      const titulo = regra.titulo_template || textoEvento?.titulo || evento.tipo_evento;
      const mensagem = regra.mensagem_template || textoEvento?.mensagem || dados.descricao || evento.tipo_evento;

      // Resolver destinatário: regra > dados > config admin
      let numero = regra.whatsapp_destinatario || dados.whatsapp;
      if (!numero) {
        try {
          const configResult = await dynamo.send(new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: 'PK = :pk AND SK = :sk',
            ExpressionAttributeValues: { ':pk': `TENANT#${evento.tenant_id || TENANT}`, ':sk': 'CONFIG#whatsappBusiness' },
          }));
          numero = configResult.Items?.[0]?.valor || '';
        } catch {}
      }

      if (!numero) {
        throw new Error('Número WhatsApp do destinatário não configurado');
      }

      // Resolver template — as regras já apontam diretamente para _img quando disponível
      // Fallback por evento só para casos onde não há regra com whatsapp_template definido
      const templatePorEvento = {
        'orcamento_solicitado': 'mbf_novo_orcamento_img',
        'orcamento_criado': 'mbf_novo_orcamento_img',
        'contrato_enviado': 'mbf_contrato_assinatura_img',
        'contrato_assinado': 'mbf_contrato_assinado_img',
        'pagamento_confirmado': 'mbf_pagamento_confirmado_img',
        'pagamento_vencido': 'mbf_pagamento_vencido_img',
        'album_publicado': 'mbf_fotos_prontas_img',
        'evento_confirmado': 'mbf_evento_confirmado_img',
        'evento_criado': 'mbf_notificacao_geral_img',
        'evento_realizado': 'mbf_notificacao_geral_img',
        'album_baixado': 'mbf_notificacao_geral_img',
        'feedback_respondido': 'mbf_feedback_img',
        'mensagem_recebida': 'mbf_notificacao_geral_img',
      };

      const templateName = regra.whatsapp_template || templatePorEvento[evento.tipo_evento] || 'mbf_notificacao_geral_img';

      // Mapear parâmetros corretos por template (cada um tem número diferente de params)
      const templateParams = {
        'mbf_notificacao_geral_img': [titulo, mensagem],
        'mbf_novo_orcamento_img': [dados.cliente_nome || 'Cliente', titulo],
        'mbf_contrato_assinado_img': [titulo, mensagem],
        'mbf_contrato_assinatura_img': [dados.cliente_nome || 'Cliente', titulo],
        'mbf_pagamento_vencido_img': [dados.cliente_nome || 'Cliente', titulo, mensagem],
        'mbf_pagamento_confirmado_img': [dados.cliente_nome || 'Cliente', titulo, mensagem],
        'mbf_evento_confirmado_img': [dados.cliente_nome || 'Cliente', titulo, mensagem],
        'mbf_feedback_img': [dados.cliente_nome || 'Cliente', titulo],
        'mbf_orcamento_pronto_img': [dados.cliente_nome || 'Cliente', titulo, mensagem],
        'mbf_lembrete_evento_img': [dados.cliente_nome || 'Cliente', dados.tipo_evento || titulo, dados.data_evento || 'a definir', dados.hora_evento || '—'],
        'mbf_fotos_prontas_img': [dados.cliente_nome || 'Cliente', titulo, dados.total_fotos || '—', dados.dias_expiracao || '30'],
        'mbf_album_pronto_img': [dados.cliente_nome || 'Cliente', titulo, mensagem],
        'mbf_lembrete_admin_img': [titulo, mensagem],
      };
      const parametros = templateParams[templateName] || [dados.cliente_nome || 'Cliente', titulo, mensagem];

      // Templates _img EXIGEM header IMAGE a cada envio.
      // A Meta NÃO usa automaticamente a imagem do template — precisa enviar mediaUrl SEMPRE.
      //
      // IMPORTANTE: O header_handle retornado pela API de templates da Meta é uma
      // referência interna criptografada e NÃO funciona como URL pública no envio.
      // Devemos SEMPRE usar URLs públicas (CDN/S3) para o campo image.link.
      //
      // Ref: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
      const CDN_BASE = 'https://d2112x4m4e89fv.cloudfront.net';

      if (isImageTemplate(templateName)) {
        let imagemUrl;

        if (regra.header_image_key) {
          // 1) Regra tem imagem customizada no CDN
          imagemUrl = `${CDN_BASE}/${regra.header_image_key}`;
        } else {
          // 2) Mapeamento CDN por template (sempre retorna URL válida, nunca null)
          imagemUrl = getTemplateImageUrl(templateName);
        }

        await enviarWhatsApp({
          numero,
          template: templateName,
          parametros,
          mediaType: 'image',
          mediaUrl: imagemUrl,
        });
      } else {
        // Template sem header IMAGE — enviar normalmente
        await enviarWhatsApp({
          numero,
          template: templateName,
          parametros,
        });
      }
      break;
    }

    default:
      throw new Error(`Canal desconhecido: ${canal}`);
  }
}

module.exports = { processarEvento };
