// ══════════════════════════════════════════════════════════════
// CONFIG/ENV.JS — Validação e exportação de variáveis de ambiente
// ══════════════════════════════════════════════════════════════

const required = [
  'JWT_SECRET',
  'PB_URL',
  'PB_ADMIN_EMAIL',
  'PB_ADMIN_PASSWORD',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'S3_BUCKET',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ Variáveis de ambiente obrigatórias faltando: ${missing.join(', ')}`);
  process.exit(1);
}

export const env = {
  // Servidor
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Auth
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // PocketBase
  PB_URL: process.env.PB_URL,
  PB_ADMIN_EMAIL: process.env.PB_ADMIN_EMAIL,
  PB_ADMIN_PASSWORD: process.env.PB_ADMIN_PASSWORD,

  // AWS
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_BACKUP_BUCKET: process.env.S3_BACKUP_BUCKET || 'horizons-backups',
  CLOUDFRONT_DOMAIN: process.env.CLOUDFRONT_DOMAIN || '',
  CLOUDFRONT_KEY_PAIR_ID: process.env.CLOUDFRONT_KEY_PAIR_ID || '',
  CLOUDFRONT_PRIVATE_KEY_PATH: process.env.CLOUDFRONT_PRIVATE_KEY_PATH || '',

  // Google Calendar
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || '',
  GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID || 'primary',

  // WhatsApp
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN || '',
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || '',
  WHATSAPP_ANTECEDENCIA_PADRAO: parseInt(process.env.WHATSAPP_ANTECEDENCIA_PADRAO || '60', 10),

  // Instagram
  INSTAGRAM_ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN || '',
  INSTAGRAM_BUSINESS_ACCOUNT_ID: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '',

  // Email
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'ses',
  SES_REGION: process.env.SES_REGION || 'sa-east-1',
  SES_FROM_EMAIL: process.env.SES_FROM_EMAIL || '',
  SES_FROM_NAME: process.env.SES_FROM_NAME || 'Horizons Fotografia',

  // Gateways
  ASAAS_API_KEY: process.env.ASAAS_API_KEY || '',
  ASAAS_ENVIRONMENT: process.env.ASAAS_ENVIRONMENT || 'production',
  MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  PAGARME_API_KEY: process.env.PAGARME_API_KEY || '',
  PAGBANK_TOKEN: process.env.PAGBANK_TOKEN || '',
  PICPAY_TOKEN: process.env.PICPAY_TOKEN || '',
  SUMUP_API_KEY: process.env.SUMUP_API_KEY || '',
  BANCO_INTER_CLIENT_ID: process.env.BANCO_INTER_CLIENT_ID || '',
  BANCO_INTER_CLIENT_SECRET: process.env.BANCO_INTER_CLIENT_SECRET || '',
  STONE_API_KEY: process.env.STONE_API_KEY || '',
  INFINITEPAY_API_KEY: process.env.INFINITEPAY_API_KEY || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  // Backup
  BACKUP_CRON: process.env.BACKUP_CRON || '0 2 * * *',
  BACKUP_RETENTION_DAYS: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
};

// Feature flags baseados na presença de variáveis
export const features = {
  googleCalendar: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI),
  whatsapp: !!(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_VERIFY_TOKEN),
  instagram: !!(env.INSTAGRAM_ACCESS_TOKEN && env.INSTAGRAM_BUSINESS_ACCOUNT_ID),
  email: !!(env.SES_FROM_EMAIL),
  cloudfront: !!(env.CLOUDFRONT_DOMAIN && env.CLOUDFRONT_KEY_PAIR_ID),
  stripe: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),
};

export default env;
