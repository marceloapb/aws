/**
 * MAP-01: Geocoding Service (endereço → coordenadas)
 * Cache por CEP no DynamoDB para não repetir chamadas
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ssm = new SSMClient({});
const TABLE = process.env.TABLE_NAME;
const PREFIX = process.env.SSM_PREFIX || '/mbf/prod';

let cachedApiKey = null;

async function getApiKey() {
  if (cachedApiKey) return cachedApiKey;
  const param = await ssm.send(new GetParameterCommand({ Name: `${PREFIX}/GOOGLE_MAPS_API_KEY`, WithDecryption: true }));
  cachedApiKey = param.Parameter.Value;
  return cachedApiKey;
}

/**
 * Geocode um endereço (com cache por CEP)
 * @param {string} endereco - endereço completo ou CEP
 * @param {string} cep - CEP para cache key
 */
async function geocode(endereco, cep) {
  const cepClean = (cep || '').replace(/\D/g, '');

  // Verificar cache
  if (cepClean.length === 8) {
    const cached = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: 'GEOCACHE', SK: `CEP#${cepClean}` },
    }));
    if (cached.Item) return { lat: cached.Item.lat, lng: cached.Item.lng, endereco_formatado: cached.Item.endereco_formatado, cached: true };
  }

  // Chamar Google Geocoding API
  const apiKey = await getApiKey();
  const query = encodeURIComponent(endereco || cep);
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${apiKey}&language=pt-BR`);
  const data = await response.json();

  if (data.status !== 'OK' || !data.results[0]) {
    return null;
  }

  const result = data.results[0];
  const coords = { lat: result.geometry.location.lat, lng: result.geometry.location.lng, endereco_formatado: result.formatted_address };

  // Salvar no cache (TTL 1 ano)
  if (cepClean.length === 8) {
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: 'GEOCACHE', SK: `CEP#${cepClean}`,
        ...coords, cep: cepClean,
        source: 'google_geocoding_api',
        created_at: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 365 * 86400,
      },
    }));
  }

  return coords;
}

/**
 * MAP-02: Distance Matrix (distância e tempo entre 2 pontos)
 */
async function distanceMatrix(origemLat, origemLng, destinoLat, destinoLng) {
  const apiKey = await getApiKey();
  const origins = `${origemLat},${origemLng}`;
  const destinations = `${destinoLat},${destinoLng}`;

  const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${apiKey}&language=pt-BR&units=metric`);
  const data = await response.json();

  if (data.status !== 'OK' || !data.rows[0]?.elements[0]) return null;

  const element = data.rows[0].elements[0];
  if (element.status !== 'OK') return null;

  return {
    distancia_km: Math.round(element.distance.value / 100) / 10,
    distancia_texto: element.distance.text,
    duracao_minutos: Math.round(element.duration.value / 60),
    duracao_texto: element.duration.text,
  };
}

/**
 * MAP-03: Gerar link Google Maps directions
 */
function gerarLinkMaps(endereco) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`;
}

/**
 * MAP-04: Gerar URL embed do mapa (sem chave API necessária)
 */
function gerarEmbedUrl(endereco) {
  return `https://www.google.com/maps/embed/v1/place?key=&q=${encodeURIComponent(endereco)}`;
}

module.exports = { geocode, distanceMatrix, gerarLinkMaps, gerarEmbedUrl, getApiKey };
