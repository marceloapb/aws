import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { QueryCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.REGION }));

export const handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) return response(401, { error: "Não autorizado" });

    const clientId = event.pathParameters?.clientId;
    if (!clientId) return response(400, { error: "clientId é obrigatório" });

    // Buscar cliente via GSI1
    const result = await ddbClient.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk AND GSI1SK = :sk",
      ExpressionAttributeValues: {
        ":pk": `CLIENT#${clientId}`,
        ":sk": "PROFILE"
      }
    }));

    if (!result.Items || result.Items.length === 0) {
      return response(404, { error: "Cliente não encontrado" });
    }

    const client = result.Items[0];

    // Verificar ownership
    if (client.photographerId !== userId) {
      return response(403, { error: "Sem permissão para acessar este cliente" });
    }

    return response(200, { client });

  } catch (error) {
    console.error(JSON.stringify({ error: error.message, stack: error.stack }));
    return response(500, { error: "Erro ao buscar cliente" });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
