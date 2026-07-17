# FIN-15: API — CRUD Despesa Avulsa

## Metadados
- **ID:** FIN-15
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** FIN-14

## Contexto
O admin registra despesas avulsas (não recorrentes): combustível para um evento, compra de acessório, contratação de assistente, etc. Pode vincular opcionalmente a um evento.

## Escopo
- `apps/backend/src/handlers/financeiro/despesas.js` — NOVO
- `apps/frontend/src/pages/admin/Despesas.jsx` — NOVO
- `apps/frontend/src/pages/admin/DespesaForm.jsx` — NOVO
- API: /admin/financeiro/despesas (CRUD)

## Fora de Escopo (NÃO TOCAR)
- Despesa fixa/recorrente (FIN-16)
- Fluxo de caixa (FIN-18)
- Cobranças (FIN-01+)

## Spec Técnica

### API
| Método | Rota | Ação |
|---|---|---|
| GET | /admin/financeiro/despesas | Listar (filtros: mês, categoria, evento) |
| POST | /admin/financeiro/despesas | Criar |
| PUT | /admin/financeiro/despesas/:id | Atualizar |
| DELETE | /admin/financeiro/despesas/:id | Excluir |

### Campos
| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| descricao | text | Sim | max 200 |
| categoria_id | select | Sim | categorias ativas |
| valor | number | Sim | > 0 |
| data | date | Sim | <= hoje |
| evento_id | select | Não | eventos do tenant |
| observacao | textarea | Não | max 500 |
| comprovante | file | Não | imagem/PDF, max 5MB |

### Frontend — Despesas.jsx
- Listagem em tabela: Descrição, Categoria, Valor, Data, Evento, Ações
- Filtros: mês, categoria, com/sem evento
- Total do mês visível no topo
- Botão "+ Nova Despesa"

### Frontend — DespesaForm.jsx
- Modal de formulário
- Select de categoria
- Select de evento (opcional, com busca)
- Upload de comprovante (foto/PDF)
- Valor com máscara monetária

### Comprovante
- Upload para S3: `{tenant_id}/despesas/{despesa_id}/comprovante.{ext}`
- Presigned URL para visualizar
- Max 5MB, formatos: jpg, png, pdf

## Critérios de Aceite
- [ ] CRUD completo funciona
- [ ] Filtro por mês e categoria
- [ ] Vínculo opcional com evento
- [ ] Upload de comprovante
- [ ] Total do mês no topo
- [ ] Máscara monetária
- [ ] Validação de data (<= hoje)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-15: CRUD Despesa Avulsa.

1. Crie handlers/financeiro/despesas.js: CRUD com filtros.
2. Crie pages/admin/Despesas.jsx: listagem + filtros + total.
3. Crie pages/admin/DespesaForm.jsx: modal de formulário.
4. Upload comprovante para S3.
5. Vínculo opcional com evento_id.
6. SAM: rotas /admin/financeiro/despesas.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
