const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.DYNAMODB_REGION || 'us-east-1' });

const dynamo = DynamoDBDocumentClient.from(client);
const TABLE = process.env.TABLE_NAME || process.env.DYNAMODB_TABLE_NAME || 'mbf-backend-v3-table';

module.exports = { dynamo, TABLE };
