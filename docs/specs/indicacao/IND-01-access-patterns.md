# IND-01 — DynamoDB Access Patterns e PK/SK

**ID:** IND-01  
**TIPO:** Melhoria  
**PRIORIDADE:** P0  
**IMPACTO:** Alto | **ESFORÇO:** Médio  

---

## Contexto

A §31 define entidades (ProgramaIndicacaoConfig, CodigoIndicacao, Indicacao, campos em Cliente) mas não mapeia access patterns para single-table design (§23). Sem isso, qualquer handler vai forçar Scan.

---

## Escopo

- `docs/specs/SPEC-54 -programa-indicacoes.md` (adicionar seção 8.1 — Access Patterns)

## Fora de Escopo (NÃO TOCAR)

- Regras de negócio (seções 5–7) — permanecem intactas.
- Entidades do §23 já existentes.

---

## Spec Técnica

### Access Patterns

| # | Query | PK | SK | Índice |
|---|---|---|---|---|
| AP1 | Config do programa | `TENANT#<tid>` | `CONFIG#INDICACOES` | Table |
| AP2 | Código → indicador (resolver link) | `REFCODE#<codigo>` | `REFCODE#<codigo>` | Table |
| AP3 | Indicações do indicador (meu painel) | `CLIENTE#<id>` | `INDICACAO#<data>#<indicado_id>` | Table |
| AP4 | Indicação por indicado (first-touch check) | `CLIENTE#<indicado_id>` | `INDICADO_POR#<indicador_id>` | Table |
| AP5 | Indicações pendentes (admin) | `TENANT#<tid>` | `IND#PENDENTE#<data>#<id>` | GSI1 |
| AP6 | Indicações com suspeita (admin) | `TENANT#<tid>` | `IND#SUSPEITA#<data>#<id>` | GSI1 |
| AP7 | Ranking indicadores (admin) | `TENANT#<tid>` | `RANKING#<qtd_confirmadas>#<indicador_id>` | GSI1 |
| AP8 | Todas indicações (admin listagem) | `TENANT#<tid>` | `IND#<status>#<data>#<id>` | GSI1 |

### Entidade DynamoDB — Indicacao

```
PK: CLIENTE#<indicador_id>
SK: INDICACAO#<data_cadastro>#<indicado_id>
GSI1PK: TENANT#<tid>
GSI1SK: IND#<status>#<data_cadastro>#<id>
Attributes: indicado_id, codigo_usado, status, flag_suspeita, motivo_suspeita, data_confirmacao
```

### Entidade DynamoDB — CodigoIndicacao

```
PK: REFCODE#<codigo>
SK: REFCODE#<codigo>
Attributes: cliente_id, ativo, created_at
```

### Entidade DynamoDB — ProgramaIndicacaoConfig

```
PK: TENANT#<tid>
SK: CONFIG#INDICACOES
Attributes: ativo, percentual_base_indicado, incremento_por_indicacao, teto_indicacao, gatilho
```

### Campos novos no item Cliente existente

```
desconto_indicacao_acumulado (Number)
status_programa (String: ativo | revogado)
indicado_por (String | null)
```

---

## Critérios de Aceite

1. Todos os 8 access patterns resolvidos sem Scan.
2. GSI1 (já existente no projeto) reutilizado.
3. Documento §31 seção 8 atualizado com a tabela de APs.

---

## Prompt para o Kiro

```
Atualize o arquivo `docs/specs/SPEC-54 -programa-indicacoes.md` adicionando a subseção
"8.1 — Access Patterns (Single-Table)" logo após a seção 8, com a tabela de access
patterns e os schemas de entidade DynamoDB exatamente como definidos nesta spec.
Não altere nenhuma outra seção do arquivo. Não renomeie, refatore ou mova outros arquivos.
```
