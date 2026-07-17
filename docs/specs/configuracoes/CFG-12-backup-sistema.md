# CFG-12: Backup e Sistema — LGPD + Manutenção

## Metadados
- **ID:** CFG-12
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** Nenhuma

## Contexto
A aba "Backup e Sistema" cobre: configuração de backup (PITR + exports S3), política LGPD (retenção, anonimização, direito ao esquecimento), versão do sistema, e manutenção (limpar cache, reindexar).

## Escopo
- `apps/frontend/src/pages/admin/Configuracoes/BackupSistema.jsx` — NOVO ou expandir
- `apps/api/src/routes/admin-configuracoes.js` — endpoints de backup/sistema
- DynamoDB: entidade CONFIG#SISTEMA

## Fora de Escopo (NÃO TOCAR)
- Execução real do backup (SPEC-24 cobre PITR)
- Anonimização automática (implementação futura)
- Integrações
- Gateway

## Spec Técnica

### Seções da tela

#### 1. Backup
| Campo | Tipo | Notas |
|---|---|---|
| PITR Status | badge | Ativo/Inativo (readonly — vem do DynamoDB) |
| Último backup manual | datetime readonly | |
| Botão "Exportar Dados" | action | Gera export JSON/CSV para S3, retorna link |
| Frequência export automático | select | Nunca / Semanal / Mensal |

#### 2. LGPD
| Campo | Tipo | Notas |
|---|---|---|
| Prazo retenção (meses) | number | Readonly — vem de CFG-10 |
| Dados pendentes de exclusão | count | Quantos clientes solicitaram |
| Botão "Processar Exclusões" | action | Executa anonimização pendente |
| Log de exclusões | table | Últimas 10 (data, cliente, status) |

#### 3. Sistema
| Campo | Tipo | Notas |
|---|---|---|
| Versão do sistema | text readonly | Vem do package.json ou env |
| Ambiente | badge | Produção/Staging |
| Último deploy | datetime readonly | |
| Uso estimado | text | Itens no DynamoDB, fotos no S3, etc. |
| Botão "Limpar Cache CloudFront" | action | Invalida /* |

### API
| Método | Path | Descrição |
|---|---|---|
| GET | /admin/configuracoes/sistema | Status geral do sistema |
| POST | /admin/configuracoes/sistema/export | Inicia export para S3 |
| POST | /admin/configuracoes/sistema/lgpd/processar | Processa exclusões pendentes |
| GET | /admin/configuracoes/sistema/lgpd/log | Log de exclusões |
| POST | /admin/configuracoes/sistema/cache/invalidar | Invalida CloudFront |

### DynamoDB
```
PK: TENANT#<id>
SK: CONFIG#SISTEMA
attributes: export_frequencia, ultimo_export, versao, ambiente, ultimo_deploy, updated_at
```

```
PK: TENANT#<id>
SK: LGPD_LOG#<timestamp>
attributes: cliente_id, cliente_nome, tipo (exclusao|anonimizacao), status (pendente|processado|erro), processed_at
```

## Critérios de Aceite
- [ ] Seção Backup mostra PITR status e botão exportar
- [ ] Export gera link de download (presigned URL S3)
- [ ] Seção LGPD mostra contagem de pendências e log
- [ ] Botão "Processar Exclusões" funciona
- [ ] Seção Sistema mostra versão, ambiente, último deploy
- [ ] Botão "Limpar Cache" invalida CloudFront
- [ ] Readonly nos campos que vêm de outras configs

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CFG-12: Backup e Sistema — LGPD + Manutenção.

1. Crie apps/frontend/src/pages/admin/Configuracoes/BackupSistema.jsx:
   - Seção Backup: badge PITR, último backup, botão export, select frequência
   - Seção LGPD: prazo retenção (readonly), pendências, botão processar, tabela de log
   - Seção Sistema: versão, ambiente, último deploy, uso, botão limpar cache

2. Backend em admin-configuracoes.js:
   - GET /admin/configuracoes/sistema
   - POST /admin/configuracoes/sistema/export → gera export S3 (async, retorna job ID)
   - POST /admin/configuracoes/sistema/lgpd/processar → processa exclusões
   - GET /admin/configuracoes/sistema/lgpd/log → últimos 10 registros
   - POST /admin/configuracoes/sistema/cache/invalidar → CloudFront CreateInvalidation /*

3. DynamoDB: PK TENANT#<id>, SK CONFIG#SISTEMA + SK LGPD_LOG#<ts>

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
