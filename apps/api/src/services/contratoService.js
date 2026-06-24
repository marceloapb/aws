// ══════════════════════════════════════════════════════════════
// SERVICES/CONTRATO-SERVICE.JS — Lógica de contratos
// ══════════════════════════════════════════════════════════════

import crypto from 'crypto';
import { getPocketbaseClient } from '../config/pocketbase.js';
import { gerarPdfContrato } from './pdfService.js';
import { enviarLinkContrato as enviarEmailContrato } from './emailService.js';
import { enviarLinkContrato as enviarWhatsContrato } from './whatsappService.js';
import { env } from '../config/env.js';

export async function gerarContrato(orcamentoId, conteudoHtml) {
  const pb = await getPocketbaseClient();

  const orcamento = await pb.collection('orcamentos').getOne(orcamentoId);
  const cliente = await pb.collection('clientes').getOne(orcamento.cliente_id);

  // Gerar número sequencial
  const total = await pb.collection('contratos').getList(1, 1, { sort: '-created' });
  const nextNum = (total.totalItems + 1).toString().padStart(5, '0');
  const numero = `CTR-${nextNum}`;

  // Criar contrato
  const contrato = await pb.collection('contratos').create({
    numero,
    cliente_id: cliente.id,
    orcamento_id: orcamentoId,
    titulo: `Contrato — ${orcamento.tipo_evento} — ${cliente.nome}`,
    conteudo_html: conteudoHtml,
    status: 'rascunho',
    token_assinatura: crypto.randomUUID(),
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
  const assinatura_hash = crypto.createHash('sha256').update(hashData).digest('hex');

  // Atualizar contrato
  const contratoAtualizado = await pb.collection('contratos').update(contrato.id, {
    status: 'assinado',
    assinado_em: new Date().toISOString(),
    assinatura_ip: ip,
    assinatura_user_agent: userAgent,
    assinatura_imagem,
    assinatura_hash,
  });

  // Gerar PDF
  const cliente = await pb.collection('clientes').getOne(contrato.cliente_id);
  const { s3_key, url } = await gerarPdfContrato(contratoAtualizado, cliente);

  await pb.collection('contratos').update(contrato.id, {
    pdf_s3_key: s3_key,
    pdf_url: url,
  });

  return { ...contratoAtualizado, pdf_url: url };
}

export default { gerarContrato, enviarParaAssinatura, assinarContrato };
