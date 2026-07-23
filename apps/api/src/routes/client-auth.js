const { Router } = require('express');
const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { env } = require('../config/env');

const router = Router();
const cognito = new CognitoIdentityProviderClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID || process.env.COGNITO_USER_POOL_CLIENT_ID;

router.post('/signup', async (req, res) => {
  try {
    const { nome, email, senha, phone, tipo_pessoa, documento } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios' });

    // Validar documento obrigatório
    const documentoLimpo = documento ? documento.replace(/\D/g, '') : '';
    if (!documentoLimpo || (documentoLimpo.length !== 11 && documentoLimpo.length !== 14)) {
      return res.status(400).json({ success: false, message: 'CPF ou CNPJ é obrigatório' });
    }

    // Verificar se documento já existe (unicidade)
    const docCheck = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `DOC#${documentoLimpo}`
      },
      Limit: 1
    }));
    if (docCheck.Items && docCheck.Items.length > 0) {
      return res.status(409).json({ success: false, message: 'Já existe um cadastro com este CPF/CNPJ' });
    }

    // Criar usuário no Cognito
    const result = await cognito.send(new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      Password: senha,
      UserAttributes: [{ Name: 'name', Value: nome }, { Name: 'email', Value: email }],
    }));

    // Confirmar automaticamente e verificar e-mail
    const { AdminConfirmSignUpCommand, AdminUpdateUserAttributesCommand } = require('@aws-sdk/client-cognito-identity-provider');
    const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_ENV0dsEJx';
    try {
      await cognito.send(new AdminConfirmSignUpCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
      }));
      await cognito.send(new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: [{ Name: 'email_verified', Value: 'true' }],
      }));
    } catch (confirmErr) {
      // Se falhar auto-confirm, segue sem — cliente confirma por e-mail
      console.warn('Auto-confirm failed:', confirmErr.message);
    }

    // Salvar perfil do cliente no DynamoDB
    const clienteId = result.UserSub;
    const telefoneLimpo = phone ? phone.replace(/\D/g, '') : '';
    const now = new Date().toISOString();
    const temDadosCompletos = nome.trim().length >= 3 && telefoneLimpo.length >= 10 && tipo_pessoa && documentoLimpo.length >= 11;

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `CLIENT#${clienteId}`,
        SK: 'PROFILE',
        GSI1PK: `DOC#${documentoLimpo}`,
        GSI1SK: `CLIENT#${clienteId}`,
        email,
        nome_completo: nome.trim(),
        telefone: telefoneLimpo,
        tipo_pessoa: tipo_pessoa || 'PF',
        documento: documentoLimpo,
        perfil_completo: temDadosCompletos,
        criadoEm: now,
        atualizadoEm: now,
      }
    }));

    // Tentar auto-login para retornar token diretamente
    try {
      const loginResult = await cognito.send(new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: { USERNAME: email, PASSWORD: senha },
      }));
      const tokens = loginResult.AuthenticationResult;
      const payload = JSON.parse(Buffer.from(tokens.IdToken.split('.')[1], 'base64url').toString('utf8'));
      const groups = payload['cognito:groups'] || [];
      const role = groups.includes('admin') ? 'admin' : 'client';

      const user = {
        id: payload.sub,
        sub: payload.sub,
        email: payload.email,
        name: payload.name || nome || email.split('@')[0],
        role,
        groups,
        perfil_completo: temDadosCompletos,
      };

      return res.status(201).json({
        success: true,
        message: 'Cadastro realizado com sucesso!',
        auto_login: true,
        user,
        token: tokens.IdToken,
        data: { idToken: tokens.IdToken, accessToken: tokens.AccessToken, refreshToken: tokens.RefreshToken },
      });
    } catch (loginErr) {
      // Se auto-login falhar (ex: e-mail não confirmado), retorna sucesso sem token
      return res.status(201).json({ success: true, message: 'Cadastro realizado. Verifique seu e-mail para confirmar.', auto_login: false });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, senha, password } = req.body;
    const pwd = senha || password;
    if (!email || !pwd) return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios' });
    const result = await cognito.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: pwd },
    }));
    const tokens = result.AuthenticationResult;

    // Decodificar idToken para extrair dados do usuário
    const payload = JSON.parse(Buffer.from(tokens.IdToken.split('.')[1], 'base64url').toString('utf8'));
    const groups = payload['cognito:groups'] || [];
    const role = groups.includes('admin') ? 'admin' : 'client';

    // Buscar perfil_completo do DynamoDB
    let perfil_completo = false;
    try {
      const profileResult = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `CLIENT#${payload.sub}`, SK: 'PROFILE' },
        ProjectionExpression: 'perfil_completo'
      }));
      perfil_completo = profileResult.Item?.perfil_completo === true;
    } catch {}

    const user = {
      id: payload.sub,
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      role: role,
      groups: groups,
      perfil_completo,
    };

    res.json({
      success: true,
      user,
      token: tokens.IdToken,
      data: { idToken: tokens.IdToken, accessToken: tokens.AccessToken, refreshToken: tokens.RefreshToken },
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Credenciais inválidas' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    await cognito.send(new ForgotPasswordCommand({ ClientId: CLIENT_ID, Username: email }));
    res.json({ success: true, message: 'Código de recuperação enviado para o e-mail' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/confirm-forgot-password', async (req, res) => {
  try {
    const { email, code, novaSenha } = req.body;
    await cognito.send(new ConfirmForgotPasswordCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
      Password: novaSenha,
    }));
    res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
