/**
 * Interface do Gateway de Pagamento.
 * Todo adapter concreto deve implementar estes métodos.
 */

/**
 * @typedef {Object} CobrancaInput
 * @property {number} valor - Valor em centavos
 * @property {string} vencimento - Data ISO de vencimento
 * @property {Object} cliente - { nome, email, cpf_cnpj, telefone }
 * @property {string} descricao - Descrição da cobrança
 * @property {string} meio - pix|boleto|cartao
 */

/**
 * @typedef {Object} CobrancaResult
 * @property {string} cobranca_externa_id - ID no gateway
 * @property {string} status - pendente|pago|cancelado|expirado
 * @property {string} link_pagamento - URL para pagamento
 * @property {string} [pix_copia_cola] - Código PIX
 * @property {string} [pix_qr_code] - URL do QR Code
 * @property {string} [boleto_url] - URL do boleto
 */

/**
 * @typedef {Object} WebhookResult
 * @property {string} evento - payment_confirmed|payment_failed|payment_refunded
 * @property {string} cobranca_externa_id - ID no gateway
 * @property {string} status - pago|cancelado|estornado
 * @property {string} [pago_em] - Data ISO do pagamento
 */

const GatewayInterface = {
  /**
   * Cria cobrança no gateway externo
   * @param {CobrancaInput} input
   * @returns {Promise<CobrancaResult>}
   */
  criarCobranca: async (input) => { throw new Error('Não implementado'); },

  /**
   * Consulta status de cobrança
   * @param {{ cobranca_externa_id: string }} input
   * @returns {Promise<{ status: string, pago_em?: string }>}
   */
  consultarStatus: async (input) => { throw new Error('Não implementado'); },

  /**
   * Cancela cobrança
   * @param {{ cobranca_externa_id: string }} input
   * @returns {Promise<{ success: boolean }>}
   */
  cancelar: async (input) => { throw new Error('Não implementado'); },

  /**
   * Parse webhook payload do gateway
   * @param {Object} body - Body do webhook
   * @param {Object} headers - Headers do request
   * @returns {WebhookResult|null}
   */
  parseWebhook: (body, headers) => { throw new Error('Não implementado'); },
};

module.exports = GatewayInterface;
