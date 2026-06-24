import serverlessExpress from '@vendia/serverless-express';
import app from './app.js';

export const handler = serverlessExpress({ app });

if (process.env.IS_LOCAL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Local server on ${port}`));
}
