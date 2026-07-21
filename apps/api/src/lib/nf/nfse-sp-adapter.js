/**
 * Adapter NFS-e Prefeitura de São Paulo (NF Paulistana)
 * Web Service SOAP: https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx
 * Autenticação: Certificado Digital A1 (.pfx)
 * Formato: XML assinado com padrão NFS-e Nacional adaptado SP
 */

const crypto = require('crypto');
const https = require('https');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const ssm = new SSMClient({ region: 'us-east-1' });
const s3 = new S3Client({});

const WSDL_PRODUCAO = 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx';
const WSDL_HOMOLOGACAO = 'https://nfeh.prefeitura.sp.gov.br/ws/lotenfe.asmx';

/**
 * Carrega o certificado A1 do S3
 */
async function loadCertificate(config) {
  const bucket = process.env.S3_BUCKET_NAME;
  const key = config.certificado_s3_key;
  const senha = config.certificado_senha;

  const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const pfxBuffer = Buffer.from(await result.Body.transformToByteArray());

  return { pfx: pfxBuffer, passphrase: senha };
}

/**
 * Monta o XML do RPS (Recibo Provisório de Serviço)
 */
function montarXmlRPS(dados, config) {
  const { valor, descricao_servico, tomador, numero_rps } = dados;
  const dataEmissao = new Date().toISOString().slice(0, 10);

  return `<?xml version="1.0" encoding="UTF-8"?>
<PedidoEnvioLoteRPS xmlns="http://www.prefeitura.sp.gov.br/nfe">
  <Cabecalho xmlns="" Versao="1">
    <CPFCNPJRemetente>
      <CNPJ>${config.cnpj.replace(/\D/g, '')}</CNPJ>
    </CPFCNPJRemetente>
    <transacao>true</transacao>
    <dtInicio>${dataEmissao}</dtInicio>
    <dtFim>${dataEmissao}</dtFim>
    <QtdRPS>1</QtdRPS>
    <ValorTotalServicos>${valor.toFixed(2)}</ValorTotalServicos>
    <ValorTotalDeducoes>0.00</ValorTotalDeducoes>
  </Cabecalho>
  <RPS xmlns="">
    <Assinatura></Assinatura>
    <ChaveRPS>
      <InscricaoPrestador>${config.inscricao_municipal}</InscricaoPrestador>
      <SerieRPS>BB</SerieRPS>
      <NumeroRPS>${numero_rps}</NumeroRPS>
    </ChaveRPS>
    <TipoRPS>RPS</TipoRPS>
    <DataEmissao>${dataEmissao}</DataEmissao>
    <StatusRPS>N</StatusRPS>
    <TributacaoRPS>T</TributacaoRPS>
    <ValorServicos>${valor.toFixed(2)}</ValorServicos>
    <ValorDeducoes>0.00</ValorDeducoes>
    <ValorPIS>0.00</ValorPIS>
    <ValorCOFINS>0.00</ValorCOFINS>
    <ValorINSS>0.00</ValorINSS>
    <ValorIR>0.00</ValorIR>
    <ValorCSLL>0.00</ValorCSLL>
    <CodigoServico>${config.codigo_servico || '09911'}</CodigoServico>
    <AliquotaServicos>${(config.aliquota || 2).toFixed(4)}</AliquotaServicos>
    <ISSRetido>false</ISSRetido>
    <CPFCNPJTomador>
      <CPF>${(tomador.cpf || tomador.cnpj || '').replace(/\D/g, '')}</CPF>
    </CPFCNPJTomador>
    <RazaoSocialTomador>${tomador.nome || tomador.razao_social || ''}</RazaoSocialTomador>
    <EnderecoTomador>
      <Logradouro>${tomador.logradouro || ''}</Logradouro>
      <NumeroEndereco>${tomador.numero || ''}</NumeroEndereco>
      <ComplementoEndereco>${tomador.complemento || ''}</ComplementoEndereco>
      <Bairro>${tomador.bairro || ''}</Bairro>
      <Cidade>3550308</Cidade>
      <UF>SP</UF>
      <CEP>${(tomador.cep || '').replace(/\D/g, '')}</CEP>
    </EnderecoTomador>
    <EmailTomador>${tomador.email || ''}</EmailTomador>
    <Discriminacao>${descricao_servico || 'Serviços fotográficos profissionais'}</Discriminacao>
  </RPS>
</PedidoEnvioLoteRPS>`;
}

/**
 * Assina o XML com o certificado A1
 */
function assinarXML(xml, pfxBuffer, passphrase) {
  // Extrair chave privada do PFX
  const sign = crypto.createSign('RSA-SHA1');
  sign.update(xml);

  // No Node.js, precisamos usar o PFX diretamente
  // A assinatura para NFS-e SP usa SHA-1 com o XML canonicalizado
  const signature = sign.sign({
    key: pfxBuffer,
    passphrase: passphrase,
    format: 'pkcs12',
  }, 'base64');

  // Inserir assinatura no XML (campo <Assinatura>)
  return xml.replace('<Assinatura></Assinatura>', `<Assinatura>${signature}</Assinatura>`);
}

/**
 * Gera a assinatura do RPS no formato da Prefeitura SP
 * Formato: InscricaoPrestador + SerieRPS + NumeroRPS + DataEmissao + Tributacao + StatusRPS + ValorServicos + ValorDeducoes + CodigoServico + ISS (S/N) + CPF/CNPJ Tomador
 */
function gerarAssinaturaRPS(dados, config) {
  const valor = dados.valor;
  const tomadorDoc = (dados.tomador.cpf || dados.tomador.cnpj || '').replace(/\D/g, '');
  const dataEmissao = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  // Montar string de assinatura conforme manual da prefeitura SP
  const inscricao = (config.inscricao_municipal || '').padStart(8, '0');
  const serie = 'BB'.padEnd(5, ' ');
  const numero = String(dados.numero_rps).padStart(12, '0');
  const data = dataEmissao;
  const tributacao = 'T';
  const status = 'N';
  const valorStr = String(Math.round(valor * 100)).padStart(15, '0');
  const deducoes = '000000000000000';
  const codigo = (config.codigo_servico || '09911').padStart(5, '0');
  const issRetido = '2'; // Não retido
  const indicadorDoc = tomadorDoc.length === 11 ? '1' : '2';
  const documento = tomadorDoc.padStart(14, '0');

  return inscricao + serie + numero + data + tributacao + status + valorStr + deducoes + codigo + issRetido + indicadorDoc + documento;
}

/**
 * Envia o lote para o Web Service SOAP da Prefeitura
 */
async function enviarLoteSoap(xmlAssinado, cert, ambiente = 'producao') {
  const endpoint = ambiente === 'producao' ? WSDL_PRODUCAO : WSDL_HOMOLOGACAO;

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <EnvioLoteRPSRequest xmlns="http://www.prefeitura.sp.gov.br/nfe">
      <VersaoSchema>1</VersaoSchema>
      <MensagemXML>${xmlAssinado.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</MensagemXML>
    </EnvioLoteRPSRequest>
  </soap12:Body>
</soap12:Envelope>`;

  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(soapEnvelope),
      },
      pfx: cert.pfx,
      passphrase: cert.passphrase,
      rejectUnauthorized: true,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.write(soapEnvelope);
    req.end();
  });
}

/**
 * Parseia a resposta SOAP da prefeitura
 */
function parsearResposta(soapResponse) {
  const body = soapResponse.body;

  // Verificar sucesso
  if (body.includes('<Sucesso>true</Sucesso>') || body.includes('<ChaveNFeRPS>')) {
    const numeroNF = body.match(/<NumeroNFe>(\d+)<\/NumeroNFe>/)?.[1] || '';
    const codigoVerificacao = body.match(/<CodigoVerificacao>([^<]+)<\/CodigoVerificacao>/)?.[1] || '';
    return {
      success: true,
      numero_nf: numeroNF,
      codigo_verificacao: codigoVerificacao,
      status: 'emitida',
      pdf_url: `https://nfe.prefeitura.sp.gov.br/contribuinte/notaprint.aspx?nf=${numeroNF}&verificacao=${codigoVerificacao}`,
    };
  }

  // Extrair erro
  const erro = body.match(/<Descricao>([^<]+)<\/Descricao>/)?.[1]
    || body.match(/<MensagemRetorno>([^<]+)<\/MensagemRetorno>/)?.[1]
    || 'Erro desconhecido na emissão';

  return { success: false, erro, status: 'erro' };
}

// ══════════════════════════════════════════
// INTERFACE PÚBLICA
// ══════════════════════════════════════════

/**
 * Emitir NFS-e
 */
async function emitir({ valor, descricao_servico, tomador, numero_rps, config }) {
  // 1. Carregar certificado
  const cert = await loadCertificate(config);

  // 2. Montar XML
  const xml = montarXmlRPS({ valor, descricao_servico, tomador, numero_rps }, config);

  // 3. Gerar assinatura e assinar
  const assinaturaStr = gerarAssinaturaRPS({ valor, tomador, numero_rps }, config);
  const sign = crypto.createSign('SHA1');
  sign.update(assinaturaStr);
  const assinatura = sign.sign({ key: cert.pfx, passphrase: cert.passphrase, format: 'pkcs12' }, 'base64');
  const xmlAssinado = xml.replace('<Assinatura></Assinatura>', `<Assinatura>${assinatura}</Assinatura>`);

  // 4. Enviar SOAP
  const ambiente = config.ambiente || 'producao';
  const response = await enviarLoteSoap(xmlAssinado, cert, ambiente);

  // 5. Parsear resposta
  return parsearResposta(response);
}

/**
 * Cancelar NFS-e
 */
async function cancelar({ numero_nf, config }) {
  const cert = await loadCertificate(config);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<PedidoCancelamentoNFe xmlns="http://www.prefeitura.sp.gov.br/nfe">
  <Cabecalho xmlns="" Versao="1">
    <CPFCNPJRemetente>
      <CNPJ>${config.cnpj.replace(/\D/g, '')}</CNPJ>
    </CPFCNPJRemetente>
    <transacao>true</transacao>
  </Cabecalho>
  <Detalhe xmlns="">
    <ChaveNFe>
      <InscricaoPrestador>${config.inscricao_municipal}</InscricaoPrestador>
      <NumeroNFe>${numero_nf}</NumeroNFe>
    </ChaveNFe>
    <AssinaturaCancelamento></AssinaturaCancelamento>
  </Detalhe>
</PedidoCancelamentoNFe>`;

  const endpoint = (config.ambiente || 'producao') === 'producao' ? WSDL_PRODUCAO : WSDL_HOMOLOGACAO;

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <CancelamentoNFeRequest xmlns="http://www.prefeitura.sp.gov.br/nfe">
      <VersaoSchema>1</VersaoSchema>
      <MensagemXML>${xml.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</MensagemXML>
    </CancelamentoNFeRequest>
  </soap12:Body>
</soap12:Envelope>`;

  const response = await new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
      pfx: cert.pfx, passphrase: cert.passphrase,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ body: data }));
    });
    req.on('error', reject);
    req.write(soapEnvelope);
    req.end();
  });

  if (response.body.includes('<Sucesso>true</Sucesso>')) {
    return { success: true, status: 'cancelada' };
  }
  const erro = response.body.match(/<Descricao>([^<]+)<\/Descricao>/)?.[1] || 'Erro ao cancelar';
  return { success: false, erro };
}

/**
 * Consultar NFS-e
 */
async function consultar({ numero_nf, config }) {
  const cert = await loadCertificate(config);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<PedidoConsultaNFe xmlns="http://www.prefeitura.sp.gov.br/nfe">
  <Cabecalho xmlns="" Versao="1">
    <CPFCNPJRemetente>
      <CNPJ>${config.cnpj.replace(/\D/g, '')}</CNPJ>
    </CPFCNPJRemetente>
  </Cabecalho>
  <Detalhe xmlns="">
    <ChaveNFe>
      <InscricaoPrestador>${config.inscricao_municipal}</InscricaoPrestador>
      <NumeroNFe>${numero_nf}</NumeroNFe>
    </ChaveNFe>
  </Detalhe>
</PedidoConsultaNFe>`;

  const endpoint = (config.ambiente || 'producao') === 'producao' ? WSDL_PRODUCAO : WSDL_HOMOLOGACAO;

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <ConsultaNFeRequest xmlns="http://www.prefeitura.sp.gov.br/nfe">
      <VersaoSchema>1</VersaoSchema>
      <MensagemXML>${xml.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</MensagemXML>
    </ConsultaNFeRequest>
  </soap12:Body>
</soap12:Envelope>`;

  const response = await new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
      pfx: cert.pfx, passphrase: cert.passphrase,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ body: data }));
    });
    req.on('error', reject);
    req.write(soapEnvelope);
    req.end();
  });

  return parsearResposta(response);
}

module.exports = { emitir, cancelar, consultar };
