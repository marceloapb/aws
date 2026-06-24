// ══════════════════════════════════════════════════════════════
// JOBS/ALBUM-RETENTION-JOB.JS — Lifecycle de retenção de álbuns
// ══════════════════════════════════════════════════════════════

import { getPocketbaseClient } from '../config/pocketbase.js';
import { deleteAlbumFolder } from '../services/s3Service.js';
import { ALBUM_STATUS } from '../config/constants.js';

const INTERVAL_MS = 60 * 60 * 1000; // 1 hora
const DIAS_EXPIRACAO = 30;
const DIAS_GRACA = 7;

export function startAlbumRetentionJob() {
  console.log('[ALBUM RETENTION] Iniciado — verificando a cada 1 hora');
  setInterval(processarRetencao, INTERVAL_MS);
  processarRetencao(); // Executar imediatamente
}

async function processarRetencao() {
  try {
    const pb = await getPocketbaseClient();
    const hoje = new Date();

    // 1. Álbuns ativos que expiraram (30 dias após entrega)
    const albunsAtivos = await pb.collection('albuns').getFullList({
      filter: `status = "${ALBUM_STATUS.ATIVO}" && protegido = false && data_expiracao != "" && data_expiracao <= "${hoje.toISOString().split('T')[0]}"`,
    });

    for (const album of albunsAtivos) {
      await pb.collection('albuns').update(album.id, { status: ALBUM_STATUS.EXPIRADO });
      console.log(`[ALBUM RETENTION] Álbum ${album.titulo} → expirado`);
    }

    // 2. Álbuns expirados que entraram no período de graça (7 dias)
    const dataGraca = new Date(hoje.getTime() - DIAS_GRACA * 24 * 60 * 60 * 1000);
    const albunsExpirados = await pb.collection('albuns').getFullList({
      filter: `status = "${ALBUM_STATUS.EXPIRADO}" && protegido = false && data_expiracao <= "${dataGraca.toISOString().split('T')[0]}"`,
    });

    for (const album of albunsExpirados) {
      await pb.collection('albuns').update(album.id, { status: ALBUM_STATUS.EM_GRACA });
      console.log(`[ALBUM RETENTION] Álbum ${album.titulo} → em_graca`);
    }

    // 3. Álbuns em graça prontos para exclusão
    const dataExclusao = new Date(hoje.getTime() - (DIAS_GRACA * 2) * 24 * 60 * 60 * 1000);
    const albunsGraca = await pb.collection('albuns').getFullList({
      filter: `status = "${ALBUM_STATUS.EM_GRACA}" && protegido = false && data_expiracao <= "${dataExclusao.toISOString().split('T')[0]}"`,
    });

    for (const album of albunsGraca) {
      await pb.collection('albuns').update(album.id, { status: ALBUM_STATUS.PRONTO_EXCLUSAO });
      console.log(`[ALBUM RETENTION] Álbum ${album.titulo} → pronto_exclusao`);
    }

    // 4. Deletar álbuns prontos para exclusão (S3 + registros)
    const albunsParaDeletar = await pb.collection('albuns').getFullList({
      filter: `status = "${ALBUM_STATUS.PRONTO_EXCLUSAO}"`,
    });

    for (const album of albunsParaDeletar) {
      try {
        await deleteAlbumFolder(album.id);

        // Deletar fotos do banco
        const fotos = await pb.collection('fotos').getFullList({ filter: `album_id = "${album.id}"` });
        for (const foto of fotos) {
          await pb.collection('fotos').delete(foto.id);
        }

        await pb.collection('albuns').delete(album.id);
        console.log(`[ALBUM RETENTION] Álbum ${album.titulo} DELETADO do S3 e banco`);
      } catch (error) {
        console.error(`[ALBUM RETENTION] Erro ao deletar ${album.titulo}:`, error.message);
      }
    }
  } catch (error) {
    console.error('[ALBUM RETENTION] Erro geral:', error.message);
  }
}

export default { startAlbumRetentionJob };
