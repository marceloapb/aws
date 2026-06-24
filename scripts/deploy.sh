#!/bin/bash
set -e
echo "🚀 Iniciando deploy do Horizons Photography System..."

echo "📦 Building frontend..."
cd apps/web && npm ci && npm run build && cd ../..

echo "☁️ Deploying frontend..."
aws s3 sync apps/web/dist s3://$FRONTEND_BUCKET --delete
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"

echo "🖥️ Deploying backend..."
cd apps/api
docker build -t horizons-api .
aws ecr get-login-password --region sa-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY
docker tag horizons-api:latest $ECR_REGISTRY/horizons-api:latest
docker push $ECR_REGISTRY/horizons-api:latest
cd ../..

echo "🏗️ Updating infrastructure..."
aws cloudformation deploy \
  --template-file infra/cloudformation.yml \
  --stack-name horizons-production \
  --parameter-overrides Environment=production \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset

echo "✅ Deploy completo!"
