# SPEC G1

**ID:** G1  
**TIPO:** Feature  
**TÍTULO:** Tela Global "Configurações do Álbum" + Prorrogação Paga (lado cliente)  
**PRIORIDADE:** P1  
**IMPACTO:** Alto — sem ela, expiração é genérica e prorrogação não existe (receita perdida)  
**ESFORÇO:** Médio (2 Lambdas + 1 entidade DynamoDB + 1 tela ADM + 1 tela cliente)

## CONTEXTO

A spec §11 (atualização 05/07/2026) define uma tela global `Configurações do Álbum` separada da lista de álbuns, com 4 blocos: Disponibilidade, Notificação de Expiração, Templates WhatsApp, Extensão do Álbum. Do lado cliente, `album-vitrine-cliente-prototipo.jsx` ganhou a tela de "álbum expirado" com escolha de faixa e pagamento. O arquivo `FUNCIONALIDADES-album-adm.md` NÃO cobre nenhum desses itens.

## ESCOPO (arquivos e recursos)

### DynamoDB — nova entidade (single-table)

```
CONFIG_ALBUM (PK: TENANT#<tenant_id>, SK: CONFIG#ALBUM)
  prazo_padrao_dias: Number
  presets_dias: List<Number>  // [30,60,90,180,365]
  notificacao_dias_antecedencia: List<Number>  // [7,3,1]
  notificacao_canais: List<String>  // ["whatsapp","email"]
  templates_whatsapp: List<{nome, corpo, variaveis[]}>
  faixas_extensao: List<{meses: 1|3|6|12, ativo: Boolean, preco: Number}>
  bloquear_visualizacao: Boolean
  bloquear_download: Boolean
  mensagem_album_expirado: String
```

### Lambda — `getConfigAlbum`
- GET /admin/album/config
- Lê CONFIG_ALBUM do tenant. Se não existir, retorna defaults hardcoded (prazo 180, faixas inativas).

### Lambda — `putConfigAlbum`
- PUT /admin/album/config
- Validação: pelo menos 1 faixa ativa se extensão habilitada; preço > 0; dias antecedência > 0.
- Grava no DynamoDB.

### Lambda — `solicitarExtensao` (lado cliente)
- POST /cliente/album/{albumId}/extensao
- Body: `{ faixa_meses, meio_pagamento }`
- Regras: álbum deve estar expirado; faixa deve estar ativa na config global.
- Se `meio_pagamento` = gateway → cria COBRANCA tipo `extensao` + chama adapter gateway (§21). Status do álbum: `aguardando_pagamento_extensao`.
- Se `meio_pagamento` = manual (Pix direto/dinheiro) → cria COBRANCA tipo `extensao` com status `em_analise`. Álbum NÃO reativa até confirmação manual do admin.
- Webhook de pagamento confirmado → Lambda reativa o álbum (recalcula `expira_em` = now + faixa_meses).

### API Gateway — HTTP API
- GET  /admin/album/config → getConfigAlbum (auth: admin)
- PUT  /admin/album/config → putConfigAlbum (auth: admin)
- POST /cliente/album/{albumId}/extensao → solicitarExtensao (auth: cliente)

### IAM
- Role `getConfigAlbumRole`: dynamodb:GetItem em tabela principal, condition PK = TENANT#*.
- Role `putConfigAlbumRole`: dynamodb:PutItem mesma condition.
- Role `solicitarExtensaoRole`: dynamodb:GetItem + PutItem + UpdateItem (álbum + cobrança).

### SAM (template.yaml) — adições
- 3 funções Lambda com suas roles.
- 3 rotas no HttpApi existente.

## FORA DE ESCOPO (NÃO TOCAR)

- Tela de lista de álbuns (já existe).
- Modal de regras por álbum (`ModalRegras`) — NÃO alterar; apenas pré-preencher `prazo_dias` com o valor global ao criar álbum novo (lógica no frontend, não nesta spec).
- Envio real de notificação de expiração (pertence ao Follow-up §20 + Notificações §23).
- Frontend/UI (protótipo já existe, implementação de tela é spec separada).

## CRITÉRIOS DE ACEITE

1. GET /admin/album/config retorna defaults quando não há registro.
2. PUT /admin/album/config persiste e GET subsequente retorna o atualizado.
3. PUT rejeita faixa com preço ≤ 0 (400).
4. POST extensão em álbum NÃO expirado retorna 409.
5. POST extensão com faixa inativa retorna 422.
6. POST extensão via gateway cria COBRANCA + chama adapter; álbum fica `aguardando_pagamento_extensao`.
7. POST extensão via manual cria COBRANCA `em_analise`; álbum NÃO reativa.
8. Webhook confirmado recalcula `expira_em` corretamente.

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente a spec G1 — Configurações do Álbum + Prorrogação Paga.

Crie:
1. Entidade CONFIG_ALBUM no DynamoDB (single-table, PK TENANT#<id>, SK CONFIG#ALBUM) com campos: prazo_padrao_dias, presets_dias, notificacao_dias_antecedencia, notificacao_canais, templates_whatsapp, faixas_extensao (list de {meses, ativo, preco}), bloquear_visualizacao, bloquear_download, mensagem_album_expirado.
2. Lambda getConfigAlbum (GET /admin/album/config) — lê a config; retorna defaults se não existir.
3. Lambda putConfigAlbum (PUT /admin/album/config) — valida (preço > 0, pelo menos 1 faixa ativa) e grava.
4. Lambda solicitarExtensao (POST /cliente/album/{albumId}/extensao) — valida álbum expirado + faixa ativa; cria COBRANCA tipo extensao; se gateway chama adapter, se manual fica em_analise. Webhook de confirmação recalcula expira_em = now + faixa_meses e muda status do álbum para publicado.
5. IAM: uma role por Lambda, privilégio mínimo (GetItem/PutItem/UpdateItem na tabela principal, condition key prefix).
6. SAM: adicione as 3 funções + rotas ao template.yaml existente.

Altere SOMENTE: template.yaml, src/handlers/album/getConfigAlbum.mjs, src/handlers/album/putConfigAlbum.mjs, src/handlers/album/solicitarExtensao.mjs, e os arquivos de role IAM correspondentes. NÃO refatore, renomeie ou mexa em mais nada.
```
