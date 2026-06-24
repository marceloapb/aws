import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, QueryCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.REGION }));

export const handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) return response(401, { error: "Não autorizado" });

    const galleryId = event.pathParameters?.galleryId;
    if (!galleryId) return response(400, { error: "galleryId é obrigatório" });

    const updates = JSON.parse(event.body || "{}");
    const allowedFields = ["name", "description", "status", "expiresAt", "clientId"];

    // Filtrar apenas campos permitidos
    const fieldsToUpdate = Object.keys(updates).filter(k => allowedFields.includes(k));
    if (fieldsToUpdate.length === 0) {
      return response(400, { error: `Campos atualizáveis: ${allowedFields.join(", ")}` });
    }

    // Verificar ownership
    const queryResult = await ddbClient.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk AND GSI1SK = :sk",
      ExpressionAttributeValues: {
        ":pk": `GALLERY#${galleryId}`,
        ":sk": "METADATA"
      }
    }));

    if (!queryResult.Items || queryResult.Items.length === 0) {
      return response(404, { error: "Galeria não encontrada" });
    }

    const gallery = queryResult.Items[0];
    if (gallery.photographerId !== userId) {
      return response(403, { error: "Sem permissão" });
    }

    // Montar UpdateExpression
    const expressionParts = [];
    const expressionValues = {};
    const expressionNames = {};

    fieldsToUpdate.forEach((field, i) => {
      expressionParts.push(`#f${i} = :v${i}`);
      expressionNames[`#f${i}`] = field;
      expressionValues[`:v${i}`] = updates[field];
    });

    expressionParts.push("#updAt = :updAt");
    expressionNames["#updAt"] = "updatedAt";
    expressionValues[":updAt"] = new Date().toISOString();

    await ddbClient.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { PK: gallery.PK, SK: gallery.SK },
      UpdateExpression: `SET ${expressionParts.join(", ")}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: "ALL_NEW"
    }));

    return response(200, { message: "Galeria atualizada", galleryId });

  } catch (error) {
    console.error(JSON.stringify({ error: error.message, stack: error.stack }));
    return response(500, { error: "Erro ao atualizar galeria" });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
