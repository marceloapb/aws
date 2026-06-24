# SPEC-04 — Remover Dockerfile e Padrão Container

**ID:** 04  
**TIPO:** Correção  
**PRIORIDADE:** P1  
**IMPACTO:** Custo | **ESFORÇO:** Baixo  

## CONTEXTO

`apps/api/Dockerfile` indica deploy em container (ECS/App Runner). Com Lambda + SAM, o Dockerfile é desnecessário e confunde o pipeline.

## ESCOPO

- `apps/api/Dockerfile` → deletar
- `scripts/deploy.sh` → atualizar para usar `sam build && sam deploy`

## FORA DE ESCOPO (NÃO TOCAR)

- Todo o resto do código
- Frontend
- Infra existente (manter como referência)

## SPEC TÉCNICA

- Remover Dockerfile
- `scripts/deploy.sh` deve executar: `sam build && sam deploy --no-confirm-changeset --no-fail-on-empty-changeset`
- Manter `.dockerignore` se existir (não prejudica)

## CRITÉRIOS DE ACEITE

- Dockerfile removido do repo
- `scripts/deploy.sh` faz deploy via SAM
- Nenhuma referência a Docker no pipeline

## PROMPT PRONTO PARA O KIRO CLI

```
Remova o Dockerfile e atualize o script de deploy para SAM.

1. Delete `apps/api/Dockerfile`.
2. Substitua o conteúdo de `scripts/deploy.sh` por:
   ```bash
   #!/bin/bash
   set -e
   echo "Building SAM application..."
   cd apps/api
   sam build
   echo "Deploying to AWS..."
   sam deploy --no-confirm-changeset --no-fail-on-empty-changeset
   echo "Deploy complete!"
   ```

Altere SOMENTE: `apps/api/Dockerfile` (deletar), `scripts/deploy.sh`. Não refatore, renomeie ou mexa em mais nada.
```
