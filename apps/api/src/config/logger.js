let requestId = 'local';

export function setRequestId(id) { requestId = id; }

function log(level, message, context = {}) {
  const entry = JSON.stringify({ level, message, timestamp: new Date().toISOString(), requestId, ...context });
  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else console.log(entry);
}

export const logger = {
  setRequestId,
  info: (msg, ctx) => log('info', msg, ctx),
  warn: (msg, ctx) => log('warn', msg, ctx),
  error: (msg, ctx) => log('error', msg, ctx),
};

export default logger;
