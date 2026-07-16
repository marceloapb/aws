#!/bin/bash
set -e
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"
STAGE="prod"
GITHUB_REPO="marceloapb/aws"
FRONTEND_BUCKET_NAME="mbf-${STAGE}-frontend"
FRONTEND_URL="https://app.bloise.com.br"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 MBF Bootstrap — Conta: $ACCOUNT_ID | Região: $REGION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📦 [0/8] Verificando GitHub CLI..."
if ! command -v gh &> /dev/null; then
  sudo yum install -y gh 2>/dev/null || (
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt update && sudo apt install gh -y
  )
fi
echo "✅ GitHub CLI: $(gh --version | head -1)"

if ! gh auth status &>/dev/null 2>&1; then
  echo ""
  echo "⚠️  Execute primeiro: gh auth login"
  exit 1
fi

echo ""
echo "🔐 [1/8] Criando OIDC Provider..."
OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN" &>/dev/null; then
  echo "✅ Já existe."
else
  aws iam create-open-id-connect-provider \
    --url "https://token.actions.githubusercontent.com" \
    --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" \
    --client-id-list "sts.amazonaws.com"
  echo "✅ Criado."
fi

echo ""
echo "🔑 [2/8] Criando IAM Role..."
ROLE_NAME="mbf-${STAGE}-github-deploy"
TRUST_POLICY="{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Federated\":\"arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com\"},\"Action\":\"sts:AssumeRoleWithWebIdentity\",\"Condition\":{\"StringEquals\":{\"token.actions.githubusercontent.com:aud\":\"sts.amazonaws.com\"},\"StringLike\":{\"token.actions.githubusercontent.com:sub\":\"repo:${GITHUB_REPO}:*\"}}}]}"

if aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
  echo "✅ Role já existe."
else
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" \
    --description "GitHub Actions deploy role for MBF Systems"
  echo "✅ Role criada."
fi
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

echo "   Anexando policy..."
DEPLOY_POLICY="{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"CFN\",\"Effect\":\"Allow\",\"Action\":[\"cloudformation:*\"],\"Resource\":\"arn:aws:cloudformation:${REGION}:${ACCOUNT_ID}:stack/mbf-*\"},{\"Sid\":\"CFNGlobal\",\"Effect\":\"Allow\",\"Action\":[\"cloudformation:ListStacks\",\"cloudformation:ValidateTemplate\",\"cloudformation:GetTemplateSummary\"],\"Resource\":\"*\"},{\"Sid\":\"S3\",\"Effect\":\"Allow\",\"Action\":[\"s3:*\"],\"Resource\":[\"arn:aws:s3:::mbf-*\",\"arn:aws:s3:::mbf-*/*\",\"arn:aws:s3:::aws-sam-cli-managed-default-*\",\"arn:aws:s3:::aws-sam-cli-managed-default-*/*\"]},{\"Sid\":\"Lambda\",\"Effect\":\"Allow\",\"Action\":[\"lambda:*\"],\"Resource\":\"arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:mbf-*\"},{\"Sid\":\"APIGW\",\"Effect\":\"Allow\",\"Action\":[\"apigateway:*\"],\"Resource\":[\"arn:aws:apigateway:${REGION}::/*\"]},{\"Sid\":\"DDB\",\"Effect\":\"Allow\",\"Action\":[\"dynamodb:*\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/mbf-*\"},{\"Sid\":\"IAM\",\"Effect\":\"Allow\",\"Action\":[\"iam:CreateRole\",\"iam:DeleteRole\",\"iam:GetRole\",\"iam:PutRolePolicy\",\"iam:DeleteRolePolicy\",\"iam:AttachRolePolicy\",\"iam:DetachRolePolicy\",\"iam:PassRole\",\"iam:TagRole\",\"iam:GetRolePolicy\",\"iam:ListRolePolicies\",\"iam:ListAttachedRolePolicies\"],\"Resource\":\"arn:aws:iam::${ACCOUNT_ID}:role/mbf-*\"},{\"Sid\":\"Events\",\"Effect\":\"Allow\",\"Action\":[\"scheduler:*\",\"events:*\"],\"Resource\":\"*\"},{\"Sid\":\"CF\",\"Effect\":\"Allow\",\"Action\":[\"cloudfront:CreateInvalidation\",\"cloudfront:GetDistribution\"],\"Resource\":\"*\"},{\"Sid\":\"SSM\",\"Effect\":\"Allow\",\"Action\":[\"ssm:GetParameter\"],\"Resource\":\"arn:aws:ssm:${REGION}:${ACCOUNT_ID}:parameter/mbf/*\"},{\"Sid\":\"Cognito\",\"Effect\":\"Allow\",\"Action\":[\"cognito-idp:*\"],\"Resource\":\"arn:aws:cognito-idp:${REGION}:${ACCOUNT_ID}:userpool/*\"},{\"Sid\":\"Logs\",\"Effect\":\"Allow\",\"Action\":[\"logs:*\"],\"Resource\":\"*\"}]}"

aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "mbf-deploy-policy" \
  --policy-document "$DEPLOY_POLICY"
echo "✅ Policy anexada."

echo ""
echo "🪣 [3/8] Criando S3 Bucket para frontend..."
if aws s3api head-bucket --bucket "$FRONTEND_BUCKET_NAME" &>/dev/null 2>&1; then
  echo "✅ Já existe."
else
  aws s3api create-bucket \
    --bucket "$FRONTEND_BUCKET_NAME" \
    --region "$REGION"
  aws s3api put-public-access-block \
    --bucket "$FRONTEND_BUCKET_NAME" \
    --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  echo "✅ Criado: $FRONTEND_BUCKET_NAME"
fi

echo ""
echo "🌐 [4/8] Criando CloudFront Distribution..."
OAC_NAME="mbf-${STAGE}-oac"
OAC_ID=$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='${OAC_NAME}'].Id" --output text 2>/dev/null)

if [ -z "$OAC_ID" ] || [ "$OAC_ID" == "None" ]; then
  OAC_ID=$(aws cloudfront create-origin-access-control \
    --origin-access-control-config "{\"Name\":\"${OAC_NAME}\",\"Description\":\"OAC for MBF frontend\",\"SigningProtocol\":\"sigv4\",\"SigningBehavior\":\"always\",\"OriginAccessControlOriginType\":\"s3\"}" \
    --query 'OriginAccessControl.Id' --output text)
  echo "   OAC criado: $OAC_ID"
else
  echo "   OAC existente: $OAC_ID"
fi

EXISTING_DIST=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='mbf-${STAGE}-frontend'].Id" --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_DIST" ] && [ "$EXISTING_DIST" != "None" ]; then
  CF_DISTRIBUTION_ID="$EXISTING_DIST"
  CF_DOMAIN=$(aws cloudfront get-distribution --id "$CF_DISTRIBUTION_ID" \
    --query 'Distribution.DomainName' --output text)
  echo "✅ Já existe: $CF_DISTRIBUTION_ID ($CF_DOMAIN)"
else
  CF_CONFIG="{\"CallerReference\":\"mbf-${STAGE}-$(date +%s)\",\"Comment\":\"mbf-${STAGE}-frontend\",\"Enabled\":true,\"DefaultRootObject\":\"index.html\",\"Origins\":{\"Quantity\":1,\"Items\":[{\"Id\":\"S3-${FRONTEND_BUCKET_NAME}\",\"DomainName\":\"${FRONTEND_BUCKET_NAME}.s3.${REGION}.amazonaws.com\",\"OriginAccessControlId\":\"${OAC_ID}\",\"S3OriginConfig\":{\"OriginAccessIdentity\":\"\"}}]},\"DefaultCacheBehavior\":{\"TargetOriginId\":\"S3-${FRONTEND_BUCKET_NAME}\",\"ViewerProtocolPolicy\":\"redirect-to-https\",\"AllowedMethods\":{\"Quantity\":2,\"Items\":[\"GET\",\"HEAD\"],\"CachedMethods\":{\"Quantity\":2,\"Items\":[\"GET\",\"HEAD\"]}},\"ForwardedValues\":{\"QueryString\":false,\"Cookies\":{\"Forward\":\"none\"}},\"MinTTL\":0,\"DefaultTTL\":86400,\"MaxTTL\":31536000,\"Compress\":true},\"CustomErrorResponses\":{\"Quantity\":1,\"Items\":[{\"ErrorCode\":403,\"ResponsePagePath\":\"/index.html\",\"ResponseCode\":\"200\",\"ErrorCachingMinTTL\":0}]},\"PriceClass\":\"PriceClass_100\"}"

  CF_RESULT=$(aws cloudfront create-distribution --distribution-config "$CF_CONFIG")
  CF_DISTRIBUTION_ID=$(echo "$CF_RESULT" | jq -r '.Distribution.Id')
  CF_DOMAIN=$(echo "$CF_RESULT" | jq -r '.Distribution.DomainName')
  echo "✅ Criada: $CF_DISTRIBUTION_ID ($CF_DOMAIN)"

  BUCKET_POLICY="{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"AllowCF\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"cloudfront.amazonaws.com\"},\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::${FRONTEND_BUCKET_NAME}/*\",\"Condition\":{\"StringEquals\":{\"AWS:SourceArn\":\"arn:aws:cloudfront::${ACCOUNT_ID}:distribution/${CF_DISTRIBUTION_ID}\"}}}]}"
  aws s3api put-bucket-policy --bucket "$FRONTEND_BUCKET_NAME" --policy "$BUCKET_POLICY"
  echo "   Bucket policy configurada."
fi

echo ""
echo "🔏 [5/8] Gerando Key Pair..."
KEY_DIR="/tmp/mbf-cf-keys"
mkdir -p "$KEY_DIR"

if [ ! -f "$KEY_DIR/private_key.pem" ]; then
  openssl genrsa -out "$KEY_DIR/private_key.pem" 2048 2>/dev/null
  openssl rsa -pubout -in "$KEY_DIR/private_key.pem" -out "$KEY_DIR/public_key.pem" 2>/dev/null
  echo "✅ Key pair gerado."
else
  echo "✅ Key pair já existe."
fi

CF_PUBLIC_KEY_NAME="mbf-${STAGE}-signing-key"
EXISTING_KEY_ID=$(aws cloudfront list-public-keys \
  --query "PublicKeyList.Items[?Name=='${CF_PUBLIC_KEY_NAME}'].Id" --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_KEY_ID" ] && [ "$EXISTING_KEY_ID" != "None" ]; then
  CF_KEY_PAIR_ID="$EXISTING_KEY_ID"
  echo "✅ Public Key existe: $CF_KEY_PAIR_ID"
else
  PUBLIC_KEY_PEM=$(cat "$KEY_DIR/public_key.pem")
  CF_KEY_RESULT=$(aws cloudfront create-public-key --public-key-config \
    "{\"CallerReference\":\"mbf-${STAGE}-$(date +%s)\",\"Name\":\"${CF_PUBLIC_KEY_NAME}\",\"EncodedKey\":$(echo "$PUBLIC_KEY_PEM" | jq -Rs .),\"Comment\":\"MBF signing key\"}")
  CF_KEY_PAIR_ID=$(echo "$CF_KEY_RESULT" | jq -r '.PublicKey.Id')
  echo "✅ Public Key criada: $CF_KEY_PAIR_ID"

  aws cloudfront create-key-group --key-group-config \
    "{\"Name\":\"mbf-${STAGE}-key-group\",\"Items\":[\"${CF_KEY_PAIR_ID}\"],\"Comment\":\"MBF key group\"}" 2>/dev/null || true
  echo "   Key Group criado."
fi

echo ""
echo "🔒 [6/8] Salvando private key no SSM..."
aws ssm put-parameter \
  --name "/mbf/${STAGE}/cloudfront/private-key" \
  --type "SecureString" \
  --value "$(cat /tmp/mbf-cf-keys/private_key.pem)" \
  --overwrite \
  --description "CloudFront signing private key for MBF" \
  --region "$REGION"
echo "✅ Salva em /mbf/${STAGE}/cloudfront/private-key"

echo ""
echo "🚀 [7/8] Deploy da API via SAM..."
cd /tmp
if [ ! -d "/tmp/mbf-aws" ]; then
  gh repo clone "$GITHUB_REPO" mbf-aws
fi

cd /tmp/mbf-aws/apps/api
npm ci --omit=dev

if ! command -v sam &>/dev/null; then
  pip3 install aws-sam-cli -q
fi

sam build

sam deploy \
  --stack-name "mbf-${STAGE}-api" \
  --parameter-overrides \
    Stage=$STAGE \
    CloudFrontDomain=$CF_DOMAIN \
    CloudFrontKeyPairId=$CF_KEY_PAIR_ID \
    FrontendUrl=$FRONTEND_URL \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --resolve-s3 \
  --region $REGION

API_URL=$(aws cloudformation describe-stacks \
  --stack-name "mbf-${STAGE}-api" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text \
  --region $REGION)
echo "✅ API deployed: $API_URL"

echo ""
echo "🔑 [8/8] Configurando GitHub Secrets..."
gh secret set AWS_ROLE_ARN --repo "$GITHUB_REPO" --body "$ROLE_ARN"
gh secret set CLOUDFRONT_DOMAIN --repo "$GITHUB_REPO" --body "$CF_DOMAIN"
gh secret set CLOUDFRONT_KEY_PAIR_ID --repo "$GITHUB_REPO" --body "$CF_KEY_PAIR_ID"
gh secret set FRONTEND_URL --repo "$GITHUB_REPO" --body "$FRONTEND_URL"
gh secret set API_URL --repo "$GITHUB_REPO" --body "$API_URL"
gh secret set FRONTEND_BUCKET --repo "$GITHUB_REPO" --body "$FRONTEND_BUCKET_NAME"
gh secret set CLOUDFRONT_DISTRIBUTION_ID --repo "$GITHUB_REPO" --body "$CF_DISTRIBUTION_ID"
echo "✅ Todos os 7 secrets configurados!"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ BOOTSTRAP COMPLETO!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 VALORES:"
echo "   AWS_ROLE_ARN:              $ROLE_ARN"
echo "   CLOUDFRONT_DOMAIN:         $CF_DOMAIN"
echo "   CLOUDFRONT_KEY_PAIR_ID:    $CF_KEY_PAIR_ID"
echo "   FRONTEND_URL:              $FRONTEND_URL"
echo "   API_URL:                   $API_URL"
echo "   FRONTEND_BUCKET:           $FRONTEND_BUCKET_NAME"
echo "   CLOUDFRONT_DISTRIBUTION_ID: $CF_DISTRIBUTION_ID"
echo ""
echo "📌 PRÓXIMOS PASSOS:"
echo "   1. Push em apps/api/ → deploy automático da API"
echo "   2. Push em apps/web/ → deploy automático do frontend"
echo "   3. Acesse: $API_URL/health"
echo ""
echo "🧹 LIMPEZA (opcional):"
echo "   rm -rf /tmp/mbf-cf-keys /tmp/mbf-aws"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
