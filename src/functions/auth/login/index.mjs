import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.REGION });

export const handler = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body || "{}");

    if (!email || !password) {
      return response(400, { error: "Campos obrigatórios: email, password" });
    }

    const authResult = await cognitoClient.send(new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    }));

    const tokens = authResult.AuthenticationResult;

    return response(200, {
      accessToken: tokens.AccessToken,
      idToken: tokens.IdToken,
      refreshToken: tokens.RefreshToken,
      expiresIn: tokens.ExpiresIn
    });

  } catch (error) {
    console.error(JSON.stringify({ error: error.message, code: error.name }));

    if (error.name === "NotAuthorizedException") {
      return response(401, { error: "Email ou senha incorretos" });
    }
    if (error.name === "UserNotConfirmedException") {
      return response(403, { error: "Email não confirmado. Verifique sua caixa de entrada." });
    }
    if (error.name === "UserNotFoundException") {
      return response(401, { error: "Email ou senha incorretos" });
    }
    return response(500, { error: "Erro interno no login" });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
