const ALBUM_STATUS = {
  ATIVO: 'ativo', EXPIRADO: 'expirado', EM_GRACA: 'em_graca', PRONTO_EXCLUSAO: 'pronto_exclusao',
};
const SYNC_STATUS = { PENDENTE: 'pendente', SINCRONIZADO: 'sincronizado', ERRO: 'erro' };
const INSTAGRAM_STATUS = { RASCUNHO: 'rascunho', AGENDADO: 'agendado', PUBLICANDO: 'publicando', PUBLICADO: 'publicado', ERRO: 'erro' };
const COBRANCA_STATUS = { PENDENTE: 'pendente', PAGO: 'pago', VENCIDO: 'vencido', CANCELADO: 'cancelado', ESTORNADO: 'estornado' };
const ORCAMENTO_STATUS = { RASCUNHO: 'rascunho', ENVIADO: 'enviado', APROVADO: 'aprovado', REJEITADO: 'rejeitado', EXPIRADO: 'expirado' };
const CONTRATO_STATUS = { RASCUNHO: 'rascunho', ENVIADO: 'enviado', ASSINADO: 'assinado', CANCELADO: 'cancelado' };
const EVENT_COLORS = {
  casamento: '7', ensaio: '2', aniversario: '5', corporativo: '9', batizado: '6', formatura: '3', externo: '8', default: '1',
};
const TIPOS_EVENTO = ['casamento', 'ensaio', 'aniversario', 'corporativo', 'batizado', 'formatura', 'newborn', 'smash_cake', 'outro'];
const MEIOS_PAGAMENTO = ['pix', 'boleto', 'cartao_credito'];
const GATEWAYS = ['asaas', 'stripe', 'mercadopago', 'pagarme', 'pagbank', 'picpay', 'sumup', 'banco-inter', 'stone', 'infinitepay'];

module.exports = {
  ALBUM_STATUS,
  SYNC_STATUS,
  INSTAGRAM_STATUS,
  COBRANCA_STATUS,
  ORCAMENTO_STATUS,
  CONTRATO_STATUS,
  EVENT_COLORS,
  TIPOS_EVENTO,
  MEIOS_PAGAMENTO,
  GATEWAYS,
};
