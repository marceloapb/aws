const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const router = Router();

// GET /api/admin/contratos/modelos
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `TENANT#${tenantId}`, ':sk': 'MODELO_CONTRATO#' },
    }));
    res.json({ success: true, data: result.Items || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/contratos/modelos/:id
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: { ':pk': `TENANT#${tenantId}`, ':sk': `MODELO_CONTRATO#${req.params.id}` },
    }));
    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ success: false, message: 'Modelo não encontrado' });
    }
    res.json({ success: true, data: result.Items[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/contratos/modelos
router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { nome, tipo_evento, corpo_html, ativo = true } = req.body;
    if (!nome) return res.status(400).json({ success: false, message: 'Nome é obrigatório' });

    const id = crypto.randomUUID();
    const item = {
      id,
      PK: `TENANT#${tenantId}`,
      SK: `MODELO_CONTRATO#${id}`,
      GSI1PK: 'MODELO_CONTRATO',
      GSI1SK: `MODELO_CONTRATO#${id}`,
      tenant_id: tenantId,
      nome,
      tipo_evento: Array.isArray(tipo_evento) ? tipo_evento : (tipo_evento ? [tipo_evento] : []),
      corpo_html: corpo_html || '',
      ativo: ativo !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/contratos/modelos/:id
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { nome, tipo_evento, corpo_html, ativo } = req.body;
    const updates = {};
    if (nome !== undefined) updates.nome = nome;
    if (tipo_evento !== undefined) updates.tipo_evento = Array.isArray(tipo_evento) ? tipo_evento : [tipo_evento];
    if (corpo_html !== undefined) updates.corpo_html = corpo_html;
    if (ativo !== undefined) updates.ativo = ativo;
    updates.updated_at = new Date().toISOString();

    const keys = Object.keys(updates);
    const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
    const vals = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));

    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${tenantId}`, SK: `MODELO_CONTRATO#${req.params.id}` },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
      ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
      ReturnValues: 'ALL_NEW',
    }));

    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return res.status(404).json({ success: false, message: 'Modelo não encontrado' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/contratos/modelos/:id
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    await dynamo.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${tenantId}`, SK: `MODELO_CONTRATO#${req.params.id}` },
      ConditionExpression: 'attribute_exists(PK)',
    }));
    res.json({ success: true, message: 'Modelo excluído com sucesso' });
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return res.status(404).json({ success: false, message: 'Modelo não encontrado' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/contratos/modelos/importar
// Recebe arquivo base64 OU texto puro e usa IA para gerar o modelo HTML
router.post('/importar', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { texto_contrato, arquivo_base64, arquivo_nome, nome_modelo } = req.body;

    let textoFinal = texto_contrato || '';

    // Se recebeu arquivo base64, extrair texto no backend
    if (arquivo_base64 && !textoFinal) {
      const buffer = Buffer.from(arquivo_base64, 'base64');
      const nomeArquivo = (arquivo_nome || '').toLowerCase();

      if (nomeArquivo.endsWith('.txt')) {
        textoFinal = buffer.toString('utf-8');
      } else if (nomeArquivo.endsWith('.docx')) {
        // DOCX é ZIP com XMLs. Extrair texto das tags <w:t>
        textoFinal = extrairTextoDocx(buffer);
      } else if (nomeArquivo.endsWith('.pdf')) {
        // PDF: extrair strings legíveis do binário
        textoFinal = extrairTextoPdf(buffer);
      } else {
        // Tentar como texto
        textoFinal = buffer.toString('utf-8');
      }
    }

    if (!textoFinal || textoFinal.trim().length < 20) {
      return res.status(400).json({ success: false, message: 'Não foi possível extrair texto suficiente do arquivo. Envie o texto do contrato diretamente.' });
    }

    const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
    const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
    const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'amazon.nova-micro-v1:0';

    // Prompt otimizado para reproduzir 100% do contrato original
    const prompt = `Você é um designer de contratos especializado em reproduzir documentos com fidelidade total.

MISSÃO: Transformar o contrato abaixo em um modelo HTML que seja uma CÓPIA EXATA do original, apenas substituindo dados variáveis por tags.

REGRAS OBRIGATÓRIAS:
1. REPRODUZA 100% DO CONTRATO — cada parágrafo, cada cláusula, cada vírgula. NÃO resuma, NÃO omita, NÃO reescreva.
2. MANTENHA O LAYOUT IDÊNTICO — se tem cabeçalho centralizado, mantenha centralizado. Se tem bordas, mantenha bordas. Se tem tabela, mantenha tabela.
3. PRESERVE AS CORES EXATAS — se o contrato menciona ou usa cores (títulos em destaque, bordas coloridas, etc.), reproduza-as com CSS inline. Use cores profissionais como #333333 para texto, #EA580C ou equivalente para destaques.
4. MANTENHA TIPOGRAFIA — use font-family: 'Georgia', serif para textos formais ou 'Helvetica Neue', Arial, sans-serif. Mantenha negrito, itálico, sublinhado exatamente onde aparecem.
5. IDENTIFIQUE AUTOMATICAMENTE onde estão os dados variáveis e substitua APENAS esses trechos pelas tags corretas.

TAGS DISPONÍVEIS (use SOMENTE estas, posicione-as onde o dado original estava):
- {{cliente_nome}} → onde aparece o nome do contratante/cliente
- {{cliente_cpf}} → onde aparece CPF ou CNPJ do cliente
- {{cliente_email}} → onde aparece e-mail do cliente
- {{cliente_endereco}} → onde aparece endereço do cliente
- {{valor_total}} → onde aparece o valor do serviço/contrato
- {{tipo_evento}} → onde aparece o tipo de evento (casamento, ensaio, etc.)
- {{data_evento}} → onde aparece a data do evento
- {{local_evento}} → onde aparece o local/endereço do evento
- {{data_hoje}} → onde aparece a data de assinatura/geração do contrato

COMO POSICIONAR AS TAGS:
- Se o contrato diz "Fulano de Tal, inscrito no CPF 123.456.789-00" → "{{cliente_nome}}, inscrito no CPF {{cliente_cpf}}"
- Se o contrato diz "no valor de R$ 5.000,00" → "no valor de {{valor_total}}"
- Se o contrato diz "evento no dia 15/03/2025" → "evento no dia {{data_evento}}"
- Se um dado NÃO aparece no contrato original, NÃO insira a tag forçadamente

ESTRUTURA DO HTML:
- Comece com <div style="..."> como container principal
- Use estilos inline em TODOS os elementos (não use <style> ou classes CSS)
- Largura máxima 800px, padding adequado, fundo branco
- Títulos com font-size maior, bold, possivelmente centralizados
- Parágrafos com text-align: justify, line-height: 1.6
- Cláusulas numeradas se o original numera
- Se houver logotipo ou imagem referenciada, coloque um placeholder [LOGO] estilizado
- Assinaturas no final com linhas _____ se o original tem

CONTRATO ORIGINAL (reproduza 100%):
${textoFinal}

Responda APENAS com o HTML completo. Sem explicações, sem markdown, sem \`\`\`. Comece direto com <div`;

    const command = new ConverseCommand({
      modelId: MODEL_ID,
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 8000, temperature: 0.2, topP: 0.9 },
    });

    const response = await bedrock.send(command);
    let corpoHtml = response.output.message.content[0].text.trim();

    // Limpar possíveis wrappers de markdown
    if (corpoHtml.startsWith('```html')) {
      corpoHtml = corpoHtml.replace(/^```html\n?/, '').replace(/\n?```$/, '');
    } else if (corpoHtml.startsWith('```')) {
      corpoHtml = corpoHtml.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    // Identificar os tipos de evento mencionados no contrato
    const tiposDetectados = [];
    const tiposMap = {
      'casamento': 'Casamento',
      'aniversário': 'Aniversário',
      'aniversario': 'Aniversário',
      'corporativo': 'Corporativo',
      'empresa': 'Corporativo',
      'formatura': 'Formatura',
      'ensaio': 'Ensaio',
      'newborn': 'Ensaio',
      'gestante': 'Ensaio',
    };
    const textoLower = textoFinal.toLowerCase();
    for (const [keyword, tipo] of Object.entries(tiposMap)) {
      if (textoLower.includes(keyword) && !tiposDetectados.includes(tipo)) {
        tiposDetectados.push(tipo);
      }
    }
    if (tiposDetectados.length === 0) tiposDetectados.push('Outro');

    // Salvar o modelo automaticamente
    const id = crypto.randomUUID();
    const item = {
      id,
      PK: `TENANT#${tenantId}`,
      SK: `MODELO_CONTRATO#${id}`,
      GSI1PK: 'MODELO_CONTRATO',
      GSI1SK: `MODELO_CONTRATO#${id}`,
      tenant_id: tenantId,
      nome: nome_modelo || 'Modelo Importado',
      tipo_evento: tiposDetectados,
      corpo_html: corpoHtml,
      ativo: true,
      importado: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    res.status(201).json({
      success: true,
      data: item,
      tipos_detectados: tiposDetectados,
      texto_extraido: textoFinal.substring(0, 200) + '...',
    });
  } catch (error) {
    console.error('[MODELOS] Erro ao importar contrato:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Extrai texto de um arquivo DOCX (ZIP com XML)
 * DOCX contém word/document.xml com tags <w:t> para texto
 */
function extrairTextoDocx(buffer) {
  try {
    const content = buffer.toString('binary');
    // Procurar o conteúdo do document.xml dentro do ZIP
    // DOCX/ZIP armazena XML; procuramos tags <w:t>
    const utf8Content = buffer.toString('utf-8');

    // Extrair texto das tags <w:t>
    const wtMatches = utf8Content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (wtMatches && wtMatches.length > 5) {
      const texto = wtMatches
        .map(m => m.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (texto.length > 50) return texto;
    }

    // Fallback: extrair strings legíveis com regex (UTF-8 válido)
    const legivel = utf8Content.match(/[\w\sÀ-ÿçÇ.,;:!?(){}[\]"'\/\-@#$%&*+=]{5,}/g) || [];
    const fallback = legivel.join(' ').replace(/\s+/g, ' ').trim();
    return fallback || '';
  } catch (err) {
    console.error('[MODELOS] Erro ao extrair texto DOCX:', err.message);
    return '';
  }
}

/**
 * Extrai texto legível de um arquivo PDF (heurística básica)
 * Para extração robusta, considerar usar pdf-parse ou similar
 */
function extrairTextoPdf(buffer) {
  try {
    const content = buffer.toString('latin1');
    const textParts = [];
    let current = '';

    for (let i = 0; i < content.length; i++) {
      const code = content.charCodeAt(i);
      if ((code >= 32 && code <= 126) || (code >= 192 && code <= 255)) {
        current += content[i];
      } else {
        if (current.length > 4) textParts.push(current);
        current = '';
      }
    }
    if (current.length > 4) textParts.push(current);

    // Filtrar lixo típico de PDF (comandos internos)
    const filtered = textParts.filter(p =>
      !p.match(/^[\d\s.]+$/) &&
      !p.startsWith('/') &&
      !p.startsWith('obj') &&
      !p.startsWith('endobj') &&
      !p.startsWith('stream') &&
      !p.includes('xref') &&
      !p.includes('trailer') &&
      p.length > 4
    );

    return filtered.join(' ').replace(/\s+/g, ' ').trim();
  } catch (err) {
    console.error('[MODELOS] Erro ao extrair texto PDF:', err.message);
    return '';
  }
}

module.exports = router;
