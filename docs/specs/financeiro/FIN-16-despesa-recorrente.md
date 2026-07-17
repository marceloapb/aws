# FIN-16: Despesa Fixa/Recorrente + Auto-Geração Mensal

## Metadados
- **ID:** FIN-16
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** FIN-15

## Contexto
O admin cadastra despesas fixas (aluguel, internet, software) que se repetem todo mês. Um job mensal gera automaticamente a despesa avulsa correspondente no dia configurado.

## Escopo
- `apps/backend/src/handlers/financeiro/despesasFixas.js` — NOVO
- `apps/backend/src/handlers/financeiro/gerarDespesasMensais.js` — NOVO (Lambda scheduled)
- `apps/frontend/src/pages/admin/DespesasFixas.jsx` — NOVO
- API: /admin/financeiro/despesas-fixas (CRUD)
- EventBridge: job mensal

## Fora de Escopo (NÃO TOCAR)
- Despesa avulsa (FIN-15 — já feito)
- Fluxo de caixa (FIN-18)
- Cobranças

## Spec Técnica

### API
| Método | Rota | Ação |
|---|---|---|
| GET | /admin/financeiro/despesas-fixas | Listar |
| POST | /admin/financeiro/despesas-fixas | Criar |
| PUT | /admin/financeiro/despesas-fixas/:id | Atualizar |
| DELETE | /admin/financeiro/despesas-fixas/:id | Desativar |

### Campos
- descricao (obrigatório)
- categoria_id (obrigatório)
- valor (obrigatório, > 0)
- dia_vencimento (1-28)
- ativa (boolean)

### Job Mensal (EventBridge → Lambda)
```js
// Executa no dia 1 de cada mês
async function gerarDespesasMensais() {
  const tenants = await listarTenantsAtivos()
  
  for (const tenant of tenants) {
    const fixas = await listarDespesasFixas(tenant.id, { ativa: true })
    
    for (const fixa of fixas) {
      // Verificar se já existe despesa do mês (idempotência)
      const jaExiste = await verificarDespesaMes(fixa.id, mesAtual)
      if (jaExiste) continue
      
      await criarDespesa({
        descricao: fixa.descricao,
        categoria_id: fixa.categoria_id,
        valor: fixa.valor,
        data: `${anoAtual}-${mesAtual}-${fixa.dia_vencimento}`,
        recorrente: true,
        despesa_fixa_id: fixa.id
      })
    }
  }
}
```

### Regras
- dia_vencimento: 1-28 (evitar problemas com fev/meses curtos)
- Idempotência: não gerar 2x no mesmo mês
- Admin pode editar despesa gerada (ex: valor diferente)
- Admin pode criar despesa fixa a qualquer momento; só gera no próximo mês

### Frontend — DespesasFixas.jsx
- Lista de despesas fixas com: descrição, categoria, valor, dia, ativa
- Toggle ativo/inativo
- Criar/editar em modal
- Badge: "Gerada em Jul/2026" (última geração)

## Critérios de Aceite
- [ ] CRUD de despesas fixas funciona
- [ ] Job mensal gera despesas avulsas automaticamente
- [ ] Idempotência: não duplica no mesmo mês
- [ ] dia_vencimento 1-28
- [ ] Toggle ativa funciona
- [ ] Despesa gerada vinculada à fixa (despesa_fixa_id)
- [ ] Admin pode editar despesa gerada

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-16: Despesa Fixa/Recorrente.

1. Crie handlers/financeiro/despesasFixas.js: CRUD.
2. Crie handlers/financeiro/gerarDespesasMensais.js: Lambda scheduled (dia 1).
3. Crie pages/admin/DespesasFixas.jsx: lista, toggle, modal.
4. Idempotência: não duplicar no mês.
5. SAM: rotas + EventBridge rule mensal.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
