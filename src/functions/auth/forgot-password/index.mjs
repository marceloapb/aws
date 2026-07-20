import {
  CognitoIdentityProviderClient,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand
} from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.REGION });

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { action } = body;

    if (action === "request") {
      return await requestCode(body);
    } else if (action === "confirm") {
      return await confirmPassword(body);
    } else {
      return response(400, { error: "action deve ser 'request' ou 'confirm'" });
    }

  } catch (error) {
    console.error(JSON.stringify({ error: error.message, code: error.name }));

    if (error.name === "UserNotFoundException") {
      // Não revelar se o email existe
      return response(200, { message: "Se o email existir, um código será enviado." });
    }
    if (error.name === "CodeMismatchException") {
      return response(400, { error: "Código inválido" });
    }
    if (error.name === "ExpiredCodeException") {
      return response(400, { error: "Código expirado. Solicite um novo." });
    }
    return response(500, { error: "Erro interno" });
  }
};

async function requestCode({ email }) {
  if (!email) return response(400, { error: "Campo obrigatório: email" });

  await cognitoClient.send(new ForgotPasswordCommand({
    ClientId: process.env.COGNITO_CLIENT_ID,
    Username: email
  }));

  return response(200, { message: "Se o email existir, um código será enviado." });
}

async function confirmPassword({ email, code, newPassword }) {
  if (!email || !code || !newPassword) {
    return response(400, { error: "Campos obrigatórios: email, code, newPassword" });
  }

  await cognitoClient.send(new ConfirmForgotPasswordCommand({
    ClientId: process.env.COGNITO_CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
    Password: newPassword
  }));

  return response(200, { message: "Senha alterada com sucesso" });
}

const response = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
