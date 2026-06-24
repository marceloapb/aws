import { logger } from '../config/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message,
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Rota não encontrada: ${req.method} ${req.path}` });
}
