// ══════════════════════════════════════════════════════════════
// JOBS/WHATSAPP-REMINDER-JOB.JS — Scheduler de lembretes WhatsApp
// ══════════════════════════════════════════════════════════════

import { getPocketbaseClient } from '../config/pocketbase.js';
import { enviarLembreteEvento } from '../services/whatsappService.js';
import { features } from '../config/env.js';

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

export function startWhatsappReminderJob() {
  if (!features.whatsapp) {
    console.log('[WHATSAPP JOB] Feature desabilitada — job não iniciado');
    return;
  }

  console.log('[WHATSAPP JOB] Iniciado — verificando a cada 5 minutos');
  setInterval(verificarLembretes, INTERVAL_MS);
  verificarLembretes(); // Executar imediatamente
}

async function verificarLembretes() {
  try {
    const pb = await getPocketbaseClient();
    const agora = new Date();

    // Buscar eventos com lembrete ativo e não enviado
    const eventos = await pb.collection('agenda').getFullList({
      filter: `aviso_whatsapp_ativo = true && lembrete_enviado = false && status = "ocupada" && data_evento >= "${agora.toISOString().split('T')[0]}"`,
      expand: 'cliente_id',
    });

    for (const evento of eventos) {
      const antecedencia = evento.antecedencia_minutos || 60;
      const dataEvento = new Date(`${evento.data_evento}T${evento.horario_inicio || '09:00'}:00`);
      const momentoEnvio = new Date(dataEvento.getTime() - antecedencia * 60 * 1000);

      if (agora >= momentoEnvio) {
        const cliente = evento.expand?.cliente_id;
        if (cliente?.whatsapp_numero) {
          const resultado = await enviarLembreteEvento(
            cliente.whatsapp_numero,
            cliente.nome,
            evento.tipo_evento,
            new Date(evento.data_evento).toLocaleDateString('pt-BR'),
            evento.horario_inicio || '09:00'
          );

          if (resultado.success) {
            await pb.collection('agenda').update(evento.id, { lembrete_enviado: true });
            console.log(`[WHATSAPP JOB] Lembrete enviado para ${cliente.nome}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('[WHATSAPP JOB] Erro:', error.message);
  }
}

export default { startWhatsappReminderJob };
