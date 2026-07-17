# CLI-11: Merge de Duplicatas

## Metadados
- **ID:** CLI-11
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Alto
- **Dependência:** CLI-04, CLI-05

## Contexto
Clientes podem ser cadastrados mais de uma vez (ex: importação + cadastro manual, formulário do site + admin). Precisamos de um merge que unifica registros, preservando histórico de ambos.

## Escopo
- `apps/frontend/src/pages/admin/Clientes.jsx` — botão "Merge"
- `apps/frontend/src/components/cliente/MergeWizard.jsx` — NOVO
- Backend: Lambda `mergeClientes`
- API: POST /admin/clientes/merge

## Fora de Escopo (NÃO TOCAR)
- Detecção automática de duplicatas (futuro — ML)
- ClienteForm.jsx
- ClienteDetalhe.jsx
- Módulos de orçamento/contrato (apenas atualizar referências)

## Spec Técnica

### Fluxo do Merge
1. Admin seleciona 2 clientes na listagem
2. Abre MergeWizard com comparação lado a lado
3. Para cada campo conflitante: admin escolhe qual valor manter
4. Preview do resultado final
5. Confirmação com aviso "irreversível"
6. Backend executa merge

### Backend — mergeClientes
- Input: `{ cliente_principal_id, cliente_secundario_id, campos_escolhidos }`
- Ações:
  1. Atualizar cliente principal com campos escolhidos
  2. Mover todas as referências (orçamentos, contratos, sessões, pagamentos) do secundário para o principal
  3. Copiar tags do secundário (union)
  4. Copiar notas do secundário
  5. Registrar evento na timeline: "Merge com [nome_secundario]"
  6. Soft-delete do cliente secundário (status: merged, merged_into: principal_id)
- Transação: usar TransactWriteItems para atomicidade

### Frontend — MergeWizard.jsx
- Step 1: Comparação lado a lado (tabela de campos)
- Step 2: Para cada conflito, radio button "Manter A" / "Manter B"
- Step 3: Preview do resultado
- Step 4: Confirmação com warning
- Loading durante execução
- Sucesso: navega para o cliente unificado

## Critérios de Aceite
- [ ] Selecionar 2 clientes e abrir wizard
- [ ] Comparação lado a lado correta
- [ ] Escolher campo por campo funciona
- [ ] Preview mostra resultado final
- [ ] Merge executa atomicamente
- [ ] Referências (orçamentos, contratos etc) migram
- [ ] Tags unificadas (sem duplicatas)
- [ ] Notas copiadas
- [ ] Cliente secundário soft-deleted
- [ ] Timeline registra o merge

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CLI-11: Merge de Duplicatas.

1. Em Clientes.jsx: botão "Merge" (ativa ao selecionar 2 clientes).
2. Crie components/cliente/MergeWizard.jsx: comparação lado a lado, escolha de campos, preview, confirmação.
3. Backend POST /admin/clientes/merge:
   - TransactWriteItems: atualizar principal, mover referências, copiar tags/notas, soft-delete secundário.
4. Registrar evento na timeline.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
