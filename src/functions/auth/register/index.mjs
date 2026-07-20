import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.REGION });
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.REGION }));

export const handler = async (event) => {
  try {
    const { email, password, name } = JSON.parse(event.body || "{}");

    if (!email || !password || !name) {
      return response(400, { error: "Campos obrigatórios: email, password, name" });
    }

    // 1. Registrar no Cognito
    const signUpResult = await cognitoClient.send(new SignUpCommand({
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "name", Value: name }
      ]
    }));

    // 2. Salvar perfil no DynamoDB
    const userId = signUpResult.UserSub;
    await ddbClient.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        PK: `PHOTOGRAPHER#${userId}`,
        SK: "PROFILE",
        GSI1PK: `EMAIL#${email}`,
        GSI1SK: "PHOTOGRAPHER",
        id: userId,
        email,
        name,
        plan: "free",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      ConditionExpression: "attribute_not_exists(PK)"
    }));

    return response(201, {
      message: "Usuário registrado. Verifique seu email para confirmar.",
      userId
    });

  } catch (error) {
    console.error(JSON.stringify({ error: error.message, code: error.name }));

    if (error.name === "UsernameExistsException") {
      return response(409, { error: "Email já cadastrado" });
    }
    if (error.name === "InvalidPasswordException") {
      return response(400, { error: "Senha não atende os requisitos mínimos" });
    }
    return response(500, { error: "Erro interno no registro" });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
