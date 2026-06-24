import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.REGION }));

export const handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) return response(401, { error: "Não autorizado" });

    const { name, email, phone, notes } = JSON.parse(event.body || "{}");

    if (!name || !email) {
      return response(400, { error: "Campos obrigatórios: name, email" });
    }

    const clientId = crypto.randomUUID();
    const now = new Date().toISOString();

    const item = {
      PK: `PHOTOGRAPHER#${userId}`,
      SK: `CLIENT#${clientId}`,
      GSI1PK: `CLIENT#${clientId}`,
      GSI1SK: "PROFILE",
      id: clientId,
      name,
      email,
      phone: phone || null,
      notes: notes || "",
      photographerId: userId,
      galleryCount: 0,
      createdAt: now,
      updatedAt: now
    };

    await ddbClient.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: item,
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)"
    }));

    return response(201, { message: "Cliente criado", client: item });

  } catch (error) {
    console.error(JSON.stringify({ error: error.message, stack: error.stack }));
    return response(500, { error: "Erro ao criar cliente" });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
