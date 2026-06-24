export function clientAuth(req, res, next) {
  try {
    const claims = req.apiGateway?.event?.requestContext?.authorizer?.jwt?.claims;
    if (!claims) return res.status(401).json({ success: false, message: 'Não autenticado' });

    req.clienteId = claims.sub;
    req.clienteEmail = claims.email;
    req.user = { id: claims.sub, email: claims.email };
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token inválido' });
  }
}

export default clientAuth;
