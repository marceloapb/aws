// ══════════════════════════════════════════════════════════════
// SERVICES/NFSE-SERVICE.JS — Emissão NFS-e Padrão Nacional (MEI)
// ══════════════════════════════════════════════════════════════
//
// Fluxo: Pagamento confirmado → Monta DPS XML → Assina → Envia SEFIN → Salva NFS-e
//
// Endpoints SEFIN Nacional:
//   Produção:    https://sefin.nfse.gov.br/SefinNacional/nfse
//   Homologação: https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional/nfse
//
// Autenticação: mTLS com certificado e-CNPJ A1 (.pfx)
// ══════════════════════════════════════════════════════════════

const crypto = require('crypto');
const https = require('https');
const forge = require('node-forge');
const { dynamo, TABLE } = require('../config/dynamodb');
const { GetCommand, PutCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssm = new SSMClient({ region: 'us-east-1' });
const PREFIX = process.env.SSM_PREFIX || '/mbf/prod';
const TENANT = process.env.TENANT_ID || 'default';

// URLs da API
const SEFIN_PROD = 'https://sefin.nfse.gov.br/SefinNacional';
const SEFIN_HOMOLOG = 'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional';
const ADN_PROD = 'https://adn.nfse.gov.br';
const ADN_HOMOLOG = 'https://adn.producaorestrita.nfse.gov.br';

// Cache de configuração
let cachedConfig = null;
let configExpiry = 0;

/**
 * Busca configuração NFS-e do DynamoDB + SSM
 */
async function getConfig() {
  if (cachedConfig && Date.now() < configExpiry) return cachedConfig;

  // Buscar config NFS-e específica
  const result = await dynamo.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `TENANT#${TENANT}`, SK: 'CONFIG#nfse' },
  }));
  const dbConfig = result.Item || {};

  // Buscar dados da empresa já cadastrados (CONFIG#cnpj, CONFIG#estado, etc)
  const configKeys = ['cnpj', 'businessName', 'tradeName', 'estado', 'cidade', 'cep', 'rua', 'numero', 'bairro', 'inscricaoMunicipal'];
  const empresaData = {};
  try {
    const empResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'CONFIG#' },
    }));
    for (const item of (empResult.Items || [])) {
      if (item.chave && item.valor) empresaData[item.chave] = item.valor;
    }
  } catch {}

  // Mapear código IBGE de São Paulo (fallback)
  const MUNICIPIOS_IBGE = { 'São Paulo': '3550308', 'Sao Paulo': '3550308' };
  const codigoMunicipio = dbConfig.codigo_municipio || MUNICIPIOS_IBGE[empresaData.cidade] || '3550308';

  // Buscar certificado: S3 (pfx) + SSM (passphrase)
  let certPfxBase64 = '';
  let certPassphrase = '';
  try {
    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({ region: 'us-east-1' });
    const BUCKET = process.env.BUCKET_NAME || 'mbf-backend-v3-fotos';

    const [passParam, s3KeyParam] = await Promise.all([
      ssm.send(new GetParameterCommand({ Name: `${PREFIX}/NFSE_CERT_PASSPHRASE`, WithDecryption: true })),
      ssm.send(new GetParameterCommand({ Name: `${PREFIX}/NFSE_CERT_S3_KEY`, WithDecryption: false })),
    ]);
    certPassphrase = passParam.Parameter.Value;
    const certS3Key = s3KeyParam.Parameter.Value;

    // Baixar PFX do S3
    const s3Resp = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: certS3Key }));
    const chunks = [];
    for await (const chunk of s3Resp.Body) chunks.push(chunk);
    certPfxBase64 = Buffer.concat(chunks).toString('base64');
  } catch (err) {
    console.warn('[NFSE] Certificado não configurado:', err.message);
  }

  cachedConfig = {
    // Usa CONFIG#nfse se preenchido, senão puxa dos dados da empresa
    cnpj: dbConfig.cnpj || (empresaData.cnpj || '').replace(/\D/g, ''),
    inscricaoMunicipal: dbConfig.inscricao_municipal || empresaData.inscricaoMunicipal || '',
    razaoSocial: dbConfig.razao_social || empresaData.businessName || empresaData.tradeName || 'Marcelo Bloise Fotografia',
    codigoMunicipio,
    uf: dbConfig.uf || empresaData.estado || 'SP',
    cnae: dbConfig.cnae || '7420001',
    codigoTribNacional: dbConfig.codigo_trib_nacional || '13.03.01.00',
    serie: dbConfig.serie || 'NFSE',
    ambiente: dbConfig.ambiente || '2', // 2=homologação, 1=produção
    emissaoAutomatica: dbConfig.emissao_automatica !== false,
    certPfxBase64,
    certPassphrase,
  };

  configExpiry = Date.now() + 5 * 60 * 1000; // Cache 5min
  return cachedConfig;
}

/**
 * Invalida cache de configuração (chamar após salvar config)
 */
function invalidateConfigCache() {
  cachedConfig = null;
  configExpiry = 0;
}

/**
 * Obtém o próximo número da DPS (sequencial)
 */
async function getProximoNumeroDPS() {
  const result = await dynamo.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `TENANT#${TENANT}`, SK: 'NFSE_SEQUENCIA' },
  }));

  const atual = result.Item?.ultimo_numero || 0;
  const proximo = atual + 1;

  await dynamo.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `TENANT#${TENANT}`,
      SK: 'NFSE_SEQUENCIA',
      ultimo_numero: proximo,
      updated: new Date().toISOString(),
    },
  }));

  return proximo;
}

/**
 * Monta o XML da DPS (sem assinatura)
 */
function montarXmlDPS({ config, numeroDPS, dados }) {
  const {
    cliente_nome, cliente_cpf_cnpj, cliente_endereco = {},
    cliente_email, cliente_telefone,
    descricao_servico, valor_servico, data_competencia,
    codigo_municipio_prestacao,
  } = dados;

  const now = new Date();
  // Calcular horário de Brasília (UTC-3)
  // dhEmi: horário de Brasília (UTC-3), subtraindo 1min para clock skew
  const nowMs = Date.now() - 60000;
  const utcDate = new Date(nowMs);
  const brasilDate = new Date(nowMs - 3 * 3600000);
  const dhEmi = brasilDate.toISOString().replace(/\.\d{3}Z$/, '') + '-03:00';
  const dCompet = data_competencia || now.toISOString().slice(0, 10);
  // ID formato: DPS + CódMunicipio(7) + TipoInscrição(1=CPF,2=CNPJ) + InscriçãoFederal(14) + Série(5 dígitos numéricos, zero-padded) + Número(15 zero-padded)
  // IMPORTANTE: O pattern TSIdDPS exige série NUMÉRICA (regex: 0{0,4}\d{1,5})
  const codMun = (config.codigoMunicipio || '3550308').padStart(7, '0');
  const tipoInscricao = '2'; // 2=CNPJ
  const inscricaoFederal = config.cnpj.padStart(14, '0').substring(0, 14);
  const serieNum = (config.serie || '1').replace(/\D/g, '') || '1'; // Extrair só dígitos da série
  const serieId = serieNum.padStart(5, '0').substring(0, 5);
  const numId = String(numeroDPS).padStart(15, '0');
  const idDPS = `DPS${codMun}${tipoInscricao}${inscricaoFederal}${serieId}${numId}`;

  // Determinar identificador do tomador
  const cpfCnpjLimpo = (cliente_cpf_cnpj || '').replace(/\D/g, '');
  // Só incluir tag de documento se tiver valor, senão usar cNaoNIF
  let docXml;
  if (cpfCnpjLimpo && cpfCnpjLimpo.length === 14) {
    docXml = `<CNPJ>${cpfCnpjLimpo}</CNPJ>`;
  } else if (cpfCnpjLimpo && cpfCnpjLimpo.length === 11) {
    docXml = `<CPF>${cpfCnpjLimpo}</CPF>`;
  } else {
    docXml = `<cNaoNIF>0</cNaoNIF>`; // 0=Não informado na nota de origem
  }

  // Endereço do tomador
  const end = cliente_endereco;
  const endXml = end.cep ? `
      <end>
        <endNac>
          <cMun>${end.codigo_municipio || config.codigoMunicipio}</cMun>
          <CEP>${(end.cep || '').replace(/\D/g, '')}</CEP>
          <xLgr>${escapeXml(end.logradouro || '')}</xLgr>
          <nro>${escapeXml(end.numero || 'S/N')}</nro>
          ${end.complemento ? `<xCpl>${escapeXml(end.complemento)}</xCpl>` : ''}
          <xBairro>${escapeXml(end.bairro || '')}</xBairro>
          <UF>${end.uf || config.uf}</UF>
        </endNac>
      </end>` : '';

  const imXml = config.inscricaoMunicipal ? `<IM>${config.inscricaoMunicipal}</IM>` : '';
  const foneXml = cliente_telefone ? `<fone>${cliente_telefone.replace(/\D/g, '')}</fone>` : '';
  const emailXml = cliente_email ? `<email>${escapeXml(cliente_email)}</email>` : '';
  const cTribNac = (config.codigoTribNacional || '130301').replace(/\D/g, '').substring(0, 6);
  const vServ = Number(valor_servico).toFixed(2);
  const desc = escapeXml(descricao_servico || 'Cobertura fotografica profissional de evento social.');

  const xml = `<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01"><infDPS Id="${idDPS}"><tpAmb>${config.ambiente}</tpAmb><dhEmi>${dhEmi}</dhEmi><verAplic>MBFoto_v1.0</verAplic><serie>${serieNum}</serie><nDPS>${numeroDPS}</nDPS><dCompet>${dCompet}</dCompet><tpEmit>1</tpEmit><cLocEmi>${config.codigoMunicipio}</cLocEmi><prest><CNPJ>${config.cnpj}</CNPJ>${imXml}<regTrib><opSimpNac>2</opSimpNac><regApTribSN>1</regApTribSN><regEspTrib>0</regEspTrib></regTrib></prest><toma>${docXml}<xNome>${escapeXml(cliente_nome || 'Consumidor Final')}</xNome>${endXml}${foneXml}${emailXml}</toma><serv><locPrest><cLocPrestacao>${codigo_municipio_prestacao || config.codigoMunicipio}</cLocPrestacao></locPrest><cServ><cTribNac>${cTribNac}</cTribNac><xDescServ>${desc}</xDescServ></cServ></serv><valores><vServPrest><vServ>${vServ}</vServ></vServPrest><trib><tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN></tribMun><totTrib><vTotTrib><vTotTribFed>0.00</vTotTribFed><vTotTribEst>0.00</vTotTribEst><vTotTribMun>0.00</vTotTribMun></vTotTrib></totTrib></trib></valores></infDPS></DPS>`;

  return xml;
}

/**
 * Assina o XML da DPS com certificado A1 (implementação manual - testada contra SEFIN)
 */
function assinarXml(xml, pfxBuffer, passphrase) {
  const { DOMParser } = require('@xmldom/xmldom');
  const { ExclusiveCanonicalization } = require('xml-crypto/lib/exclusive-canonicalization');

  // Extrair o Id do infDPS
  const idMatch = xml.match(/infDPS[^>]*Id="([^"]+)"/);
  const infDPSId = idMatch ? idMatch[1] : '';
  if (!infDPSId) throw new Error('Id do infDPS não encontrado no XML');

  // Extrair chave e certificado do PFX
  const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase);

  let privateKeyPem = '';
  let certPem = '';

  for (const safeContent of p12.safeContents) {
    for (const bag of safeContent.safeBags) {
      if (bag.type === forge.pki.oids.pkcs8ShroudedKeyBag || bag.type === forge.pki.oids.keyBag) {
        privateKeyPem = forge.pki.privateKeyToPem(bag.key);
      } else if (bag.type === forge.pki.oids.certBag && bag.cert) {
        certPem = forge.pki.certificateToPem(bag.cert);
      }
    }
  }

  if (!privateKeyPem || !certPem) {
    throw new Error('Certificado A1 inválido: não foi possível extrair chave/certificado');
  }

  const certBase64 = certPem
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\s/g, '');

  // 1) Canonicalizar infDPS com Exclusive C14N
  const c14n = new ExclusiveCanonicalization();
  const doc = new DOMParser().parseFromString(xml);
  const infNode = doc.getElementsByTagName('infDPS')[0];
  const canonicalized = c14n.process(infNode, { inclusiveNamespacesPrefixList: '' }).toString();

  // 2) Calcular digest SHA-256
  const digest = crypto.createHash('sha256').update(canonicalized).digest('base64');

  // 3) Montar SignedInfo
  const signedInfoXml = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/><SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><Reference URI="#${infDPSId}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/><Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>${digest}</DigestValue></Reference></SignedInfo>`;

  // 4) Canonicalizar SignedInfo
  const siDoc = new DOMParser().parseFromString(signedInfoXml);
  const siCanon = c14n.process(siDoc.documentElement, { inclusiveNamespacesPrefixList: '' }).toString();

  // 5) Assinar SignedInfo com RSA-SHA256
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(siCanon);
  const signatureValue = sign.sign(privateKeyPem, 'base64');

  // 6) Montar Signature XML completo
  const signatureXml = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/><SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><Reference URI="#${infDPSId}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/><Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>${digest}</DigestValue></Reference></SignedInfo><SignatureValue>${signatureValue}</SignatureValue><KeyInfo><X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data></KeyInfo></Signature>`;

  // 7) Inserir Signature entre </infDPS> e </DPS>, prefixar com declaração UTF-8
  const signedXml = xml.replace(/<\/infDPS>\s*<\/DPS>/, '</infDPS>' + signatureXml + '</DPS>');
  return '<?xml version="1.0" encoding="UTF-8"?>' + signedXml;
}

/**
 * Envia a DPS assinada para a SEFIN Nacional
 */
async function enviarDPS(xmlAssinado, config) {
  const { gzipSync } = require('zlib');
  const baseUrl = config.ambiente === '1' ? SEFIN_PROD : SEFIN_HOMOLOG;
  const url = `${baseUrl}/nfse`;

  const pfxBuffer = Buffer.from(config.certPfxBase64, 'base64');

  // Comprimir XML com gzip e codificar em base64 (formato exigido pela SEFIN)
  const xmlGzipped = gzipSync(Buffer.from(xmlAssinado, 'utf8'));
  const dpsXmlGZipB64 = xmlGzipped.toString('base64');
  const jsonBody = JSON.stringify({ dpsXmlGZipB64 });

  // Usar https.request nativo para suportar mTLS (certificado client-side)
  const responseText = await new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonBody, 'utf8'),
      },
      pfx: pfxBuffer,
      passphrase: config.certPassphrase,
      rejectUnauthorized: true,
      timeout: 30000,
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 500) {
          reject(new Error(`SEFIN HTTP ${res.statusCode}: ${body.substring(0, 500)}`));
        } else {
          resolve(body);
        }
      });
    });

    req.on('error', (err) => reject(new Error(`SEFIN conexão falhou: ${err.message}`)));
    req.on('timeout', () => { req.destroy(); reject(new Error('SEFIN timeout (30s)')); });
    req.write(jsonBody);
    req.end();
  });

  // Parsear resposta JSON da SEFIN
  let parsed = {};
  try {
    parsed = JSON.parse(responseText);
  } catch {
    // Se não for JSON, tentar extrair de XML (fallback)
    parsed = {
      cStat: extrairTag(responseText, 'cStat'),
      xMotivo: extrairTag(responseText, 'xMotivo'),
      chNFSe: extrairTag(responseText, 'chNFSe'),
      nNFSe: extrairTag(responseText, 'nNFSe'),
      nfseXmlGZipB64: extrairTag(responseText, 'nfseXmlGZipB64'),
    };
  }

  // A SEFIN pode retornar erros em diversos formatos
  const erros = parsed.erros || parsed.erro || [];
  const primeiroErro = Array.isArray(erros) ? erros[0] : erros;
  const sucesso = !primeiroErro && (parsed.chNFSe || parsed.chaveAcesso);

  return {
    sucesso: !!sucesso,
    cStat: parsed.cStat || (sucesso ? '100' : '200'),
    xMotivo: parsed.xMotivo || primeiroErro?.descricao || primeiroErro?.Descricao || primeiroErro?.message || (sucesso ? 'Autorizado' : 'Rejeitado'),
    chNFSe: parsed.chNFSe || parsed.chaveAcesso || null,
    nNFSe: parsed.nNFSe || parsed.numeroNfse || null,
    nfseXml: parsed.nfseXmlGZipB64 || parsed.nfseXmlGzipB64 || null,
    xmlResposta: responseText,
  };
}

/**
 * Emite uma NFS-e completa (monta, assina, envia, salva)
 */
async function emitirNFSe(dados) {
  const config = await getConfig();

  if (!config.cnpj) throw new Error('CNPJ não configurado para NFS-e');
  if (!config.certPfxBase64) throw new Error('Certificado digital não configurado');
  if (!dados.valor_servico || dados.valor_servico <= 0) throw new Error('Valor do serviço inválido');

  const numeroDPS = await getProximoNumeroDPS();
  const xmlDPS = montarXmlDPS({ config, numeroDPS, dados });

  // Assinar
  const pfxBuffer = Buffer.from(config.certPfxBase64, 'base64');
  const xmlAssinado = assinarXml(xmlDPS, pfxBuffer, config.certPassphrase);

  // Enviar
  const resultado = await enviarDPS(xmlAssinado, config);

  // Salvar no DynamoDB
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const nfseItem = {
    PK: `TENANT#${TENANT}`,
    SK: `NFSE#${id}`,
    GSI1PK: 'NFSE',
    GSI1SK: `NFSE#${now}`,
    id,
    numero_dps: numeroDPS,
    serie: config.serie,
    numero_nfse: resultado.nNFSe || null,
    chave_nfse: resultado.chNFSe || null,
    status: resultado.sucesso ? 'autorizada' : 'rejeitada',
    cStat: resultado.cStat,
    xMotivo: resultado.xMotivo,
    valor: dados.valor_servico,
    cliente_nome: dados.cliente_nome || '',
    cliente_cpf_cnpj: dados.cliente_cpf_cnpj || '',
    descricao: dados.descricao_servico || '',
    cobranca_id: dados.cobranca_id || null,
    cliente_id: dados.cliente_id || null,
    xml_envio: xmlAssinado,
    xml_resposta: resultado.xmlResposta,
    nfse_xml_gzip: resultado.nfseXml || null,
    ambiente: config.ambiente,
    created: now,
  };

  await dynamo.send(new PutCommand({ TableName: TABLE, Item: nfseItem }));

  return {
    success: resultado.sucesso,
    id,
    numero_dps: numeroDPS,
    numero_nfse: resultado.nNFSe,
    chave_nfse: resultado.chNFSe,
    status: resultado.sucesso ? 'autorizada' : 'rejeitada',
    cStat: resultado.cStat,
    xMotivo: resultado.xMotivo,
  };
}

/**
 * Emite NFS-e a partir de uma cobrança confirmada (chamado pelo webhook de pagamento)
 */
async function emitirNFSeAutomatica(cobranca, cliente) {
  const config = await getConfig();
  if (!config.emissaoAutomatica) return null;
  if (!config.cnpj || !config.certPfxBase64) return null;

  try {
    const dados = {
      cliente_id: cobranca.cliente_id,
      cliente_nome: cliente?.nome || cliente?.name || 'Consumidor Final',
      cliente_cpf_cnpj: cliente?.cpf || cliente?.cnpj || '',
      cliente_email: cliente?.email || '',
      cliente_telefone: cliente?.whatsapp || cliente?.telefone || '',
      cliente_endereco: {
        cep: cliente?.cep || '',
        logradouro: cliente?.endereco || cliente?.logradouro || '',
        numero: cliente?.numero || '',
        complemento: cliente?.complemento || '',
        bairro: cliente?.bairro || '',
        codigo_municipio: cliente?.codigo_municipio || config.codigoMunicipio,
        uf: cliente?.uf || config.uf,
      },
      valor_servico: cobranca.valor || 0,
      descricao_servico: cobranca.descricao || cobranca.referencia || 'Serviço fotográfico profissional',
      cobranca_id: cobranca.id || cobranca.SK,
      data_competencia: cobranca.data_competencia || new Date().toISOString().slice(0, 10),
    };

    const resultado = await emitirNFSe(dados);
    console.log(`[NFSE] Emissão automática: ${resultado.status} (DPS #${resultado.numero_dps})`);
    return resultado;
  } catch (err) {
    console.error('[NFSE] Erro na emissão automática:', err.message);
    // Salvar log de erro
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `TENANT#${TENANT}`,
        SK: `NFSE_ERRO#${new Date().toISOString()}`,
        cobranca_id: cobranca.id || cobranca.SK,
        cliente_id: cobranca.cliente_id,
        erro: err.message,
        created: new Date().toISOString(),
      },
    }));
    return null;
  }
}

// ═══ UTILITÁRIOS ═══

function escapeXml(str) {
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remover acentos
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function extrairTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}

module.exports = {
  emitirNFSe,
  emitirNFSeAutomatica,
  getConfig,
  invalidateConfigCache,
  getProximoNumeroDPS,
};
