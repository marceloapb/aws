import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, UpdateCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.REGION }));

export const handler = async (event) => {
  console.log(JSON.stringify({ action: "expire-galleries-start", event }));

  try {
    const now = new Date().toISOString();
    let expiredCount = 0;
    let lastEvaluatedKey = undefined;

    do {
      // Scan para encontrar galerias expiradas
      // Em produção com muitos dados, considerar GSI com expiresAt como SK
      const params = {
        TableName: process.env.TABLE_NAME,
        FilterExpression: "begins_with(SK, :sk) AND #status = :active AND expiresAt < :now AND attribute_exists(expiresAt)",
        ExpressionAttributeNames: {
          "#status": "status"
        },
        ExpressionAttributeValues: {
          ":sk": "GALLERY#",
          ":active": "active",
          ":now": now
        }
      };

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = await ddbClient.send(new ScanCommand(params));
      lastEvaluatedKey = result.LastEvaluatedKey;

      // Atualizar status para "expired"
      for (const gallery of (result.Items || [])) {
        await ddbClient.send(new UpdateCommand({
          TableName: process.env.TABLE_NAME,
          Key: { PK: gallery.PK, SK: gallery.SK },
          UpdateExpression: "SET #status = :expired, updatedAt = :now",
          ExpressionAttributeNames: {
            "#status": "status"
          },
          ExpressionAttributeValues: {
            ":expired": "expired",
            ":now": now
          }
        }));
        expiredCount++;
        console.log(JSON.stringify({ action: "gallery-expired", galleryId: gallery.id, photographerId: gallery.photographerId }));
      }

    } while (lastEvaluatedKey);

    console.log(JSON.stringify({ action: "expire-galleries-complete", expiredCount }));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Expiração concluída", expiredCount })
    };

  } catch (error) {
    console.error(JSON.stringify({ action: "expire-galleries-error", error: error.message, stack: error.stack }));
    throw error;
  }
};
