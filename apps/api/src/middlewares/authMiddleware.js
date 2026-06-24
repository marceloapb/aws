import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

function extractToken(req) {
  const auth = req.headers.authorization;
  return auth?.startsWith('Bearer ') ? auth.substring(7) : null;
}

export function authAdmin(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Token não fornecido' });
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (decoded.tipo !== 'admin') return res.status(403).json({ success: false, message: 'Acesso restrito a administradores' });
    req.adminId = decoded.id;
    req.adminEmail = decoded.email;
    next();
  } catch (error) {
    const msg = error.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido';
    res.status(401).json({ success: false, message: msg });
  }
}

export function authCliente(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Token não fornecido' });
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (decoded.tipo !== 'cliente') return res.status(403).json({ success: false, message: 'Acesso restrito a clientes' });
    req.clienteId = decoded.id;
    req.clienteEmail = decoded.email;
    next();
  } catch (error) {
    const msg = error.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido';
    res.status(401).json({ success: false, message: msg });
  }
}
