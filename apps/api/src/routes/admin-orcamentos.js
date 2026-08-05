const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { resolverValorBase } = require('../services/catalogoPrecificacaoService');
const { geocode, distanceMatrix } = require('../services/mapsService');
const { criarEvento, excluirEvento } = require('../services/googleCalendarService');
const { features } = require('../config/env');
const { SYNC_STATUS } = require('../config/constants');
const { registrarEvento, avancarStatusAutomatico } = require('../services/clienteHistoricoService');

const router = Router();
const TENANT = process.env.TENANT_ID || 'default';

async function findOrcamento(id) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'ORCAMENTO', ':sk': `ORCAMENTO#${id}` },
  }));
  return result.Items?.[0] || null;
}

// GET /api/admin/orcamentos
router.get('/', async (req, res) => {
  try {
    const { status, cliente_id, page = 1, limit = 50 } = req.query;

    // Map frontend status filter to DB values
    const STATUS_TO_DB = {
      draft: ['rascunho', 'solicitado', 'em_revisao', 'pronto_enviar'],
      sent: ['enviado'],
      accepted: ['aceito', 'aprovado', 'contrato_gerado'],
      rejected: ['recusado', 'cancelado'],
      expired: ['expirado'],
    };

    let items = [];
    if (cliente_id) {
      const result = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `CLIENTE#${cliente_id}`, ':sk': 'ORCAMENTO#' },
      }));
      items = result.Items || [];
    } else {
      const params = {
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'ORCAMENTO' },
      };
      // Apply status filter directly on DynamoDB if it maps to a single value
      const dbStatuses = status ? (STATUS_TO_DB[status] || [status]) : null;
      if (dbStatuses && dbStatuses.length === 1) {
        params.FilterExpression = '#s = :status';
        params.ExpressionAttributeNames = { '#s': 'status' };
        params.ExpressionAttributeValues[':status'] = dbStatuses[0];
      }
      const result = await dynamo.send(new QueryCommand(params));
      items = result.Items || [];
      // Filter in-memory if multiple DB statuses map to one frontend status
      if (dbStatuses && dbStatuses.length > 1) {
        items = items.filter(o => dbStatuses.includes(o.status));
      }
    }
    if (status && cliente_id) {
      const dbStatuses = STATUS_TO_DB[status] || [status];
      items = items.filter(o => dbStatuses.includes(o.status));
    }

    const total = items.length;
    const start = (Number(page) - 1) * Number(limit);
    const pageItems = items.slice(start, start + Number(limit));

    // Resolve client names for items that don't have clientName
    const clienteIds = [...new Set(pageItems.filter(i => i.cliente_id && !i.clientName && !i.nome_completo && !i.cliente_nome).map(i => i.cliente_id))];
    const clienteNomes = {};
    const TENANT = process.env.TENANT_ID || 'default';
    for (const cid of clienteIds.slice(0, 20)) {
      try {
        // Try TENANT#<tenant> / CLIENTE#<id> (admin-clientes pattern)
        const clienteResult = await dynamo.send(new GetCommand({
          TableName: TABLE,
          Key: { PK: `TENANT#${TENANT}`, SK: `CLIENTE#${cid}` },
        }));
        if (clienteResult.Item?.nome || clienteResult.Item?.nome_completo) {
          clienteNomes[cid] = clienteResult.Item.nome || clienteResult.Item.nome_completo;
        } else {
          // Fallback: CLIENT#<id> / PROFILE (client-auth pattern)
          const profileResult = await dynamo.send(new GetCommand({
            TableName: TABLE,
            Key: { PK: `CLIENT#${cid}`, SK: 'PROFILE' },
          }));
          if (profileResult.Item?.nome || profileResult.Item?.nome_completo) {
            clienteNomes[cid] = profileResult.Item.nome || profileResult.Item.nome_completo;
          }
        }
      } catch {}
    }

    const data = pageItems.map(item => ({
      ...item,
      clientName: item.clientName || item.nome_completo || item.cliente_nome || clienteNomes[item.cliente_id] || null,
      eventType: item.eventType || item.tipo_evento || item.nome_evento || null,
      eventDate: item.eventDate || item.data_evento || null,
      total: item.total || item.valor_total || 0,
      status: item.status === 'solicitado' ? 'draft'
        : item.status === 'rascunho' ? 'draft'
        : item.status === 'em_revisao' ? 'draft'
        : item.status === 'pronto_enviar' ? 'draft'
        : item.status === 'enviado' ? 'sent'
        : item.status === 'aceito' ? 'accepted'
        : item.status === 'aprovado' ? 'accepted'
        : item.status === 'recusado' ? 'rejected'
        : item.status === 'expirado' ? 'expired'
        : item.status === 'cancelado' ? 'rejected'
        : item.status === 'contrato_gerado' ? 'accepted'
        : (item.status || 'draft'),
      origem_canal: item.origem_canal || null,
    }));

    res.json({ success: true, data, pagination: { page: Number(page), totalPages: Math.ceil(total / Number(limit)), totalItems: total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/orcamentos/:id/editar — retorna orçamento com itens resolvidos do catálogo
router.get('/:id/editar', async (req, res) => {
  try {
    const orcamento = await findOrcamento(req.params.id);
    if (!orcamento) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });

    // Determinar photographerId a partir do contexto do admin autenticado
    const photographerId = req.user?.sub || req.user?.id || null;

    // ─── Buscar catálogo completo (itens + pacotes) ───
    let catalogoItens = [];
    let catalogoPacotes = [];
    if (photographerId) {
      try {
        const [itensRes, pacotesRes] = await Promise.all([
          dynamo.send(new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'ITEM_CATALOGO#' },
          })),
          dynamo.send(new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'PACOTE_CATALOGO#' },
          })),
        ]);
        catalogoItens = (itensRes.Items || []).filter(i => i.ativo !== false);
        catalogoPacotes = (pacotesRes.Items || []).filter(p => p.ativo !== false);
      } catch (catErr) {
        console.error('Erro ao carregar catálogo:', catErr.message);
      }
    }

    // ─── Resolver itens sugeridos pelo cliente ───
    // O cliente pode ter selecionado: pacote_id e servicos_selecionados (array de IDs)
    const itensSugeridos = [];

    // 1) Resolver pacote selecionado
    if (orcamento.pacote_id) {
      const pacote = catalogoPacotes.find(p => p.id === orcamento.pacote_id);
      if (pacote) {
        // Expandir itens do pacote
        const itensDoPacote = (pacote.itens || []).map(ref => {
          const catalogoItem = catalogoItens.find(c => c.id === (ref.item_id || ref.id || ref));
          if (catalogoItem) {
            const valorBase = resolverValorBase(catalogoItem) || catalogoItem.valor_base || 0;
            return {
              item_id: catalogoItem.id,
              nome: catalogoItem.nome,
              descricao: catalogoItem.descricao || '',
              valor_unitario: valorBase,
              valor_sugerido: valorBase,
              quantidade: ref.quantidade || 1,
              tipo: catalogoItem.tipo || 'produto',
              origem: 'pacote',
              pacote_nome: pacote.nome,
              duracao_base: catalogoItem.duracao_base || 0,
              valor_hora_adicional: catalogoItem.valor_hora_adicional || 0,
              snapshot_at: new Date().toISOString(),
            };
          }
          return null;
        }).filter(Boolean);

        // Se o pacote tem desconto embutido, adicionar como linha negativa ou campo separado
        itensSugeridos.push(...itensDoPacote);

        // Adicionar linha do pacote em si se não tiver itens expandidos
        if (itensDoPacote.length === 0) {
          const subtotalPacote = (pacote.itens || []).reduce((s, ref) => {
            const ci = catalogoItens.find(c => c.id === (ref.item_id || ref.id || ref));
            return s + (ci ? (resolverValorBase(ci) || ci.valor_base || 0) * (ref.quantidade || 1) : 0);
          }, 0);
          let valorPacote = subtotalPacote;
          if (pacote.desconto_tipo === 'percentual' && pacote.desconto_valor > 0) {
            valorPacote = subtotalPacote * (1 - pacote.desconto_valor / 100);
          } else if (pacote.desconto_tipo === 'fixo' && pacote.desconto_valor > 0) {
            valorPacote = Math.max(0, subtotalPacote - pacote.desconto_valor);
          }
          itensSugeridos.push({
            item_id: pacote.id,
            nome: pacote.nome,
            descricao: pacote.descricao || '',
            valor_unitario: valorPacote,
            valor_sugerido: valorPacote,
            quantidade: 1,
            tipo: 'pacote',
            origem: 'pacote',
            snapshot_at: new Date().toISOString(),
          });
        }
      }
    }

    // 2) Resolver serviços/produtos selecionados individualmente
    const servicosSelecionados = Array.isArray(orcamento.servicos_selecionados) ? orcamento.servicos_selecionados : [];
    for (const sid of servicosSelecionados) {
      // Evitar duplicar itens que já vieram do pacote
      const jaAdicionado = itensSugeridos.some(i => i.item_id === sid);
      if (jaAdicionado) continue;

      const catalogoItem = catalogoItens.find(c => c.id === sid);
      if (catalogoItem) {
        const valorBase = resolverValorBase(catalogoItem) || catalogoItem.valor_base || 0;
        itensSugeridos.push({
          item_id: catalogoItem.id,
          nome: catalogoItem.nome,
          descricao: catalogoItem.descricao || '',
          valor_unitario: valorBase,
          valor_sugerido: valorBase,
          quantidade: 1,
          tipo: catalogoItem.tipo || 'servico_principal',
          origem: 'cliente',
          duracao_base: catalogoItem.duracao_base || 0,
          valor_hora_adicional: catalogoItem.valor_hora_adicional || 0,
          snapshot_at: new Date().toISOString(),
        });
      }
    }

    // ─── Normalizar cliente ───
    const TENANT = process.env.TENANT_ID || 'default';
    const clienteIdFromPK = orcamento.PK && orcamento.PK.startsWith('CLIENTE#') ? orcamento.PK.replace('CLIENTE#', '') : null;
    const resolvedClienteId = orcamento.cliente_id || clienteIdFromPK;

    if (!orcamento.cliente && resolvedClienteId) {
      // Try TENANT#<tenant> / CLIENTE#<id> pattern (admin-clientes)
      try {
        const clienteResult = await dynamo.send(new GetCommand({
          TableName: TABLE,
          Key: { PK: `TENANT#${TENANT}`, SK: `CLIENTE#${resolvedClienteId}` },
        }));
        const profile = clienteResult.Item;
        if (profile) {
          orcamento.cliente = {
            id: profile.id || resolvedClienteId,
            nome: profile.nome || profile.nome_completo || null,
            email: profile.email || null,
            telefone: profile.telefone || profile.whatsapp_numero || profile.celular || null,
          };
        }
      } catch {}
    }
    // Fallback: try CLIENT#<id> / PROFILE pattern (client-auth)
    if (!orcamento.cliente && resolvedClienteId) {
      try {
        const profileResult = await dynamo.send(new GetCommand({
          TableName: TABLE,
          Key: { PK: `CLIENT#${resolvedClienteId}`, SK: 'PROFILE' },
        }));
        const profile = profileResult.Item;
        if (profile) {
          orcamento.cliente = {
            id: resolvedClienteId,
            nome: profile.nome || profile.nome_completo || null,
            email: profile.email || null,
            telefone: profile.telefone || profile.celular || null,
          };
        }
      } catch {}
    }
    // Fallback: build cliente from flat fields on the orçamento itself
    if (!orcamento.cliente) {
      orcamento.cliente = {
        nome: orcamento.clientName || orcamento.nome_completo || orcamento.cliente_nome || null,
        email: orcamento.cliente_email || orcamento.email || null,
        telefone: orcamento.cliente_telefone || orcamento.telefone || null,
      };
    }

    // Normalize local_evento for frontend
    if (!orcamento.local_evento && orcamento.local) {
      orcamento.local_evento = orcamento.local;
    }

    // Calculate distance for edit page too
    if ((orcamento.local_evento || orcamento.local) && !orcamento.distancia_km) {
      try {
        const tenantCfg = process.env.TENANT_ID || 'default';
        const configResult2 = await dynamo.send(new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: { ':pk': `TENANT#${tenantCfg}`, ':sk': 'CONFIG#' },
        }));
        let empresaEndereco = null;
        let empresaLat = null;
        let empresaLng = null;
        let cepDistancia = null;
        for (const c of (configResult2.Items || [])) {
          if (c.chave === 'endereco' || c.chave === 'endereco_empresa') empresaEndereco = c.valor;
          if (c.chave === 'latitude') empresaLat = Number(c.valor);
          if (c.chave === 'longitude') empresaLng = Number(c.valor);
          if (c.chave === 'cepDistancia') cepDistancia = c.valor;
        }

        // Prioridade: cepDistancia > endereco
        const enderecoEmpresa = cepDistancia
          ? cepDistancia.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2')
          : empresaEndereco;

        if (enderecoEmpresa || (empresaLat && empresaLng)) {
          const eventoEndereco = orcamento.local_evento || orcamento.local;
          const eventoCep = orcamento.endereco?.cep || null;
          const eventoGeo = await geocode(eventoEndereco, eventoCep);

          if (eventoGeo) {
            orcamento.local_lat = eventoGeo.lat;
            orcamento.local_lng = eventoGeo.lng;

            let origemLat = empresaLat;
            let origemLng = empresaLng;
            if (!origemLat || !origemLng) {
              const empresaGeo = await geocode(enderecoEmpresa, null);
              if (empresaGeo) { origemLat = empresaGeo.lat; origemLng = empresaGeo.lng; }
            }

            if (origemLat && origemLng) {
              const dist = await distanceMatrix(origemLat, origemLng, eventoGeo.lat, eventoGeo.lng);
              if (dist) {
                orcamento.distancia_km = dist.distancia_km;
                orcamento.duracao_minutos = dist.duracao_minutos;
              }
            }
          }
        }
      } catch (mapErr) {
        console.error('Erro ao calcular distância (editar):', mapErr.message);
      }
    }

    // ─── Buscar config do tenant para max_desconto ───
    let configTenant = { max_desconto: 30, desconto_avista: 5, taxa_juros: 1.99 };
    if (photographerId) {
      try {
        const tenantRes = await dynamo.send(new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'CONFIG#' },
        }));
        for (const c of (tenantRes.Items || [])) {
          if (c.chave === 'max_desconto') configTenant.max_desconto = Number(c.valor) || 30;
          if (c.chave === 'desconto_avista') configTenant.desconto_avista = Number(c.valor) || 5;
          if (c.chave === 'taxa_juros') configTenant.taxa_juros = Number(c.valor) || 1.99;
        }
      } catch {}
    }

    // ─── Normalizar status ───
    if (orcamento.status === 'solicitado' || orcamento.status === 'aprovado') {
      orcamento.status = orcamento.status === 'aprovado' ? 'aceito' : 'rascunho';
    }

    res.json({
      success: true,
      data: {
        orcamento,
        itens_sugeridos: itensSugeridos,
        catalogo: {
          itens: catalogoItens.map(i => ({
            id: i.id,
            nome: i.nome,
            descricao: i.descricao || '',
            tipo: i.tipo || 'servico_principal',
            valor_base: resolverValorBase(i) || i.valor_base || 0,
            duracao_base: i.duracao_base || 0,
            valor_hora_adicional: i.valor_hora_adicional || 0,
          })),
          pacotes: catalogoPacotes.map(p => {
            // Calcular valor do pacote a partir dos itens
            const subtotal = (p.itens || []).reduce((s, ref) => {
              const ci = catalogoItens.find(c => c.id === (ref.item_id || ref.id || ref));
              return s + (ci ? (resolverValorBase(ci) || ci.valor_base || 0) * (ref.quantidade || 1) : 0);
            }, 0);
            let valorPacote = subtotal;
            if (p.desconto_tipo === 'percentual' && p.desconto_valor > 0) {
              valorPacote = subtotal * (1 - p.desconto_valor / 100);
            } else if (p.desconto_tipo === 'fixo' && p.desconto_valor > 0) {
              valorPacote = Math.max(0, subtotal - p.desconto_valor);
            }
            return {
              id: p.id,
              nome: p.nome,
              descricao: p.descricao || '',
              valor_base: valorPacote,
              itens: (p.itens || []).map(ref => {
                const ci = catalogoItens.find(c => c.id === (ref.item_id || ref.id || ref));
                return { item_id: ref.item_id || ref.id || ref, nome: ci?.nome || ref.nome || '', quantidade: ref.quantidade || 1 };
              }),
              desconto_tipo: p.desconto_tipo || '',
              desconto_valor: p.desconto_valor || 0,
            };
          }),
        },
        config: configTenant,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/orcamentos/:id
router.get('/:id', async (req, res) => {
  try {
    const orcamento = await findOrcamento(req.params.id);
    if (!orcamento) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });

    // Normalize: ensure 'cliente' object exists for OrcamentoDetalhe.jsx
    const TENANT = process.env.TENANT_ID || 'default';
    const clienteIdFromPK = orcamento.PK && orcamento.PK.startsWith('CLIENTE#') ? orcamento.PK.replace('CLIENTE#', '') : null;
    const resolvedClienteId = orcamento.cliente_id || clienteIdFromPK;

    if (!orcamento.cliente && resolvedClienteId) {
      // Try TENANT#<tenant> / CLIENTE#<id> pattern (admin-clientes)
      try {
        const clienteResult = await dynamo.send(new GetCommand({
          TableName: TABLE,
          Key: { PK: `TENANT#${TENANT}`, SK: `CLIENTE#${resolvedClienteId}` },
        }));
        const profile = clienteResult.Item;
        if (profile) {
          orcamento.cliente = {
            id: profile.id || resolvedClienteId,
            nome: profile.nome || profile.nome_completo || null,
            email: profile.email || null,
            telefone: profile.telefone || profile.whatsapp_numero || profile.celular || null,
          };
        }
      } catch {}
    }
    // Fallback: try CLIENT#<id> / PROFILE pattern (client-auth)
    if (!orcamento.cliente && resolvedClienteId) {
      try {
        const profileResult = await dynamo.send(new GetCommand({
          TableName: TABLE,
          Key: { PK: `CLIENT#${resolvedClienteId}`, SK: 'PROFILE' },
        }));
        const profile = profileResult.Item;
        if (profile) {
          orcamento.cliente = {
            id: resolvedClienteId,
            nome: profile.nome || profile.nome_completo || null,
            email: profile.email || null,
            telefone: profile.telefone || profile.celular || null,
          };
        }
      } catch {}
    }
    // Fallback: build cliente from flat fields on the orçamento itself
    if (!orcamento.cliente) {
      orcamento.cliente = {
        nome: orcamento.clientName || orcamento.nome_completo || orcamento.cliente_nome || null,
        email: orcamento.cliente_email || orcamento.email || null,
        telefone: orcamento.cliente_telefone || orcamento.telefone || null,
      };
    }

    // Normalize local_evento for MapEmbed (field is stored as 'local' from client form)
    if (!orcamento.local_evento && orcamento.local) {
      orcamento.local_evento = orcamento.local;
    }

    // Calculate distance from company address to event location if not already cached
    if ((orcamento.local_evento || orcamento.local) && !orcamento.distancia_km) {
      try {
        // Get company address from config
        const tenantCfg = process.env.TENANT_ID || 'default';
        const configResult = await dynamo.send(new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: { ':pk': `TENANT#${tenantCfg}`, ':sk': 'CONFIG#' },
        }));
        let empresaEndereco = null;
        let empresaLat = null;
        let empresaLng = null;
        let cepDistancia = null;
        for (const c of (configResult.Items || [])) {
          if (c.chave === 'endereco' || c.chave === 'endereco_empresa') empresaEndereco = c.valor;
          if (c.chave === 'latitude') empresaLat = Number(c.valor);
          if (c.chave === 'longitude') empresaLng = Number(c.valor);
          if (c.chave === 'cepDistancia') cepDistancia = c.valor;
        }

        // Prioridade: cepDistancia > endereco
        const enderecoEmpresa = cepDistancia
          ? cepDistancia.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2')
          : empresaEndereco;

        if (enderecoEmpresa || (empresaLat && empresaLng)) {
          const eventoEndereco = orcamento.local_evento || orcamento.local;

          // Geocode the event location
          const eventoCep = orcamento.endereco?.cep || null;
          const eventoGeo = await geocode(eventoEndereco, eventoCep);

          if (eventoGeo) {
            orcamento.local_lat = eventoGeo.lat;
            orcamento.local_lng = eventoGeo.lng;

            // Get company coordinates
            let origemLat = empresaLat;
            let origemLng = empresaLng;
            if (!origemLat || !origemLng) {
              const empresaGeo = await geocode(enderecoEmpresa, null);
              if (empresaGeo) {
                origemLat = empresaGeo.lat;
                origemLng = empresaGeo.lng;
              }
            }

            // Calculate distance
            if (origemLat && origemLng) {
              const dist = await distanceMatrix(origemLat, origemLng, eventoGeo.lat, eventoGeo.lng);
              if (dist) {
                orcamento.distancia_km = dist.distancia_km;
                orcamento.duracao_minutos = dist.duracao_minutos;
                orcamento.distancia_texto = dist.distancia_texto;
                orcamento.duracao_texto = dist.duracao_texto;
              }
            }
          }
        }
      } catch (mapErr) {
        // Distance calculation is non-critical, don't block the response
        console.error('Erro ao calcular distância:', mapErr.message);
      }
    }

    // Normalize status: map legacy values so detail page can match
    if (orcamento.status === 'solicitado') {
      orcamento.status = 'rascunho';
    }
    if (orcamento.status === 'aprovado') {
      orcamento.status = 'aceito';
    }

    // Ensure opcoes is an array (detail page expects it)
    if (!orcamento.opcoes && orcamento.itens) {
      orcamento.opcoes = [{
        id: 'default',
        nome: 'Proposta',
        itens_snapshot: Array.isArray(orcamento.itens) ? orcamento.itens : [],
        desconto_tipo: orcamento.desconto_tipo || null,
        desconto_valor: orcamento.desconto_valor || 0,
      }];
    }

    // Ensure titulo exists
    if (!orcamento.titulo) {
      orcamento.titulo = orcamento.title || orcamento.nome_evento || orcamento.tipo_evento || null;
    }

    // Ensure tipo_evento exists (normalize from different field names)
    if (!orcamento.tipo_evento) {
      orcamento.tipo_evento = orcamento.eventType || orcamento.nome_evento || orcamento.tipo || null;
    }

    // Ensure data_evento exists
    if (!orcamento.data_evento) {
      orcamento.data_evento = orcamento.eventDate || null;
    }

    // Ensure valor_total exists
    if (!orcamento.valor_total) {
      orcamento.valor_total = orcamento.total || orcamento.valor || 0;
    }

    // Verificar se já tem contrato vinculado
    try {
      const clienteId = orcamento.cliente_id || (orcamento.PK?.startsWith('CLIENTE#') ? orcamento.PK.replace('CLIENTE#', '') : null);
      if (clienteId) {
        const ctResult = await dynamo.send(new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: { ':pk': `CLIENTE#${clienteId}`, ':sk': 'CONTRATO#' },
        }));
        const contratoVinculado = (ctResult.Items || []).find(c => c.orcamento_id === req.params.id);
        if (contratoVinculado) {
          orcamento.contrato_vinculado = { id: contratoVinculado.id, status: contratoVinculado.status };
        }
      }
    } catch {}

    // Verificar se já tem álbum vinculado
    try {
      const clienteId = orcamento.cliente_id || (orcamento.PK?.startsWith('CLIENTE#') ? orcamento.PK.replace('CLIENTE#', '') : null);
      if (clienteId) {
        const albumResult = await dynamo.send(new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: { ':pk': `CLIENTE#${clienteId}`, ':sk': 'ALBUM#' },
        }));
        const albumVinculado = (albumResult.Items || []).find(a => a.orcamento_id === req.params.id);
        if (albumVinculado) {
          orcamento.album_vinculado = { id: albumVinculado.id, titulo: albumVinculado.titulo, status: albumVinculado.status };
        }
      }
    } catch {}

    res.json({ success: true, data: orcamento });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
  }
});

// POST /api/admin/orcamentos
router.post('/', async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const clienteId = req.body.cliente_id;
    const item = {
      ...req.body, id, status: 'rascunho',
      PK: `CLIENTE#${clienteId}`, SK: `ORCAMENTO#${id}`,
      GSI1PK: 'ORCAMENTO', GSI1SK: `ORCAMENTO#${id}`,
      created: new Date().toISOString(),
    };
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    // ─── Avançar status do cliente automaticamente ───
    if (clienteId) {
      try {
        await registrarEvento({
          cliente_id: clienteId,
          tipo: 'orcamento_criado',
          descricao: `Orçamento criado – ${item.tipo_evento || item.titulo || 'Evento'}`,
          metadata: { orcamento_id: id, valor: item.valor_total || 0 },
        });
        await avancarStatusAutomatico(clienteId, 'orcamento_criado');
      } catch (histErr) {
        console.error('[ORCAMENTO] Erro ao registrar histórico/status:', histErr.message);
      }
    }

    // ─── Criar evento na agenda automaticamente ───
    if (item.data_evento) {
      try {
        // Buscar nome do cliente
        let clienteNome = item.cliente_nome || '';
        let clienteTelefone = '';
        if (clienteId && !clienteNome) {
          const clienteResult = await dynamo.send(new QueryCommand({
            TableName: TABLE,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
            ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${clienteId}` },
          }));
          const cliente = clienteResult.Items?.[0];
          if (cliente) {
            clienteNome = cliente.nome || '';
            clienteTelefone = cliente.whatsapp_numero || cliente.telefone || '';
          }
        }

        const agendaId = crypto.randomUUID();
        const agendaItem = {
          id: agendaId,
          PK: `TENANT#${TENANT}`, SK: `AGENDA#${item.data_evento}#${agendaId}`,
          GSI1PK: 'AGENDA', GSI1SK: `AGENDA#${agendaId}`,
          tipo_evento: item.tipo_evento || item.tipo || 'Sessão',
          cliente_id: clienteId,
          cliente_nome: clienteNome,
          data_evento: item.data_evento,
          horario_inicio: item.horario_inicio || '09:00',
          horario_fim: item.horario_fim || '18:00',
          local: item.local_evento || item.local || '',
          observacoes: `Orçamento #${id} - ${item.titulo || item.descricao || ''}`.trim(),
          orcamento_id: id,
          status: 'pendente',
          sync_status: SYNC_STATUS.PENDENTE,
          created: new Date().toISOString(),
        };
        await dynamo.send(new PutCommand({ TableName: TABLE, Item: agendaItem }));

        // Sincronizar com Google Calendar
        if (features.googleCalendar) {
          try {
            const googleEvent = await criarEvento({
              tipo_evento: agendaItem.tipo_evento,
              cliente_nome: clienteNome,
              data_evento: agendaItem.data_evento,
              horario_inicio: agendaItem.horario_inicio,
              horario_fim: agendaItem.horario_fim,
              local: agendaItem.local,
              observacoes: agendaItem.observacoes,
            });
            await dynamo.send(new UpdateCommand({
              TableName: TABLE,
              Key: { PK: agendaItem.PK, SK: agendaItem.SK },
              UpdateExpression: 'SET google_event_id = :g, sync_status = :s',
              ExpressionAttributeValues: { ':g': googleEvent.id, ':s': SYNC_STATUS.SINCRONIZADO },
            }));
            agendaItem.google_event_id = googleEvent.id;
            agendaItem.sync_status = SYNC_STATUS.SINCRONIZADO;
          } catch (syncError) {
            console.error('[ORCAMENTO] Erro sync Google Calendar:', syncError.message);
          }
        }

        // Salvar referência do evento no orçamento
        await dynamo.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: item.PK, SK: item.SK },
          UpdateExpression: 'SET agenda_evento_id = :aid',
          ExpressionAttributeValues: { ':aid': agendaId },
        }));
        item.agenda_evento_id = agendaId;
      } catch (agendaError) {
        console.error('[ORCAMENTO] Erro ao criar evento na agenda:', agendaError.message);
      }
    }

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/orcamentos/:id
router.put('/:id', async (req, res) => {
  try {
    const orc = await findOrcamento(req.params.id);
    if (!orc) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });

    const updates = req.body;
    const keys = Object.keys(updates);
    const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
    const vals = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));
    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: orc.PK, SK: orc.SK },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
      ReturnValues: 'ALL_NEW',
    }));
    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/orcamentos/:id/enviar
router.post('/:id/enviar', async (req, res) => {
  try {
    const orc = await findOrcamento(req.params.id);
    if (!orc) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: orc.PK, SK: orc.SK },
      UpdateExpression: 'SET #s = :s, enviado_em = :e',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'enviado', ':e': new Date().toISOString() },
      ReturnValues: 'ALL_NEW',
    }));

    // Registrar no histórico e avançar status
    const clienteId = orc.cliente_id || (orc.PK?.startsWith('CLIENTE#') ? orc.PK.replace('CLIENTE#', '') : null);
    if (clienteId) {
      try {
        await registrarEvento({
          cliente_id: clienteId,
          tipo: 'orcamento_enviado',
          descricao: `Orçamento enviado – ${orc.tipo_evento || orc.titulo || 'Evento'}`,
          metadata: { orcamento_id: req.params.id },
        });
        await avancarStatusAutomatico(clienteId, 'orcamento_enviado');
      } catch (histErr) {
        console.error('[ORCAMENTO] Erro ao registrar histórico envio:', histErr.message);
      }
    }

    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/orcamentos/:id/aprovar
router.post('/:id/aprovar', async (req, res) => {
  try {
    const orc = await findOrcamento(req.params.id);
    if (!orc) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: orc.PK, SK: orc.SK },
      UpdateExpression: 'SET #s = :s, aprovado_em = :a',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'aceito', ':a': new Date().toISOString() },
      ReturnValues: 'ALL_NEW',
    }));

    // Registrar no histórico e avançar status para Cliente
    const clienteId = orc.cliente_id || (orc.PK?.startsWith('CLIENTE#') ? orc.PK.replace('CLIENTE#', '') : null);
    if (clienteId) {
      try {
        await registrarEvento({
          cliente_id: clienteId,
          tipo: 'orcamento_aceito',
          descricao: `Orçamento aceito – ${orc.tipo_evento || orc.titulo || 'Evento'}`,
          metadata: { orcamento_id: req.params.id, valor: orc.valor_total || 0 },
        });
        await avancarStatusAutomatico(clienteId, 'orcamento_aceito');
      } catch (histErr) {
        console.error('[ORCAMENTO] Erro ao registrar histórico aprovação:', histErr.message);
      }
    }

    // Atualizar status do evento na agenda para confirmado
    if (orc.agenda_evento_id) {
      try {
        const eventoResult = await dynamo.send(new QueryCommand({
          TableName: TABLE,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
          ExpressionAttributeValues: { ':pk': 'AGENDA', ':sk': `AGENDA#${orc.agenda_evento_id}` },
        }));
        const evento = eventoResult.Items?.[0];
        if (evento) {
          await dynamo.send(new UpdateCommand({
            TableName: TABLE,
            Key: { PK: evento.PK, SK: evento.SK },
            UpdateExpression: 'SET #s = :s',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':s': 'confirmado' },
          }));
        }
      } catch (agendaErr) {
        console.error('[ORCAMENTO] Erro ao confirmar evento na agenda:', agendaErr.message);
      }
    }

    // ═══ GERAR COBRANÇAS AUTOMATICAMENTE ═══
    // Quando orçamento é aceito, gerar parcelas no financeiro
    try {
      const valorTotal = orc.valor_total || orc.total || orc.valor || 0;
      const clienteId = orc.cliente_id || (orc.PK?.startsWith('CLIENTE#') ? orc.PK.replace('CLIENTE#', '') : null);

      if (valorTotal > 0 && clienteId) {
        // Determinar condições de pagamento do orçamento
        const condicoes = orc.condicoes_pagamento || orc.condicoes || {};
        const opcaoEscolhida = orc.opcao_escolhida;

        // Calcular número de parcelas e valor
        let numParcelas = 1;
        let valorParcela = valorTotal;
        let meioPagamento = 'PIX';

        if (condicoes.sem_juros?.ativo && condicoes.sem_juros?.max_parcelas > 1) {
          numParcelas = condicoes.sem_juros.max_parcelas;
          valorParcela = Math.round((valorTotal / numParcelas) * 100) / 100;
        } else if (condicoes.parcelas && condicoes.parcelas > 1) {
          numParcelas = condicoes.parcelas;
          valorParcela = Math.round((valorTotal / numParcelas) * 100) / 100;
        }

        if (condicoes.meio_pagamento) meioPagamento = condicoes.meio_pagamento;

        // Se tem opção escolhida pelo cliente (pode ter valor diferente)
        let valorEfetivo = valorTotal;
        if (opcaoEscolhida !== undefined && orc.opcoes?.length > 0) {
          const opcao = orc.opcoes[opcaoEscolhida] || orc.opcoes.find(o => o.id === opcaoEscolhida);
          if (opcao?.valor_total) valorEfetivo = opcao.valor_total;
        }
        if (valorEfetivo !== valorTotal) {
          valorParcela = Math.round((valorEfetivo / numParcelas) * 100) / 100;
        }

        // Gerar parcelas com vencimentos mensais a partir de hoje
        const now = new Date();
        const { v4: uuidv4Gen } = require('uuid');

        for (let i = 0; i < numParcelas; i++) {
          const cobrancaId = uuidv4Gen();
          const vencimento = new Date(now);
          vencimento.setMonth(vencimento.getMonth() + i);
          // Se cai em dia 29-31 de meses curtos, ajustar para último dia
          if (vencimento.getDate() !== now.getDate()) {
            vencimento.setDate(0); // último dia do mês anterior
          }

          // Ajuste de centavos na última parcela
          let valorParc = valorParcela;
          if (i === numParcelas - 1) {
            valorParc = Math.round(((valorEfetivo || valorTotal) - valorParcela * (numParcelas - 1)) * 100) / 100;
          }

          await dynamo.send(new PutCommand({
            TableName: TABLE,
            Item: {
              PK: `CLIENTE#${clienteId}`,
              SK: `COBRANCA#${cobrancaId}`,
              GSI1PK: 'COBRANCA',
              GSI1SK: `COBRANCA#${cobrancaId}`,
              id: cobrancaId,
              cliente_id: clienteId,
              cliente_nome: orc.cliente_nome || orc.nome_cliente || '',
              orcamento_id: req.params.id,
              evento_nome: orc.tipo_evento || orc.titulo || orc.nome_evento || '',
              valor: valorParc,
              valor_total: valorEfetivo || valorTotal,
              valor_pago: 0,
              parcela: `${i + 1}/${numParcelas}`,
              vencimento: vencimento.toISOString().slice(0, 10),
              status: 'em_aberto',
              meio: meioPagamento,
              origem: 'orcamento_aceito',
              created_at: now.toISOString(),
            },
          }));
        }

        console.log(`[ORCAMENTO] ${numParcelas} cobrança(s) gerada(s) automaticamente para orçamento ${req.params.id} — Total: ${valorEfetivo || valorTotal}`);
      }
    } catch (cobErr) {
      // Não bloquear a aprovação se a geração de cobranças falhar
      console.error('[ORCAMENTO] Erro ao gerar cobranças automáticas:', cobErr.message);
    }

    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/orcamentos/:id/recusar
router.post('/:id/recusar', async (req, res) => {
  try {
    const orc = await findOrcamento(req.params.id);
    if (!orc) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: orc.PK, SK: orc.SK },
      UpdateExpression: 'SET #s = :s, recusado_em = :r',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'recusado', ':r': new Date().toISOString() },
      ReturnValues: 'ALL_NEW',
    }));

    // Registrar no histórico
    const clienteId = orc.cliente_id || (orc.PK?.startsWith('CLIENTE#') ? orc.PK.replace('CLIENTE#', '') : null);
    if (clienteId) {
      try {
        await registrarEvento({
          cliente_id: clienteId,
          tipo: 'orcamento_recusado',
          descricao: `Orçamento recusado – ${orc.tipo_evento || orc.titulo || 'Evento'}`,
          metadata: { orcamento_id: req.params.id },
        });
      } catch (histErr) {
        console.error('[ORCAMENTO] Erro ao registrar histórico recusa:', histErr.message);
      }
    }

    // Excluir evento da agenda e do Google Calendar
    if (orc.agenda_evento_id) {
      try {
        const eventoResult = await dynamo.send(new QueryCommand({
          TableName: TABLE,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
          ExpressionAttributeValues: { ':pk': 'AGENDA', ':sk': `AGENDA#${orc.agenda_evento_id}` },
        }));
        const evento = eventoResult.Items?.[0];
        if (evento) {
          // Excluir do Google Calendar
          if (features.googleCalendar && evento.google_event_id) {
            try {
              await excluirEvento(evento.google_event_id);
            } catch (syncErr) {
              console.error('[ORCAMENTO] Erro ao excluir evento do Google Calendar:', syncErr.message);
            }
          }
          // Excluir da agenda no DynamoDB
          await dynamo.send(new DeleteCommand({
            TableName: TABLE,
            Key: { PK: evento.PK, SK: evento.SK },
          }));
        }
      } catch (agendaErr) {
        console.error('[ORCAMENTO] Erro ao excluir evento da agenda:', agendaErr.message);
      }
    }

    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/orcamentos/:id
router.delete('/:id', async (req, res) => {
  try {
    const orc = await findOrcamento(req.params.id);
    if (!orc) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
    await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: orc.PK, SK: orc.SK } }));
    res.json({ success: true, message: 'Orçamento excluído' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/orcamentos/:id/pdf — Gerar PDF do orçamento
router.post('/:id/pdf', async (req, res) => {
  try {
    const TENANT = req.tenantId || process.env.TENANT_ID || 'default';
    const { id } = req.params;

    // Buscar orçamento
    const orcResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'ORCAMENTO', ':sk': `ORCAMENTO#${id}` },
    }));
    const orc = orcResult.Items?.[0];
    if (!orc) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });

    // Buscar configs empresa
    const configResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'CONFIG#' },
    }));
    const configs = {};
    for (const item of (configResult.Items || [])) {
      if (item.chave && item.valor) configs[item.chave] = item.valor;
    }

    const empresaNome = configs.tradeName || configs.businessName || 'Marcelo Bloise Fotografia';
    const empresaCnpj = configs.cnpj || '';
    const empresaTel = configs.phone || '';
    const empresaEmail = configs.email || '';

    // Montar opções
    const opcoes = orc.opcoes || [];
    let opcoesHtml = '';
    for (const op of opcoes) {
      const itens = (op.itens_snapshot || []).map(i =>
        `<tr><td>${i.nome || i.titulo || ''}</td><td style="text-align:center">${i.quantidade || 1}</td><td style="text-align:right">R$ ${(i.valor_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>`
      ).join('');
      const subtotal = (op.itens_snapshot || []).reduce((s, i) => s + (i.valor_unitario || 0) * (i.quantidade || 1), 0);
      const desconto = op.desconto_tipo === 'pct' ? subtotal * ((op.desconto_valor || 0) / 100) : (op.desconto_valor || 0);
      const total = Math.max(0, subtotal - desconto);
      opcoesHtml += `
        <div style="margin-bottom:20px;border:1px solid #ddd;border-radius:8px;padding:16px;">
          <h3 style="margin:0 0 10px;color:#EA580C;">${op.titulo || op.nome || 'Opção'} ${op.destaque ? '⭐' : ''}</h3>
          ${op.descricao ? `<p style="color:#666;font-size:13px;">${op.descricao}</p>` : ''}
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:10px;">
            <thead><tr style="border-bottom:1px solid #eee;"><th style="text-align:left;padding:6px;">Item</th><th style="text-align:center;padding:6px;">Qtd</th><th style="text-align:right;padding:6px;">Valor</th></tr></thead>
            <tbody>${itens}</tbody>
          </table>
          ${desconto > 0 ? `<p style="color:#666;font-size:12px;margin-top:8px;">Desconto: -R$ ${desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>` : ''}
          <p style="font-size:16px;font-weight:bold;margin-top:10px;color:#EA580C;">Total: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>`;
    }

    const valorTotal = orc.valor_total || opcoes.reduce((max, op) => {
      const sub = (op.itens_snapshot || []).reduce((s, i) => s + (i.valor_unitario || 0) * (i.quantidade || 1), 0);
      const desc = op.desconto_tipo === 'pct' ? sub * ((op.desconto_valor || 0) / 100) : (op.desconto_valor || 0);
      return Math.max(max, sub - desc);
    }, 0);

    const dataEmissao = orc.created ? new Date(orc.created).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Orçamento - ${orc.titulo || ''}</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#333;}
.header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #EA580C;padding-bottom:20px;margin-bottom:30px;}
.header h1{color:#EA580C;margin:0;font-size:22px;}
.info{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px;}
.info-box{background:#f9f9f9;padding:15px;border-radius:8px;}
.info-box h4{margin:0 0 8px;color:#666;font-size:12px;text-transform:uppercase;}
.info-box p{margin:4px 0;font-size:14px;}
.footer{margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center;color:#999;font-size:12px;}
@media print{body{padding:20px;}}</style></head>
<body>
<div class="header">
  <div><h1>${empresaNome}</h1><p style="margin:4px 0;color:#666;font-size:13px;">${empresaTel} | ${empresaEmail}</p></div>
  <div style="text-align:right;"><p style="font-size:12px;color:#666;">ORÇAMENTO</p><p style="font-size:18px;font-weight:bold;color:#EA580C;">#${id.slice(0, 8).toUpperCase()}</p></div>
</div>
<div class="info">
  <div class="info-box"><h4>Cliente</h4><p><strong>${orc.cliente_nome || orc.cliente?.nome || ''}</strong></p><p>${orc.cliente?.email || ''}</p><p>${orc.cliente?.whatsapp || orc.cliente?.telefone || ''}</p></div>
  <div class="info-box"><h4>Detalhes</h4><p><strong>${orc.titulo || orc.tipo_evento || ''}</strong></p><p>Data evento: ${orc.data_evento ? new Date(orc.data_evento + 'T00:00').toLocaleDateString('pt-BR') : 'A definir'}</p><p>Emissão: ${dataEmissao}</p>${orc.validade_dias ? `<p>Validade: ${orc.validade_dias} dias</p>` : ''}</div>
</div>
${orc.descricao ? `<div style="margin-bottom:20px;"><h3 style="color:#333;font-size:15px;">Descrição</h3><p style="color:#666;font-size:14px;line-height:1.6;">${orc.descricao}</p></div>` : ''}
<h3 style="color:#333;font-size:15px;margin-bottom:15px;">Opções</h3>
${opcoesHtml || '<p style="color:#999;">Nenhuma opção cadastrada</p>'}
<div style="text-align:right;margin-top:30px;padding:20px;background:#f9f9f9;border-radius:8px;">
  <p style="font-size:12px;color:#666;">VALOR TOTAL</p>
  <p style="font-size:28px;font-weight:bold;color:#EA580C;margin:5px 0;">R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
</div>
${orc.observacoes ? `<div style="margin-top:20px;"><h4 style="color:#666;font-size:12px;text-transform:uppercase;">Observações</h4><p style="font-size:13px;color:#666;">${orc.observacoes}</p></div>` : ''}
<div class="footer"><p>${empresaNome} | CNPJ: ${empresaCnpj}</p><p>Este orçamento é válido por ${orc.validade_dias || 30} dias a partir da data de emissão.</p></div>
</body></html>`;

    res.json({ success: true, data: { html, url: null } });
  } catch (error) {
    console.error('[PDF] Erro orçamento:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
