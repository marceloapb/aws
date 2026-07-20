import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const sesClient = new SESv2Client({ region: process.env.REGION });
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.REGION }));

export const handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) return response(401, { error: "Não autorizado" });

    const { to, subject, htmlBody, textBody, type, metadata } = JSON.parse(event.body || "{}");

    if (!to || !subject) {
      return response(400, { error: "Campos obrigatórios: to, subject" });
    }

    // Enviar email via SES
    await sesClient.send(new SendEmailCommand({
      FromEmailAddress: process.env.SES_FROM_EMAIL,
      Destination: {
        ToAddresses: Array.isArray(to) ? to : [to]
      },
      Content: {
        Simple: {
          Subject: { Data: subject },
          Body: {
            Html: htmlBody ? { Data: htmlBody } : undefined,
            Text: { Data: textBody || subject }
          }
        }
      }
    }));

    // Registrar notificação no DynamoDB
    const notificationId = crypto.randomUUID();
    const now = new Date().toISOString();

    await ddbClient.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        PK: `PHOTOGRAPHER#${userId}`,
        SK: `NOTIFICATION#${notificationId}`,
        GSI1PK: `NOTIFICATION#${now.slice(0, 10)}`,
        GSI1SK: `PHOTOGRAPHER#${userId}`,
        id: notificationId,
        to: Array.isArray(to) ? to : [to],
        subject,
        type: type || "custom",
        metadata: metadata || {},
        status: "sent",
        photographerId: userId,
        sentAt: now,
        createdAt: now
      }
    }));

    return response(200, {
      message: "Email enviado com sucesso",
      notificationId
    });

  } catch (error) {
    console.error(JSON.stringify({ error: error.message, code: error.name, stack: error.stack }));

    if (error.name === "MessageRejected") {
      return response(400, { error: "Email rejeitado. Verifique o destinatário." });
    }
    if (error.name === "MailFromDomainNotVerifiedException") {
      return response(500, { error: "Domínio de envio não verificado no SES" });
    }
    return response(500, { error: "Erro ao enviar notificação" });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
