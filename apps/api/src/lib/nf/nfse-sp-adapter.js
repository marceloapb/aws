/**
 * Adapter NFS-e Prefeitura de Sao Paulo (NF Paulistana)
 * Web Service SOAP - Manual v3.3.7
 *
 * Endpoints:
 *   Producao:    https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx
 *   Homologacao: https://nfeh.prefeitura.sp.gov.br/ws/lotenfe.asmx
 *   Novo (v1+v2): https://nfews.prefeitura.sp.gov.br/lotenfe.asmx
 *
 * Autenticacao: Certificado Digital A1 (.pfx) - ICP-Brasil
 * Protocolo: SOAP 1.2, Document/Literal wrapped, TLS 1.2
 * Assinatura: XML Digital Signature (Enveloped), RSA-SHA1
 */

const crypto = require('crypto');
const https = require('https');
const forge = require('node-forge');
const { SignedXml } = require('xml-crypto');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: 'us-east-1' });

// Endpoints do Web Service
const ENDPOINTS = {
  producao: 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx',
  homologacao: 'https://nfeh.prefeitura.sp.gov.br/ws/lotenfe.asmx',
  novo: 'https://nfews.prefeitura.sp.gov.br/lotenfe.asmx',
};

const NAMESPACE = 'http://www.prefeitura.sp.gov.br/nfe';


// ══════════════════════════════════════════════════════════════
// CERTIFICADO
// ══════════════════════════════════════════════════════════════

/**
 * Carrega o certificado A1 (PFX) do S3
 */
async function loadCertificate(config) {
  const bucket = process.env.BUCKET_NAME || 'mbf-backend-v3-fotos';
  const key = config.certificado_s3_key || 'certificates/nfse-cert-a1.pfx';
  const passphrase = config.certificado_senha;

  const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks = [];
  for await (const chunk of result.Body) chunks.push(chunk);
  const pfxBuffer = Buffer.concat(chunks);

  return { pfx: pfxBuffer, passphrase };
}

/**
 * Extrai chave privada e certificado X509 do PFX
 */
function extrairChavesCertificado(pfxBuffer, passphrase) {
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
    throw new Error('Certificado A1 invalido: nao foi possivel extrair chave/certificado');
  }

  const certBase64 = certPem
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\s/g, '');

  return { privateKeyPem, certPem, certBase64 };
}


// ══════════════════════════════════════════════════════════════
// ASSINATURA DO RPS (Manual item 4.3.2)
// ══════════════════════════════════════════════════════════════

/**
 * Gera a string de assinatura do RPS conforme manual SP v3.3.7 (versao 1)
 * Total: 86 posicoes (sem intermediario) ou mais (com intermediario)
 *
 * Campos:
 * #1  Inscricao Municipal Prestador - 8 digitos (zeros a esquerda)
 * #2  Serie do RPS - 5 caracteres (espacos a direita)
 * #3  Numero do RPS - 12 digitos (zeros a esquerda)
 * #4  Data Emissao - 8 caracteres AAAAMMDD
 * #5  Tipo Tributacao - 1 caractere (T/F/A/B/D/M/N/R/S/X/V/P)
 * #6  Status RPS - 1 caractere (N/C)
 * #7  ISS Retido - 1 caractere (S/N)
 * #8  Valor Servicos - 15 digitos (centavos, zeros a esquerda)
 * #9  Valor Deducoes - 15 digitos (centavos, zeros a esquerda)
 * #10 Codigo Servico - 5 digitos (zeros a esquerda)
 * #11 Indicador CPF/CNPJ Tomador - 1 digito (1=CPF, 2=CNPJ, 3=Nao informado)
 * #12 CPF/CNPJ Tomador - 14 digitos (zeros a esquerda)
 * #13 Indicador CPF/CNPJ Intermediario - 1 digito (opcional)
 * #14 CPF/CNPJ Intermediario - 14 digitos (opcional)
 * #15 ISS Retido Intermediario - 1 caractere S/N (opcional)
 */
function gerarStringAssinaturaRPS(dados, config) {
  const inscricao = (config.inscricao_municipal || '').padStart(8, '0');
  const serie = (dados.serie_rps || config.serie_rps || 'BB').padEnd(5, ' ');
  const numero = String(dados.numero_rps || 0).padStart(12, '0');

  // Data formato AAAAMMDD
  const dataEmissao = (dados.data_emissao || new Date().toISOString().slice(0, 10)).replace(/-/g, '');

  const tributacao = dados.tributacao || 'T';
  const status = dados.status_rps || 'N';
  const issRetido = dados.iss_retido ? 'S' : 'N';

  // Valores em centavos (inteiros), 15 posicoes
  const valorServicos = String(Math.round((dados.valor || 0) * 100)).padStart(15, '0');
  const valorDeducoes = String(Math.round((dados.valor_deducoes || 0) * 100)).padStart(15, '0');

  const codigoServico = (dados.codigo_servico || config.codigo_servico || '09911').padStart(5, '0');

  // Tomador
  const tomadorDoc = (dados.tomador?.cpf || dados.tomador?.cnpj || '').replace(/\D/g, '');
  let indicadorTomador, docTomador;
  if (tomadorDoc.length === 11) {
    indicadorTomador = '1';
    docTomador = tomadorDoc.padStart(14, '0');
  } else if (tomadorDoc.length === 14) {
    indicadorTomador = '2';
    docTomador = tomadorDoc;
  } else {
    indicadorTomador = '3';
    docTomador = '00000000000000';
  }

  let str = inscricao + serie + numero + dataEmissao + tributacao + status
    + issRetido + valorServicos + valorDeducoes + codigoServico
    + indicadorTomador + docTomador;

  // Intermediario (opcional)
  if (dados.intermediario) {
    const intDoc = (dados.intermediario.cpf || dados.intermediario.cnpj || '').replace(/\D/g, '');
    let indicadorInt, docInt;
    if (intDoc.length === 11) {
      indicadorInt = '1';
      docInt = intDoc.padStart(14, '0');
    } else if (intDoc.length === 14) {
      indicadorInt = '2';
      docInt = intDoc;
    } else {
      indicadorInt = '3';
      docInt = '00000000000000';
    }
    const issRetidoInt = dados.intermediario.iss_retido ? 'S' : 'N';
    str += indicadorInt + docInt + issRetidoInt;
  }

  return str;
}


/**
 * Assina a string do RPS usando RSA-SHA1 (conforme manual item 4.3.2)
 * Passos:
 *  1. Converter ASCII para bytes
 *  2. Gerar hash SHA1
 *  3. Assinar com RSA-SHA1
 *  4. Retornar em Base64
 */
function assinarStringRPS(str, privateKeyPem) {
  const sign = crypto.createSign('SHA1');
  sign.update(str, 'ascii');
  return sign.sign(privateKeyPem, 'base64');
}

/**
 * Gera a string de assinatura de cancelamento (Manual item 4.3.10)
 * Total: 20 posicoes
 * #1 Inscricao Municipal Prestador - 8 digitos
 * #2 Numero da NF-e - 12 digitos
 */
function gerarStringAssinaturaCancelamento(inscricaoMunicipal, numeroNFe) {
  const inscricao = (inscricaoMunicipal || '').padStart(8, '0');
  const numero = String(numeroNFe || 0).padStart(12, '0');
  return inscricao + numero;
}


// ══════════════════════════════════════════════════════════════
// ASSINATURA XML (ds:Signature Enveloped)
// ══════════════════════════════════════════════════════════════

/**
 * Aplica a assinatura digital XML (Enveloped) na mensagem
 * Conforme manual item 3.2.3:
 * - Padrao: XML Digital Signature, formato Enveloped
 * - Algoritmo: RSA-SHA1
 * - Digest: SHA-1
 * - Transformacoes: Enveloped + C14N
 * - Cadeia: EndCertOnly
 */
function assinarXmlEnveloped(xml, privateKeyPem, certBase64, referenceUri = '') {
  const sig = new SignedXml({
    privateKey: privateKeyPem,
    signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
  });

  sig.addReference({
    xpath: "//*[local-name(.)='PedidoEnvioLoteRPS'] | //*[local-name(.)='PedidoEnvioRPS'] | //*[local-name(.)='PedidoCancelamentoNFe'] | //*[local-name(.)='PedidoConsultaNFe'] | //*[local-name(.)='PedidoConsultaNFePeriodo'] | //*[local-name(.)='PedidoConsultaLote'] | //*[local-name(.)='PedidoConsultaCNPJ'] | //*[local-name(.)='PedidoInformacoesLote']",
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    uri: referenceUri,
  });

  sig.keyInfoProvider = {
    getKeyInfo: () => `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`,
    file: '',
  };

  sig.computeSignature(xml, {
    prefix: '',
    location: { reference: "//*[local-name(.)='Signature']", action: 'after' },
  });

  return sig.getSignedXml();
}


// ══════════════════════════════════════════════════════════════
// MONTAGEM DOS XMLs
// ══════════════════════════════════════════════════════════════

/**
 * Monta o XML do RPS individual (tpRPS conforme manual 4.2.2)
 */
function montarRPS(dados, config, assinaturaBase64) {
  const dataEmissao = dados.data_emissao || new Date().toISOString().slice(0, 10);
  const valor = Number(dados.valor || 0);
  const valorDeducoes = Number(dados.valor_deducoes || 0);

  // Tomador CPF vs CNPJ (choice)
  const tomadorDoc = (dados.tomador?.cpf || dados.tomador?.cnpj || '').replace(/\D/g, '');
  let cpfCnpjTomadorXml = '';
  if (tomadorDoc.length === 11) {
    cpfCnpjTomadorXml = `<CPF>${tomadorDoc}</CPF>`;
  } else if (tomadorDoc.length === 14) {
    cpfCnpjTomadorXml = `<CNPJ>${tomadorDoc}</CNPJ>`;
  }

  // Intermediario (opcional)
  let intermediarioXml = '';
  if (dados.intermediario) {
    const intDoc = (dados.intermediario.cpf || dados.intermediario.cnpj || '').replace(/\D/g, '');
    let intDocXml = '';
    if (intDoc.length === 11) intDocXml = `<CPF>${intDoc}</CPF>`;
    else if (intDoc.length === 14) intDocXml = `<CNPJ>${intDoc}</CNPJ>`;

    intermediarioXml = `
    <CPFCNPJIntermediario>${intDocXml}</CPFCNPJIntermediario>${dados.intermediario.inscricao_municipal ? `
    <InscricaoMunicipalIntermediario>${dados.intermediario.inscricao_municipal}</InscricaoMunicipalIntermediario>` : ''}
    <ISSRetidoIntermediario>${dados.intermediario.iss_retido ? 'true' : 'false'}</ISSRetidoIntermediario>${dados.intermediario.email ? `
    <EmailIntermediario>${escapeXml(dados.intermediario.email)}</EmailIntermediario>` : ''}`;
  }

  return `<RPS>
    <Assinatura>${assinaturaBase64}</Assinatura>
    <ChaveRPS>
      <InscricaoPrestador>${config.inscricao_municipal}</InscricaoPrestador>
      <SerieRPS>${dados.serie_rps || config.serie_rps || 'BB'}</SerieRPS>
      <NumeroRPS>${dados.numero_rps}</NumeroRPS>
    </ChaveRPS>
    <TipoRPS>${dados.tipo_rps || 'RPS'}</TipoRPS>
    <DataEmissao>${dataEmissao}</DataEmissao>
    <StatusRPS>${dados.status_rps || 'N'}</StatusRPS>
    <TributacaoRPS>${dados.tributacao || 'T'}</TributacaoRPS>
    <ValorServicos>${valor.toFixed(2)}</ValorServicos>
    <ValorDeducoes>${valorDeducoes.toFixed(2)}</ValorDeducoes>
    <ValorPIS>${(dados.valor_pis || 0).toFixed(2)}</ValorPIS>
    <ValorCOFINS>${(dados.valor_cofins || 0).toFixed(2)}</ValorCOFINS>
    <ValorINSS>${(dados.valor_inss || 0).toFixed(2)}</ValorINSS>
    <ValorIR>${(dados.valor_ir || 0).toFixed(2)}</ValorIR>
    <ValorCSLL>${(dados.valor_csll || 0).toFixed(2)}</ValorCSLL>
    <CodigoServico>${dados.codigo_servico || config.codigo_servico || '09911'}</CodigoServico>
    <AliquotaServicos>${((dados.aliquota || config.aliquota || 0.05)).toFixed(4)}</AliquotaServicos>
    <ISSRetido>${dados.iss_retido ? 'true' : 'false'}</ISSRetido>${cpfCnpjTomadorXml ? `
    <CPFCNPJTomador>${cpfCnpjTomadorXml}</CPFCNPJTomador>` : ''}${dados.tomador?.inscricao_municipal ? `
    <InscricaoMunicipalTomador>${dados.tomador.inscricao_municipal}</InscricaoMunicipalTomador>` : ''}${dados.tomador?.inscricao_estadual ? `
    <InscricaoEstadualTomador>${dados.tomador.inscricao_estadual}</InscricaoEstadualTomador>` : ''}${dados.tomador?.nome ? `
    <RazaoSocialTomador>${escapeXml(dados.tomador.nome)}</RazaoSocialTomador>` : ''}${montarEnderecoTomador(dados.tomador)}${dados.tomador?.email ? `
    <EmailTomador>${escapeXml(dados.tomador.email)}</EmailTomador>` : ''}${intermediarioXml}
    <Discriminacao>${escapeXml(dados.descricao_servico || 'Servicos profissionais')}</Discriminacao>${dados.valor_carga_tributaria ? `
    <ValorCargaTributaria>${dados.valor_carga_tributaria.toFixed(2)}</ValorCargaTributaria>` : ''}${dados.codigo_cei ? `
    <CodigoCEI>${dados.codigo_cei}</CodigoCEI>` : ''}${dados.matricula_obra ? `
    <MatriculaObra>${dados.matricula_obra}</MatriculaObra>` : ''}${dados.municipio_prestacao ? `
    <MunicipioPrestacao>${dados.municipio_prestacao}</MunicipioPrestacao>` : ''}
  </RPS>`;
}


function montarEnderecoTomador(tomador) {
  if (!tomador || !tomador.logradouro) return '';
  return `
    <EnderecoTomador>${tomador.tipo_logradouro ? `
      <TipoLogradouro>${escapeXml(tomador.tipo_logradouro)}</TipoLogradouro>` : ''}
      <Logradouro>${escapeXml(tomador.logradouro)}</Logradouro>${tomador.numero ? `
      <NumeroEndereco>${escapeXml(tomador.numero)}</NumeroEndereco>` : ''}${tomador.complemento ? `
      <ComplementoEndereco>${escapeXml(tomador.complemento)}</ComplementoEndereco>` : ''}${tomador.bairro ? `
      <Bairro>${escapeXml(tomador.bairro)}</Bairro>` : ''}
      <Cidade>${tomador.cidade_ibge || '3550308'}</Cidade>
      <UF>${tomador.uf || 'SP'}</UF>${tomador.cep ? `
      <CEP>${(tomador.cep || '').replace(/\D/g, '')}</CEP>` : ''}
    </EnderecoTomador>`;
}

/**
 * Monta PedidoEnvioRPS (envio individual - item 4.3.2)
 */
function montarPedidoEnvioRPS(rpsXml, config) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<PedidoEnvioRPS xmlns="${NAMESPACE}">
  <Cabecalho xmlns="" Versao="1">
    <CPFCNPJRemetente>
      <CNPJ>${config.cnpj.replace(/\D/g, '')}</CNPJ>
    </CPFCNPJRemetente>
  </Cabecalho>
  ${rpsXml}
</PedidoEnvioRPS>`;
}

/**
 * Monta PedidoEnvioLoteRPS (envio em lote - item 4.3.3)
 */
function montarPedidoEnvioLoteRPS(rpsArray, config, opcoes = {}) {
  const dataInicio = opcoes.data_inicio || new Date().toISOString().slice(0, 10);
  const dataFim = opcoes.data_fim || dataInicio;
  const qtdRPS = rpsArray.length;
  const valorTotal = rpsArray.reduce((s, r) => s + (r.valor || 0), 0);
  const valorDeducoes = rpsArray.reduce((s, r) => s + (r.valor_deducoes || 0), 0);
  const transacao = opcoes.transacao !== false ? 'true' : 'false';

  // Montar cada RPS com assinatura individual
  const rpsXmls = rpsArray.map(rps => rps._xml).join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<PedidoEnvioLoteRPS xmlns="${NAMESPACE}">
  <Cabecalho xmlns="" Versao="1">
    <CPFCNPJRemetente>
      <CNPJ>${config.cnpj.replace(/\D/g, '')}</CNPJ>
    </CPFCNPJRemetente>
    <transacao>${transacao}</transacao>
    <dtInicio>${dataInicio}</dtInicio>
    <dtFim>${dataFim}</dtFim>
    <QtdRPS>${qtdRPS}</QtdRPS>
    <ValorTotalServicos>${valorTotal.toFixed(2)}</ValorTotalServicos>
    <ValorTotalDeducoes>${valorDeducoes.toFixed(2)}</ValorTotalDeducoes>
  </Cabecalho>
  ${rpsXmls}
</PedidoEnvioLoteRPS>`;
}


/**
 * Monta PedidoCancelamentoNFe (item 4.3.10)
 */
function montarPedidoCancelamento(notasParaCancelar, config, opcoes = {}) {
  const transacao = opcoes.transacao !== false ? 'true' : 'false';

  const detalhes = notasParaCancelar.map(nota => `
  <Detalhe xmlns="">
    <ChaveNFe>
      <InscricaoPrestador>${config.inscricao_municipal}</InscricaoPrestador>
      <NumeroNFe>${nota.numero_nf}</NumeroNFe>
    </ChaveNFe>
    <AssinaturaCancelamento>${nota._assinatura}</AssinaturaCancelamento>
  </Detalhe>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<PedidoCancelamentoNFe xmlns="${NAMESPACE}">
  <Cabecalho xmlns="" Versao="1">
    <CPFCNPJRemetente>
      <CNPJ>${config.cnpj.replace(/\D/g, '')}</CNPJ>
    </CPFCNPJRemetente>
    <transacao>${transacao}</transacao>
  </Cabecalho>${detalhes}
</PedidoCancelamentoNFe>`;
}

/**
 * Monta PedidoConsultaNFe (item 4.3.5) - por chave RPS ou chave NFe
 */
function montarPedidoConsultaNFe(consultas, config) {
  const detalhes = consultas.map(c => {
    if (c.numero_nf) {
      return `
  <Detalhe xmlns="">
    <ChaveNFe>
      <InscricaoPrestador>${config.inscricao_municipal}</InscricaoPrestador>
      <Numero>${c.numero_nf}</Numero>${c.codigo_verificacao ? `
      <CodigoVerificacao>${c.codigo_verificacao}</CodigoVerificacao>` : ''}
    </ChaveNFe>
  </Detalhe>`;
    }
    return `
  <Detalhe xmlns="">
    <ChaveRPS>
      <InscricaoPrestador>${config.inscricao_municipal}</InscricaoPrestador>${c.serie_rps ? `
      <SerieRPS>${c.serie_rps}</SerieRPS>` : ''}
      <NumeroRPS>${c.numero_rps}</NumeroRPS>
    </ChaveRPS>
  </Detalhe>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<PedidoConsultaNFe xmlns="${NAMESPACE}">
  <Cabecalho xmlns="" Versao="1">
    <CPFCNPJRemetente>
      <CNPJ>${config.cnpj.replace(/\D/g, '')}</CNPJ>
    </CPFCNPJRemetente>
  </Cabecalho>${detalhes}
</PedidoConsultaNFe>`;
}


/**
 * Monta PedidoConsultaNFePeriodo (itens 4.3.6 e 4.3.7)
 * Usado tanto para ConsultaNFeRecebidas quanto ConsultaNFeEmitidas
 */
function montarPedidoConsultaPeriodo(config, opcoes) {
  const { cpf_cnpj, inscricao, data_inicio, data_fim, pagina = 1 } = opcoes;
  const doc = (cpf_cnpj || config.cnpj || '').replace(/\D/g, '');
  let cpfCnpjXml;
  if (doc.length === 11) cpfCnpjXml = `<CPF>${doc}</CPF>`;
  else cpfCnpjXml = `<CNPJ>${doc}</CNPJ>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<PedidoConsultaNFePeriodo xmlns="${NAMESPACE}">
  <Cabecalho xmlns="" Versao="1">
    <CPFCNPJRemetente>
      <CNPJ>${config.cnpj.replace(/\D/g, '')}</CNPJ>
    </CPFCNPJRemetente>
    <CPFCNPJ>${cpfCnpjXml}</CPFCNPJ>${inscricao || config.inscricao_municipal ? `
    <Inscricao>${inscricao || config.inscricao_municipal}</Inscricao>` : ''}
    <dtInicio>${data_inicio}</dtInicio>
    <dtFim>${data_fim}</dtFim>
    <NumeroPagina>${pagina}</NumeroPagina>
  </Cabecalho>
</PedidoConsultaNFePeriodo>`;
}

/**
 * Monta PedidoConsultaLote (item 4.3.8)
 */
function montarPedidoConsultaLote(numeroLote, config) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<PedidoConsultaLote xmlns="${NAMESPACE}">
  <Cabecalho xmlns="" Versao="1">
    <CPFCNPJRemetente>
      <CNPJ>${config.cnpj.replace(/\D/g, '')}</CNPJ>
    </CPFCNPJRemetente>
    <NumeroLote>${numeroLote}</NumeroLote>
  </Cabecalho>
</PedidoConsultaLote>`;
}

/**
 * Monta PedidoConsultaCNPJ (item 4.3.11)
 */
function montarPedidoConsultaCNPJ(cnpjConsultar, config) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<PedidoConsultaCNPJ xmlns="${NAMESPACE}">
  <Cabecalho xmlns="" Versao="1">
    <CPFCNPJRemetente>
      <CNPJ>${config.cnpj.replace(/\D/g, '')}</CNPJ>
    </CPFCNPJRemetente>
  </Cabecalho>
  <CNPJContribuinte>
    <CNPJ>${cnpjConsultar.replace(/\D/g, '')}</CNPJ>
  </CNPJContribuinte>
</PedidoConsultaCNPJ>`;
}


// ══════════════════════════════════════════════════════════════
// COMUNICACAO SOAP
// ══════════════════════════════════════════════════════════════

/**
 * Envia mensagem SOAP ao Web Service da Prefeitura SP
 * Conforme manual: SOAP 1.2, Document/Literal wrapped
 */
async function enviarSoap(metodo, xmlMensagem, cert, ambiente = 'producao') {
  const endpoint = ENDPOINTS[ambiente] || ENDPOINTS.producao;

  // Escapar XML para dentro do SOAP (ou usar CDATA)
  const mensagemEscapada = `<![CDATA[${xmlMensagem}]]>`;

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${metodo}Request xmlns="http://www.prefeitura.sp.gov.br/nfe">
      <VersaoSchema>1</VersaoSchema>
      <MensagemXML>${mensagemEscapada}</MensagemXML>
    </${metodo}Request>
  </soap:Body>
</soap:Envelope>`;

  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(soapEnvelope, 'utf8'),
        'SOAPAction': `http://www.prefeitura.sp.gov.br/nfe/${metodo}`,
      },
      pfx: cert.pfx,
      passphrase: cert.passphrase,
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
      timeout: 60000,
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({ statusCode: res.statusCode, body });
      });
    });

    req.on('error', (err) => reject(new Error(`Erro conexao WS SP: ${err.message}`)));
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout conexao WS SP (60s)')); });
    req.write(soapEnvelope);
    req.end();
  });
}


// ══════════════════════════════════════════════════════════════
// PARSE DE RESPOSTAS
// ══════════════════════════════════════════════════════════════

/**
 * Extrai o conteudo do RetornoXML da resposta SOAP
 */
function extrairRetornoXml(soapBody) {
  // O retorno vem dentro de <RetornoXML> escapado ou em CDATA
  const match = soapBody.match(/<RetornoXML[^>]*>([\s\S]*?)<\/RetornoXML>/i);
  if (!match) return soapBody;
  let xml = match[1].trim();
  // Desescapar se veio escapado
  if (xml.startsWith('&lt;')) {
    xml = xml.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  }
  // Remover CDATA wrapper se houver
  if (xml.startsWith('<![CDATA[')) {
    xml = xml.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
  }
  return xml;
}

/**
 * Parseia resposta de envio de RPS / Lote (RetornoEnvioRPS / RetornoEnvioLoteRPS)
 */
function parsearRespostaEnvio(soapResponse) {
  const retornoXml = extrairRetornoXml(soapResponse.body);

  const sucesso = retornoXml.includes('<Sucesso>true</Sucesso>');

  // Extrair NFS-e geradas (ChaveNFeRPS)
  const nfes = [];
  const regex = /<ChaveNFeRPS>([\s\S]*?)<\/ChaveNFeRPS>/g;
  let m;
  while ((m = regex.exec(retornoXml)) !== null) {
    const bloco = m[1];
    nfes.push({
      inscricao_prestador: extrairTag(bloco, 'InscricaoPrestador'),
      numero_nf: extrairTag(bloco, 'Numero'),
      codigo_verificacao: extrairTag(bloco, 'CodigoVerificacao'),
      numero_rps: extrairTag(bloco, 'NumeroRPS'),
      serie_rps: extrairTag(bloco, 'SerieRPS'),
    });
  }

  // Extrair erros
  const erros = [];
  const erroRegex = /<Erro>([\s\S]*?)<\/Erro>/g;
  while ((m = erroRegex.exec(retornoXml)) !== null) {
    erros.push({
      codigo: extrairTag(m[1], 'Codigo'),
      descricao: extrairTag(m[1], 'Descricao'),
    });
  }

  // Extrair alertas
  const alertas = [];
  const alertaRegex = /<Alerta>([\s\S]*?)<\/Alerta>/g;
  while ((m = alertaRegex.exec(retornoXml)) !== null) {
    alertas.push({
      codigo: extrairTag(m[1], 'Codigo'),
      descricao: extrairTag(m[1], 'Descricao'),
    });
  }

  // Informacoes do lote
  const numeroLote = extrairTag(retornoXml, 'NumeroLote');

  const resultado = {
    success: sucesso,
    numero_lote: numeroLote,
    nfes,
    erros,
    alertas,
    xml_retorno: retornoXml,
  };

  // Para envio individual, simplificar
  if (nfes.length === 1) {
    resultado.numero_nf = nfes[0].numero_nf;
    resultado.codigo_verificacao = nfes[0].codigo_verificacao;
    resultado.status = 'emitida';
    resultado.pdf_url = `https://nfe.prefeitura.sp.gov.br/contribuinte/notaprint.aspx?nf=${nfes[0].numero_nf}&verificacao=${nfes[0].codigo_verificacao}&inscricao=${nfes[0].inscricao_prestador}`;
  }

  if (!sucesso && erros.length > 0) {
    resultado.erro = erros.map(e => `[${e.codigo}] ${e.descricao}`).join('; ');
    resultado.status = 'erro';
  }

  return resultado;
}


/**
 * Parseia resposta de consulta (RetornoConsulta)
 */
function parsearRespostaConsulta(soapResponse) {
  const retornoXml = extrairRetornoXml(soapResponse.body);
  const sucesso = retornoXml.includes('<Sucesso>true</Sucesso>');

  const nfes = [];
  const nfeRegex = /<NFe>([\s\S]*?)<\/NFe>/g;
  let m;
  while ((m = nfeRegex.exec(retornoXml)) !== null) {
    const bloco = m[1];
    nfes.push({
      numero_nf: extrairTag(bloco, 'Numero'),
      codigo_verificacao: extrairTag(bloco, 'CodigoVerificacao'),
      inscricao_prestador: extrairTag(bloco, 'InscricaoPrestador'),
      data_emissao: extrairTag(bloco, 'DataEmissaoNFe'),
      status: extrairTag(bloco, 'StatusNFe') === 'C' ? 'cancelada' : 'normal',
      valor_servicos: extrairTag(bloco, 'ValorServicos'),
      codigo_servico: extrairTag(bloco, 'CodigoServico'),
      aliquota: extrairTag(bloco, 'AliquotaServicos'),
      valor_iss: extrairTag(bloco, 'ValorISS'),
      iss_retido: extrairTag(bloco, 'ISSRetido') === 'true',
      discriminacao: extrairTag(bloco, 'Discriminacao'),
      cpf_cnpj_tomador: extrairTag(bloco, 'CPF') || extrairTag(bloco, 'CNPJ'),
      razao_social_tomador: extrairTag(bloco, 'RazaoSocialTomador'),
    });
  }

  const erros = [];
  const erroRegex = /<Erro>([\s\S]*?)<\/Erro>/g;
  while ((m = erroRegex.exec(retornoXml)) !== null) {
    erros.push({
      codigo: extrairTag(m[1], 'Codigo'),
      descricao: extrairTag(m[1], 'Descricao'),
    });
  }

  return { success: sucesso, nfes, erros, xml_retorno: retornoXml };
}

/**
 * Parseia resposta de cancelamento (RetornoCancelamentoNFe)
 */
function parsearRespostaCancelamento(soapResponse) {
  const retornoXml = extrairRetornoXml(soapResponse.body);
  const sucesso = retornoXml.includes('<Sucesso>true</Sucesso>');

  const erros = [];
  const erroRegex = /<Erro>([\s\S]*?)<\/Erro>/g;
  let m;
  while ((m = erroRegex.exec(retornoXml)) !== null) {
    erros.push({
      codigo: extrairTag(m[1], 'Codigo'),
      descricao: extrairTag(m[1], 'Descricao'),
    });
  }

  return {
    success: sucesso,
    status: sucesso ? 'cancelada' : 'erro',
    erros,
    erro: erros.length > 0 ? erros.map(e => `[${e.codigo}] ${e.descricao}`).join('; ') : null,
    xml_retorno: retornoXml,
  };
}


// ══════════════════════════════════════════════════════════════
// INTERFACE PUBLICA
// ══════════════════════════════════════════════════════════════

/**
 * Emitir NFS-e individual (EnvioRPS - item 4.3.2)
 * @param {Object} params
 * @param {number} params.valor - Valor do servico
 * @param {string} params.descricao_servico - Discriminacao dos servicos
 * @param {Object} params.tomador - Dados do tomador {cpf, cnpj, nome, logradouro, ...}
 * @param {number} params.numero_rps - Numero do RPS
 * @param {Object} params.config - Configuracao {cnpj, inscricao_municipal, ...}
 */
async function emitir(params) {
  const { config, ...dados } = params;
  const cert = await loadCertificate(config);
  const { privateKeyPem, certBase64 } = extrairChavesCertificado(cert.pfx, cert.passphrase);

  // 1. Gerar assinatura do RPS (string 86+ posicoes -> SHA1 -> RSA -> Base64)
  const strAssinatura = gerarStringAssinaturaRPS(dados, config);
  const assinaturaRPS = assinarStringRPS(strAssinatura, privateKeyPem);

  // 2. Montar XML do RPS com assinatura
  const rpsXml = montarRPS(dados, config, assinaturaRPS);

  // 3. Montar PedidoEnvioRPS
  const pedidoXml = montarPedidoEnvioRPS(rpsXml, config);

  // 4. Assinar XML com ds:Signature (Enveloped)
  const xmlAssinado = assinarXmlEnveloped(pedidoXml, privateKeyPem, certBase64);

  // 5. Enviar SOAP
  const ambiente = config.ambiente || 'producao';
  const response = await enviarSoap('EnvioRPS', xmlAssinado, cert, ambiente);

  // 6. Parsear resposta
  return parsearRespostaEnvio(response);
}

/**
 * Emitir lote de NFS-e (EnvioLoteRPS - item 4.3.3)
 */
async function emitirLote(params) {
  const { config, rps_list, opcoes = {} } = params;
  const cert = await loadCertificate(config);
  const { privateKeyPem, certBase64 } = extrairChavesCertificado(cert.pfx, cert.passphrase);

  // Montar cada RPS com assinatura individual
  const rpsMontados = rps_list.map(dados => {
    const strAssinatura = gerarStringAssinaturaRPS(dados, config);
    const assinaturaRPS = assinarStringRPS(strAssinatura, privateKeyPem);
    const xml = montarRPS(dados, config, assinaturaRPS);
    return { ...dados, _xml: xml };
  });

  // Montar PedidoEnvioLoteRPS
  const pedidoXml = montarPedidoEnvioLoteRPS(rpsMontados, config, opcoes);

  // Assinar XML com ds:Signature
  const xmlAssinado = assinarXmlEnveloped(pedidoXml, privateKeyPem, certBase64);

  // Enviar SOAP
  const ambiente = config.ambiente || 'producao';
  const response = await enviarSoap('EnvioLoteRPS', xmlAssinado, cert, ambiente);

  return parsearRespostaEnvio(response);
}


/**
 * Cancelar NFS-e (CancelamentoNFe - item 4.3.10)
 * @param {Object} params
 * @param {string|Array} params.numero_nf - Numero(s) da(s) NF-e a cancelar
 * @param {Object} params.config
 */
async function cancelar(params) {
  const { config, numero_nf, transacao } = params;
  const cert = await loadCertificate(config);
  const { privateKeyPem, certBase64 } = extrairChavesCertificado(cert.pfx, cert.passphrase);

  // Suportar cancelamento unico ou multiplo
  const numeros = Array.isArray(numero_nf) ? numero_nf : [numero_nf];

  // Gerar assinatura de cancelamento para cada NF-e
  const notasComAssinatura = numeros.map(num => {
    const strCanc = gerarStringAssinaturaCancelamento(config.inscricao_municipal, num);
    const assinatura = assinarStringRPS(strCanc, privateKeyPem);
    return { numero_nf: num, _assinatura: assinatura };
  });

  // Montar XML
  const pedidoXml = montarPedidoCancelamento(notasComAssinatura, config, { transacao });

  // Assinar XML com ds:Signature
  const xmlAssinado = assinarXmlEnveloped(pedidoXml, privateKeyPem, certBase64);

  // Enviar SOAP
  const ambiente = config.ambiente || 'producao';
  const response = await enviarSoap('CancelamentoNFe', xmlAssinado, cert, ambiente);

  return parsearRespostaCancelamento(response);
}

/**
 * Consultar NFS-e por numero ou RPS (ConsultaNFe - item 4.3.5)
 */
async function consultar(params) {
  const { config, numero_nf, numero_rps, serie_rps, codigo_verificacao } = params;
  const cert = await loadCertificate(config);
  const { privateKeyPem, certBase64 } = extrairChavesCertificado(cert.pfx, cert.passphrase);

  const consultas = [];
  if (numero_nf) {
    consultas.push({ numero_nf, codigo_verificacao });
  } else if (numero_rps) {
    consultas.push({ numero_rps, serie_rps });
  }

  const pedidoXml = montarPedidoConsultaNFe(consultas, config);
  const xmlAssinado = assinarXmlEnveloped(pedidoXml, privateKeyPem, certBase64);

  const ambiente = config.ambiente || 'producao';
  const response = await enviarSoap('ConsultaNFe', xmlAssinado, cert, ambiente);

  return parsearRespostaConsulta(response);
}


/**
 * Consultar NFS-e emitidas por periodo (ConsultaNFeEmitidas - item 4.3.7)
 */
async function consultarEmitidas(params) {
  const { config, data_inicio, data_fim, pagina = 1 } = params;
  const cert = await loadCertificate(config);
  const { privateKeyPem, certBase64 } = extrairChavesCertificado(cert.pfx, cert.passphrase);

  const pedidoXml = montarPedidoConsultaPeriodo(config, {
    cpf_cnpj: config.cnpj,
    inscricao: config.inscricao_municipal,
    data_inicio,
    data_fim,
    pagina,
  });

  const xmlAssinado = assinarXmlEnveloped(pedidoXml, privateKeyPem, certBase64);
  const ambiente = config.ambiente || 'producao';
  const response = await enviarSoap('ConsultaNFeEmitidas', xmlAssinado, cert, ambiente);

  return parsearRespostaConsulta(response);
}

/**
 * Consultar NFS-e recebidas por periodo (ConsultaNFeRecebidas - item 4.3.6)
 */
async function consultarRecebidas(params) {
  const { config, cpf_cnpj_tomador, inscricao_tomador, data_inicio, data_fim, pagina = 1 } = params;
  const cert = await loadCertificate(config);
  const { privateKeyPem, certBase64 } = extrairChavesCertificado(cert.pfx, cert.passphrase);

  const pedidoXml = montarPedidoConsultaPeriodo(config, {
    cpf_cnpj: cpf_cnpj_tomador || config.cnpj,
    inscricao: inscricao_tomador,
    data_inicio,
    data_fim,
    pagina,
  });

  const xmlAssinado = assinarXmlEnveloped(pedidoXml, privateKeyPem, certBase64);
  const ambiente = config.ambiente || 'producao';
  const response = await enviarSoap('ConsultaNFeRecebidas', xmlAssinado, cert, ambiente);

  return parsearRespostaConsulta(response);
}

/**
 * Consultar lote processado (ConsultaLote - item 4.3.8)
 */
async function consultarLote(params) {
  const { config, numero_lote } = params;
  const cert = await loadCertificate(config);
  const { privateKeyPem, certBase64 } = extrairChavesCertificado(cert.pfx, cert.passphrase);

  const pedidoXml = montarPedidoConsultaLote(numero_lote, config);
  const xmlAssinado = assinarXmlEnveloped(pedidoXml, privateKeyPem, certBase64);

  const ambiente = config.ambiente || 'producao';
  const response = await enviarSoap('ConsultaLote', xmlAssinado, cert, ambiente);

  return parsearRespostaConsulta(response);
}

/**
 * Consultar CNPJ (ConsultaCNPJ - item 4.3.11)
 */
async function consultarCNPJ(params) {
  const { config, cnpj } = params;
  const cert = await loadCertificate(config);
  const { privateKeyPem, certBase64 } = extrairChavesCertificado(cert.pfx, cert.passphrase);

  const pedidoXml = montarPedidoConsultaCNPJ(cnpj, config);
  const xmlAssinado = assinarXmlEnveloped(pedidoXml, privateKeyPem, certBase64);

  const ambiente = config.ambiente || 'producao';
  const response = await enviarSoap('ConsultaCNPJ', xmlAssinado, cert, ambiente);

  const retornoXml = extrairRetornoXml(response.body);
  const sucesso = retornoXml.includes('<Sucesso>true</Sucesso>');

  // Extrair inscrições vinculadas
  const inscricoes = [];
  const detalheRegex = /<Detalhe>([\s\S]*?)<\/Detalhe>/g;
  let m;
  while ((m = detalheRegex.exec(retornoXml)) !== null) {
    inscricoes.push({
      inscricao_municipal: extrairTag(m[1], 'InscricaoMunicipal'),
      emite_nfe: extrairTag(m[1], 'EmiteNFe') === 'true',
    });
  }

  return { success: sucesso, inscricoes, xml_retorno: retornoXml };
}


/**
 * Teste de envio de lote (TesteEnvioLoteRPS - item 4.3.4)
 * Mesma validacao do envio real, mas NAO gera NFS-e
 */
async function testarLote(params) {
  const { config, rps_list, opcoes = {} } = params;
  const cert = await loadCertificate(config);
  const { privateKeyPem, certBase64 } = extrairChavesCertificado(cert.pfx, cert.passphrase);

  const rpsMontados = rps_list.map(dados => {
    const strAssinatura = gerarStringAssinaturaRPS(dados, config);
    const assinaturaRPS = assinarStringRPS(strAssinatura, privateKeyPem);
    const xml = montarRPS(dados, config, assinaturaRPS);
    return { ...dados, _xml: xml };
  });

  const pedidoXml = montarPedidoEnvioLoteRPS(rpsMontados, config, opcoes);
  const xmlAssinado = assinarXmlEnveloped(pedidoXml, privateKeyPem, certBase64);

  const ambiente = config.ambiente || 'producao';
  const response = await enviarSoap('TesteEnvioLoteRPS', xmlAssinado, cert, ambiente);

  return parsearRespostaEnvio(response);
}

// ══════════════════════════════════════════════════════════════
// UTILITARIOS
// ══════════════════════════════════════════════════════════════

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function extrairTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`);
  const match = (xml || '').match(regex);
  return match ? match[1].trim() : null;
}

// ══════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════

module.exports = {
  emitir,
  emitirLote,
  cancelar,
  consultar,
  consultarEmitidas,
  consultarRecebidas,
  consultarLote,
  consultarCNPJ,
  testarLote,
  // Helpers exportados para testes
  gerarStringAssinaturaRPS,
  gerarStringAssinaturaCancelamento,
  montarRPS,
};
