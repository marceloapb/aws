export function validatePayload(body) {
  if (!body || body.object !== 'whatsapp_business_account') return false;
  if (!Array.isArray(body.entry) || body.entry.length === 0) return false;
  return true;
}
