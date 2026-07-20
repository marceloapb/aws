import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { QueryCommand, DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const s3Client = new S3Client({ region: process.env.REGION });
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.REGION }));

export const handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) return response(401, { error: "Não autorizado" });

    const photoId = event.pathParameters?.photoId;
    if (!photoId) return response(400, { error: "photoId é obrigatório" });

    // Buscar a foto pelo GSI1 para encontrar a PK/SK real
    const queryResult = await ddbClient.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      FilterExpression: "id = :photoId",
      ExpressionAttributeValues: {
        ":pk": `PHOTOGRAPHER#${userId}`,
        ":photoId": photoId
      }
    }));

    if (!queryResult.Items || queryResult.Items.length === 0) {
      return response(404, { error: "Foto não encontrada" });
    }

    const photo = queryResult.Items[0];

    // Verificar se pertence ao fotógrafo
    if (photo.photographerId !== userId) {
      return response(403, { error: "Sem permissão para deletar esta foto" });
    }

    // 1. Deletar do S3
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: photo.s3Key
    }));

    // 2. Deletar do DynamoDB
    await ddbClient.send(new DeleteCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        PK: photo.PK,
        SK: photo.SK
      }
    }));

    return response(200, { message: "Foto deletada com sucesso", photoId });

  } catch (error) {
    console.error(JSON.stringify({ error: error.message, stack: error.stack }));
    return response(500, { error: "Erro ao deletar foto" });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
