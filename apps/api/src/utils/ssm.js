const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const logger = require('../config/logger');

const ssmClient = new SSMClient({ region: 'us-east-1' });

/**
 * Busca parâmetro do SSM Parameter Store
 * @param {string} name - Path do parâmetro
 * @param {boolean} withDecryption - Se deve descriptografar (SecureString)
 * @returns {string} Valor do parâmetro
 */
async function getParameter(name, withDecryption = false) {
  try {
    const result = await ssmClient.send(new GetParameterCommand({
      Name: name,
      WithDecryption: withDecryption
    }));
    return result.Parameter.Value;
  } catch (error) {
    logger.error({ action: 'ssm_get_parameter_error', name, error: error.message });
    throw error;
  }
}

module.exports = { getParameter };

