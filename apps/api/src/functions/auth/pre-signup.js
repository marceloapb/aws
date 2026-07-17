const { CognitoIdentityProviderClient, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');

const cognito = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

const handler = async (event) => {
  // Auto-confirma em dev
  if (process.env.STAGE === 'dev') {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }

  // Verifica email duplicado
  const { email } = event.request.userAttributes;
  if (email) {
    const result = await cognito.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `email = "${email}"`,
      Limit: 1,
    }));
    if (result.Users && result.Users.length > 0) {
      throw new Error('Email já cadastrado');
    }
  }

  return event;
};

module.exports = { handler };
