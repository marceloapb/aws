// ══════════════════════════════════════════════════════════════
// SERVICES/CONTRATO-PDF-SERVICE.JS
// Geração de PDF do contrato com selo de assinatura e manifesto de auditoria
// ══════════════════════════════════════════════════════════════

const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { obterLogAuditoria, gerarHashDocumento } = require('./assinaturaEletronicaService');
const logger = require('../config/logger');

/**
 * Gera PDF do contrato com selo de assinatura e página de auditoria
 * RF03: Selo visual ao PDF
 * Seção 3: Página final com manifesto de assinaturas
 *
 * Retorna um Buffer com o HTML formatado para PDF
 * (Em produção, usar puppeteer/chromium ou serviço externo para PDF real)
 */
async function gerarContratoPDF(contratoId) {
  // Buscar contrato
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'CONTRATO', ':sk': `CONTRATO#${contratoId}` },
  }));
  const contrato = result.Items?.[0];
  if (!contrato) throw new Error('Contrato não encontrado');

  // Buscar cliente
  const cliResult = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${contrato.cliente_id}` },
  }));
  const cliente = cliResult.Items?.[0];

  // Buscar log de auditoria se contrato assinado
  let logsAuditoria = [];
  if (contrato.status === 'assinado') {
    logsAuditoria = await obterLogAuditoria(contratoId);
  }

  // Montar HTML do PDF
  const html = montarHTMLCompleto(contrato, cliente, logsAuditoria);

  // Converter HTML para Buffer (representação PDF-ready)
  const pdfBuffer = Buffer.from(html, 'utf-8');

  logger.info({
    action: 'contrato_pdf_gerado',
    contratoId,
    status: contrato.status,
    comAuditoria: logsAuditoria.length > 0,
  });

  return pdfBuffer;
}

/**
 * Monta o HTML completo do contrato com todas as seções
 */
function montarHTMLCompleto(contrato, cliente, logsAuditoria) {
  const partes = [];

  // Cabeçalho do documento
  partes.push(gerarCabecalho());

  // Conteúdo do contrato
  partes.push(`
    <div class="contrato-conteudo">
      ${contrato.conteudo_html || ''}
    </div>
  `);

  // Selo de assinatura (se assinado)
  if (contrato.status === 'assinado' && contrato.selo_assinatura) {
    partes.push(gerarSeloVisual(contrato.selo_assinatura));
  }

  // Página de manifesto de auditoria (Seção 3 da spec)
  if (logsAuditoria.length > 0) {
    partes.push(gerarPaginaAuditoria(contrato, cliente, logsAuditoria));
  }

  // Hash de integridade no rodapé
  partes.push(gerarRodapeIntegridade(contrato));

  // Fechar documento
  partes.push('</body></html>');

  return partes.join('\n');
}

function gerarCabecalho() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Contrato de Serviços Fotográficos</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #111827; font-size: 22px; text-align: center; margin-bottom: 30px; border-bottom: 2px solid #EA580C; padding-bottom: 15px; }
    h2 { color: #374151; font-size: 16px; margin-top: 25px; margin-bottom: 10px; }
    p { margin-bottom: 8px; font-size: 14px; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
    .contrato-conteudo { margin-bottom: 40px; }
    .selo-assinatura { border: 2px solid #059669; border-radius: 12px; padding: 20px; margin: 30px 0; background: #ecfdf5; }
    .selo-titulo { color: #059669; font-weight: bold; font-size: 16px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
    .selo-dados { font-size: 12px; color: #374151; }
    .selo-dados dt { font-weight: bold; color: #065f46; }
    .selo-dados dd { margin-bottom: 6px; margin-left: 0; }
    .auditoria-page { page-break-before: always; margin-top: 40px; border-top: 3px solid #1f2937; padding-top: 30px; }
    .auditoria-titulo { color: #1f2937; font-size: 18px; text-align: center; margin-bottom: 20px; }
    .auditoria-tabela { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
    .auditoria-tabela th { background: #f3f4f6; padding: 10px; text-align: left; border: 1px solid #d1d5db; font-weight: 600; }
    .auditoria-tabela td { padding: 10px; border: 1px solid #d1d5db; vertical-align: top; }
    .hash-container { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-top: 20px; font-family: monospace; font-size: 10px; word-break: break-all; }
    .rodape { margin-top: 40px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
    .legal-notice { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px; font-size: 11px; color: #92400e; margin-top: 15px; }
  </style>
</head>
<body>`;
}

/**
 * RF03: Gera selo visual de assinatura para o PDF
 */
function gerarSeloVisual(selo) {
  return `
    <div class="selo-assinatura">
      <div class="selo-titulo">&#x2705; DOCUMENTO ASSINADO ELETRONICAMENTE</div>
      <dl class="selo-dados">
        <dt>Signatário:</dt>
        <dd>${selo.signatario || 'N/A'}</dd>
        <dt>CPF:</dt>
        <dd>${selo.cpf || 'N/A'}</dd>
        <dt>Data/Hora da Assinatura:</dt>
        <dd>${formatarDataHora(selo.data)}</dd>
        <dt>Método de Autenticação:</dt>
        <dd>${selo.autenticacao || 'OTP via WhatsApp/SMS'}</dd>
        <dt>Endereço IP:</dt>
        <dd>${selo.ip || 'N/A'}</dd>
        <dt>Enquadramento Legal:</dt>
        <dd>${selo.lei || 'Lei 14.063/2020'} | ${selo.mp || 'MP 2.200-2/2001'}</dd>
        <dt>ID da Assinatura:</dt>
        <dd style="font-family:monospace;font-size:11px;">${selo.id || 'N/A'}</dd>
      </dl>
      <div class="hash-container">
        <strong>Hash SHA-256 do documento:</strong><br>
        ${selo.hash || 'N/A'}
      </div>
    </div>
  `;
}

/**
 * Seção 3: Gera página final com manifesto de auditoria
 */
function gerarPaginaAuditoria(contrato, cliente, logsAuditoria) {
  const log = logsAuditoria[0]; // Log principal de assinatura

  return `
    <div class="auditoria-page">
      <h2 class="auditoria-titulo">MANIFESTO DE ASSINATURAS - LOG DE AUDITORIA</h2>
      <p style="text-align:center;font-size:12px;color:#6b7280;margin-bottom:20px;">
        Extrato probatório conforme exigências legais para assinatura eletrônica avançada
      </p>

      <table class="auditoria-tabela">
        <thead>
          <tr>
            <th style="width:30%;">Dado Capturado</th>
            <th style="width:70%;">Valor / Finalidade</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Endereço IP</strong></td>
            <td>${log?.enderecoIP || contrato.ip_assinatura || 'N/A'}<br>
            <em style="font-size:10px;color:#6b7280;">Identificação da rede e localização aproximada do dispositivo</em></td>
          </tr>
          <tr>
            <td><strong>Timestamp (Data/Hora)</strong></td>
            <td>${formatarDataHora(log?.timestamp || contrato.assinado_em)}<br>
            <em style="font-size:10px;color:#6b7280;">Registro com carimbo de tempo (padrão NTP)</em></td>
          </tr>
          <tr>
            <td><strong>Autenticação</strong></td>
            <td>Código PIN (OTP 6 dígitos) enviado via ${log?.autenticacao?.canal || 'WhatsApp/SMS'} — Validado com sucesso<br>
            <em style="font-size:10px;color:#6b7280;">ID do OTP: ${log?.autenticacao?.otpId || 'N/A'}</em></td>
          </tr>
          <tr>
            <td><strong>Metadados do Signatário</strong></td>
            <td>
              Nome: ${log?.signatario?.nomeCompleto || cliente?.nome || 'N/A'}<br>
              CPF: ${log?.signatario?.cpf || cliente?.cpf || 'N/A'}<br>
              E-mail: ${log?.signatario?.email || cliente?.email || 'N/A'}<br>
              Telefone: ${log?.signatario?.telefone || cliente?.whatsapp_numero || 'N/A'}
            </td>
          </tr>
          <tr>
            <td><strong>User-Agent</strong></td>
            <td style="font-size:11px;word-break:break-all;">${log?.userAgent || contrato.user_agent_assinatura || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>Hash do Documento (SHA-256)</strong></td>
            <td style="font-family:monospace;font-size:10px;word-break:break-all;">${log?.hashDocumento || contrato.hash_documento || 'N/A'}</td>
          </tr>
        </tbody>
      </table>

      <div class="legal-notice">
        <strong>Fundamentação Legal:</strong> Esta assinatura eletrônica possui validade jurídica
        conforme Lei nº 14.063/2020 (Art. 4º, inciso II - Assinatura Eletrônica Avançada)
        e Medida Provisória nº 2.200-2/2001. O documento assinado eletronicamente é equivalente
        ao documento com assinatura manuscrita para todos os efeitos legais.
      </div>
    </div>
  `;
}

function gerarRodapeIntegridade(contrato) {
  const hashAtual = contrato.hash_documento || gerarHashDocumento(contrato.conteudo_html || '');
  return `
    <div class="rodape">
      <p>Documento gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
      <p style="font-family:monospace;font-size:9px;">Verificação de integridade: ${hashAtual}</p>
      <p>MBFoto - Plataforma de Gestão Fotográfica</p>
    </div>
  `;
}

function formatarDataHora(isoString) {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

module.exports = { gerarContratoPDF };
