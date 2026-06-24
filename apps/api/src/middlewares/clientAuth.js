// ══════════════════════════════════════════════════════════════
// MIDDLEWARES/CLIENT-AUTH.JS — Autenticação de cliente
// ══════════════════════════════════════════════════════════════

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getPocketbaseClient } from '../config/pocketbase.js';

export async function clientAuth(req, res, next) {
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

    if (decoded.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Acesso restrito a clientes',
        code: 'FORBIDDEN',
      });
    }

    // Verificar se cliente existe e está ativo
    const pb = await getPocketbaseClient();
    const cliente = await pb.collection('clientes').getOne(decoded.cliente_id);

    if (!cliente || !cliente.ativo) {
      return res.status(403).json({
        success: false,
        message: 'Conta de cliente inativa',
        code: 'FORBIDDEN',
      });
    }

    req.client = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      cliente_id: decoded.cliente_id,
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

export default clientAuth;
