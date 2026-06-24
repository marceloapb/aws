import { Router } from 'express';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { env } from '../config/env.js';

const router = Router();
const cognito = new CognitoIdentityProviderClient({ region: env.AWS_REGION });
const CLIENT_ID = process.env.COGNITO_USER_POOL_CLIENT_ID;

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
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios' });
    const result = await cognito.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: senha },
    }));
    const tokens = result.AuthenticationResult;
    res.json({ success: true, data: { idToken: tokens.IdToken, accessToken: tokens.AccessToken, refreshToken: tokens.RefreshToken } });
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

export default router;
