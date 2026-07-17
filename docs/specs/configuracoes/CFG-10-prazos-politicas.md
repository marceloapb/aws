# CFG-10: Prazos e Políticas — Parametrização

## Metadados
- **ID:** CFG-10
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
A aba "Prazos e Políticas" parametriza regras de negócio globais: validade de orçamento, prazo de entrega padrão, política de cancelamento, multa por atraso, prazo de seleção de fotos, e limites operacionais.

## Escopo
- `apps/frontend/src/pages/admin/Configuracoes/PrazosPoliticas.jsx` — NOVO ou expandir existente
- `apps/api/src/routes/admin-configuracoes.js` — GET/PUT /configuracoes/prazos
- DynamoDB: entidade CONFIG#PRAZOS

## Fora de Escopo (NÃO TOCAR)
- Lógica de aplicação desses prazos nos orçamentos/contratos (outros módulos consomem)
- Condições de pagamento (CFG-11 separada)
- Gateway
- Integrações

## Spec Técnica

### Campos
| Seção | Campo | Tipo | Default | Notas |
|---|---|---|---|---|
| Orçamentos | Validade padrão (dias) | number | 7 | Dias até expirar |
| Orçamentos | Tempo de resposta SLA (horas) | number | 24 | Para follow-up automático |
| Contratos | Multa por cancelamento (%) | number | 20 | Percentual sobre valor total |
| Contratos | Prazo devolução sinal (dias) | number | 30 | Após cancelamento do fotógrafo |
| Entrega | Prazo entrega padrão (dias) | number | 30 | Dias úteis após evento |
| Entrega | Prazo seleção fotos (dias) | number | 14 | Dias para cliente escolher |
| Entrega | Prazo mínimo aviso ensaio (dias) | number | 3 | Antecedência mínima |
| Financeiro | Juros por atraso (% ao mês) | number | 2 | Juros compostos |
| Financeiro | Multa por atraso (%) | number | 2 | Percentual fixo |
| Financeiro | Desconto antecipação (%) | number | 5 | Pagamento antecipado |
| LGPD | Prazo retenção dados (meses) | number | 60 | Após último contrato |
| LGPD | Permitir exclusão pelo cliente | toggle | true | |

### API
| Método | Path | Descrição |
|---|---|---|
| GET | /admin/configuracoes/prazos | Retorna prazos/políticas |
| PUT | /admin/configuracoes/prazos | Atualiza (merge parcial) |

### DynamoDB
```
PK: TENANT#<id>
SK: CONFIG#PRAZOS
attributes: orcamentos{}, contratos{}, entrega{}, financeiro{}, lgpd{}, updated_at
```

## Critérios de Aceite
- [ ] Formulário com todas as seções e campos
- [ ] Valores default pré-preenchidos
- [ ] Validação: números positivos, percentuais entre 0-100
- [ ] Merge parcial no PUT (não apaga campos não enviados)
- [ ] Toast de confirmação ao salvar

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CFG-10: Prazos e Políticas — Parametrização.

1. Crie apps/frontend/src/pages/admin/Configuracoes/PrazosPoliticas.jsx:
   - Formulário com seções: Orçamentos, Contratos, Entrega, Financeiro, LGPD
   - Inputs numéricos com labels descritivos e unidade (dias, %, horas, meses)
   - Toggles para campos boolean
   - Valores default conforme tabela da spec
   - Botão Salvar chama PUT /admin/configuracoes/prazos
   - Toast de sucesso ao salvar

2. Backend em admin-configuracoes.js:
   - GET /admin/configuracoes/prazos → DynamoDB Query PK=TENANT#id, SK=CONFIG#PRAZOS
   - PUT /admin/configuracoes/prazos → merge parcial com spread no DynamoDB update

3. DynamoDB: PK TENANT#<id>, SK CONFIG#PRAZOS com nested objects por seção.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
