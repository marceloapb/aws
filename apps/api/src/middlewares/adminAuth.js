function adminAuth(req, res, next) {
  try {
    // O API Gateway já validou o JWT. Aqui só decodificamos o payload.
    const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) return res.status(401).json({ success: false, message: 'Não autenticado' });

    // Decodifica payload do JWT (base64url) - já validado pelo API Gateway Authorizer
    const parts = token.split('.');
    if (parts.length !== 3) return res.status(401).json({ success: false, message: 'Token malformado' });

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

    const groups = payload['cognito:groups'] || [];
    const groupList = Array.isArray(groups) ? groups : [groups];
    if (!groupList.includes('admin')) {
      return res.status(403).json({ success: false, message: 'Acesso restrito a administradores' });
    }

    req.adminId = payload.sub;
    req.adminEmail = payload.email;
    req.user = { sub: payload.sub, email: payload.email, role: 'admin' };
    req.tenantId = payload['custom:tenantId'] || payload.sub;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token inválido' });
  }
}

module.exports = adminAuth;
