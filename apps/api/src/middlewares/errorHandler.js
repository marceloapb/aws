// ══════════════════════════════════════════════════════════════
// MIDDLEWARES/ERROR-HANDLER.JS — Error handler global
// ══════════════════════════════════════════════════════════════

import { env } from '../config/env.js';

export function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Erros de validação do PocketBase
  if (err.status === 400 && err.data) {
    return res.status(400).json({
      success: false,
      message: 'Erro de validação',
      code: 'VALIDATION_ERROR',
      details: err.data,
    });
  }

  // Registro não encontrado no PocketBase
  if (err.status === 404) {
    return res.status(404).json({
      success: false,
      message: 'Recurso não encontrado',
      code: 'NOT_FOUND',
    });
  }

  // Erro genérico
  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode === 500 ? 'Erro interno do servidor' : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    code: statusCode === 500 ? 'INTERNAL_ERROR' : 'ERROR',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export default errorHandler;
