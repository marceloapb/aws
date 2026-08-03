// ══════════════════════════════════════════════════════════════
// SERVICES/MANIFESTO-SERVICE.JS
// SIG-04: Manifesto PDF — prova técnica completa de assinatura
// ══════════════════════════════════════════════════════════════

const crypto = require('crypto');
const { listarAuditLog } = require('./auditLogService');
const { gerarCodigoVerificacao, mascararCPF, formatarDataHoraBR } = require('./seloAssinaturaService');
const { calcularHash } = require('./integrityService');
const logger = require('../config/logger');

/**
 * Monta os dados necessários para o manifesto
 */
async function montarManifesto(contrato, aceite, auditLog) {
  // Hash do conteúdo HTML original
  const hashHTML = crypto
    .createHash('sha256')
    .update(contrato.conteudo_html || '')
    .digest('hex');

  const codigo = gerarCodigoVerificacao(
    contrato.id,
    aceite?.data || aceite?.assinadoEm || contrato.assinado_em
  );

  return {
    contrato,
    aceite,
    auditLog,
    hashHTML,
    hashPDF: contrato.pdf_sha256 || null,
    codigo_verificacao: codigo,
    gerado_em: new Date().toISOString(),
  };
}

/**
 * Gera o HTML completo do manifesto técnico
 */
function gerarHTMLManifesto(dados) {
  const { contrato, aceite, auditLog, hashHTML, hashPDF, codigo_verificacao, gerado_em } = dados;

  const selo = contrato.selo_assinatura || {};
  const log = contrato.log_auditoria || {};

  const signatario = aceite?.signatario?.nomeCompleto || selo.signatario || log.signatario?.nomeCompleto || 'N/A';
  const cpf = mascararCPF(aceite?.signatario?.cpf || selo.cpf || log.signatario?.cpf);
  const ip = aceite?.enderecoIP || selo.ip || log.enderecoIP || contrato.ip_assinatura || 'N/A';
  const userAgent = aceite?.userAgent || log.userAgent || contrato.user_agent_assinatura || 'N/A';
  const dataAceite = aceite?.timestamp || selo.data || contrato.assinado_em || 'N/A';
  const canal = aceite?.autenticacao?.canal || selo.autenticacao || log.autenticacao?.canal || 'WhatsApp';
  const otpId = aceite?.autenticacao?.otpId || log.autenticacao?.otpId || 'N/A';

  // Formatar audit log como tabela
  const auditRows = (auditLog || []).map(e => `
    <tr>
      <td style="padding: 6px; border: 1px solid #ccc; font-size: 10px;">${formatarDataHoraBR(e.timestamp || e.criadoEm)}</td>
      <td style="padding: 6px; border: 1px solid #ccc; font-size: 10px;">${e.evento || e.tipo || 'N/A'}</td>
      <td style="padding: 6px; border: 1px solid #ccc; font-size: 10px;">${e.ip_address || e.enderecoIP || '-'}</td>
      <td style="padding: 6px; border: 1px solid #ccc; font-size: 10px;">${typeof e.detalhes === 'object' ? JSON.stringify(e.detalhes) : (e.detalhes || '-')}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Manifesto de Assinatura Eletrônica</title>
</head>
<body style="font-family: 'Courier New', monospace; font-size: 11px; padding: 40px; max-width: 800px; margin: 0 auto; color: #1f2937;">
  <h1 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; font-size: 16px;">
    MANIFESTO DE ASSINATURA ELETRÔNICA
  </h1>
  <p style="text-align: center; font-size: 10px; color: #6b7280;">
    Código: ${codigo_verificacao} | Gerado em: ${formatarDataHoraBR(gerado_em)}
  </p>

  <section style="margin-top: 20px;">
    <h2 style="font-size: 13px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">1. IDENTIFICAÇÃO DO DOCUMENTO</h2>
    <p><strong>Contrato ID:</strong> ${contrato.id}</p>
    <p><strong>Número:</strong> ${contrato.numero_contrato || 'N/A'}</p>
    <p><strong>Cliente ID:</strong> ${contrato.cliente_id}</p>
    <p><strong>Orçamento:</strong> ${contrato.orcamento_id || 'N/A'}</p>
    <p><strong>Criado em:</strong> ${formatarDataHoraBR(contrato.created)}</p>
    <p><strong>Assinado em:</strong> ${formatarDataHoraBR(dataAceite)}</p>
  </section>

  <section style="margin-top: 20px;">
    <h2 style="font-size: 13px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">2. DADOS DO SIGNATÁRIO</h2>
    <p><strong>Nome:</strong> ${signatario}</p>
    <p><strong>CPF:</strong> ${cpf}</p>
    <p><strong>IP:</strong> ${ip}</p>
    <p><strong>User Agent:</strong> ${userAgent}</p>
  </section>

  <section style="margin-top: 20px;">
    <h2 style="font-size: 13px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">3. VERIFICAÇÃO OTP</h2>
    <p><strong>Canal:</strong> ${canal}</p>
    <p><strong>OTP ID:</strong> ${otpId}</p>
    <p><strong>Método:</strong> Código de 6 dígitos com expiração de 10 minutos</p>
    <p><strong>Validado em:</strong> ${formatarDataHoraBR(aceite?.autenticacao?.validadoEm || dataAceite)}</p>
  </section>

  <section style="margin-top: 20px;">
    <h2 style="font-size: 13px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">4. TRILHA DE AUDITORIA</h2>
    ${auditLog && auditLog.length > 0 ? `
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <tr>
        <th style="padding: 6px; border: 1px solid #ccc; background: #f3f4f6; font-size: 10px;">Hora</th>
        <th style="padding: 6px; border: 1px solid #ccc; background: #f3f4f6; font-size: 10px;">Evento</th>
        <th style="padding: 6px; border: 1px solid #ccc; background: #f3f4f6; font-size: 10px;">IP</th>
        <th style="padding: 6px; border: 1px solid #ccc; background: #f3f4f6; font-size: 10px;">Detalhes</th>
      </tr>
      ${auditRows}
    </table>
    ` : '<p><em>Nenhum log de auditoria granular disponível.</em></p>'}
  </section>

  <section style="margin-top: 20px;">
    <h2 style="font-size: 13px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">5. INTEGRIDADE DO DOCUMENTO</h2>
    <p><strong>Hash SHA-256 (HTML):</strong></p>
    <p style="font-family: monospace; font-size: 9px; word-break: break-all; background: #f9fafb; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px;">${hashHTML}</p>
    <p><strong>Hash SHA-256 (PDF):</strong></p>
    <p style="font-family: monospace; font-size: 9px; word-break: break-all; background: #f9fafb; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px;">${hashPDF || 'N/A (gerado após este manifesto)'}</p>
  </section>

  <section style="margin-top: 20px;">
    <h2 style="font-size: 13px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">6. FUNDAMENTAÇÃO LEGAL</h2>
    <ul style="font-size: 10px; line-height: 1.8;">
      <li>Art. 107, Código Civil — forma livre para declaração de vontade</li>
      <li>MP 2.200-2/2001, Art. 10, §2º — validade de documentos eletrônicos</li>
      <li>Lei 14.063/2020, Art. 4º, II — assinatura eletrônica avançada</li>
      <li>Lei 13.709/2018 (LGPD) — tratamento para execução de contrato</li>
      <li>Marco Civil da Internet (Lei 12.965/2014) — registro de conexão</li>
    </ul>
  </section>

  <footer style="margin-top: 40px; border-top: 2px solid #333; padding-top: 10px; font-size: 9px; color: #6b7280; text-align: center;">
    <p>Este manifesto é prova técnica da assinatura eletrônica e deve ser armazenado por 5 anos.</p>
    <p>Código de verificação: ${codigo_verificacao}</p>
    <p>Gerado automaticamente em ${formatarDataHoraBR(gerado_em)} — Marcelo Bloise Fotografia</p>
  </footer>
</body>
</html>`;
}

module.exports = { montarManifesto, gerarHTMLManifesto };
