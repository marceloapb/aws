import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, QueryCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.REGION }));

export const handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) return response(401, { error: "Não autorizado" });

    const galleryId = event.pathParameters?.galleryId;
    if (!galleryId) return response(400, { error: "galleryId é obrigatório" });

    const { expiresInDays } = JSON.parse(event.body || "{}");

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

    // Gerar token de compartilhamento
    const shareToken = crypto.randomBytes(32).toString("hex");
    const days = expiresInDays || 7;
    const shareExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    await ddbClient.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { PK: gallery.PK, SK: gallery.SK },
      UpdateExpression: "SET shareToken = :token, shareExpiresAt = :expires, updatedAt = :now",
      ExpressionAttributeValues: {
        ":token": shareToken,
        ":expires": shareExpiresAt,
        ":now": new Date().toISOString()
      }
    }));

    return response(200, {
      message: "Link de compartilhamento gerado",
      shareToken,
      shareExpiresAt,
      shareUrl: `${process.env.FRONTEND_URL || ""}/gallery/shared/${shareToken}`
    });

  } catch (error) {
    console.error(JSON.stringify({ error: error.message, stack: error.stack }));
    return response(500, { error: "Erro ao compartilhar galeria" });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
