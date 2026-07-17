const { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');

const cognito = new CognitoIdentityProviderClient({});

const handler = async (event) => {
  const { userPoolId, userName } = event;

  // Adiciona ao grupo 'cliente' por default
  await cognito.send(new AdminAddUserToGroupCommand({
    UserPoolId: userPoolId,
    Username: userName,
    GroupName: 'cliente',
  }));

  return event;
};

module.exports = { handler };
