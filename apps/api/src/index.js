const app = require('./app');
const { env } = require('./config/env');
const { startWhatsappReminderJob } = require('./jobs/whatsappReminderJob');
const { startAlbumRetentionJob } = require('./jobs/albumRetentionJob');
const { startInstagramPublisherJob } = require('./jobs/instagramPublisherJob');
const { startCalendarSyncJob } = require('./jobs/calendarSyncJob');
const { startBackupJob } = require('./jobs/backupJob');

app.listen(env.PORT, () => {
  console.log(`\n  🎯 Horizons Photography System\n  📡 Port: ${env.PORT} | Env: ${env.NODE_ENV}\n`);
  startWhatsappReminderJob();
  startAlbumRetentionJob();
  startInstagramPublisherJob();
  startCalendarSyncJob();
  startBackupJob();
});

module.exports = app;
