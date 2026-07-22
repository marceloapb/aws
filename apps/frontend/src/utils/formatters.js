/**
 * Utilitários de formatação, validação e máscaras para o sistema MBF.
 * Usar em todos os formulários do sistema.
 */

// ═══ MÁSCARAS ═══

export function maskCPF(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCNPJ(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function maskCPFCNPJ(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) return maskCPF(value);
  return maskCNPJ(value);
}

export function maskPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskCEP(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskCurrency(value) {
  const digits = value.replace(/\D/g, '');
  const number = Number(digits) / 100;
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ═══ VALIDAÇÕES ═══

export function validateCPF(cpf) {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false; // todos iguais

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[10])) return false;

  return true;
}

export function validateCNPJ(cnpj) {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weights1[i];
  let remainder = sum % 11;
  const dig1 = remainder < 2 ? 0 : 11 - remainder;
  if (parseInt(digits[12]) !== dig1) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weights2[i];
  remainder = sum % 11;
  const dig2 = remainder < 2 ? 0 : 11 - remainder;
  if (parseInt(digits[13]) !== dig2) return false;

  return true;
}

export function validateCPFCNPJ(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return validateCPF(value);
  if (digits.length === 14) return validateCNPJ(value);
  return false;
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

// ═══ CEP (busca endereço) ═══

export async function fetchAddressByCEP(cep) {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await response.json();
    if (data.erro) return null;

    return {
      rua: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || '',
      complemento: data.complemento || '',
    };
  } catch {
    return null;
  }
}

// ═══ FORMATADORES ═══

export function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR');
}

export function unformat(value) {
  return value.replace(/\D/g, '');
}


// ═══ ENDEREÇO / MAPS ═══

/**
 * Remove prefixos descritivos de locais de evento para melhorar geocoding.
 * Ex: "buffert - Rua Engenheiro Mac Lean, 185" → "Rua Engenheiro Mac Lean, 185"
 * Ex: "Salão de festas - Av. Paulista, 1000" → "Av. Paulista, 1000"
 */
export function cleanEventAddress(endereco) {
  if (!endereco) return '';
  // Remove prefixo antes de " - " se o que vem depois parecer endereço
  // (começa com Rua, Av, Alameda, Travessa, Estrada, Rod, número, etc.)
  const separatorIdx = endereco.indexOf(' - ');
  if (separatorIdx > 0 && separatorIdx < 40) {
    const afterSep = endereco.slice(separatorIdx + 3).trim();
    // Se após o separador começa com indicadores de endereço
    if (/^(Rua|R\.|Av\.?|Avenida|Al\.?|Alameda|Trav\.?|Travessa|Estr\.?|Estrada|Rod\.?|Rodovia|Pra[çc]a|Lg\.?|Largo|\d)/i.test(afterSep)) {
      return afterSep;
    }
  }
  return endereco;
}
