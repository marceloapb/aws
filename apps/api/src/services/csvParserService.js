const { parse } = require('csv-parse/sync');
const logger = require('../config/logger');

const MAX_LINHAS = 500;

function parseClientes(buffer) {
  return parseCSV(buffer, 'clientes', ['nome', 'email', 'telefone']);
}

function parseCatalogo(buffer) {
  return parseCSV(buffer, 'catalogo', ['nome', 'tipo', 'preco']);
}

function parseEquipamentos(buffer) {
  return parseCSV(buffer, 'equipamentos', ['nome', 'tipo']);
}

function parseCSV(buffer, entityType, camposObrigatorios) {
  try {
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    });

    if (records.length > MAX_LINHAS) {
      return {
        validated: [],
        errors: [{ linha: 0, motivo: `Arquivo excede o limite de ${MAX_LINHAS} linhas. Total: ${records.length}` }]
      };
    }

    const validated = [];
    const errors = [];

    records.forEach((record, index) => {
      const linha = index + 2; // +2 porque index 0 = linha 2 do CSV (header é linha 1)
      const camposFaltando = camposObrigatorios.filter(campo => !record[campo] || record[campo].trim() === '');

      if (camposFaltando.length > 0) {
        errors.push({ linha, motivo: `Campos obrigatórios faltando: ${camposFaltando.join(', ')}` });
      } else {
        // Validações específicas por tipo
        if (entityType === 'catalogo' && record.preco) {
          const preco = parseFloat(record.preco);
          if (isNaN(preco) || preco < 0) {
            errors.push({ linha, motivo: 'Preço inválido (deve ser número >= 0)' });
            return;
          }
          record.preco = preco;
        }

        if (entityType === 'clientes' && record.email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(record.email)) {
            errors.push({ linha, motivo: `Email inválido: ${record.email}` });
            return;
          }
        }

        validated.push(record);
      }
    });

    logger.info({ action: 'csv_parse', entityType, total: records.length, validated: validated.length, errors: errors.length });
    return { validated, errors };
  } catch (error) {
    logger.error({ action: 'csv_parse_error', entityType, error: error.message });
    return {
      validated: [],
      errors: [{ linha: 0, motivo: `Erro ao processar CSV: ${error.message}` }]
    };
  }
}

const TEMPLATES = {
  clientes: 'nome,email,telefone,documento,endereco',
  catalogo: 'nome,tipo,preco,descricao,quantidadeFotos,duracaoHoras',
  equipamentos: 'nome,tipo,marca,modelo,numero_serie'
};

module.exports = { parseClientes, parseCatalogo, parseEquipamentos, TEMPLATES };
