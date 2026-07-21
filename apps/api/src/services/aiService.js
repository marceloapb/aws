/**
 * Serviço de IA — Amazon Bedrock (Claude 3 Haiku)
 * Gera captions para Instagram, textos para contratos, etc.
 */

const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
const MODEL_ID = 'amazon.nova-micro-v1:0';
const VISION_MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

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

  const mediaType = contentType.includes('png') ? 'image/png' : 'image/jpeg';

  const command = new ConverseCommand({
    modelId: VISION_MODEL_ID,
    messages: [{
      role: 'user',
      content: [
        { image: { format: mediaType.split('/')[1], source: { bytes: Buffer.from(imageBase64, 'base64') } } },
        { text: prompt },
      ],
    }],
    inferenceConfig: { maxTokens: 500, temperature: 0.3 },
  });

  const response = await bedrock.send(command);
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
