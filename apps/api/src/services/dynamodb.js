const { dynamo, TABLE } = require('../config/dynamodb');
const { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const db = {
  put: (item) => dynamo.send(new PutCommand({ TableName: TABLE, Item: item })),
  
  get: (pk, sk) => dynamo.send(new GetCommand({ TableName: TABLE, Key: { PK: pk, SK: sk } })).then(r => r.Item),
  
  query: (pk, skPrefix) => dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: skPrefix 
      ? 'PK = :pk AND begins_with(SK, :sk)' 
      : 'PK = :pk',
    ExpressionAttributeValues: skPrefix 
      ? { ':pk': pk, ':sk': skPrefix }
      : { ':pk': pk },
  })).then(r => r.Items || []),
  
  update: (pk, sk, updates) => {
    const keys = Object.keys(updates);
    if (keys.length === 0) return Promise.resolve(null);
    const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
    const vals = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));
    return dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: pk, SK: sk },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
      ReturnValues: 'ALL_NEW',
    })).then(r => r.Attributes);
  },
  
  delete: (pk, sk) => dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: pk, SK: sk } })),
  
  queryGSI: (indexName, pkName, pkValue, skName, skPrefix) => {
    const keyExpr = skPrefix
      ? `${pkName} = :pk AND begins_with(${skName}, :sk)`
      : `${pkName} = :pk`;
    const values = skPrefix
      ? { ':pk': pkValue, ':sk': skPrefix }
      : { ':pk': pkValue };
    return dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: indexName,
      KeyConditionExpression: keyExpr,
      ExpressionAttributeValues: values,
    })).then(r => r.Items || []);
  },
};

module.exports = db;
