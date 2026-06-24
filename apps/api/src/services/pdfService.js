// ══════════════════════════════════════════════════════════════
// SERVICES/PDF-SERVICE.JS — Geração de PDF de contratos
// ══════════════════════════════════════════════════════════════

import puppeteer from 'puppeteer';
import { env } from '../config/env.js';

let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browser;
}

export async function gerarPDFContrato(contrato, cliente) {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #1e40af; padding-bottom: 20px; }
        .header h1 { color: #1e40af; margin: 0; font-size: 24px; }
        .header p { color: #666; margin: 5px 0 0; }
        .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .info-box p { margin: 5px 0; }
        .content { margin: 30px 0; }
        .signature-section { margin-top: 60px; border-top: 1px solid #ddd; padding-top: 20px; }
        .signature-box { display: inline-block; width: 45%; text-align: center; }
        .signature-line { border-bottom: 1px solid #333; margin: 40px 20px 5px; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS</h1>
        <p>Nº ${contrato.numero}</p>
      </div>

      <div class="info-box">
        <p><strong>Contratante:</strong> ${cliente.nome}</p>
        <p><strong>CPF:</strong> ${cliente.cpf || 'Não informado'}</p>
        <p><strong>Email:</strong> ${cliente.email || 'Não informado'}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      <div class="content">
        ${contrato.conteudo_html}
      </div>

      ${contrato.assinatura_imagem ? `
        <div class="signature-section">
          <div class="signature-box">
            <img src="${contrato.assinatura_imagem}" style="max-width: 200px; max-height: 80px;" />
            <div class="signature-line"></div>
            <p>${cliente.nome}</p>
            <p style="font-size: 11px; color: #666;">Assinado em: ${contrato.assinado_em ? new Date(contrato.assinado_em).toLocaleString('pt-BR') : ''}</p>
          </div>
        </div>
      ` : ''}

      <div class="footer">
        <p>Documento gerado eletronicamente pelo sistema Horizons Photography</p>
        <p>Hash de verificação: ${contrato.assinatura_hash || 'Pendente assinatura'}</p>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    printBackground: true,
  });

  await page.close();
  return pdfBuffer;
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
