import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { QueryCommand, BatchWriteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const s3Client = new S3Client({ region: process.env.REGION });
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.REGION }));

export const handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) return response(401, { error: "Não autorizado" });

    const galleryId = event.pathParameters?.galleryId;
    if (!galleryId) return response(400, { error: "galleryId é obrigatório" });

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

    // 1. Buscar todas as fotos da galeria
    const photosResult = await ddbClient.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `GALLERY#${galleryId}`,
        ":sk": "PHOTO#"
      }
    }));

    const photos = photosResult.Items || [];

    // 2. Deletar fotos do S3
    if (photos.length > 0) {
      const s3Keys = photos.map(p => ({ Key: p.s3Key }));
      await s3Client.send(new DeleteObjectsCommand({
        Bucket: process.env.BUCKET_NAME,
        Delete: { Objects: s3Keys }
      }));
    }

    // 3. Deletar registros do DynamoDB (fotos + galeria)
    const itemsToDelete = [
      ...photos.map(p => ({ PK: p.PK, SK: p.SK })),
      { PK: gallery.PK, SK: gallery.SK }
    ];

    // BatchWrite aceita no máximo 25 itens por vez
    const batches = [];
    for (let i = 0; i < itemsToDelete.length; i += 25) {
      batches.push(itemsToDelete.slice(i, i + 25));
    }

    for (const batch of batches) {
      await ddbClient.send(new BatchWriteCommand({
        RequestItems: {
          [process.env.TABLE_NAME]: batch.map(key => ({
            DeleteRequest: { Key: key }
          }))
        }
      }));
    }

    return response(200, {
      message: "Galeria e fotos deletadas",
      galleryId,
      photosDeleted: photos.length
    });

  } catch (error) {
    console.error(JSON.stringify({ error: error.message, stack: error.stack }));
    return response(500, { error: "Erro ao deletar galeria" });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
