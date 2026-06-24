// ══════════════════════════════════════════════════════════════
// SERVICES/CONTRATO-SERVICE.JS — Geração e assinatura de contratos
// ══════════════════════════════════════════════════════════════

import crypto from 'crypto';
import { getPocketbaseClient } from '../config/pocketbase.js';
import { gerarPDFContrato } from './pdfService.js';
import { uploadFoto } from './s3Service.js';
import { enviarLinkContrato as enviarEmailContrato } from './emailService.js';
import { enviarLinkContrato as enviarWhatsContrato } from './whatsappService.js';
import { env } from '../config/env.js';

export async function gerarContrato(orcamentoId) {
  const pb = await getPocketbaseClient();

  const orcamento = await pb.collection('orcamentos').getOne(orcamentoId);
  const cliente = await pb.collection('clientes').getOne(orcamento.cliente_id);

  // Gerar número sequencial
  const total = await pb.collection('contratos').getList(1, 1);
  const numero = `CTR-${String(total.totalItems + 1).padStart(5, '0')}`;

  // Gerar token único para URL pública
  const token = crypto.randomUUID();

  // Gerar conteúdo HTML do contrato
  const conteudoHtml = gerarConteudoHtml(orcamento, cliente);

  const contrato = await pb.collection('contratos').create({
    numero,
    cliente_id: cliente.id,
    orcamento_id: orcamentoId,
    titulo: `Contrato — ${orcamento.tipo_evento} — ${cliente.nome}`,
    conteudo_html: conteudoHtml,
    status: 'rascunho',
    token_assinatura: token,
  });

  // Atualizar orçamento
  await pb.collection('orcamentos').update(orcamentoId, {
    contrato_gerado: true,
    contrato_id: contrato.id,
  });

  return contrato;
}

export async function enviarParaAssinatura(contratoId) {
  const pb = await getPocketbaseClient();

  const contrato = await pb.collection('contratos').getOne(contratoId);
  const cliente = await pb.collection('clientes').getOne(contrato.cliente_id);

  const linkAssinatura = `${env.FRONTEND_URL}/contrato/${contrato.token_assinatura}`;

  // Enviar por email
  if (cliente.email) {
    await enviarEmailContrato(cliente.email, cliente.nome, linkAssinatura);
  }

  // Enviar por WhatsApp
  if (cliente.whatsapp_numero) {
    await enviarWhatsContrato(cliente.whatsapp_numero, cliente.nome, linkAssinatura);
  }

  // Atualizar status
  await pb.collection('contratos').update(contratoId, {
    status: 'enviado',
    enviado_em: new Date().toISOString(),
  });

  return { linkAssinatura };
}

export async function assinarContrato(token, { assinatura_imagem, ip, userAgent }) {
  const pb = await getPocketbaseClient();

  const contratos = await pb.collection('contratos').getFullList({
    filter: `token_assinatura = "${token}"`,
  });

  if (contratos.length === 0) {
    throw Object.assign(new Error('Contrato não encontrado'), { status: 404 });
  }

  const contrato = contratos[0];

  if (contrato.status === 'assinado') {
    throw Object.assign(new Error('Contrato já foi assinado'), { status: 409 });
  }

  // Gerar hash de não-repúdio
  const hashData = `${contrato.id}|${contrato.cliente_id}|${ip}|${userAgent}|${new Date().toISOString()}`;
  const hash = crypto.createHash('sha256').update(hashData).digest('hex');

  // Atualizar contrato
  const contratoAtualizado = await pb.collection('contratos').update(contrato.id, {
    status: 'assinado',
    assinado_em: new Date().toISOString(),
    assinatura_ip: ip,
    assinatura_user_agent: userAgent,
    assinatura_imagem,
    assinatura_hash: hash,
  });

  // Gerar PDF
  const cliente = await pb.collection('clientes').getOne(contrato.cliente_id);
  const pdfBuffer = await gerarPDFContrato(contratoAtualizado, cliente);

  // Upload PDF para S3
  const pdfKey = `contratos/${contrato.id}/${contrato.numero}.pdf`;
  const { url } = await uploadFoto(pdfBuffer, pdfKey, 'application/pdf');

  await pb.collection('contratos').update(contrato.id, {
    pdf_s3_key: pdfKey,
    pdf_url: url,
  });

  return { success: true, hash, pdf_url: url };
}

function gerarConteudoHtml(orcamento, cliente) {
  return `
    <h2>CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS</h2>

    <h3>1. DAS PARTES</h3>
    <p><strong>CONTRATANTE:</strong> ${cliente.nome}, CPF ${cliente.cpf || '___.___.___-__'}, 
    residente em ${cliente.endereco || '[endereço]'}, ${cliente.cidade || '[cidade]'}/${cliente.estado || '[UF]'}.</p>
    <p><strong>CONTRATADO:</strong> Horizons Fotografia.</p>

    <h3>2. DO OBJETO</h3>
    <p>Prestação de serviços fotográficos para o evento: <strong>${orcamento.tipo_evento}</strong></p>
    <p>Data do evento: <strong>${orcamento.data_evento || 'A definir'}</strong></p>
    <p>Local: <strong>${orcamento.local_evento || 'A definir'}</strong></p>

    <h3>3. DO VALOR</h3>
    <p>Valor total: <strong>R$ ${orcamento.valor_total.toFixed(2)}</strong></p>
    ${orcamento.valor_sinal ? `<p>Sinal: <strong>R$ ${orcamento.valor_sinal.toFixed(2)}</strong></p>` : ''}
    ${orcamento.valor_restante ? `<p>Restante: <strong>R$ ${orcamento.valor_restante.toFixed(2)}</strong></p>` : ''}

    <h3>4. DA ENTREGA</h3>
    <p>As fotos serão entregues em formato digital através do portal do cliente, em até 30 dias úteis após o evento.</p>

    <h3>5. DOS DIREITOS AUTORAIS</h3>
    <p>As imagens produzidas são de autoria do CONTRATADO, que cede ao CONTRATANTE o direito de uso pessoal e não comercial.</p>

    <h3>6. DO CANCELAMENTO</h3>
    <p>Em caso de cancelamento pelo CONTRATANTE com menos de 7 dias de antecedência, o sinal não será devolvido.</p>

    <h3>7. DO FORO</h3>
    <p>Fica eleito o foro da comarca de [cidade] para dirimir quaisquer dúvidas oriundas deste contrato.</p>
  `;
}
