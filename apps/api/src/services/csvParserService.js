const { parse } = require('csv-parse/sync');
const logger = require('../config/logger');

const MAX_LINHAS = 500;

function parseCSV(buffer, columns, validationFn) {
  try {
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    });

    if (records.length > MAX_LINHAS) {
      return { validated: [], errors: [{ linha: 0, motivo: `Arquivo excede o limite de ${MAX_LINHAS} linhas (${records.length} encontradas)` }] };
    }

    const validated = [];
    const errors = [];

    records.forEach((record, index) => {
      const linha = index + 2;
      const error = validationFn(record);
      if (error) {
        errors.push({ linha, motivo: error, dados: record });
      } else {
        validated.push(record);
      }
    });

    return { validated, errors };
  } catch (error) {
    logger.error({ action: 'csv_parse_error', error: error.message });
    return { validated: [], errors: [{ linha: 0, motivo: `Erro ao parsear CSV: ${error.message}` }] };
  }
}

function parseClientes(buffer) {
  return parseCSV(buffer, ['nome', 'email', 'telefone', 'documento', 'endereco'], (record) => {
    if (!record.nome || record.nome.trim().length === 0) return 'Campo nome eh obrigatorio';
    if (!record.email || record.email.trim().length === 0) return 'Campo email eh obrigatorio';
    if (record.email && !record.email.includes('@')) return 'Email invalido';
    return null;
  });
}

function parseCatalogo(buffer) {
  return parseCSV(buffer, ['nome', 'tipo', 'preco', 'descricao', 'quantidadeFotos', 'duracaoHoras'], (record) => {
    if (!record.nome || record.nome.trim().length === 0) return 'Campo nome eh obrigatorio';
    if (record.preco === undefined || record.preco === '' || isNaN(Number(record.preco))) return 'Campo preco deve ser um numero valido';
    if (Number(record.preco) < 0) return 'Campo preco deve ser >= 0';
    const tiposValidos = ['ensaio', 'casamento', 'evento', 'corporativo', 'custom'];
    if (record.tipo && !tiposValidos.includes(record.tipo.toLowerCase())) return 'Tipo invalido. Aceitos: ' + tiposValidos.join(', ');
    return null;
  });
}

function parseEquipamentos(buffer) {
  return parseCSV(buffer, ['nome', 'tipo', 'marca', 'modelo', 'numero_serie'], (record) => {
    if (!record.nome || record.nome.trim().length === 0) return 'Campo nome eh obrigatorio';
    if (!record.tipo || record.tipo.trim().length === 0) return 'Campo tipo eh obrigatorio';
    return null;
  });
}

const TEMPLATES = {
  clientes: 'nome,email,telefone,documento,endereco',
  catalogo: 'nome,tipo,preco,descricao,quantidadeFotos,duracaoHoras',
  equipamentos: 'nome,tipo,marca,modelo,numero_serie'
};

module.exports = {
  parseClientes,
  parseCatalogo,
  parseEquipamentos,
  TEMPLATES
};
