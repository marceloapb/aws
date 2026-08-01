/**
 * Middleware que sanitiza respostas JSON para:
 * 1. Remover campos internos do DynamoDB (PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK)
 * 2. Sanitizar error.message em produção
 */

const INTERNAL_KEYS = ['PK', 'SK', 'GSI1PK', 'GSI1SK', 'GSI2PK', 'GSI2SK'];

function stripInternalKeys(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(stripInternalKeys);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      if (INTERNAL_KEYS.includes(key)) continue;
      // Recursivo para objetos aninhados (mas não em arrays de primitivos)
      clean[key] = typeof value === 'object' ? stripInternalKeys(value) : value;
    }
    return clean;
  }
  return obj;
}

function responseSanitizer(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    if (body && typeof body === 'object') {
      // Strip internal DynamoDB keys
      if (body.data) {
        body.data = stripInternalKeys(body.data);
      }

      // Sanitizar error messages em produção
      if (process.env.NODE_ENV === 'production' || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        if (!body.success && body.message && res.statusCode >= 500) {
          body.message = 'Erro interno do servidor';
        }
      }
    }
    return originalJson(body);
  };

  next();
}

module.exports = responseSanitizer;
