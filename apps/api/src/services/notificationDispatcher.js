// ══════════════════════════════════════════════════════════════
// SERVICES/NOTIFICATION-DISPATCHER.JS — Processamento de eventos → notificações
// ══════════════════════════════════════════════════════════════

const crypto = require('crypto');
const { QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamo, TABLE } = require('../config/dynamodb');
const { verificarDedup, marcarProcessado } = require('./dedupService');

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
          titulo: `Contrato Assinado com Sucesso! 🎉`,
          mensagem: `${dados.cliente_nome || 'O cliente'} assinou o contrato para ${dados.tipo_evento || 'o evento'}. Tudo certo para seguir com o planejamento!`,
        },
        'pagamento_confirmado': {
          titulo: `Pagamento Confirmado! 💰`,
          mensagem: `Pagamento de ${dados.cliente_nome || 'cliente'} no valor de R$ ${dados.valor ? Number(dados.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'} foi confirmado com sucesso.`,
        },
        'pagamento_vencido': {
          titulo: `Pagamento Vencido ⚠️`,
          mensagem: `O pagamento de ${dados.cliente_nome || 'cliente'} no valor de R$ ${dados.valor ? Number(dados.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'} está vencido desde ${dados.data_vencimento || 'data não informada'}. Verifique com o cliente.`,
        },
        'album_publicado': {
          titulo: `Álbum Publicado! 📸`,
          mensagem: `O álbum "${dados.titulo || dados.album_titulo || 'Fotos'}" de ${dados.cliente_nome || 'cliente'} está disponível para visualização e download.`,
        },
        'evento_confirmado': {
          titulo: `Evento Confirmado! ✅`,
          mensagem: `O evento de ${dados.cliente_nome || 'cliente'} (${dados.tipo_evento || 'sessão'}) no dia ${dados.data_evento ? new Date(dados.data_evento + 'T00:00').toLocaleDateString('pt-BR') : '—'} foi confirmado.`,
        },
        'evento_criado': {
          titulo: `Novo Evento Agendado`,
          mensagem: `Evento criado para ${dados.cliente_nome || 'cliente'}: ${dados.tipo_evento || 'sessão'} no dia ${dados.data_evento ? new Date(dados.data_evento + 'T00:00').toLocaleDateString('pt-BR') : '—'}.`,
        },
        'evento_realizado': {
          titulo: `Evento Realizado! 🎬`,
          mensagem: `O evento de ${dados.cliente_nome || 'cliente'} (${dados.tipo_evento || 'sessão'}) foi marcado como realizado. Próximos passos: edição e entrega.`,
        },
        'feedback_respondido': {
          titulo: `Novo Feedback Recebido ⭐`,
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

      // Resolver template
      const templatePorEvento = {
        'orcamento_solicitado': 'novo_orcamento',
        'orcamento_criado': 'novo_orcamento',
        'contrato_enviado': 'contrato_assinatura',
        'contrato_assinado': 'contrato_assinado_aviso',
        'pagamento_confirmado': 'pagamento_confirmado',
        'pagamento_vencido': 'pagamento_vencido',
        'album_publicado': 'album_pronto',
        'evento_confirmado': 'evento_confirmado',
        'evento_criado': 'notificacao_geral',
        'evento_realizado': 'notificacao_geral',
        'album_baixado': 'notificacao_geral',
        'feedback_respondido': 'notificacao_geral',
        'mensagem_recebida': 'notificacao_geral',
      };

      const templateName = regra.whatsapp_template || templatePorEvento[evento.tipo_evento] || 'notificacao_geral';

      // Enviar com ou sem imagem de header
      // 1) Se a regra tem header_image_key explícito, usar ele
      // 2) Senão, verificar se o template na Meta tem header IMAGE e usar automaticamente
      let mediaType = null;
      let mediaUrl = null;

      if (regra.header_image_key) {
        const CDN_BASE = 'https://d2112x4m4e89fv.cloudfront.net';
        mediaType = 'image';
        mediaUrl = `${CDN_BASE}/${regra.header_image_key}`;
      } else {
        // Auto-detectar header de imagem do template na Meta
        try {
          const { loadParams } = require('../config/env');
          const params = await loadParams();
          const token = params.WHATSAPP_ACCESS_TOKEN;
          const wabaId = params.WHATSAPP_WABA_ID || '2163797757810981';

          if (token) {
            const tplResp = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/message_templates?name=${templateName}&limit=5`, {
              headers: { 'Authorization': `Bearer ${token}` },
              signal: AbortSignal.timeout(8000),
            });
            const tplData = await tplResp.json();
            const tpl = (tplData.data || []).find(t => t.name === templateName && t.status === 'APPROVED');
            if (tpl) {
              const headerComp = tpl.components?.find(c => c.type === 'HEADER');
              if (headerComp?.format === 'IMAGE') {
                const exemploUrl = headerComp.example?.header_handle?.[0] || headerComp.example?.header_url?.[0];
                if (exemploUrl) {
                  mediaType = 'image';
                  mediaUrl = exemploUrl;
                }
              }
            }
          }
        } catch (e) {
          // Se falhar a consulta à Meta, enviar sem imagem (não bloquear o envio)
          console.warn('[DISPATCHER] Falha ao verificar header do template na Meta:', e.message);
        }
      }

      if (mediaType && mediaUrl) {
        await enviarWhatsApp({
          numero,
          template: templateName,
          parametros: [dados.cliente_nome || 'Cliente', titulo, mensagem],
          mediaType,
          mediaUrl,
        });
      } else {
        await enviarWhatsApp({
          numero,
          template: templateName,
          parametros: [dados.cliente_nome || 'Cliente', titulo, mensagem],
        });
      }
      break;
    }

    default:
      throw new Error(`Canal desconhecido: ${canal}`);
  }
}

module.exports = { processarEvento };
