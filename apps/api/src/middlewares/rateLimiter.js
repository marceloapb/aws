// ══════════════════════════════════════════════════════════════
// MIDDLEWARES/RATE-LIMITER.JS — Rate limiting
// ══════════════════════════════════════════════════════════════

import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// Rate limiter geral: 100 req/15min por IP
export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em alguns minutos.',
    code: 'RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para auth: 10 tentativas/15min por IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para webhooks: sem limite (validados por signature)
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
