import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { QueryCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.REGION }));

export const handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) return response(401, { error: "Não autorizado" });

    const { limit, nextToken } = event.queryStringParameters || {};

    const params = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `PHOTOGRAPHER#${userId}`,
        ":sk": "CLIENT#"
      },
      ScanIndexForward: false
    };

    if (limit) params.Limit = parseInt(limit, 10);
    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, "base64").toString());
    }

    const result = await ddbClient.send(new QueryCommand(params));

    const responseBody = {
      clients: result.Items || [],
      count: result.Count || 0
    };

    if (result.LastEvaluatedKey) {
      responseBody.nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64");
    }

    return response(200, responseBody);

  } catch (error) {
    console.error(JSON.stringify({ error: error.message, stack: error.stack }));
    return response(500, { error: "Erro ao listar clientes" });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
