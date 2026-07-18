# IND-03 — Mecanismo do Gatilho §8→§31 (EventBridge)

**ID:** IND-03  
**TIPO:** Correção  
**PRIORIDADE:** P0  
**IMPACTO:** Alto | **ESFORÇO:** Baixo  

---

## Contexto

A §31 diz "gatilho = assinatura do contrato" mas não define o mecanismo. O sistema usa EventBridge (§5). O handler de assinatura de contrato (§8) precisa emitir um evento que a §31 consome.

---

## Escopo

- `src/handlers/contratos/assinarContrato.mjs` (adicionar emit de evento)
- `src/handlers/indicacoes/confirmarIndicacao.mjs` (novo — consumer do evento)
- `template.yaml` (EventBridge rule + target)

## Fora de Escopo (NÃO TOCAR)

- Lógica de assinatura em si (§8) — apenas adicionar o emit no final.
- Outros consumers de eventos existentes.
- Lógica de orçamento (§6).

---

## Spec Técnica

### Evento emitido pelo §8 (assinarContrato)

```json
{
  "Source": "mbf.contratos",
  "DetailType": "ContratoAssinado",
  "Detail": {
    "contrato_id": "<id>",
    "cliente_id": "<indicado_id>",
    "tenant_id": "<tid>",
    "timestamp": "<ISO>"
  }
}
```

### Consumer — confirmarIndicacao.mjs

1. Recebe evento `ContratoAssinado`.
2. Query PK=`CLIENTE#<cliente_id>`, SK begins_with `INDICADO_POR` → pega `indicador_id`.
3. Se não tem `indicado_por` → exit (não é indicado). **Idempotência:** verifica se já existe Indicacao confirmada para este `indicado_id`.
4. Query PK=`CLIENTE#<indicador_id>`, SK begins_with `INDICACAO#` where `indicado_id` = evento.cliente_id e status=pendente.
5. UpdateItem: status → `confirmada`, data_confirmacao = now.
6. UpdateItem no Cliente indicador: `desconto_indicacao_acumulado += incremento`, condicional: `<= teto_indicacao`.
7. Log estruturado do resultado.

### SAM (template.yaml)

```yaml
ConfirmarIndicacaoFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: src/handlers/indicacoes/confirmarIndicacao.handler
    Events:
      ContratoAssinado:
        Type: EventBridgeRule
        Properties:
          Pattern:
            source: ["mbf.contratos"]
            detail-type: ["ContratoAssinado"]
```

---

## Critérios de Aceite

1. `assinarContrato.mjs` emite evento `ContratoAssinado` via EventBridge após assinatura bem-sucedida.
2. `confirmarIndicacao.mjs` consome o evento e atualiza status+acumulado.
3. Processamento é idempotente (reprocessar mesmo evento não incrementa 2x).
4. Se cliente não é indicado, handler faz early return sem erro.

---

## Prompt para o Kiro

```
1) No arquivo `src/handlers/contratos/assinarContrato.mjs`, adicione ao final do fluxo
de sucesso um `putEvents` no EventBridge com Source="mbf.contratos",
DetailType="ContratoAssinado", Detail contendo contrato_id, cliente_id e tenant_id.
2) Crie `src/handlers/indicacoes/confirmarIndicacao.mjs` que consome esse evento,
verifica se o cliente é indicado, localiza a Indicacao pendente, atualiza pra confirmada
e incrementa o desconto_indicacao_acumulado do indicador (com condition expression <= teto).
3) Adicione a Function + EventBridgeRule no template.yaml.
Altere SOMENTE esses 3 arquivos.
```
