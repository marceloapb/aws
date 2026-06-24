// ══════════════════════════════════════════════════════════════
// JOBS/INSTAGRAM-PUBLISHER-JOB.JS — Auto-publicação Instagram
// ══════════════════════════════════════════════════════════════

import { getPocketbaseClient } from '../config/pocketbase.js';
import { publicarCarrossel, publicarFotoUnica } from '../services/instagramService.js';
import { features } from '../config/env.js';
import { INSTAGRAM_STATUS } from '../config/constants.js';

const INTERVAL_MS = 2 * 60 * 1000; // 2 minutos

export function startInstagramPublisherJob() {
  if (!features.instagram) {
    console.log('[INSTAGRAM JOB] Feature desabilitada — job não iniciado');
    return;
  }

  console.log('[INSTAGRAM JOB] Iniciado — verificando a cada 2 minutos');
  setInterval(processarPublicacoes, INTERVAL_MS);
  processarPublicacoes();
}

async function processarPublicacoes() {
  try {
    const pb = await getPocketbaseClient();
    const agora = new Date().toISOString();

    // Buscar publicações agendadas que já passaram do horário
    const publicacoes = await pb.collection('instagram_publicacoes').getFullList({
      filter: `status = "${INSTAGRAM_STATUS.AGENDADO}" && agendado_para <= "${agora}"`,
      sort: 'agendado_para',
    });

    for (const pub of publicacoes) {
      try {
        // Marcar como publicando
        await pb.collection('instagram_publicacoes').update(pub.id, {
          status: INSTAGRAM_STATUS.PUBLICANDO,
        });

        // Buscar URLs das fotos
        const fotos = await pb.collection('fotos').getFullList({
          filter: pub.fotos_ids.map((id) => `id = "${id}"`).join(' || '),
        });

        const fotosKeys = fotos.map((f) => f.s3_key);
        let resultado;

        if (fotosKeys.length === 1) {
          resultado = await publicarFotoUnica(fotosKeys[0], pub.caption || '');
        } else {
          resultado = await publicarCarrossel(fotosKeys, pub.caption || '');
        }

        if (resultado.success) {
          await pb.collection('instagram_publicacoes').update(pub.id, {
            status: INSTAGRAM_STATUS.PUBLICADO,
            publicado_em: new Date().toISOString(),
            instagram_post_id: resultado.instagram_post_id,
            instagram_permalink: resultado.instagram_permalink,
            container_ids: resultado.container_ids || [],
          });
          console.log(`[INSTAGRAM JOB] Publicado: ${pub.id}`);
        } else {
          throw new Error(resultado.error || 'Erro desconhecido');
        }
      } catch (error) {
        await pb.collection('instagram_publicacoes').update(pub.id, {
          status: INSTAGRAM_STATUS.ERRO,
          erro_mensagem: error.message,
        });
        console.error(`[INSTAGRAM JOB] Erro pub ${pub.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('[INSTAGRAM JOB] Erro geral:', error.message);
  }
}

export default { startInstagramPublisherJob };
