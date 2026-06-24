import serverlessExpress from '@vendia/serverless-express';
import app from './app.js';
import { logger } from './config/logger.js';

const serverlessHandler = serverlessExpress({ app });

export const handler = (event, context) => {
  logger.setRequestId(context.awsRequestId);
  return serverlessHandler(event, context);
};

if (process.env.IS_LOCAL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Local server on ${port}`));
}
