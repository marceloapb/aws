import app from './app.js';
import { env } from './config/env.js';
import { startWhatsappReminderJob } from './jobs/whatsappReminderJob.js';
import { startAlbumRetentionJob } from './jobs/albumRetentionJob.js';
import { startInstagramPublisherJob } from './jobs/instagramPublisherJob.js';
import { startCalendarSyncJob } from './jobs/calendarSyncJob.js';
import { startBackupJob } from './jobs/backupJob.js';

app.listen(env.PORT, () => {
  console.log(`\n  🎯 Horizons Photography System\n  📡 Port: ${env.PORT} | Env: ${env.NODE_ENV}\n`);
  startWhatsappReminderJob();
  startAlbumRetentionJob();
  startInstagramPublisherJob();
  startCalendarSyncJob();
  startBackupJob();
});

export default app;
