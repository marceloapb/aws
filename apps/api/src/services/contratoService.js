// ══════════════════════════════════════════════════════════════
// SERVICES/CONTRATO-SERVICE.JS — Geração e assinatura de contratos
// ══════════════════════════════════════════════════════════════

import { getPocketbaseClient } from '../config/pocketbase.js';
import { enviarTemplate } from './whatsappService.js';
import { env } from '../config/env.js';

const TEMPLATES = {
  casamento: 'contrato_casamento',
  ensaio: 'contrato_ensaio',
  aniversario: 'contrato_aniversario',
  corporativo: 'contrato_corporativo',
  default: 'contrato_padrao',
};

export async function gerarContrato(orcamentoId) {
  const pb = await getPocketbaseClient();

  const orcamento = await pb.collection('orcamentos').getOne(orcamentoId, { expand: 'cliente_id' });
  const cliente = orcamento.expand?.cliente_id;

  if (!cliente) throw new Error('Cliente não encontrado no orçamento');

  // Buscar template
  const templateKey = TEMPLATES[orcamento.tipo_evento] || TEMPLATES.default;
  const templates = await pb.collection('configuracoes').getFullList({ filter: `chave = "${templateKey}"` });
  let conteudo = templates[0]?.valor || getTemplateDefault(orcamento.tipo_evento);

  // Substituir variáveis
  conteudo = conteudo
    .replace(/{{cliente_nome}}/g, cliente.nome)
    .replace(/{{cliente_cpf}}/g, cliente.cpf || '')
    .replace(/{{cliente_email}}/g, cliente.email || '')
    .replace(/{{cliente_endereco}}/g, cliente.endereco || '')
    .replace(/{{tipo_evento}}/g, orcamento.tipo_evento)
    .replace(/{{data_evento}}/g, orcamento.data_evento || '')
    .replace(/{{local_evento}}/g, orcamento.local || '')
    .replace(/{{valor_total}}/g, `R$ ${orcamento.valor_total?.toFixed(2)}`)
    .replace(/{{data_hoje}}/g, new Date().toLocaleDateString('pt-BR'));

  // Criar contrato
  const contrato = await pb.collection('contratos').create({
    cliente_id: cliente.id,
    orcamento_id: orcamentoId,
    conteudo_html: conteudo,
    status: 'rascunho',
    token_assinatura: crypto.randomUUID(),
  });

  return contrato;
}

export async function enviarParaAssinatura(contratoId) {
  const pb = await getPocketbaseClient();
  const contrato = await pb.collection('contratos').getOne(contratoId, { expand: 'cliente_id' });
  const cliente = contrato.expand?.cliente_id;

  if (!cliente) throw new Error('Cliente não encontrado');

  const link = `${env.FRONTEND_URL}/contrato/${contrato.token_assinatura}`;

  // Atualizar status
  await pb.collection('contratos').update(contratoId, {
    status: 'enviado',
    enviado_em: new Date().toISOString(),
  });

  // Enviar WhatsApp se disponível
  if (cliente.whatsapp_numero) {
    try {
      await enviarTemplate(cliente.whatsapp_numero, 'contrato_assinatura', [cliente.nome, link]);
    } catch (error) {
      console.error('[CONTRATO] Erro ao enviar WhatsApp:', error.message);
    }
  }

  return { link, enviado_whatsapp: !!cliente.whatsapp_numero };
}

export async function assinarContrato(token, dadosAssinatura) {
  const pb = await getPocketbaseClient();

  const contratos = await pb.collection('contratos').getFullList({ filter: `token_assinatura = "${token}"` });
  if (contratos.length === 0) throw new Error('Contrato não encontrado');

  const contrato = contratos[0];
  if (contrato.status === 'assinado') throw new Error('Contrato já foi assinado');

  await pb.collection('contratos').update(contrato.id, {
    status: 'assinado',
    assinado_em: new Date().toISOString(),
    ip_assinatura: dadosAssinatura.ip,
    user_agent_assinatura: dadosAssinatura.userAgent,
    assinatura_hash: dadosAssinatura.hash,
  });

  return { success: true };
}

function getTemplateDefault(tipoEvento) {
  return `<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS</h1>
<p>Contratante: {{cliente_nome}}, CPF: {{cliente_cpf}}</p>
<p>Tipo de evento: {{tipo_evento}}</p>
<p>Data: {{data_evento}}</p>
<p>Local: {{local_evento}}</p>
<p>Valor: {{valor_total}}</p>
<p>Data: {{data_hoje}}</p>`;
}

export default { gerarContrato, enviarParaAssinatura, assinarContrato };
