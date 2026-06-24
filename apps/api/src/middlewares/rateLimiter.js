const requestCounts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 100;

export function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, startTime: now });
    return next();
  }
  const record = requestCounts.get(ip);
  if (now - record.startTime > WINDOW_MS) {
    requestCounts.set(ip, { count: 1, startTime: now });
    return next();
  }
  record.count++;
  if (record.count > MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: 'Muitas requisições. Tente novamente em alguns minutos.',
      retry_after: Math.ceil((WINDOW_MS - (now - record.startTime)) / 1000),
    });
  }
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts.entries()) {
    if (now - record.startTime > WINDOW_MS) requestCounts.delete(ip);
  }
}, 5 * 60 * 1000);

export default rateLimiter;
