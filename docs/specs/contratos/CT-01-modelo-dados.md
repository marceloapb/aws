# CT-01: Modelo de Dados (DynamoDB)

## Metadados
- **ID:** CT-01
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Médio
- **Dependência:** Nenhuma

## Contexto
Definir todas as entidades do módulo Contratos no single-table design. Inclui: modelo de contrato (template), contrato gerado, aditivo, aceite.

## Escopo
- `apps/backend/src/models/contrato.js` — NOVO
- DynamoDB: 4 entidades

## Fora de Escopo (NÃO TOCAR)
- CRUD modelos (CT-02)
- Geração (CT-03)
- Orçamentos (módulo ORC)

## Spec Técnica

### Entidades

#### 1. MODELO_CONTRATO (template reutilizável)
```json
{
  "PK": "TENANT#t123",
  "SK": "MODELO_CONTRATO#modelo_001",
  "id": "modelo_001",
  "nome": "Contrato Padrão Casamento",
  "descricao": "Contrato para ensaios e cobertura de casamento",
  "corpo_html": "<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1><p>Pelo presente instrumento...</p>",
  "variaveis": ["nome_cliente", "cpf_cliente", "tipo_evento", "data_evento", "local_evento", "valor_total", "forma_pagamento", "prazo_entrega"],
  "campos_manuais": ["observacoes_adicionais"],
  "prazo_assinatura_dias": 7,
  "ativo": true,
  "versao": 3,
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-07-10T14:00:00Z"
}
```

#### 2. CONTRATO (instância gerada)
```json
{
  "PK": "TENANT#t123",
  "SK": "CONTRATO#ct_001",
  "id": "ct_001",
  "modelo_id": "modelo_001",
  "orcamento_id": "orc_001",
  "cliente_id": "cli_001",
  "status": "pendente",
  "corpo_html_renderizado": "<h1>CONTRATO DE PRESTAÇÃO...</h1>",
  "snapshot_orcamento": { "valor": 4500, "servicos": [...], "parcelas": [...] },
  "prazo_assinatura_dias": 7,
  "expira_em": "2026-07-24T10:00:00Z",
  "aceite": null,
  "pdf_s3_key": null,
  "link_cliente": "https://app.mbfotos.com.br/contrato/ct_001?token=xxx",
  "created_at": "2026-07-17T10:00:00Z",
  "updated_at": "2026-07-17T10:00:00Z"
}
```

#### 3. ACEITE_CONTRATO (prova de aceite)
```json
{
  "PK": "CONTRATO#ct_001",
  "SK": "ACEITE#2026-07-18T15:30:00Z",
  "contrato_id": "ct_001",
  "cliente_id": "cli_001",
  "nome_informado": "Ana Carolina Silva",
  "cpf_informado": "123.456.789-00",
  "ip_address": "189.44.120.55",
  "user_agent": "Mozilla/5.0...",
  "checkbox_lido": true,
  "checkbox_aceito": true,
  "data_aceite": "2026-07-18T15:30:00Z"
}
```

#### 4. ADITIVO_CONTRATO
```json
{
  "PK": "CONTRATO#ct_001",
  "SK": "ADITIVO#adit_001",
  "id": "adit_001",
  "contrato_id": "ct_001",
  "tipo": "aumento",
  "motivo": "Adição de drone na cobertura",
  "valor_original": 4500,
  "valor_novo": 5200,
  "diferenca": 700,
  "descricao_alteracao": "Incluída cobertura com drone (2h de voo)",
  "status": "pendente",
  "aceite": null,
  "created_at": "2026-08-01T10:00:00Z"
}
```

### Status de Contrato
| Status | Descrição |
|---|---|
| rascunho | Gerado mas não enviado |
| pendente | Enviado ao cliente, aguardando assinatura |
| assinado | Cliente aceitou |
| expirado | Prazo de assinatura venceu |
| cancelado | Admin cancelou |

### Status de Aditivo
| Status | Descrição |
|---|---|
| pendente | Enviado ao cliente |
| aceito | Cliente aceitou |
| recusado | Cliente recusou |
| cancelado | Admin cancelou |

## Critérios de Aceite
- [ ] 4 entidades criadas no model
- [ ] Helpers CRUD para cada entidade
- [ ] Status com transições válidas
- [ ] Snapshot de orçamento imutável
- [ ] Aceite com dados de prova (IP, data, CPF)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CT-01: Modelo de Dados Contratos.

1. Crie models/contrato.js: helpers CRUD para 4 entidades.
2. MODELO_CONTRATO, CONTRATO, ACEITE_CONTRATO, ADITIVO_CONTRATO.
3. Status: rascunho/pendente/assinado/expirado/cancelado.
4. Snapshot de orçamento no contrato gerado.
5. Aceite com IP, user_agent, CPF, timestamps.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
