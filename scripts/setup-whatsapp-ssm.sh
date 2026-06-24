#!/bin/bash
# Provisiona parâmetros WhatsApp no SSM Parameter Store
# Rodar: chmod +x scripts/setup-whatsapp-ssm.sh && ./scripts/setup-whatsapp-ssm.sh

ENVIRONMENT="prod"
PREFIX="/mbf/${ENVIRONMENT}"

aws ssm put-parameter \
  --name "${PREFIX}/WHATSAPP_ACCESS_TOKEN" \
  --type SecureString \
  --value "EAAVMcZCecdcMBRwPUepFjTt99bnf6omAgj8QmiYISfOU2at7vL8kWaNCCLbsINLyyqDZA6QJZCHvi9m4SoWj2g0v9LSLVGuMewZC5ZAp0QhdrcHIG7rhk8jsRSvWwzm0aY4ZCt2X0p6vzQZBErnjiNyPTZBCh6O36NNpMD7ZAYPvgpnYvXePa3Jg4ldki6CLJPgZDZD" \
  --description "WhatsApp Cloud API - token permanente" \
  --overwrite

aws ssm put-parameter \
  --name "${PREFIX}/WHATSAPP_PHONE_NUMBER_ID" \
  --type String \
  --value "1119943161209234" \
  --description "WhatsApp - ID do numero de telefone" \
  --overwrite

aws ssm put-parameter \
  --name "${PREFIX}/WHATSAPP_VERIFY_TOKEN" \
  --type SecureString \
  --value "GZFDcDQgDBNmLv9MbRXzvazE0cE5u87i" \
  --description "WhatsApp webhook - verify token" \
  --overwrite

echo "✅ Parâmetros WhatsApp criados em ${PREFIX}/"
