const { Router } = require('express');
const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { env } = require('../config/env');

const router = Router();
const cognito = new CognitoIdentityProviderClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID || process.env.COGNITO_USER_POOL_CLIENT_ID;

router.post('/signup', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios' });
    await cognito.send(new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      Password: senha,
      UserAttributes: [{ Name: 'name', Value: nome }, { Name: 'email', Value: email }],
    }));
    res.status(201).json({ success: true, message: 'Cadastro realizado. Verifique seu e-mail.' });
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
