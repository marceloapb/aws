export function adminAuth(req, res, next) {
  try {
    const claims = req.apiGateway?.event?.requestContext?.authorizer?.jwt?.claims;
    if (!claims) return res.status(401).json({ success: false, message: 'Não autenticado' });

    const groups = claims['cognito:groups'] || '';
    const groupList = Array.isArray(groups) ? groups : groups.split(',');
    if (!groupList.includes('admin')) {
      return res.status(403).json({ success: false, message: 'Acesso restrito a administradores' });
    }

    req.adminId = claims.sub;
    req.adminEmail = claims.email;
    req.tenantId = claims['custom:tenantId'] || 'default';
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token inválido' });
  }
}

export default adminAuth;
