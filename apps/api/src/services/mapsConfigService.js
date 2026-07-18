/**
 * MAP-08: Controle de Custo Google Maps
 * - Validar e salvar API Key no SSM
 * - Status de uso mensal (geocoding + distance)
 * - Alerta se > 80% do free tier ($200/mês)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { SSMClient, GetParameterCommand, PutParameterCommand } = require('@aws-sdk/client-ssm');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ssm = new SSMClient({ region: 'us-east-1' });
const TABLE = process.env.TABLE_NAME;
const PREFIX = process.env.SSM_PREFIX || '/mbf/prod';

/**
 * PUT /admin/maps/config — Salvar/atualizar API Key
 */
async function salvarApiKey(req, res) {
  try {
    const { api_key } = req.body;
    if (!api_key || !api_key.startsWith('AIza')) {
      return res.status(400).json({ success: false, message: 'Chave inválida. Deve começar com AIza...' });
    }

    // Validar key com chamada teste
    const validacao = await validarApiKey(api_key);
    if (!validacao.valida) {
      return res.status(400).json({ success: false, message: validacao.motivo });
    }

    // Salvar no SSM
    await ssm.send(new PutParameterCommand({
      Name: `${PREFIX}/GOOGLE_MAPS_API_KEY`,
      Value: api_key,
      Type: 'SecureString',
      Overwrite: true,
    }));

    // Registrar log
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: 'MAPS_CONFIG',
        SK: `KEY_UPDATE#${Date.now()}`,
        updated_by: req.user?.sub || 'system',
        updated_at: new Date().toISOString(),
        key_prefix: api_key.slice(0, 4),
        key_suffix: api_key.slice(-4),
      },
    }));

    res.json({ success: true, valida: true, mensagem: 'Chave salva e validada com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /admin/maps/status — Status de uso e custo estimado
 */
async function getStatus(req, res) {
  try {
    // Verificar se key está configurada
    let configurado = false;
    let keyMascarada = null;
    try {
      const param = await ssm.send(new GetParameterCommand({ Name: `${PREFIX}/GOOGLE_MAPS_API_KEY`, WithDecryption: true }));
      if (param.Parameter?.Value) {
        configurado = true;
        const key = param.Parameter.Value;
        keyMascarada = `${key.slice(0, 4)}...${key.slice(-4)}`;
      }
    } catch (e) {
      if (e.name !== 'ParameterNotFound') throw e;
    }

    // Contar uso mensal
    const uso = await contarUsoMensal();

    // Recomendações
    const recomendacoes = [];
    if (!configurado) {
      recomendacoes.push('❌ API Key não configurada. Acesse Configurações > Google Maps.');
    } else {
      recomendacoes.push('✅ Restrinja a chave por domínio no Google Cloud Console');
      recomendacoes.push('✅ Habilite apenas Geocoding API e Distance Matrix API');
      if (uso.percentual_usado > 80) {
        recomendacoes.push('⚠️ Uso acima de 80% do free tier! Otimize o cache.');
      }
    }

    res.json({
      success: true,
      data: {
        configurado,
        key_mascarada: keyMascarada,
        uso_estimado: uso,
        recomendacoes,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Validar API Key com chamada teste de geocoding
 */
async function validarApiKey(apiKey) {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent('São Paulo, Brasil')}&key=${apiKey}`
    );
    const data = await response.json();

    if (data.status === 'REQUEST_DENIED') {
      return { valida: false, motivo: data.error_message || 'Chave inválida ou sem permissão' };
    }
    if (data.status === 'OK') {
      return { valida: true };
    }
    return { valida: false, motivo: `Status inesperado: ${data.status}` };
  } catch (error) {
    return { valida: false, motivo: `Erro ao validar: ${error.message}` };
  }
}

/**
 * Contar chamadas à API no mês atual
 * Conta itens GEOCACHE e DISTANCE que NÃO vieram de cache
 */
async function contarUsoMensal() {
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();

  let geocodingChamadas = 0;
  let distanceChamadas = 0;

  try {
    // Contar geocoding (itens criados no mês)
    const geoResult = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND SK > :sk',
      FilterExpression: 'created_at >= :inicio',
      ExpressionAttributeValues: {
        ':pk': 'GEOCACHE',
        ':sk': 'CEP#',
        ':inicio': inicioMes,
      },
      Select: 'COUNT',
    }));
    geocodingChamadas = geoResult.Count || 0;

    // Contar distance (itens criados no mês)
    const distResult = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'created_at >= :inicio',
      ExpressionAttributeValues: {
        ':pk': 'DISTANCE',
        ':inicio': inicioMes,
      },
      Select: 'COUNT',
    }));
    distanceChamadas = distResult.Count || 0;
  } catch (e) {
    // Se falhar, retornar zeros
  }

  const custoGeocoding = geocodingChamadas * 0.005; // $5/1000
  const custoDistance = distanceChamadas * 0.005;    // $5/1000
  const custoTotal = custoGeocoding + custoDistance;
  const limiteFreeTier = 200;

  return {
    geocoding_chamadas_mes: geocodingChamadas,
    distance_chamadas_mes: distanceChamadas,
    custo_estimado_usd: Math.round(custoTotal * 100) / 100,
    limite_free_tier_usd: limiteFreeTier,
    percentual_usado: Math.round((custoTotal / limiteFreeTier) * 1000) / 10,
  };
}

module.exports = { salvarApiKey, getStatus, contarUsoMensal };

