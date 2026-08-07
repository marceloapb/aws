// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-SITE-AI.JS — IA para Site Builder (Amazon Bedrock)
// Endpoints de geração de conteúdo, SEO, FAQ, páginas inteiras
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const { randomUUID } = require('crypto');

const router = Router();
const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'amazon.nova-micro-v1:0';

// ─── Helpers ────────────────────────────────────────────────

async function callBedrock(prompt, { maxTokens = 1000, temperature = 0.7 } = {}) {
  const command = new ConverseCommand({
    modelId: MODEL_ID,
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    inferenceConfig: { maxTokens, temperature, topP: 0.9 },
  });

  const response = await bedrock.send(command);
  return response.output.message.content[0].text.trim();
}

function parseJSON(text) {
  try {
    const clean = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

// ─── POST /generate-text — Gerar texto para campo específico ─

router.post('/generate-text', async (req, res) => {
  try {
    const { tipo_campo, contexto, tom = 'profissional', idioma = 'pt-BR' } = req.body;

    if (!tipo_campo) {
      return res.status(400).json({ success: false, message: 'tipo_campo é obrigatório' });
    }

    const prompts = {
      titulo: `Gere um título curto e impactante para a seção "${contexto || 'principal'}" de um site de fotógrafo profissional. Tom: ${tom}. Máximo 8 palavras. Responda APENAS com o título, sem aspas.`,
      subtitulo: `Gere um subtítulo envolvente para acompanhar o título "${contexto || ''}" em um site de fotógrafo profissional. Tom: ${tom}. Máximo 20 palavras. Responda APENAS com o subtítulo, sem aspas.`,
      conteudo: `Escreva um parágrafo de texto para a seção "${contexto || 'sobre'}" de um site de fotógrafo profissional. Tom: ${tom}. 2-4 frases bem construídas. Responda APENAS com o texto, sem aspas nem formatação.`,
      botao_texto: `Gere um texto curto para botão de chamada para ação (CTA) para um site de fotógrafo. Contexto: "${contexto || 'contato'}". Tom: ${tom}. Máximo 4 palavras. Exemplos de referência: "Fale comigo", "Agendar sessão", "Ver portfolio". Responda APENAS com o texto do botão.`,
      citacao: `Gere uma citação inspiradora sobre fotografia ou momentos especiais. Tom: ${tom}. Máximo 30 palavras. Responda APENAS com a citação, sem aspas.`,
    };

    const prompt = prompts[tipo_campo] || `Gere um texto curto para o campo "${tipo_campo}" de um site de fotógrafo profissional. Contexto: "${contexto || ''}". Tom: ${tom}. Responda APENAS com o texto gerado.`;

    const resultado = await callBedrock(prompt, { maxTokens: 200, temperature: 0.8 });

    res.json({ success: true, data: { texto: resultado } });
  } catch (error) {
    console.error('[AI] generate-text error:', error);
    res.status(500).json({ success: false, message: `Erro ao gerar texto: ${error.message}` });
  }
});

// ─── POST /generate-faq — Gerar perguntas frequentes ────────

router.post('/generate-faq', async (req, res) => {
  try {
    const { servicos = [], quantidade = 5, nicho = 'fotografia' } = req.body;

    const servicosTexto = servicos.length > 0
      ? `Serviços oferecidos: ${servicos.join(', ')}.`
      : 'Serviços gerais de fotografia profissional (casamentos, ensaios, eventos).';

    const prompt = `Você é um fotógrafo profissional brasileiro especializado em ${nicho}.
${servicosTexto}

Gere ${quantidade} perguntas frequentes (FAQ) que clientes potenciais fariam, com respostas profissionais e informativas.

Retorne APENAS um JSON válido (array) no formato:
[
  { "pergunta": "...", "resposta": "..." },
  ...
]

Cada resposta deve ter 1-3 frases. Seja natural e profissional. Sem markdown.`;

    const resultado = await callBedrock(prompt, { maxTokens: 1500, temperature: 0.7 });
    const items = parseJSON(resultado);

    if (!items || !Array.isArray(items)) {
      return res.status(500).json({ success: false, message: 'Erro ao processar resposta da IA' });
    }

    res.json({ success: true, data: { items } });
  } catch (error) {
    console.error('[AI] generate-faq error:', error);
    res.status(500).json({ success: false, message: `Erro ao gerar FAQ: ${error.message}` });
  }
});

// ─── POST /generate-services — Gerar serviços ───────────────

router.post('/generate-services', async (req, res) => {
  try {
    const { nicho = 'fotografia', quantidade = 4 } = req.body;

    const prompt = `Você é um fotógrafo profissional brasileiro especializado em ${nicho}.

Gere ${quantidade} serviços que você oferece, com nome, descrição curta e emoji como ícone.

Retorne APENAS um JSON válido (array) no formato:
[
  { "nome": "...", "descricao": "...", "icone": "emoji" },
  ...
]

Use emojis relevantes como ícone. Descrições com 1-2 frases. Sem markdown.`;

    const resultado = await callBedrock(prompt, { maxTokens: 800, temperature: 0.7 });
    const items = parseJSON(resultado);

    if (!items || !Array.isArray(items)) {
      return res.status(500).json({ success: false, message: 'Erro ao processar resposta da IA' });
    }

    res.json({ success: true, data: { items } });
  } catch (error) {
    console.error('[AI] generate-services error:', error);
    res.status(500).json({ success: false, message: `Erro ao gerar serviços: ${error.message}` });
  }
});

// ─── POST /generate-seo — Gerar SEO para página ─────────────

router.post('/generate-seo', async (req, res) => {
  try {
    const { titulo_pagina, blocos = [], nicho = 'fotografia' } = req.body;

    if (!titulo_pagina) {
      return res.status(400).json({ success: false, message: 'titulo_pagina é obrigatório' });
    }

    // Extrair conteúdo dos blocos para contexto
    const conteudoBlocos = blocos.map(b => {
      const props = b.props || b.data || {};
      return `[${b.type}] ${props.titulo || ''} ${props.conteudo || props.subtitulo || ''}`.trim();
    }).filter(Boolean).join('. ');

    const prompt = `Você é um especialista em SEO para sites de fotógrafos profissionais brasileiros.

Página: "${titulo_pagina}"
Nicho: ${nicho}
Conteúdo da página: ${conteudoBlocos || 'Página de fotógrafo profissional'}

Gere meta tags SEO otimizadas para buscadores. Retorne APENAS um JSON válido:
{
  "seo_titulo": "Título SEO (50-60 caracteres, com palavra-chave principal)",
  "seo_descricao": "Meta description (130-155 caracteres, persuasiva com CTA implícito)"
}

Sem markdown, apenas o JSON.`;

    const resultado = await callBedrock(prompt, { maxTokens: 300, temperature: 0.5 });
    const seo = parseJSON(resultado);

    if (!seo || !seo.seo_titulo) {
      return res.status(500).json({ success: false, message: 'Erro ao processar resposta da IA' });
    }

    res.json({ success: true, data: seo });
  } catch (error) {
    console.error('[AI] generate-seo error:', error);
    res.status(500).json({ success: false, message: `Erro ao gerar SEO: ${error.message}` });
  }
});

// ─── POST /rewrite — Reescrever/melhorar texto ──────────────

router.post('/rewrite', async (req, res) => {
  try {
    const { texto, estilo = 'profissional', instrucao = '' } = req.body;

    if (!texto) {
      return res.status(400).json({ success: false, message: 'texto é obrigatório' });
    }

    const estilos = {
      profissional: 'profissional e confiável',
      emocional: 'emocional e envolvente, tocando o coração do leitor',
      criativo: 'criativo e único, com personalidade',
      formal: 'formal e elegante, sofisticado',
      direto: 'direto e objetivo, sem enrolação',
      poetico: 'poético e artístico, com metáforas sutis',
    };

    const estiloDesc = estilos[estilo] || estilos.profissional;
    const instrucaoExtra = instrucao ? `\nInstrução adicional: ${instrucao}` : '';

    const prompt = `Reescreva o texto abaixo mantendo a mesma ideia, mas com tom ${estiloDesc}.${instrucaoExtra}

Texto original:
"${texto}"

Responda APENAS com o texto reescrito, sem aspas nem explicações. Mantenha o mesmo tamanho aproximado.`;

    const resultado = await callBedrock(prompt, { maxTokens: 500, temperature: 0.7 });

    res.json({ success: true, data: { texto: resultado } });
  } catch (error) {
    console.error('[AI] rewrite error:', error);
    res.status(500).json({ success: false, message: `Erro ao reescrever: ${error.message}` });
  }
});

// ─── POST /generate-page — Gerar página inteira com IA ──────

router.post('/generate-page', async (req, res) => {
  try {
    const { descricao, tipo_pagina = 'landing', nicho = 'fotografia', nome_fotografo = '' } = req.body;

    if (!descricao) {
      return res.status(400).json({ success: false, message: 'descricao é obrigatória' });
    }

    const prompt = `Você é um web designer especialista em criar sites para fotógrafos profissionais brasileiros.

O fotógrafo pediu: "${descricao}"
${nome_fotografo ? `Nome: ${nome_fotografo}` : ''}
Nicho: ${nicho}
Tipo: ${tipo_pagina}

Crie uma página completa com blocos. Tipos disponíveis: hero, text, gallery, testimonials, cta, faq, video, separator, services.

Variantes por tipo:
- hero: fullscreen, minimal, split
- text: simples, destaque, citacao
- gallery: grid, masonry, carousel
- testimonials: carousel, grid, lista
- cta: simples, destaque, banner
- faq: accordion, cards, lista
- video: contained, fullwidth, background
- separator: linha, espaco, decorativo
- services: cards, grid, lista

Retorne APENAS um JSON válido no formato:
{
  "titulo": "Título da página",
  "slug": "slug-da-pagina",
  "blocos": [
    {
      "type": "hero",
      "variant": "fullscreen",
      "props": { "titulo": "...", "subtitulo": "...", "botao_texto": "...", "botao_url": "..." }
    },
    {
      "type": "text",
      "variant": "simples",
      "props": { "titulo": "...", "conteudo": "..." }
    }
  ],
  "seo_titulo": "Título SEO (50-60 chars)",
  "seo_descricao": "Meta description (130-155 chars)"
}

Regras:
- Use 4-7 blocos por página
- Comece com hero
- Termine com cta
- Todos os textos em português brasileiro
- Seja criativo mas profissional
- Adapte ao pedido do fotógrafo
- Sem markdown, apenas o JSON`;

    const resultado = await callBedrock(prompt, { maxTokens: 2000, temperature: 0.8 });
    const page = parseJSON(resultado);

    if (!page || !page.blocos) {
      return res.status(500).json({ success: false, message: 'Erro ao processar resposta da IA' });
    }

    // Add UUIDs to blocks
    page.blocos = page.blocos.map(b => ({ ...b, id: randomUUID() }));

    res.json({ success: true, data: page });
  } catch (error) {
    console.error('[AI] generate-page error:', error);
    res.status(500).json({ success: false, message: `Erro ao gerar página: ${error.message}` });
  }
});

// ─── POST /suggest-blocks — Sugerir blocos baseado no contexto

router.post('/suggest-blocks', async (req, res) => {
  try {
    const { blocos_existentes = [], tipo_pagina = 'home', nicho = 'fotografia' } = req.body;

    const blocosAtual = blocos_existentes.map(b => b.type).join(', ') || 'nenhum';

    const prompt = `Você é um web designer para fotógrafos. A página ${tipo_pagina} já tem estes blocos: [${blocosAtual}].

Sugira os próximos 3 blocos que fariam sentido para esta página de ${nicho}.

Tipos disponíveis: hero, text, gallery, testimonials, cta, faq, video, separator, services.

Retorne APENAS um JSON array:
[
  { "type": "...", "motivo": "Por que adicionar este bloco (1 frase)" }
]

Sem markdown, apenas JSON.`;

    const resultado = await callBedrock(prompt, { maxTokens: 400, temperature: 0.6 });
    const sugestoes = parseJSON(resultado);

    if (!sugestoes || !Array.isArray(sugestoes)) {
      return res.status(500).json({ success: false, message: 'Erro ao processar sugestões' });
    }

    res.json({ success: true, data: { sugestoes } });
  } catch (error) {
    console.error('[AI] suggest-blocks error:', error);
    res.status(500).json({ success: false, message: `Erro ao sugerir blocos: ${error.message}` });
  }
});

// ─── POST /chat — Chat livre com assistente IA ──────────────

router.post('/chat', async (req, res) => {
  try {
    const { mensagem, contexto_pagina = null } = req.body;

    if (!mensagem) {
      return res.status(400).json({ success: false, message: 'mensagem é obrigatória' });
    }

    const contextoExtra = contexto_pagina
      ? `\nContexto da página atual: título "${contexto_pagina.titulo}", ${contexto_pagina.blocos_count || 0} blocos.`
      : '';

    const prompt = `Você é um assistente de IA especializado em criação de sites para fotógrafos profissionais brasileiros. Você ajuda com:
- Textos e copywriting
- Sugestões de layout/blocos
- Dicas de SEO
- Estratégia de conversão
- Ideias de conteúdo
${contextoExtra}

Mensagem do usuário: "${mensagem}"

Responda de forma útil, concisa e prática. Use português brasileiro. Se for sugerir blocos/layouts, descreva-os de forma clara. Máximo 200 palavras.`;

    const resultado = await callBedrock(prompt, { maxTokens: 600, temperature: 0.7 });

    res.json({ success: true, data: { resposta: resultado } });
  } catch (error) {
    console.error('[AI] chat error:', error);
    res.status(500).json({ success: false, message: `Erro no chat: ${error.message}` });
  }
});

module.exports = router;
