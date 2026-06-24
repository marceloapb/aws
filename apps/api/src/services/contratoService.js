// ══════════════════════════════════════════════════════════════
// SERVICES/CONTRATO-SERVICE.JS — Geração e assinatura de contratos
// ══════════════════════════════════════════════════════════════

import { getPocketbaseClient } from '../config/pocketbase.js';
import { env } from '../config/env.js';
import { enviarNotificacaoContrato } from './whatsappService.js';
import { features } from '../config/env.js';
import crypto from 'crypto';

export async function gerarContrato(orcamentoId) {
  const pb = await getPocketbaseClient();

  const orcamento = await pb.collection('orcamentos').getOne(orcamentoId, { expand: 'cliente_id' });
  const cliente = orcamento.expand?.cliente_id;

  if (!cliente) throw new Error('Cliente não encontrado no orçamento');

  // Buscar template de contrato
  const configs = await pb.collection('configuracoes').getFullList({ filter: 'chave = "contrato_template"' });
  let template = configs[0]?.valor || getTemplateDefault();

  // Substituir variáveis
  template = template
    .replace(/{{cliente_nome}}/g, cliente.nome)
    .replace(/{{cliente_cpf}}/g, cliente.cpf || '')
    .replace(/{{cliente_email}}/g, cliente.email || '')
    .replace(/{{tipo_evento}}/g, orcamento.tipo_evento || '')
    .replace(/{{data_evento}}/g, orcamento.data_evento || '')
    .replace(/{{valor_total}}/g, `R$ ${orcamento.valor_total?.toFixed(2) || '0.00'}`)
    .replace(/{{data_geracao}}/g, new Date().toLocaleDateString('pt-BR'));

  // Gerar token de acesso único
  const tokenAcesso = crypto.randomBytes(32).toString('hex');

  const contrato = await pb.collection('contratos').create({
    cliente_id: cliente.id,
    orcamento_id: orcamentoId,
    conteudo_html: template,
    status: 'gerado',
    token_acesso: tokenAcesso,
    valor: orcamento.valor_total,
  });

  return contrato;
}

export async function enviarParaAssinatura(contratoId) {
  const pb = await getPocketbaseClient();
  const contrato = await pb.collection('contratos').getOne(contratoId, { expand: 'cliente_id' });
  const cliente = contrato.expand?.cliente_id;

  if (!cliente) throw new Error('Cliente não encontrado');

  // Atualizar status
  await pb.collection('contratos').update(contratoId, {
    status: 'enviado',
    enviado_em: new Date().toISOString(),
  });

  // Enviar WhatsApp
  const link = `${env.FRONTEND_URL}/contrato/${contrato.token_acesso}`;

  if (features.whatsapp && cliente.whatsapp_numero) {
    await enviarNotificacaoContrato(cliente.whatsapp_numero, cliente.nome, link);
  }

  return { link, enviado_whatsapp: !!cliente.whatsapp_numero };
}

export async function assinarContrato(tokenAcesso, dadosAssinatura) {
  const pb = await getPocketbaseClient();

  const contratos = await pb.collection('contratos').getFullList({
    filter: `token_acesso = "${tokenAcesso}" && status != "assinado"`,
  });

  if (contratos.length === 0) throw new Error('Contrato não encontrado ou já assinado');
  const contrato = contratos[0];

  // Dados de não-repúdio
  const naoRepudio = {
    ip: dadosAssinatura.ip,
    user_agent: dadosAssinatura.user_agent,
    timestamp: new Date().toISOString(),
    hash_conteudo: crypto.createHash('sha256').update(contrato.conteudo_html).digest('hex'),
    aceite_termos: dadosAssinatura.aceite_termos,
    nome_digitado: dadosAssinatura.nome_digitado,
  };

  await pb.collection('contratos').update(contrato.id, {
    status: 'assinado',
    assinado_em: new Date().toISOString(),
    dados_assinatura: JSON.stringify(naoRepudio),
  });

  return { success: true, contrato_id: contrato.id };
}

function getTemplateDefault() {
  return `<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS</h1>
<p>Contratante: {{cliente_nome}} (CPF: {{cliente_cpf}})</p>
<p>Tipo de evento: {{tipo_evento}}</p>
<p>Data do evento: {{data_evento}}</p>
<p>Valor total: {{valor_total}}</p>
<p>Data de geração: {{data_geracao}}</p>`;
}

export default { gerarContrato, enviarParaAssinatura, assinarContrato };
