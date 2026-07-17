/**
 * Interface do Adapter de Nota Fiscal.
 * Cada integração (eNotas, NFe.io, Focus NF-e) implementa estes métodos.
 */

const NFInterface = {
  /**
   * Emite NFS-e
   * @param {{ valor: number, descricao: string, tomador: Object }} input
   * @returns {Promise<{ numero_nf: string, status: string, pdf_url?: string }>}
   */
  emitir: async (input) => {
    // Mock: simula emissão com sucesso
    return {
      numero_nf: `NF-${Date.now()}`,
      status: 'emitida',
      pdf_url: null,
    };
  },

  /**
   * Cancela NFS-e
   * @param {{ numero_nf: string }} input
   * @returns {Promise<{ success: boolean }>}
   */
  cancelar: async (input) => {
    return { success: true };
  },

  /**
   * Consulta status de NFS-e
   * @param {{ numero_nf: string }} input
   * @returns {Promise<{ status: string, pdf_url?: string }>}
   */
  consultar: async (input) => {
    return { status: 'emitida', pdf_url: null };
  },
};

module.exports = NFInterface;
