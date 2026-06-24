#!/bin/bash
# =============================================================================
# SCRIPT DE EXECUÇÃO SEQUENCIAL DAS SPECS NO KIRO CLI
# =============================================================================
# Uso: Execute este script para abrir cada spec na ordem correta.
# Copie o PROMPT PRONTO de cada arquivo e cole no Kiro CLI.
# =============================================================================

set -e

SPECS_DIR="docs/specs"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ordem de execução (CRÍTICO: seguir esta sequência)
SPECS=(
  "SPEC-06-criar-template-sam.md"
  "SPEC-02-express-para-lambda-handler.md"
  "SPEC-04-remover-dockerfile.md"
  "SPEC-03-remover-rate-limiter.md"
  "SPEC-07-segredos-ssm.md"
  "SPEC-01-pocketbase-para-dynamodb.md"
  "SPEC-08-auth-cognito.md"
  "SPEC-05-jobs-eventbridge-lambda.md"
  "SPEC-10-upload-presigned-url.md"
  "SPEC-09-webhooks-sqs-dlq.md"
  "SPEC-11-cloudfront-signed-urls.md"
  "SPEC-12-frontend-cicd.md"
  "SPEC-13-logs-estruturados.md"
)

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  HORIZONS → SERVERLESS: Roteiro de Migração (13 Specs)      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

for i in "${!SPECS[@]}"; do
  SPEC_NUM=$((i + 1))
  SPEC_FILE="${SPECS[$i]}"
  SPEC_PATH="${SPECS_DIR}/${SPEC_FILE}"
  
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}[${SPEC_NUM}/13]${NC} ${SPEC_FILE}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  if [ ! -f "$SPEC_PATH" ]; then
    echo -e "${RED}ERRO: Arquivo não encontrado: ${SPEC_PATH}${NC}"
    continue
  fi
  
  # Mostra título da spec
  head -1 "$SPEC_PATH" | sed 's/# //'
  echo ""
  
  # Extrai e mostra o prompt pronto
  echo -e "${BLUE}PROMPT PARA COLAR NO KIRO:${NC}"
  echo -e "${BLUE}─────────────────────────${NC}"
  sed -n '/^## PROMPT PRONTO/,/^```$/{ /^## PROMPT/d; /^```$/d; /^```/d; p }' "$SPEC_PATH"
  echo ""
  echo -e "${BLUE}─────────────────────────${NC}"
  echo ""
  
  # Pausa para o usuário executar no Kiro
  echo -e "${GREEN}Instruções:${NC}"
  echo "  1. Copie o prompt acima"
  echo "  2. Cole no chat do Kiro CLI"
  echo "  3. Aguarde a implementação"
  echo "  4. Valide (veja checklist abaixo)"
  echo "  5. Pressione ENTER para a próxima spec"
  echo ""
  
  read -p "Pressione ENTER quando terminar esta spec (ou 's' para pular): " SKIP
  if [ "$SKIP" = "s" ]; then
    echo -e "${YELLOW}Pulando ${SPEC_FILE}...${NC}"
  fi
  echo ""
done

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ TODAS AS 13 SPECS CONCLUÍDAS!                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Próximos passos:"
echo "  1. sam build"
echo "  2. sam deploy --guided"
echo "  3. Testar endpoints via curl/Postman"
echo "  4. Configurar parâmetros SSM no console AWS"
echo "  5. Criar usuário admin no Cognito"
