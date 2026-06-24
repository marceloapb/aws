import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const client = new SSMClient({});
const cache = {};

export async function getParam(name, decrypt = true) {
  if (cache[name]) return cache[name];
  const { Parameter } = await client.send(
    new GetParameterCommand({ Name: name, WithDecryption: decrypt })
  );
  cache[name] = Parameter.Value;
  return Parameter.Value;
}

export async function getWhatsAppConfig() {
  const prefix = process.env.SSM_PREFIX || '/mbf/prod';
  const [accessToken, phoneNumberId, verifyToken] = await Promise.all([
    getParam(`${prefix}/WHATSAPP_ACCESS_TOKEN`),
    getParam(`${prefix}/WHATSAPP_PHONE_NUMBER_ID`, false),
    getParam(`${prefix}/WHATSAPP_VERIFY_TOKEN`),
  ]);
  return { accessToken, phoneNumberId, verifyToken };
}
