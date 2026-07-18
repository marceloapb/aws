const { SSMClient, GetParametersByPathCommand } = require('@aws-sdk/client-ssm');

let cachedParams = null;

async function loadParams() {
  if (cachedParams) return cachedParams;
  if (process.env.IS_LOCAL === 'true') {
    const dotenv = require('dotenv');
    dotenv.config();
    cachedParams = process.env;
    return cachedParams;
  }
  const ssm = new SSMClient({ region: 'us-east-1' });
  const path = process.env.SSM_PREFIX ? `${process.env.SSM_PREFIX}/` : `/mbf/${process.env.STAGE || 'prod'}/`;
  const result = await ssm.send(new GetParametersByPathCommand({
    Path: path, WithDecryption: true, Recursive: true,
  }));
  cachedParams = {};
  for (const p of result.Parameters) {
    const key = p.Name.split('/').pop();
    cachedParams[key] = p.Value;
  }
  return cachedParams;
}

// Compatibilidade: valores não-sensíveis ainda disponíveis de process.env
const env = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  AWS_REGION: process.env.AWS_REGION || 'sa-east-1',
  DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || 'horizons',
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || '',
  STAGE: process.env.STAGE || 'prod',
};

const features = {
  whatsapp: false,   // será reavaliado após loadParams()
  instagram: false,
  googleCalendar: false,
  email: false,
};

async function initFeatures() {
  const p = await loadParams();
  features.whatsapp = !!(p.WHATSAPP_ACCESS_TOKEN && p.WHATSAPP_PHONE_NUMBER_ID);
  features.instagram = !!(p.INSTAGRAM_ACCESS_TOKEN && p.INSTAGRAM_BUSINESS_ACCOUNT_ID);
  features.googleCalendar = !!(p.GOOGLE_CLIENT_ID && p.GOOGLE_CLIENT_SECRET);
  features.email = !!p.SES_FROM_EMAIL;
}

module.exports = { loadParams, env, features, initFeatures };
