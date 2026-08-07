// ══════════════════════════════════════════════════════════════
// MIDDLEWARES/VALIDATE-FIELDS.JS — Validação e sanitização de campos
// Previne injeção de campos reservados (PK, SK, GSI*) no DynamoDB
// ══════════════════════════════════════════════════════════════

// Campos que NUNCA devem ser aceitos via req.body
const RESERVED_FIELDS = new Set([
  'PK', 'SK', 'GSI1PK', 'GSI1SK', 'GSI2PK', 'GSI2SK',
  'GSI3PK', 'GSI3SK', 'created', 'created_at',
]);

/**
 * Middleware factory — remove campos reservados do req.body
 * e opcionalmente aplica whitelist de campos aceitos.
 * 
 * @param {Object} options
 * @param {string[]} [options.allowedFields] - Se definido, só permite estes campos
 * @param {string[]} [options.requiredFields] - Campos obrigatórios (retorna 400 se ausente)
 * @param {boolean} [options.stripReserved=true] - Remove campos reservados do DynamoDB
 * @returns {Function} Express middleware
 * 
 * Uso:
 *   router.post('/', validateFields({ requiredFields: ['nome'], allowedFields: ['nome', 'email', 'telefone'] }), handler)
 *   router.put('/:id', validateFields({ stripReserved: true }), handler)
 */
function validateFields({ allowedFields, requiredFields, stripReserved = true } = {}) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ success: false, message: 'Body inválido' });
    }

    // Check required fields
    if (requiredFields && requiredFields.length > 0) {
      for (const field of requiredFields) {
        const value = req.body[field];
        if (value === undefined || value === null || value === '') {
          return res.status(400).json({ 
            success: false, 
            message: `Campo obrigatório ausente: ${field}` 
          });
        }
      }
    }

    // Strip reserved DynamoDB fields
    if (stripReserved) {
      for (const key of Object.keys(req.body)) {
        if (RESERVED_FIELDS.has(key)) {
          delete req.body[key];
        }
      }
    }

    // Apply whitelist if defined
    if (allowedFields && allowedFields.length > 0) {
      const allowedSet = new Set(allowedFields);
      for (const key of Object.keys(req.body)) {
        if (!allowedSet.has(key)) {
          delete req.body[key];
        }
      }
    }

    next();
  };
}

/**
 * Simple strip middleware — removes reserved fields without whitelist.
 * Use on PUT routes where field list is dynamic.
 */
function stripReservedFields(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (RESERVED_FIELDS.has(key)) {
        delete req.body[key];
      }
    }
  }
  next();
}

module.exports = { validateFields, stripReservedFields, RESERVED_FIELDS };
