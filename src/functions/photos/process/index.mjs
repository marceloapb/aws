import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const s3Client = new S3Client({ region: process.env.REGION });
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.REGION }));

export const handler = async (event) => {
  const results = [];

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      const { photoId, s3Key, photographerId, PK, SK } = message;

      console.log(JSON.stringify({ action: "processing", photoId, s3Key }));

      // 1. Obter metadados do objeto no S3
      const headResult = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: s3Key
      }));

      const fileSize = headResult.ContentLength;
      const contentType = headResult.ContentType;

      // 2. Gerar thumbnail key
      const thumbnailKey = s3Key.replace("/photos/", "/thumbnails/");

      // 3. Atualizar status no DynamoDB
      await ddbClient.send(new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: { PK, SK },
        UpdateExpression: "SET #status = :status, fileSize = :size, thumbnailKey = :thumb, updatedAt = :now",
        ExpressionAttributeNames: {
          "#status": "status"
        },
        ExpressionAttributeValues: {
          ":status": "processed",
          ":size": fileSize,
          ":thumb": thumbnailKey,
          ":now": new Date().toISOString()
        }
      }));

      console.log(JSON.stringify({ action: "processed", photoId, fileSize }));
      results.push({ photoId, status: "success" });

    } catch (error) {
      console.error(JSON.stringify({
        action: "process-error",
        error: error.message,
        record: record.body
      }));
      results.push({ record: record.messageId, status: "error", error: error.message });
      // Não lançar erro — deixa a mensagem ir para DLQ após 3 tentativas
    }
  }

  console.log(JSON.stringify({ action: "batch-complete", results }));
  return { batchItemFailures: [] };
};
