import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.REGION }));

export const handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) return response(401, { error: "Não autorizado" });

    const { name, description, clientId, expiresAt } = JSON.parse(event.body || "{}");

    if (!name) {
      return response(400, { error: "Campo obrigatório: name" });
    }

    const galleryId = crypto.randomUUID();
    const now = new Date().toISOString();

    const item = {
      PK: `PHOTOGRAPHER#${userId}`,
      SK: `GALLERY#${galleryId}`,
      GSI1PK: `GALLERY#${galleryId}`,
      GSI1SK: "METADATA",
      id: galleryId,
      name,
      description: description || "",
      photographerId: userId,
      clientId: clientId || null,
      status: "active",
      photoCount: 0,
      expiresAt: expiresAt || null,
      shareToken: null,
      createdAt: now,
      updatedAt: now
    };

    await ddbClient.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: item,
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)"
    }));

    return response(201, { message: "Galeria criada", gallery: item });

  } catch (error) {
    console.error(JSON.stringify({ error: error.message, stack: error.stack }));
    return response(500, { error: "Erro ao criar galeria" });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
