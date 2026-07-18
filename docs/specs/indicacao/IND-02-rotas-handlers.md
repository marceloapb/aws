# IND-02 — Rotas HTTP API + Handlers Lambda

**ID:** IND-02  
**TIPO:** Feature  
**PRIORIDADE:** P0  
**IMPACTO:** Alto | **ESFORÇO:** Médio  

---

## Contexto

A §31 não define endpoints. O frontend (protótipos existentes) precisa de rotas claras. São 3 contextos: cliente (Central), admin (config + listagem), e público (resolver código).

---

## Escopo

- `src/handlers/indicacoes/` (novos handlers)
- `template.yaml` (recursos SAM)

## Fora de Escopo (NÃO TOCAR)

- Handlers de outros módulos.
- Protótipos frontend (não gerar React aqui).
- Lógica de §6 (orçamento) — apenas interface.

---

## Spec Técnica

### Rotas

| Método | Rota | Handler | Auth | Descrição |
|---|---|---|---|---|
| GET | `/indicacoes/config` | getIndicacoesConfig | ADM | Busca config do programa |
| PUT | `/indicacoes/config` | updateIndicacoesConfig | ADM | Atualiza config |
| GET | `/indicacoes` | listIndicacoes | ADM | Lista todas (filtros: status, suspeita) |
| PATCH | `/indicacoes/{id}/revogar` | revogarIndicador | ADM | Revoga status do indicador |
| GET | `/cliente/indicacoes` | getMinhasIndicacoes | CLIENTE | Indicações do cliente logado |
| GET | `/cliente/indicacoes/codigo` | getMeuCodigo | CLIENTE | Retorna/gera código pessoal |
| GET | `/public/ref/{codigo}` | resolverCodigo | NONE | Valida código e redireciona pra §25 |

### Handlers — responsabilidade única

1. **getIndicacoesConfig** — Query PK=`TENANT#<tid>`, SK=`CONFIG#INDICACOES`. Retorna JSON.
2. **updateIndicacoesConfig** — Valida body (ativo, percentuais, teto). PutItem condicional.
3. **listIndicacoes** — Query GSI1 PK=`TENANT#<tid>`, SK begins_with `IND#`. Filtros via SK prefix (`IND#PENDENTE`, `IND#SUSPEITA`). Paginação via LastEvaluatedKey.
4. **revogarIndicador** — UpdateItem no Cliente: `status_programa = revogado`. UpdateItem na Indicacao: `status = invalidada`.
5. **getMinhasIndicacoes** — Query PK=`CLIENTE#<id>`, SK begins_with `INDICACAO#`. Retorna lista + `desconto_indicacao_acumulado`.
6. **getMeuCodigo** — Query PK=`CLIENTE#<id>` buscando item REFCODE. Se não existe, gera (nanoid 8 chars), grava e retorna.
7. **resolverCodigo** — Query PK=`REFCODE#<codigo>`. Se ativo=true e programa ativo → retorna `{ valido: true, indicador_id }`. Se não → `{ valido: false }`.

---

## Critérios de Aceite

1. 7 handlers criados em `src/handlers/indicacoes/`.
2. Cada handler: 1 arquivo, 1 export, stateless.
3. Rotas declaradas no `template.yaml` com auth Cognito (exceto `/public/ref`).
4. Responses seguem padrão existente (`{ statusCode, body }`).

---

## Prompt para o Kiro

```
Crie os 7 handlers Lambda em `src/handlers/indicacoes/` (getIndicacoesConfig.mjs,
updateIndicacoesConfig.mjs, listIndicacoes.mjs, revogarIndicador.mjs,
getMinhasIndicacoes.mjs, getMeuCodigo.mjs, resolverCodigo.mjs) seguindo os padrões
do projeto (DynamoDBClient v3, response helper, structured logging). Cada handler faz
exatamente o descrito na spec. Adicione as 7 rotas ao template.yaml na seção HttpApi
Events. Rota `/public/ref/{codigo}` sem authorizer; demais com CognitoAuthorizer.
Altere SOMENTE os arquivos listados.
```
