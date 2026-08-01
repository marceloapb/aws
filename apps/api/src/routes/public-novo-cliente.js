const { Router } = require('express');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');
const { dynamo, TABLE } = require('../config/dynamodb');
const { ScanCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminGetUserCommand,
} = require('@aws-sdk/client-cognito-identity-provider');
const whatsapp = require('../lib/whatsapp/client');
const { enviarEmail } = require('../services/emailService');

const router = Router();
const cognito = new CognitoIdentityProviderClient({ region: 'us-east-1' });
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_ENV0dsEJx';
const TENANT = process.env.TENANT_ID || 'default';

// Token de segurança para endpoints públicos (evita bots)
const PUBLIC_TOKEN = process.env.PUBLIC_FORM_TOKEN || 'mbf-pub-2026-xK9mP4';

function validateToken(req, res, next) {
  const token = req.headers['x-public-token'] || req.query.token;
  if (token !== PUBLIC_TOKEN) {
    return res.status(403).json({ success: false, message: 'Acesso não autorizado' });
  }
  next();
}

// ═══════════════════════════════════════════════════════════
// GET /public/novo-cliente/catalogo — Pacotes + Serviços ativos (sem auth)
// ═══════════════════════════════════════════════════════════
router.get('/catalogo', validateToken, async (req, res) => {
  try {
    // Buscar pacotes ativos
    const pacotesResult = await dynamo.send(new ScanCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      FilterExpression: 'GSI1SK = :sk AND (ativo = :ativo OR attribute_not_exists(ativo))',
      ExpressionAttributeValues: {
        ':sk': 'PACOTE_CATALOGO#ACTIVE',
        ':ativo': true,
      },
    }));

    const pacotes = (pacotesResult.Items || [])
      .filter(p => p.exibir_ao_cliente !== false)
      .map(p => ({
        id: p.id,
        nome: p.nome,
        descricao: p.descricao || '',
        itens: (p.itens || []).map(i => ({
          nome: i.nome,
          descricao: i.descricao || '',
          tipo: i.tipo || '',
          quantidade: i.quantidade || 1,
        })),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));

    // Buscar serviços ativos
    const servicosResult = await dynamo.send(new ScanCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      FilterExpression: 'GSI1SK = :sk AND (ativo = :ativo OR attribute_not_exists(ativo))',
      ExpressionAttributeValues: {
        ':sk': 'ITEM_CATALOGO#ACTIVE',
        ':ativo': true,
      },
    }));

    const items = (servicosResult.Items || []).filter(item => item.exibir_ao_cliente !== false);

    const servicos_principais = [];
    const produtos = [];
    const adicionais = [];

    items.forEach(item => {
      const entry = { id: item.id, nome: item.nome, descricao: item.descricao || '', tipo: item.tipo };
      switch (item.tipo) {
        case 'servico_principal': servicos_principais.push(entry); break;
        case 'produto': produtos.push(entry); break;
        case 'adicional': adicionais.push(entry); break;
        default: servicos_principais.push(entry);
      }
    });

    // Ordenar alfabeticamente
    servicos_principais.sort((a, b) => a.nome.localeCompare(b.nome));
    produtos.sort((a, b) => a.nome.localeCompare(b.nome));
    adicionais.sort((a, b) => a.nome.localeCompare(b.nome));

    res.json({
      success: true,
      data: { pacotes, servicos: { servicos_principais, produtos, adicionais } },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /public/novo-cliente/verificar — Verifica se email/CPF já existe (early validation)
// ═══════════════════════════════════════════════════════════
router.post('/verificar', validateToken, async (req, res) => {
  try {
    const { email, cpf_cnpj } = req.body;

    // Verificar email no Cognito
    if (email) {
      try {
        await cognito.send(new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: email }));
        return res.json({ success: false, code: 'EMAIL_EXISTS', message: 'Já existe um cadastro com este e-mail.' });
      } catch (err) {
        if (err.name !== 'UserNotFoundException') throw err;
      }
    }

    // Verificar CPF/CNPJ no DynamoDB
    const documentoLimpo = (cpf_cnpj || '').replace(/\D/g, '');
    if (documentoLimpo.length >= 11) {
      const docCheck = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': `DOC#${documentoLimpo}` },
        Limit: 1,
      }));
      if (docCheck.Items && docCheck.Items.length > 0) {
        return res.json({ success: false, code: 'CPF_EXISTS', message: 'Já existe um cadastro com este CPF/CNPJ.' });
      }
    }

    res.json({ success: true, message: 'Disponível' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao verificar dados.' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /public/novo-cliente — Cadastro completo + Orçamento + Senha temporária
// ═══════════════════════════════════════════════════════════
router.post('/', validateToken, async (req, res) => {
  try {
    const {
      // Dados pessoais
      nome, email, telefone, cpf_cnpj, instagram,
      // Endereço
      endereco_cep, endereco_rua, endereco_numero, endereco_complemento,
      endereco_bairro, endereco_cidade, endereco_estado,
      // Orçamento
      origem, nome_evento, data_evento, horario_inicio, horario_fim,
      pacote_id, servicos_selecionados,
      local_nome, local_cep, local_logradouro, local_numero,
      local_complemento, local_bairro, local_cidade, local_uf,
      observacoes,
    } = req.body;

    // ─── Validações ───
    if (!nome || nome.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Nome é obrigatório (mínimo 3 caracteres)' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'E-mail válido é obrigatório' });
    }
    const telefoneLimpo = (telefone || '').replace(/\D/g, '');
    if (telefoneLimpo.length < 10) {
      return res.status(400).json({ success: false, message: 'Telefone/WhatsApp é obrigatório' });
    }

    const documentoLimpo = (cpf_cnpj || '').replace(/\D/g, '');

    // ─── Verificar duplicidade por email (Cognito) ───
    try {
      await cognito.send(new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: email }));
      // Se chegou aqui, usuário já existe
      return res.status(409).json({
        success: false,
        code: 'ALREADY_EXISTS',
        message: 'Já existe um cadastro com este e-mail. Faça login para acessar.',
      });
    } catch (err) {
      if (err.name !== 'UserNotFoundException') {
        throw err; // Erro inesperado
      }
      // UserNotFoundException = OK, pode criar
    }

    // ─── Verificar duplicidade por CPF/CNPJ ───
    if (documentoLimpo.length >= 11) {
      const docCheck = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': `DOC#${documentoLimpo}` },
        Limit: 1,
      }));
      if (docCheck.Items && docCheck.Items.length > 0) {
        return res.status(409).json({
          success: false,
          code: 'ALREADY_EXISTS',
          message: 'Já existe um cadastro com este CPF/CNPJ. Faça login para acessar.',
        });
      }
    }

    // ─── Gerar senha temporária ───
    const tempPass = 'Mb!' + crypto.randomBytes(4).toString('hex').slice(0, 5) + '9';

    // ─── Criar usuário no Cognito ───
    const createResult = await cognito.send(new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      TemporaryPassword: tempPass,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: nome.trim() },
      ],
    }));

    const clienteId = createResult.User.Attributes.find(a => a.Name === 'sub')?.Value;
    const now = new Date().toISOString();

    // ─── Criar cliente no DynamoDB ───
    const clienteItem = {
      PK: `CLIENT#${clienteId}`,
      SK: 'PROFILE',
      GSI1PK: documentoLimpo ? `DOC#${documentoLimpo}` : `CLIENT#${clienteId}`,
      GSI1SK: `CLIENT#${clienteId}`,
      id: clienteId,
      nome: nome.trim(),
      email,
      telefone: telefoneLimpo,
      cpf_cnpj: documentoLimpo,
      instagram: (instagram || '').replace('@', '').trim(),
      endereco_cep: (endereco_cep || '').replace(/\D/g, ''),
      endereco_rua: endereco_rua || '',
      endereco_numero: endereco_numero || '',
      endereco_complemento: endereco_complemento || '',
      endereco_bairro: endereco_bairro || '',
      endereco_cidade: endereco_cidade || '',
      endereco_estado: endereco_estado || '',
      origem: 'link_novo_cliente',
      perfil_completo: true,
      created: now,
      updated: now,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: clienteItem }));

    // ─── Criar orçamento ───
    const orcamentoId = uuid();
    const orcamentoItem = {
      PK: `CLIENT#${clienteId}`,
      SK: `ORCAMENTO#${orcamentoId}`,
      GSI1PK: 'ORCAMENTO',
      GSI1SK: `ORCAMENTO#${now}`,
      id: orcamentoId,
      cliente_id: clienteId,
      cliente_nome: nome.trim(),
      cliente_email: email,
      cliente_telefone: telefoneLimpo,
      status: 'solicitado',
      origem: origem || '',
      nome_evento: nome_evento || '',
      data_evento: data_evento || null,
      horario_inicio: horario_inicio || null,
      horario_fim: horario_fim || null,
      pacote_id: pacote_id || null,
      servicos_selecionados: servicos_selecionados || [],
      local_nome: local_nome || '',
      local_cep: (local_cep || '').replace(/\D/g, ''),
      local_logradouro: local_logradouro || '',
      local_numero: local_numero || '',
      local_complemento: local_complemento || '',
      local_bairro: local_bairro || '',
      local_cidade: local_cidade || '',
      local_uf: local_uf || '',
      observacoes: observacoes || '',
      created: now,
      updated: now,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: orcamentoItem }));

    // ─── Enviar senha via cascata: WhatsApp → Email ───
    let metodo_envio = null;
    const logBase = { tipo_evento: 'novo_cliente_senha', created: now };

    // Tentativa 1: WhatsApp
    try {
      await whatsapp.enviarTemplate({
        telefone: telefoneLimpo,
        template_name: 'mbfoto_codigo_verificacao',
        parameters: [nome.trim(), tempPass, 'MBFoto'],
      });
      metodo_envio = 'whatsapp';

      // Log sucesso WhatsApp
      await dynamo.send(new PutCommand({
        TableName: TABLE,
        Item: {
          PK: `TENANT#${TENANT}`, SK: `LOG_NTF#${uuid()}`,
          id: uuid(), ...logBase, canal: 'whatsapp', status: 'enviado',
          destinatario: telefoneLimpo, erro: null,
        },
      }));
    } catch (whatsErr) {
      // Log erro WhatsApp
      await dynamo.send(new PutCommand({
        TableName: TABLE,
        Item: {
          PK: `TENANT#${TENANT}`, SK: `LOG_NTF#${uuid()}`,
          id: uuid(), ...logBase, canal: 'whatsapp', status: 'erro',
          destinatario: telefoneLimpo, erro: whatsErr.message,
        },
      }));

      // Tentativa 2: Email
      try {
        await enviarEmail({
          para: email,
          assunto: 'Sua senha temporária - MBFoto',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;">
              <h2 style="color:#EA580C;">Bem-vindo(a), ${nome.trim()}!</h2>
              <p>Seu cadastro foi realizado com sucesso.</p>
              <p>Sua senha temporária para acessar o portal:</p>
              <div style="background:#f3f4f6;padding:16px;border-radius:8px;text-align:center;margin:16px 0;">
                <code style="font-size:20px;font-weight:bold;letter-spacing:2px;">${tempPass}</code>
              </div>
              <p style="font-size:14px;color:#666;">No primeiro acesso, você será solicitado(a) a criar uma nova senha.</p>
              <a href="https://www.marcelobloisefotografia.com.br/login" style="display:inline-block;background:#EA580C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:12px;">Acessar Portal</a>
            </div>
          `,
        });
        metodo_envio = 'email';

        // Log sucesso Email
        await dynamo.send(new PutCommand({
          TableName: TABLE,
          Item: {
            PK: `TENANT#${TENANT}`, SK: `LOG_NTF#${uuid()}`,
            id: uuid(), ...logBase, canal: 'email', status: 'enviado',
            destinatario: email, erro: null,
          },
        }));
      } catch (emailErr) {
        // Log erro Email
        await dynamo.send(new PutCommand({
          TableName: TABLE,
          Item: {
            PK: `TENANT#${TENANT}`, SK: `LOG_NTF#${uuid()}`,
            id: uuid(), ...logBase, canal: 'email', status: 'erro',
            destinatario: email, erro: emailErr.message,
          },
        }));
      }
    }

    // ─── Resposta ───
    const mensagens = {
      whatsapp: `Cadastro realizado! Sua senha temporária foi enviada para o WhatsApp (${telefoneLimpo.slice(-4)}).`,
      email: `Cadastro realizado! Sua senha temporária foi enviada para o e-mail ${email}.`,
    };

    res.status(201).json({
      success: true,
      message: mensagens[metodo_envio] || 'Cadastro realizado! Verifique seu WhatsApp ou e-mail para a senha de acesso.',
      metodo_envio: metodo_envio || 'nenhum',
    });
  } catch (error) {
    console.error('[NOVO-CLIENTE] Erro:', error.message);
    res.status(500).json({ success: false, message: 'Erro ao processar cadastro. Tente novamente.' });
  }
});

module.exports = router;
