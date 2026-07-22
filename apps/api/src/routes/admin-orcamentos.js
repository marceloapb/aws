const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { resolverValorBase } = require('../services/catalogoPrecificacaoService');
const { geocode, distanceMatrix } = require('../services/mapsService');

const router = Router();

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
            ExpressionAttributeValues: { ':pk': `PHOTOGRAPHER#${photographerId}`, ':sk': 'ITEM_CATALOGO#' },
          })),
          dynamo.send(new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: { ':pk': `PHOTOGRAPHER#${photographerId}`, ':sk': 'PACOTE_CATALOGO#' },
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
        for (const c of (configResult2.Items || [])) {
          if (c.chave === 'endereco' || c.chave === 'endereco_empresa') empresaEndereco = c.valor;
          if (c.chave === 'latitude') empresaLat = Number(c.valor);
          if (c.chave === 'longitude') empresaLng = Number(c.valor);
        }

        if (empresaEndereco || (empresaLat && empresaLng)) {
          const eventoEndereco = orcamento.local_evento || orcamento.local;
          const eventoCep = orcamento.endereco?.cep || null;
          const eventoGeo = await geocode(eventoEndereco, eventoCep);

          if (eventoGeo) {
            orcamento.local_lat = eventoGeo.lat;
            orcamento.local_lng = eventoGeo.lng;

            let origemLat = empresaLat;
            let origemLng = empresaLng;
            if (!origemLat || !origemLng) {
              const empresaGeo = await geocode(empresaEndereco, null);
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
          ExpressionAttributeValues: { ':pk': `PHOTOGRAPHER#${photographerId}`, ':sk': 'CONFIG#' },
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
          pacotes: catalogoPacotes.map(p => ({
            id: p.id,
            nome: p.nome,
            descricao: p.descricao || '',
          })),
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
        for (const c of (configResult.Items || [])) {
          if (c.chave === 'endereco' || c.chave === 'endereco_empresa') empresaEndereco = c.valor;
          if (c.chave === 'latitude') empresaLat = Number(c.valor);
          if (c.chave === 'longitude') empresaLng = Number(c.valor);
        }

        if (empresaEndereco || (empresaLat && empresaLng)) {
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
              const empresaGeo = await geocode(empresaEndereco, null);
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

    // Ensure valor_total exists
    if (!orcamento.valor_total) {
      orcamento.valor_total = orcamento.total || orcamento.valor || 0;
    }

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

module.exports = router;
