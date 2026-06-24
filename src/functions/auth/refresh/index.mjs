import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.REGION });

export const handler = async (event) => {
  try {
    const { refreshToken } = JSON.parse(event.body || "{}");

    if (!refreshToken) {
      return response(400, { error: "Campo obrigatório: refreshToken" });
    }

    const authResult = await cognitoClient.send(new InitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    }));

    const tokens = authResult.AuthenticationResult;

    return response(200, {
      accessToken: tokens.AccessToken,
      idToken: tokens.IdToken,
      expiresIn: tokens.ExpiresIn
    });

  } catch (error) {
    console.error(JSON.stringify({ error: error.message, code: error.name }));

    if (error.name === "NotAuthorizedException") {
      return response(401, { error: "Refresh token inválido ou expirado" });
    }
    return response(500, { error: "Erro interno no refresh" });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
