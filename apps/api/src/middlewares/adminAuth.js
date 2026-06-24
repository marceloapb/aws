// ══════════════════════════════════════════════════════════════
// MIDDLEWARES/ADMIN-AUTH.JS — Autenticação de administrador
// ══════════════════════════════════════════════════════════════

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function adminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido',
        code: 'UNAUTHORIZED',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso restrito a administradores',
        code: 'FORBIDDEN',
      });
    }

    req.admin = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token inválido',
      code: 'UNAUTHORIZED',
    });
  }
}

export default adminAuth;
