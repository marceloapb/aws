// ══════════════════════════════════════════════════════════════
// CONFIG/CONSTANTS.JS — Constantes do sistema
// ══════════════════════════════════════════════════════════════

export const ALBUM_STATUS = {
  ATIVO: 'ativo',
  EXPIRADO: 'expirado',
  EM_GRACA: 'em_graca',
  PRONTO_EXCLUSAO: 'pronto_exclusao',
};

export const COBRANCA_STATUS = {
  PENDENTE: 'pendente',
  PROCESSANDO: 'processando',
  PAGO: 'pago',
  VENCIDO: 'vencido',
  CANCELADO: 'cancelado',
  ESTORNADO: 'estornado',
};

export const ORCAMENTO_STATUS = {
  RASCUNHO: 'rascunho',
  ENVIADO: 'enviado',
  APROVADO: 'aprovado',
  REJEITADO: 'rejeitado',
  CANCELADO: 'cancelado',
};

export const CONTRATO_STATUS = {
  RASCUNHO: 'rascunho',
  ENVIADO: 'enviado',
  ASSINADO: 'assinado',
  CANCELADO: 'cancelado',
};

export const AGENDA_STATUS = {
  LIVRE: 'livre',
  OCUPADA: 'ocupada',
  FORA: 'fora',
};

export const SYNC_STATUS = {
  SINCRONIZADO: 'sincronizado',
  PENDENTE: 'pendente',
  ERRO: 'erro',
};

export const INSTAGRAM_STATUS = {
  AGENDADO: 'agendado',
  PUBLICANDO: 'publicando',
  PUBLICADO: 'publicado',
  ERRO: 'erro',
};

export const PENDENCIA_STATUS = {
  PENDENTE: 'pendente',
  EM_ANDAMENTO: 'em_andamento',
  CONCLUIDA: 'concluida',
  CANCELADA: 'cancelada',
};

export const PENDENCIA_PRIORIDADE = {
  BAIXA: 'baixa',
  MEDIA: 'media',
  ALTA: 'alta',
  URGENTE: 'urgente',
};

export const EQUIPAMENTO_STATUS = {
  DISPONIVEL: 'disponivel',
  EM_USO: 'em_uso',
  MANUTENCAO: 'manutencao',
  INATIVO: 'inativo',
};

export const MEIOS_PAGAMENTO = {
  PIX: 'pix',
  BOLETO: 'boleto',
  CARTAO_CREDITO: 'cartao_credito',
  CARTAO_DEBITO: 'cartao_debito',
  DINHEIRO: 'dinheiro',
  TRANSFERENCIA: 'transferencia',
};

export const GATEWAYS = [
  'asaas',
  'mercadopago',
  'pagarme',
  'pagbank',
  'picpay',
  'sumup',
  'banco-inter',
  'stone',
  'infinitepay',
  'stripe',
];

export const CORES_CALENDARIO = [
  { id: '1', nome: 'Lavanda', hex: '#7986cb' },
  { id: '2', nome: 'Sálvia', hex: '#33b679' },
  { id: '3', nome: 'Uva', hex: '#8e24aa' },
  { id: '4', nome: 'Flamingo', hex: '#e67c73' },
  { id: '5', nome: 'Banana', hex: '#f6bf26' },
  { id: '6', nome: 'Tangerina', hex: '#f4511e' },
  { id: '7', nome: 'Pavão', hex: '#039be5' },
  { id: '8', nome: 'Grafite', hex: '#616161' },
  { id: '9', nome: 'Mirtilo', hex: '#3f51b5' },
  { id: '10', nome: 'Manjericão', hex: '#0b8043' },
  { id: '11', nome: 'Tomate', hex: '#d50000' },
];

export const PAGINATION_DEFAULT = {
  PAGE: 1,
  PER_PAGE: 20,
  MAX_PER_PAGE: 100,
};
