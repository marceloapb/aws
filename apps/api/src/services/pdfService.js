// ══════════════════════════════════════════════════════════════
// SERVICES/PDF-SERVICE.JS — Geração de PDF de contratos
// ══════════════════════════════════════════════════════════════

import puppeteer from 'puppeteer';
import { uploadFoto } from './s3Service.js';
import { env } from '../config/env.js';

export async function gerarPdfContrato(contrato, cliente) {
  const html = montarHtmlContrato(contrato, cliente);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
    });

    // Upload para S3
    const s3Key = `contratos/${contrato.id}/${contrato.numero}.pdf`;
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const { s3Client } = await import('../config/s3.js');

    await s3Client.send(new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
    }));

    const pdfUrl = env.CLOUDFRONT_DOMAIN
      ? `https://${env.CLOUDFRONT_DOMAIN}/${s3Key}`
      : `https://${env.S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${s3Key}`;

    return { s3_key: s3Key, url: pdfUrl, buffer: pdfBuffer };
  } finally {
    await browser.close();
  }
}

function montarHtmlContrato(contrato, cliente) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Helvetica', sans-serif; font-size: 12px; line-height: 1.6; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 20px; }
        .header h1 { color: #1e40af; margin: 0; font-size: 24px; }
        .header p { color: #666; margin: 5px 0 0; }
        .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .info-box h3 { margin: 0 0 10px; color: #1e40af; }
        .content { margin: 20px 0; }
        .signature-area { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
        .signature-line { border-bottom: 1px solid #333; width: 300px; margin: 40px 0 5px; }
        .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
        <p>${contrato.numero}</p>
      </div>

      <div class="info-box">
        <h3>CONTRATANTE</h3>
        <p><strong>Nome:</strong> ${cliente.nome}</p>
        <p><strong>CPF:</strong> ${cliente.cpf || 'Não informado'}</p>
        <p><strong>Email:</strong> ${cliente.email || 'Não informado'}</p>
        <p><strong>Endereço:</strong> ${cliente.endereco || 'Não informado'}</p>
      </div>

      <div class="content">
        ${contrato.conteudo_html}
      </div>

      <div class="signature-area">
        ${contrato.assinatura_imagem ? `<img src="${contrato.assinatura_imagem}" style="max-width: 300px; max-height: 100px;" />` : '<div class="signature-line"></div>'}
        <p><strong>${cliente.nome}</strong></p>
        <p>Assinado em: ${contrato.assinado_em ? new Date(contrato.assinado_em).toLocaleString('pt-BR') : '___/___/______'}</p>
        ${contrato.assinatura_ip ? `<p style="font-size: 10px; color: #999;">IP: ${contrato.assinatura_ip}</p>` : ''}
      </div>

      <div class="footer">
        <p>Documento gerado eletronicamente pelo sistema Horizons Photography</p>
        ${contrato.assinatura_hash ? `<p>Hash de verificação: ${contrato.assinatura_hash}</p>` : ''}
      </div>
    </body>
    </html>
  `;
}

export default { gerarPdfContrato };
