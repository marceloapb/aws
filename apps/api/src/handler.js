const serverless = require('serverless-http');
const app = require('./app');
const logger = require('./config/logger');

const handler = serverless(app, {
  basePath: `/${process.env.STAGE || 'prod'}`,
  request: (req, event, context) => {
    // Injeta o event e context no request para os middlewares acessarem
    req.event = event;
    req.context = context;
    req.requestContext = event.requestContext;
  },
});

module.exports.handler = async (event, context) => {
  logger.setRequestId(context.awsRequestId || 'local');
  return handler(event, context);
};

if (process.env.IS_LOCAL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Local server on ${port}`));
}
