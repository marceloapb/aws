/**
 * Serviço de IA — Amazon Bedrock (Claude 3 Haiku)
 * Gera captions para Instagram, textos para contratos, etc.
 */

const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
const MODEL_ID = 'amazon.nova-micro-v1:0';
// Modelo com visão para identificar equipamentos
// Usar modelo direto (sem cross-region inference prefix) para maior compatibilidade
const VISION_MODEL_ID = process.env.BEDROCK_VISION_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';

/**
 * Gera caption para Instagram
 */
async function gerarCaption({ tipo_evento, cliente_nome, tom = 'emocional', contexto = '', incluir_hashtags = true }) {
  const prompt = `Você é um fotógrafo profissional brasileiro especializado em ${tipo_evento || 'fotografia'}. 
Gere uma caption criativa e envolvente para Instagram.

Contexto:
- Tipo de sessão: ${tipo_evento || 'ensaio fotográfico'}
- Cliente: ${cliente_nome || 'cliente'}
- Tom desejado: ${tom}
${contexto ? `- Detalhes: ${contexto}` : ''}

Regras:
- Máximo 150 palavras na caption
- Use emojis com moderação (2-3 no máximo)
- Escreva em português brasileiro
- Seja autêntico e emocional
- ${incluir_hashtags ? 'Inclua 10-15 hashtags relevantes ao final separadas por espaço' : 'NÃO inclua hashtags'}

Responda APENAS com a caption pronta, sem explicações.`;

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    inferenceConfig: { maxTokens: 500, temperature: 0.7, topP: 0.9 },
  });

  const response = await bedrock.send(command);
  return response.output.message.content[0].text.trim();
}

/**
 * Gera texto para story do Instagram
 */
async function gerarTextoStory({ tipo_evento, cliente_nome, estilo = 'minimalista', prompt_livre = '' }) {
  const promptBase = prompt_livre
    ? `Você é um fotógrafo profissional brasileiro. O usuário quer um texto para Story do Instagram.\n\nPedido: ${prompt_livre}\n\nResponda APENAS com o texto do overlay (1-2 linhas curtas). Sem hashtags, sem emojis excessivos.`
    : `Gere um texto curto (máximo 2 linhas) para um Story de Instagram de um fotógrafo profissional.
Sessão: ${tipo_evento || 'ensaio'}
Cliente: ${cliente_nome || ''}
Estilo visual: ${estilo}

Responda APENAS com o texto do overlay (1-2 linhas curtas). Sem hashtags, sem emojis excessivos.`;

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    messages: [{ role: 'user', content: [{ text: promptBase }] }],
    inferenceConfig: { maxTokens: 100, temperature: 0.7, topP: 0.9 },
  });

  const response = await bedrock.send(command);
  return response.output.message.content[0].text.trim();
}

/**
 * Mapeia content_type para o formato aceito pelo Bedrock Converse API.
 * Formatos válidos: jpeg, png, gif, webp
 */
function resolveImageFormat(contentType) {
  if (!contentType) return 'jpeg';
  const ct = contentType.toLowerCase();
  if (ct.includes('png')) return 'png';
  if (ct.includes('gif')) return 'gif';
  if (ct.includes('webp')) return 'webp';
  // HEIC/HEIF não é suportado pelo Bedrock — fallback para jpeg
  // (o browser geralmente converte HEIC para jpeg ao usar FileReader)
  return 'jpeg';
}

/**
 * Identifica equipamento fotográfico a partir de uma imagem
 */
async function identificarEquipamento(imageBase64, contentType = 'image/jpeg') {
  const prompt = `Você é um especialista em equipamentos fotográficos. Analise esta imagem e identifique o equipamento.

Retorne APENAS um JSON válido (sem markdown, sem \`\`\`) com estes campos:
{
  "nome": "Nome completo do equipamento",
  "marca": "Marca (Canon, Nikon, Sony, etc)",
  "modelo": "Modelo específico",
  "categoria": "Uma de: Câmeras, Lentes, Flash, Iluminação, Tripés, Drones, Estabilizadores, Áudio, Acessórios, Outros",
  "numero_serie": "Se visível na imagem, caso contrário null",
  "descricao": "Breve descrição do equipamento e suas características",
  "valor_estimado": número estimado em reais (sem R$, apenas o número)
}

Se não conseguir identificar com certeza, use seu melhor palpite baseado na aparência.`;

  const format = resolveImageFormat(contentType);
  const imageBytes = Buffer.from(imageBase64, 'base64');

  // Bedrock limita imagens a 3.75 MB
  if (imageBytes.length > 3.75 * 1024 * 1024) {
    throw new Error('Imagem muito grande. O limite é 3.75 MB. Tente reduzir a resolução ou usar formato JPEG.');
  }

  const command = new ConverseCommand({
    modelId: VISION_MODEL_ID,
    messages: [{
      role: 'user',
      content: [
        { image: { format, source: { bytes: imageBytes } } },
        { text: prompt },
      ],
    }],
    inferenceConfig: { maxTokens: 500, temperature: 0.3 },
  });

  let response;
  try {
    response = await bedrock.send(command);
  } catch (err) {
    // Fornecer mensagem de erro mais clara para problemas comuns
    if (err.name === 'AccessDeniedException' || err.message?.includes('not authorized')) {
      throw new Error('Modelo de IA (Vision) não está habilitado na conta AWS. Verifique se o modelo Claude Haiku com visão está ativado no Amazon Bedrock.');
    }
    if (err.name === 'ValidationException') {
      throw new Error(`Erro de validação do Bedrock: ${err.message}`);
    }
    if (err.name === 'ThrottlingException') {
      throw new Error('Limite de requisições da IA atingido. Tente novamente em alguns segundos.');
    }
    throw new Error(`Erro ao chamar IA: ${err.message || err.name || 'desconhecido'}`);
  }

  const text = response.output.message.content[0].text.trim();

  // Parse JSON response
  try {
    // Remove possíveis backticks markdown
    const clean = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { nome: text, marca: '', modelo: '', categoria: 'Outros', numero_serie: null, descricao: '', valor_estimado: 0 };
  }
}

module.exports = { gerarCaption, gerarTextoStory, identificarEquipamento };
