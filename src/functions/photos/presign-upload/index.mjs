import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const s3Client = new S3Client({ region: process.env.REGION });
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.REGION }));

export const handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) return response(401, { error: "Não autorizado" });

    const { fileName, contentType, galleryId } = JSON.parse(event.body || "{}");

    if (!fileName || !contentType) {
      return response(400, { error: "Campos obrigatórios: fileName, contentType" });
    }

    // Validar tipo de arquivo
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/tiff"];
    if (!allowedTypes.includes(contentType)) {
      return response(400, { error: `Tipo não permitido. Aceitos: ${allowedTypes.join(", ")}` });
    }

    // Gerar ID único e path no S3
    const photoId = crypto.randomUUID();
    const extension = fileName.split(".").pop();
    const s3Key = `photographers/${userId}/photos/${photoId}.${extension}`;

    // Gerar presigned URL (válida por 15 min)
    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
      Metadata: {
        "photographer-id": userId,
        "original-name": fileName
      }
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    // Salvar metadados no DynamoDB
    const now = new Date().toISOString();
    const item = {
      PK: galleryId ? `GALLERY#${galleryId}` : `PHOTOGRAPHER#${userId}`,
      SK: `PHOTO#${photoId}`,
      GSI1PK: `PHOTOGRAPHER#${userId}`,
      GSI1SK: `PHOTO#${now}`,
      id: photoId,
      fileName,
      contentType,
      s3Key,
      galleryId: galleryId || null,
      photographerId: userId,
      status: "uploading",
      createdAt: now,
      updatedAt: now
    };

    await ddbClient.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: item
    }));

    return response(200, {
      uploadUrl,
      photoId,
      s3Key,
      expiresIn: 900
    });

  } catch (error) {
    console.error(JSON.stringify({ error: error.message, stack: error.stack }));
    return response(500, { error: "Erro ao gerar URL de upload" });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
