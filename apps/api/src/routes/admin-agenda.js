// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-AGENDA.JS — CRUD de agendamentos
// ══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';
import { criarEvento, atualizarEvento, excluirEvento } from '../services/googleCalendarService.js';
import { features } from '../config/env.js';
import { SYNC_STATUS } from '../config/constants.js';

const router = Router();

// GET /api/admin/agenda — Listar eventos
router.get('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const { data_inicio, data_fim, status, tipo_evento, page = 1, limit = 50 } = req.query;

    let filter = '';
    const filters = [];
    if (data_inicio) filters.push(`data_evento >= "${data_inicio}"`);
    if (data_fim) filters.push(`data_evento <= "${data_fim}"`);
    if (status) filters.push(`status = "${status}"`);
    if (tipo_evento) filters.push(`tipo_evento = "${tipo_evento}"`);
    filter = filters.join(' && ');

    const result = await pb.collection('agenda').getList(Number(page), Number(limit), {
      filter,
      sort: 'data_evento,horario_inicio',
      expand: 'cliente_id',
    });

    res.json({ success: true, data: result.items, pagination: { page: result.page, totalPages: result.totalPages, totalItems: result.totalItems } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/agenda/:id — Detalhe do evento
router.get('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const evento = await pb.collection('agenda').getOne(req.params.id, { expand: 'cliente_id' });
    res.json({ success: true, data: evento });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Evento não encontrado' });
  }
});

// POST /api/admin/agenda — Criar evento
router.post('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const dados = req.body;

    // Criar no PocketBase
    const evento = await pb.collection('agenda').create({
      ...dados,
      sync_status: SYNC_STATUS.PENDENTE,
    });

    // Sincronizar com Google Calendar
    if (features.googleCalendar) {
      try {
        const cliente = dados.cliente_id
          ? await pb.collection('clientes').getOne(dados.cliente_id)
          : null;

        const googleEvent = await criarEvento({
          ...dados,
          cliente_nome: cliente?.nome,
          cliente_telefone: cliente?.whatsapp_numero,
        });

        await pb.collection('agenda').update(evento.id, {
          google_event_id: googleEvent.id,
          sync_status: SYNC_STATUS.SINCRONIZADO,
        });
      } catch (syncError) {
        console.error('[AGENDA] Erro sync Google Calendar:', syncError.message);
        await pb.collection('agenda').update(evento.id, {
          sync_status: SYNC_STATUS.ERRO,
          erro: syncError.message,
        });
      }
    }

    res.status(201).json({ success: true, data: evento });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/agenda/:id — Atualizar evento
router.put('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const dados = req.body;

    const evento = await pb.collection('agenda').update(req.params.id, {
      ...dados,
      sync_status: SYNC_STATUS.PENDENTE,
    });

    // Sincronizar com Google Calendar
    if (features.googleCalendar && evento.google_event_id) {
      try {
        const cliente = evento.cliente_id
          ? await pb.collection('clientes').getOne(evento.cliente_id)
          : null;

        await atualizarEvento(evento.google_event_id, {
          ...dados,
          cliente_nome: cliente?.nome,
          cliente_telefone: cliente?.whatsapp_numero,
        });

        await pb.collection('agenda').update(evento.id, {
          sync_status: SYNC_STATUS.SINCRONIZADO,
        });
      } catch (syncError) {
        console.error('[AGENDA] Erro sync update:', syncError.message);
      }
    }

    res.json({ success: true, data: evento });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/agenda/:id — Excluir evento
router.delete('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const evento = await pb.collection('agenda').getOne(req.params.id);

    // Excluir do Google Calendar
    if (features.googleCalendar && evento.google_event_id) {
      try {
        await excluirEvento(evento.google_event_id);
      } catch (syncError) {
        console.error('[AGENDA] Erro ao excluir do Google:', syncError.message);
      }
    }

    await pb.collection('agenda').delete(req.params.id);
    res.json({ success: true, message: 'Evento excluído' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
