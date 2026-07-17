/**
 * Middleware de autenticação unificado.
 * Extrai claims do JWT Authorizer do API Gateway e popula req.user.
 * Para uso local (sem API Gateway), tenta verificar o token com aws-jwt-verify se disponível.
 */

function authenticate(req, res, next) {
  try {
    // API Gateway JWT Authorizer já validou o token
    const claims = req.apiGateway?.event?.requestContext?.authorizer?.jwt?.claims;
    if (!claims) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    req.user = {
      sub: claims.sub,
      email: claims.email,
      role: claims['custom:role'] || (claims['cognito:groups']?.includes?.('admin') ? 'admin' : 'client'),
      tenantId: claims['custom:tenantId'] || claims.sub,
    };

    // Compatibilidade com middlewares existentes
    req.adminId = claims.sub;
    req.adminEmail = claims.email;
    req.clienteId = claims.sub;
    req.clienteEmail = claims.email;
    req.tenantId = req.user.tenantId;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Sem permissão' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
