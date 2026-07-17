function validatePayload(body) {
  if (!body || body.object !== 'instagram') return false;
  if (!Array.isArray(body.entry) || body.entry.length === 0) return false;
  return true;
}

module.exports = { validatePayload };
