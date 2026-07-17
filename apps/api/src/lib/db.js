const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
  BatchGetCommand,
  BatchWriteCommand,
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE = process.env.TABLE_NAME || 'mbf-prod-table';

// Helper: build UpdateExpression from object
function buildUpdate(updates) {
  const keys = Object.keys(updates).filter(k => updates[k] !== undefined);
  if (keys.length === 0) return null;
  const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
  const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
  const values = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));
  return { UpdateExpression: expr, ExpressionAttributeNames: names, ExpressionAttributeValues: values };
}

module.exports = {
  ddb,
  TABLE,
  buildUpdate,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
  BatchGetCommand,
  BatchWriteCommand,
};
