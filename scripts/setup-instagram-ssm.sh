#!/bin/bash
# Provisiona parâmetros Instagram no SSM Parameter Store
# Rodar: chmod +x scripts/setup-instagram-ssm.sh && ./scripts/setup-instagram-ssm.sh

ENVIRONMENT="prod"
PREFIX="/mbf/${ENVIRONMENT}"

aws ssm put-parameter \
  --name "${PREFIX}/INSTAGRAM_ACCESS_TOKEN" \
  --type SecureString \
  --value "IGAAThMgQpu5tBZAFkwb1V0WE1ZAZAE45blBfVlF6V3hXejBObDV2aktaWXRCWU1rYy1PRl92M2F6RmhBZAGVpUU91d0FmQkZAwRzJZAblJVeVZAPdEdjdXdvY2FqRzBYM19rOTZAYTUhjXy1nNDBoeFQxSVhiNHMzSEdNZAmNYdlpvelBmYwZDZD" \
  --description "Instagram Graph API - access token longa duração" \
  --overwrite

aws ssm put-parameter \
  --name "${PREFIX}/INSTAGRAM_BUSINESS_ACCOUNT_ID" \
  --type String \
  --value "1784140195015035" \
  --description "Instagram - Business Account ID" \
  --overwrite

aws ssm put-parameter \
  --name "${PREFIX}/INSTAGRAM_APP_SECRET" \
  --type SecureString \
  --value "3174d33b9bf11e2c37f9d6678a1a254d" \
  --description "Instagram App Secret - para validar assinatura webhook" \
  --overwrite

aws ssm put-parameter \
  --name "${PREFIX}/INSTAGRAM_VERIFY_TOKEN" \
  --type SecureString \
  --value "mbf_ig_webhook_v3k9Xp2mQ7wL" \
  --description "Instagram webhook - verify token" \
  --overwrite

echo "✅ Parâmetros Instagram criados em ${PREFIX}/"
