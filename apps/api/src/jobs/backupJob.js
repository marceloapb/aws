// ══════════════════════════════════════════════════════════════
// JOBS/BACKUP-JOB.JS — Backup automático do PocketBase
// ══════════════════════════════════════════════════════════════

import { execSync } from 'child_process';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { getPocketbaseClient } from '../config/pocketbase.js';
import { uploadBackup } from '../services/s3Service.js';
import { env } from '../config/env.js';

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas

export function startBackupJob() {
  console.log('[BACKUP JOB] Iniciado — backup diário às 02:00');

  // Calcular tempo até as 02:00
  const agora = new Date();
  const proxima = new Date(agora);
  proxima.setHours(2, 0, 0, 0);
  if (proxima <= agora) proxima.setDate(proxima.getDate() + 1);

  const delay = proxima.getTime() - agora.getTime();
  setTimeout(() => {
    executarBackup();
    setInterval(executarBackup, INTERVAL_MS);
  }, delay);
}

async function executarBackup() {
  const pb = await getPocketbaseClient();
  const inicio = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `horizons-backup-${timestamp}.tar.gz`;

  let backupRecord;

  try {
    // Criar registro de backup
    backupRecord = await pb.collection('backups').create({
      tipo: 'automatico',
      status: 'em_andamento',
      arquivo_nome: filename,
    });

    // Compactar dados do PocketBase
    const pbDataPath = process.env.PB_DATA_PATH || '/app/pb_data';
    const tempPath = `/tmp/${filename}`;

    execSync(`tar -czf ${tempPath} -C ${pbDataPath} .`, { timeout: 120000 });

    // Ler e fazer upload para S3
    const buffer = readFileSync(tempPath);
    const { s3_key } = await uploadBackup(buffer, filename);

    // Atualizar registro
    await pb.collection('backups').update(backupRecord.id, {
      status: 'concluido',
      s3_key,
      tamanho_bytes: buffer.length,
      duracao_ms: Date.now() - inicio,
    });

    // Limpar arquivo temporário
    if (existsSync(tempPath)) unlinkSync(tempPath);

    console.log(`[BACKUP JOB] Concluído: ${filename} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
  } catch (error) {
    console.error('[BACKUP JOB] Erro:', error.message);

    if (backupRecord) {
      await pb.collection('backups').update(backupRecord.id, {
        status: 'erro',
        erro_mensagem: error.message,
        duracao_ms: Date.now() - inicio,
      });
    }
  }
}

export const handler = async () => { await executarBackup(); };

export default { handler };
