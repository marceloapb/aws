function clientAuth(req, res, next) {
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) return res.status(401).json({ success: false, message: 'Não autenticado' });

    const parts = token.split('.');
    if (parts.length !== 3) return res.status(401).json({ success: false, message: 'Token malformado' });

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

    req.clienteId = payload.sub;
    req.clienteEmail = payload.email;
    req.user = { id: payload.sub, sub: payload.sub, email: payload.email };
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token inválido' });
  }
}

module.exports = clientAuth;
